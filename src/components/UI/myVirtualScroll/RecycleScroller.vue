<template>
  <Scrolly
    ref="scrollyRef"
    :lock="lock"
    @scroll="onScroll"
  >
    <div :style="{ height: totalHeight + 'px' }">
      <div :class="vclass" :style="{ transform: `translateY(${offsetY}px)` }">
        <slot
          v-for="item of visibleItems"
          :key="getKey(item)"
          :item="item"
        />
      </div>
    </div>
  </Scrolly>
</template>

<script>
import { reactive, toRefs, watch, onMounted } from 'vue';
import { callWithDelay } from 'js/utils';

import Scrolly from '../Scrolly.vue';

export default {
  props: {
    items: {
      type: Array,
      required: true
    },

    itemHeight: {
      type: Number,
      required: true
    },

    getKey: {
      type: Function,
      required: true
    },

    renderAhread: {
      type: Number,
      default: 3
    },

    vclass: {},
    lock: {}
  },

  components: {
    Scrolly
  },

  setup(props, { emit }) {
    const state = reactive({
      scrollyRef: null,
      totalHeight: null,
      viewportHeight: null,
      offsetY: 0,
      visibleItems: []
    });

    onMounted(() => {
      const { offsetHeight, scrollTop } = state.scrollyRef.viewport;
      state.totalHeight = offsetHeight;
      state.viewportHeight = offsetHeight;
      doRender(scrollTop);
    });

    function doRender(scrollTop) {
      if (!props.items.length) {
        return;
      }

      render(scrollTop);
    }

    const render = callWithDelay((scrollTop) => {
      requestAnimationFrame(() => {
        const startNode = Math.max(
          0,
          Math.floor(scrollTop / props.itemHeight) - props.renderAhread
        );

        const visibleNodeCount = Math.min(
          props.items.length - startNode,
          Math.ceil(state.viewportHeight / props.itemHeight) + 2 * props.renderAhread
        );

        state.offsetY = startNode * props.itemHeight;
        state.visibleItems = props.items.slice(startNode, startNode + visibleNodeCount);
      });
    }, 17);

    function onScroll(event) {
      emit('scroll', event);

      doRender(event.viewport.scrollTop);
    }

    watch(
      () => props.items,
      () => {
        state.totalHeight = props.items.length * props.itemHeight;
        doRender(state.scrollyRef.viewport.scrollTop);
      }
    );

    return {
      ...toRefs(state),
      onScroll
    };
  }
};
</script>

<style>

</style>
