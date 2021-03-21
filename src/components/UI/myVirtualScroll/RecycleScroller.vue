<template>
  <Scrolly
    ref="scrolly"
    @scroll="onScroll"
  >
    <div :style="{ height: totalHeight + 'px' }">
      <div :class="vclass" :style="{ transform: `translateY(${offsetY}px)` }">
        <slot :startIndex="startIndex" :endIndex="endIndex || items.length - 1" />
      </div>
    </div>
  </Scrolly>
</template>

<script>
import { reactive, toRefs, watch, onMounted, onUnmounted } from 'vue';
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

    renderAhread: {
      type: Number,
      default: 3
    },

    vclass: {}
  },

  components: {
    Scrolly
  },

  setup(props) {
    const state = reactive({
      scrolly: null,

      totalHeight: null,
      viewportHeight: null,
      offsetY: 0,
      startIndex: 0,
      endIndex: 0
    });

    onMounted(() => {
      const { offsetHeight, scrollTop } = state.scrolly.viewport;
      state.totalHeight = offsetHeight;
      state.viewportHeight = offsetHeight;
      updateVisibleItems(scrollTop);

      window.addEventListener('resize', onResize);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', onResize);
    });

    function onResize() {
      state.viewportHeight = state.scrolly.viewport.offsetHeight;
    }

    function updateVisibleItems(scrollTop) {
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
        state.startIndex = startNode;
        state.endIndex = startNode + visibleNodeCount - 1;
      });
    }, 0);

    function onScroll(event) {
      updateVisibleItems(event.viewport.scrollTop);
    }

    watch(
      () => props.items,
      () => {
        state.totalHeight = props.items.length * props.itemHeight;
        updateVisibleItems(state.scrolly.viewport.scrollTop);
      }
    );

    return {
      ...toRefs(state),
      onScroll
    };
  }
};
</script>
