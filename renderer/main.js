'use strict';

window.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

const qs = (selector, target) => (target || document).querySelector(selector);
const qsa = (selector, target) => (target || document).querySelectorAll(selector);

const fs = require('fs');
const ROOT_DIR = __dirname;
const { getCurrentWindow, BrowserWindow } = require('electron').remote;
const Vue = require('./js/lib/Vue');
const Vuex = require('./js/lib/Vuex');
const ModalCreator = require('./js/lib/ModalCreator');
const other = require('./js/other');
const { random, endScroll } = other;
const contextMenu = require('./js/contextMenu');
const emoji = require('./js/emoji');
const { users, settings } = require('./js/Storage');
const vkapi = require('./js/vkapi');

// настройка Vue
Vue.config.devtools = true;
require('./js/initComponents');
Vue.use(ModalCreator);

let app = new Vue({
  el: '.app',
  store: require('./js/VueStore.js'),
  data: {
    auth: !settings.get('activeID'),
    section: settings.get('section')
  }
});

contextMenu.set('body', (e) => {
  return [{
    label: 'Открыть в DevTools',
    click: (temp, win) => win.inspectElement(e.x, e.y)
  }];
});

window.addEventListener('beforeunload', () => {
  getCurrentWindow().removeAllListeners();

  BrowserWindow.getAllWindows().forEach((win) => {
    if(win != getCurrentWindow()) win.destroy();
  });

  settings.set('window', getCurrentWindow().getBounds());
});
