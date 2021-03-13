<template>
  <Scrolly
    ref="scrollyRef"
    :class="scrollyClass"
    :vclass="scrollyVClass"
    :lock="lock"
    @scroll="onScroll"
  >
    <div
      ref="root"
      class="vue-recycle-scroller"
    >
      <div
        ref="wrapper"
        :style="{ minHeight: totalSize + 'px' }"
        class="vue-recycle-scroller__item-wrapper"
      >
        <div
          v-for="view of pool"
          :key="view.nr.id"
          :style="{ transform: `translateY(${view.position}px)` }"
          class="vue-recycle-scroller__item-view"
          :class="{ hover: hoverKey === view.nr.key }"
          @mouseenter="hoverKey = view.nr.key"
          @mouseleave="hoverKey = null"
        >
          <slot
            :item="view.item"
            :index="view.nr.index"
            :active="view.nr.used"
          />
        </div>
      </div>
    </div>
  </Scrolly>
</template>

<script>
import { reactive } from 'vue';
import { callWithDelay } from 'js/utils';

import Scrolly from '../Scrolly.vue';

let uid = 0;

function getValFromKey(obj, key) {
  for (const keyChunk of key.split('.')) {
    obj = obj[keyChunk];
  }

  return obj;
}

export default {
  props: {
    items: {
      type: Array,
      required: true
    },

    keyField: {
      type: String,
      default: 'id'
    },

    itemSize: {
      type: Number,
      default: null
    },

    minItemSize: {
      type: [Number, String],
      default: null
    },

    sizeField: {
      type: String,
      default: 'size'
    },

    typeField: {
      type: String,
      default: 'type'
    },

    buffer: {
      type: Number,
      default: 400
    },

    scrollyClass: {
      type: [String, Object, Array]
    },
    scrollyVClass: {
      type: [String, Object, Array]
    },
    lock: {
      type: Boolean
    }
  },

  components: {
    Scrolly
  },

  emits: ['scroll'],

  setup() {
    const state = reactive({
      root: null,
      scrollyRef: null,

      pool: [],
      totalSize: 0,
      hoverKey: null,

      startIndex: 0,
      endIndex: 0,
      views: new Map(),
      unusedViews: new Map(),
      lastUpdateScrollPosition: 0,
      computedMinItemSize: 0,
      continuous: null,
      refreshTimout: null
    });

    return state;
  },

  computed: {
    sizes() {
      if (this.itemSize === null) {
        const sizes = {
          '-1': { accumulator: 0 }
        };
        const { items, minItemSize, sizeField } = this;
        let computedMinSize = 10000;
        let accumulator = 0;
        let current;

        for (let i = 0, l = items.length; i < l; i++) {
          current = items[i][sizeField] || minItemSize;

          if (current < computedMinSize) {
            computedMinSize = current;
          }

          accumulator += current;
          sizes[i] = { accumulator, size: current };
        }

        this.computedMinItemSize = computedMinSize;
        return sizes;
      }

      return [];
    }
  },

  watch: {
    items() {
      this.updateVisibleItems(true);
    },

    sizes: {
      handler() {
        this.updateVisibleItems(false);
      },
      deep: true
    }
  },

  mounted() {
    this.updateVisibleItems(true);

    this.onResize = callWithDelay(() => {
      this.updateVisibleItems(false);
    }, 100);
  },

  activated() {
    window.addEventListener('resize', this.onResize);
  },

  deactivated() {
    window.removeEventListener('resize', this.onResize);
  },

  methods: {
    addView(pool, index, item, key, type) {
      const view = {
        item,
        position: 0,
        nr: {
          id: uid++,
          index,
          used: true,
          key,
          type
        }
      };
      pool.push(view);
      return view;
    },

    unuseView(view, fake = false) {
      const { unusedViews } = this;
      const { type } = view.nr;

      if (!unusedViews.get(type)) {
        unusedViews.set(type, []);
      }

      const unusedPool = unusedViews.get(type);
      unusedPool.push(view);

      if (!fake) {
        view.nr.used = false;
        view.position = -9999;
        this.views.delete(view.nr.key);
      }
    },

    onScroll(event) {
      this.$emit('scroll', event);

      requestAnimationFrame(() => {
        const { continuous } = this.updateVisibleItems(false, true);

        // It seems sometimes chrome doesn't fire scroll event :/
        // When non continous scrolling is ending, we force a refresh
        if (!continuous) {
          clearTimeout(this.refreshTimout);
          this.refreshTimout = setTimeout(this.onScroll.bind(this, event), 100);
        }
      });
    },

    startEndIndex(scroll) {
      const { itemSize, items, sizes } = this;
      const count = items.length;

      if (!count) {
        return {
          startIndex: 0,
          endIndex: 0,
          totalSize: 0
        };
      }

      this.lastUpdateScrollPosition = scroll.start;

      const { buffer } = this;
      scroll.start -= buffer;
      scroll.end += buffer;

      // Variable size mode
      if (itemSize === null) {
        let h;
        let a = 0;
        let b = count - 1;
        let i = ~~(count / 2);
        let oldI;

        // Searching for startIndex
        do {
          oldI = i;
          h = sizes[i].accumulator;

          if (h < scroll.start) {
            a = i;
          } else if (i < count - 1 && sizes[i + 1].accumulator > scroll.start) {
            b = i;
          }

          i = ~~((a + b) / 2);
        } while (i !== oldI);

        if (i < 0) {
          i = 0;
        }

        const startIndex = i;
        const totalSize = sizes[count - 1].accumulator;

        // Searching for endIndex
        let endIndex;
        for (
          endIndex = i;
          endIndex < count && sizes[endIndex].accumulator < scroll.end;
          endIndex++
        );

        if (endIndex === -1) {
          endIndex = count - 1;
        } else {
          endIndex++;

          if (endIndex > count) {
            endIndex = count;
          }
        }

        return {
          startIndex,
          endIndex,
          totalSize
        };
      }

      // Fixed size mode
      return {
        startIndex: Math.max(0, ~~(scroll.start / itemSize)),
        endIndex: Math.min(count, Math.ceil(scroll.end / itemSize)),
        totalSize: count * itemSize
      };
    },

    updateVisibleItems(checkItem, checkPositionDiff = false) {
      const { itemSize, typeField, keyField, items, sizes, pool, views, unusedViews } = this;
      const minItemSize = this.computedMinItemSize;
      const count = items.length;
      const scroll = this.getScroll();

      // Skip update if user hasn't scrolled enough
      if (count && checkPositionDiff) {
        const positionDiff = Math.abs(scroll.start - this.lastUpdateScrollPosition);

        if ((itemSize === null && positionDiff < minItemSize) || positionDiff < itemSize) {
          return { continuous: true };
        }
      }

      const { startIndex, endIndex, totalSize } = this.startEndIndex(scroll);
      this.totalSize = totalSize;

      const continuous = startIndex <= this.endIndex && endIndex >= this.startIndex;
      let view;

      if (this.continuous !== continuous) {
        if (continuous) {
          views.clear();
          unusedViews.clear();
          for (let i = 0, l = pool.length; i < l; i++) {
            view = pool[i];
            this.unuseView(view);
          }
        }

        this.continuous = continuous;
      } else if (continuous) {
        for (let i = 0, l = pool.length; i < l; i++) {
          view = pool[i];
          if (view.nr.used) {
            // Update view item index
            if (checkItem) {
              view.nr.index = items.findIndex((item) => (
                keyField
                  ? getValFromKey(item, keyField) === getValFromKey(view.item, keyField)
                  : item === view.item
              ));
            }

            // Check if index is still in visible range
            if (
              view.nr.index === -1 ||
              view.nr.index < startIndex ||
              view.nr.index >= endIndex
            ) {
              this.unuseView(view);
            }
          }
        }
      }

      const unusedIndex = continuous ? null : new Map();

      for (let i = startIndex; i < endIndex; i++) {
        const item = items[i];
        const key = keyField ? getValFromKey(item, keyField) : item;

        if (key == null) {
          throw new Error(`Key is ${key} on item (keyField is '${keyField}')`);
        }

        view = views.get(key);

        if (!itemSize && !sizes[i].size) {
          if (view) {
            this.unuseView(view);
          }

          continue;
        }

        // No view assigned to item
        if (!view) {
          const type = item[typeField];
          let unusedPool = unusedViews.get(type);

          if (continuous) {
            // Reuse existing view
            if (unusedPool && unusedPool.length) {
              view = unusedPool.pop();
              view.item = item;
              view.nr.used = true;
              view.nr.index = i;
              view.nr.key = key;
              view.nr.type = type;
            } else {
              view = this.addView(pool, i, item, key, type);
            }
          } else {
            // Use existing view
            // We don't care if they are already used
            // because we are not in continous scrolling
            const v = unusedIndex.get(type) || 0;

            if (!unusedPool || v >= unusedPool.length) {
              view = this.addView(pool, i, item, key, type);
              this.unuseView(view, true);
              unusedPool = unusedViews.get(type);
            }

            view = unusedPool[v];
            view.item = item;
            view.nr.used = true;
            view.nr.index = i;
            view.nr.key = key;
            view.nr.type = type;
            unusedIndex.set(type, v + 1);
          }
          views.set(key, view);
        } else {
          view.nr.used = true;
          view.item = item;
        }

        // Update position
        if (itemSize === null) {
          view.position = sizes[i - 1].accumulator;
        } else {
          view.position = i * itemSize;
        }
      }

      this.startIndex = startIndex;
      this.endIndex = endIndex;

      return { continuous };
    },

    getScroll() {
      const { viewport } = this.scrollyRef;
      const scrollState = {
        start: viewport.scrollTop,
        end: viewport.scrollTop + viewport.clientHeight
      };

      return scrollState;
    }
  }
};
</script>

<style>
.vue-recycle-scroller {
  position: relative;
}

.vue-recycle-scroller__item-wrapper {
  box-sizing: border-box;
}

.vue-recycle-scroller .vue-recycle-scroller__item-view {
  position: absolute;
  will-change: transform;
}

.vue-recycle-scroller .vue-recycle-scroller__item-view {
  width: 100%;
}
</style>
