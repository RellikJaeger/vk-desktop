<template>
  <DynamicScroller
    v-slot="{ startIndex, endIndex }"
    ref="scroller"
    :items="children"
    :lock="lockScroll"
    :vclass="vclass"
  >
    <slot name="before" />

    <template v-for="(child, index) of children" :key="'p' + child.key">
      <KeepAlive>
        <component
          :is="child"
          :scrollerItem="true"
          v-if="1 || index >= startIndex && (index <= endIndex || lockScroll)"
        />
      </KeepAlive>
    </template>

    <slot name="after" />
  </DynamicScroller>
</template>

<script>
import { h, computed } from 'vue';
import { capitalize } from 'js/utils';
import { getDay } from 'js/date';
import { isSameDay } from 'js/date/utils';
import store from 'js/store';
import getTranslate from 'js/getTranslate';

import MessagesGroup from './MessagesGroup.vue';
import Carousel from './Carousel.vue';
import ServiceMessage from '../ServiceMessage.vue';
import Icon from '../../UI/Icon.vue';
import { DynamicScroller } from '../../UI/virtualScroll';

export default {
  props: ['peer_id', 'peer', 'list', 'startInRead', 'isCustomView', 'vclass', 'lockScroll'],

  components: {
    DynamicScroller
  },

  setup(props) {
    let activeGroup = [];
    let expiredMessages = [];

    function getMessageDate(msg, prevMsg) {
      const prevMsgDate = prevMsg && new Date(prevMsg.date * 1000);
      const thisMsgDate = new Date(msg.date * 1000);

      if (!prevMsg || !isSameDay(prevMsgDate, thisMsgDate)) {
        return capitalize(getDay(thisMsgDate));
      }
    }

    function checkIsStartUnread(msg, prevMsg) {
      const isPrevUnread = prevMsg && prevMsg.id > props.startInRead;
      const isThisUnread = msg.id > props.startInRead;

      return !msg.out && !isPrevUnread && isThisUnread;
    }

    function closeGroup(children) {
      if (activeGroup.length) {
        children.push(
          h(MessagesGroup, {
            key: activeGroup.map((msg) => msg.id).join(','),
            peer_id: props.peer_id,
            peer: props.peer,
            messages: activeGroup,
            isCustomView: props.isCustomView
          })
        );

        activeGroup = [];
      }
    }

    const addExpiredMark = (children, isUnread) => {
      closeGroup(children);

      children.push(
        h(
          'div',
          {
            key: 'expired' + expiredMessages.length,
            // isUnread добавляется, если не прочтено минимум одно сообщение
            class: ['message_expired_wrap', { isUnread }],
            // Для прочтения сообщений
            'data-last-id': expiredMessages[expiredMessages.length - 1]
          },
          [
            h('div', { class: 'message_expired' }, [
              h(Icon, { name: 'bomb', color: 'var(--icon-gray)' }),
              getTranslate('im_messages_expired', [expiredMessages.length], expiredMessages.length)
            ])
          ]
        )
      );

      expiredMessages = [];
    };

    const computedChildren = computed(() => {
      const children = [];

      for (let i = 0; i < props.list.length; i++) {
        const prevMsg = props.list[i - 1];
        const msg = props.list[i];
        const nextMsg = props.list[i + 1];
        const messageDate = getMessageDate(msg, prevMsg);
        const isStartUnread = checkIsStartUnread(msg, prevMsg);
        const isPrevUnread = prevMsg && prevMsg.id > props.peer.in_read;
        const isUnread = msg.id > props.peer.in_read;

        if (expiredMessages.length && (messageDate || msg.action || isStartUnread)) {
          addExpiredMark(children, isPrevUnread);
        }

        if (messageDate) {
          closeGroup(children);

          children.push(
            h('div', {
              key: messageDate,
              class: 'message_date'
            }, messageDate)
          );
        }

        if (isStartUnread) {
          closeGroup(children);

          children.push(
            h('div', { key: 'unread', class: 'message_unread_messages' }, [
              h('span', getTranslate('im_unread_messages'))
            ])
          );
        }

        if (msg.action) {
          closeGroup(children);

          children.push(
            h('div', {
              key: msg.id,
              class: ['im_service_message', { isUnread }],
              'data-id': msg.id
            }, [
              h(ServiceMessage, {
                msg,
                author: store.state.profiles[msg.from],
                peer_id: props.peer_id,
                isFull: true
              })
            ])
          );

          continue;
        }

        if (prevMsg && prevMsg.from !== msg.from) {
          closeGroup(children);
        }

        if (!msg.isExpired) {
          // eslint-disable-next-line vue/no-side-effects-in-computed-properties
          activeGroup.push(msg);

          if (msg.template && msg.template.type === 'carousel') {
            closeGroup(children);

            children.push(
              h(Carousel, {
                key: 'carousel' + msg.id,
                peer_id: props.peer_id,
                msg
              })
            );
          }
        } else {
          // eslint-disable-next-line vue/no-side-effects-in-computed-properties
          expiredMessages.push(msg.id);

          if (!(nextMsg && nextMsg.isExpired)) {
            addExpiredMark(children, isUnread);
          }
        }
      }

      closeGroup(children);

      return children;
    });

    return {
      scroller: null,
      children: computedChildren
    };
  }
};
</script>

<style>
.message_date, .message_unread_messages {
  text-align: center;
  margin: 10px 0 8px 0;
  color: var(--text-dark-steel-gray);
}

.message_unread_messages {
  position: relative;
}

.message_unread_messages span {
  position: relative;
  background: var(--background);
  padding: 0 10px;
}

.message_unread_messages::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  height: 1px;
  width: 100%;
  background: var(--separator-dark);
}

.message_expired_wrap {
  display: flex;
  justify-content: center;
  margin: 8px 0 4px 0;
}

.message_expired {
  display: flex;
  align-items: center;
  border: 1px solid var(--separator-dark);
  border-radius: 20px;
  color: var(--text-dark-steel-gray);
  padding: 5px 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .1);
}

.message_expired svg {
  margin-right: 6px;
}

.im_service_message {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--text-dark-steel-gray);
  margin: 8px 15px 4px 15px;
}

.im_service_message b {
  font-weight: 500;
}
</style>
