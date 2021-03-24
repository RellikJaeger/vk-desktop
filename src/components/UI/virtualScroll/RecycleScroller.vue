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
import { reactive, toRefs, watch, onMounted, onBeforeUnmount } from 'vue';
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

      state.viewportHeight = offsetHeight;
      updateVisibleItems(scrollTop);

      state.resizeObserver = new ResizeObserver(
        callWithDelay(onResize, 250)
      );

      state.resizeObserver.observe(state.scrolly.viewport, {
        box: 'border-box'
      });
    });

    onBeforeUnmount(() => {
      state.resizeObserver.disconnect();
    });

    function onResize([{ contentRect }]) {
      // height = 0 при переходе в беседу в компактном режиме
      if (contentRect.height) {
        state.viewportHeight = contentRect.height;
      }
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
