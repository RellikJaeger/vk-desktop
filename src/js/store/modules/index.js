import Vue from 'vue';
import { getPhoto } from 'js/utils';

export default {
  state: {
    menuState: false,
    profiles: {}
  },
  mutations: {
    setMenuState(state, value) {
      state.menuState = value;
    },
    addProfiles(state, profiles) {
      for(let profile of profiles) {
        profile.photo = getPhoto(profile.photo_50, profile.photo_100);
        Vue.set(state.profiles, profile.id, profile);
      }
    },
    updateProfile(state, profile) {
      const old = state.profiles[profile.id] || {};
      const user = { ...old, ...profile };

      user.photo = getPhoto(user.photo_50, user.photo_100);
      Vue.set(state.profiles, user.id, user);
    }
  }
}
