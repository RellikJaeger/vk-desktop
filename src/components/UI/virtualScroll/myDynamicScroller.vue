<template>
  <Scrolly ref="scrolly" @scroll="onScroll">
    <div class="dynamic_scroller" :style="{ height: viewportHeight + 'px' }">
      <div ref="spacer" :class="vclass" :style="{ transform: `translateY(${translateY}px)` }">
        <slot :startIndex="startIndex" :endIndex="endIndex" />
      </div>
    </div>
  </Scrolly>
</template>

<script>
import { reactive, toRefs, watch, onMounted, onBeforeUnmount } from 'vue';

import Scrolly from '../Scrolly.vue';

export default {
  props: ['items', 'vclass'],

  components: {
    Scrolly
  },

  setup(props) {
    const state = reactive({
      scrolly: null,
      spacer: null,

      // scollTop: 0,

      viewportHeight: 0,
      translateY: 0,

      startIndex: 0,
      endIndex: 0
    });

    function onScroll(event) {
      // console.log(event);
    }

    watch(
      () => props.items,
      (newItems, oldItems) => {
        console.log(newItems, oldItems);
      },
      { flush: 'post' }
    )

    onMounted(() => {
      state.mutationObserver = new MutationObserver((entries) => {
        console.log(entries);
      });

      state.mutationObserver.observe(state.spacer, {
        childList: true,
        characterData: true,
        subtree: true
      });
    });

    onBeforeUnmount(() => {
      state.mutationObserver.disconnect();
    });

    return {
      ...toRefs(state),
      onScroll
    };
  }
};
</script>

<style>
.dynamic_scroller {
  min-height: 100%;
}
</style>
