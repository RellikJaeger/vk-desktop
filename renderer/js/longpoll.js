'use strict';

const util = require('util');
const querystring = require('querystring');
const { EventEmitter } = require('events');
const { parseConversation, parseMessage, concatProfiles } = require('./../components/messages/methods');

class Longpoll {
  constructor() {
    this.init();
  }

  async init() {
    let data = await Longpoll.getServer();

    this.server = data.server;
    this.key = data.key;
    this.pts = data.pts;
    this.ts = data.ts;

    this.loop();
  }

  static async getServer() {
    return await vkapi('messages.getLongPollServer', { lp_version: 5, need_pts: 1 });
  }

  async loop() {
    let [ host, path ] = this.server.split('/');

    let data = await request({
      host: host,
      path: `/${path}?` + querystring.stringify({
        act: 'a_check',
        key: this.key,
        ts: this.ts,
        wait: 10,
        mode: 362,
        version: 5
      })
    });

    if(!data.updates) data.updates = [];

    if(data.failed) {
      if([1, 3].includes(data.failed)) {
        let history = await vkapi('messages.getLongPollHistory', {
          ts: this.ts,
          pts: this.pts,
          onlines: 1,
          lp_version: 5,
          fields: other.fields
        });

        app.$store.commit('addProfiles', await concatProfiles(history.profiles, history.groups));

        for(let item of history.history) {
          if([4, 5].includes(item[0])) {
            let type = item[0] == 4 ? 'new_message' : 'edit_message',
                conversation = history.conversations.find((conv) => conv.peer.id == item[3]),
                message = history.messages.items.find((msg) => msg.id == item[1]);

            this.emit(type, {
              peer: parseConversation(conversation),
              msg: parseMessage(message, conversation)
            });
          } else data.updates.push(item);
        }

        if(data.failed == 3) {
          let server = await Longpoll.getServer();

          this.key = server.key;
          this.ts = server.ts;
        } else if(data.ts) this.ts = data.ts;

        this.pts = history.new_pts;
      } else if(data.failed == 2) {
        let server = await Longpoll.getServer();

        this.key = server.key;
        this.pts = server.pts;
      }
    }

    this.ts = data.ts || this.ts;
    this.pts = data.pts || this.pts;

    let removedMessages = [],
        eventsList = require('./longpollEvents');

    for(let update of data.updates) {
      let id = update.splice(0, 1)[0],
          event = eventsList[id];

      if(id == 2) {
        removedMessages.push(update);
        continue;
      }

      if(!event) {
        console.error('[longpoll] Неизвестное событие:', [id, ...update]);
        continue;
      }

      let eventData = event(update);
      if(!eventData) continue;

      this.emit(eventData.name, eventData.data);
    }

    let updates = removedMessages.reduce((all, update) => {
      if(!all[update[2]]) all[update[2]] = [update];
      else all[update[2]].push(update);
      return all;
    }, {});

    for(let update of Object.values(updates)) {
      let data = eventsList[2](update);
      this.emit(data.name, data.data);
    }

    this.loop();
  }
}

util.inherits(Longpoll, EventEmitter);

module.exports = new Longpoll();
