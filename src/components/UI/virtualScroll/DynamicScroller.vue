<template>
  <Scrolly
    ref="scrolly"
    @scroll="onScroll"
  >
    <div class="dynamic_scroller" :style="{ height: viewportHeight + 'px' }">
      <div ref="spacer" :class="vclass" :style="{ transform: 'none' || `translateY(${translateY}px)` }">
        <slot :startIndex="startIndex" :endIndex="endIndex" />
      </div>
    </div>
  </Scrolly>
</template>

<script>
import { throttle } from 'js/utils';

import Scrolly from '../Scrolly.vue';

const PAGE_SIZE = 10;

// TODO если чел уже вышел из беседы, то создать планирование пересчета измененных элементов

function binarySearch(arr, x) {
  let low = 0;
  let high = Array.isArray(arr)
    ? arr.length - 1
    : Object.keys(arr).length - 1;
  let mid;

  while (low < high) {
    mid = Math.floor((high + low) / 2);

    // Check if x is present at middle position
    if (arr[mid] === x) {
      break;
    } else if (arr[mid] > x) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  mid = Math.floor((high + low) / 2);

  return x <= arr[mid]
    ? mid
    : mid + 1;
}

function findStartNode(scrollTop, nodePositions, itemCount) {
  let startRange = 0;
  let endRange = itemCount - 1;

  while (endRange !== startRange) {
    const middle = Math.floor((endRange - startRange) / 2 + startRange);

    if (
      nodePositions[middle] <= scrollTop &&
      nodePositions[middle + 1] > scrollTop
    ) {
      return middle;
    }

    if (middle === startRange) {
      // edge case - start and end range are consecutive
      return endRange;
    } if (nodePositions[middle] <= scrollTop) {
      startRange = middle;
    } else {
      endRange = middle;
    }
  }

  return itemCount;
}

export default {
  props: ['items', 'vclass'],

  components: {
    Scrolly
  },

  setup() {
    return {
      scrolly: null,
      // Index of the starting page, each page has PAGE_SIZE items
      pageStartIndex: 0,
      // Index of the first list item on DOM
      startIndex: 0,
      endIndex: PAGE_SIZE,
      // Height of each row
      heights: [],
      // Total height per page
      // On page 0 , lets say all PAGE_SIZE rows add up to 2000
      // On page 1, lets say all PAGE_SIZE rows add up to 2500, then
      // rollingPageHeights: [2000, 4500]
      // page 1 = page 0 height of PAGE_SIZE items + page 1 height of PAGE_SIZE items
      rollingPageHeights: [],
      // Height of the smallest row
      smallestRowHeight: Number.MAX_SAFE_INTEGER,
      // How much to shift the spacer vertically so that the scrollbar is not disturbed when
      // hiding items
      translateY: 0,
      // Height of the outermost div inside which all the list items are present
      rootHeight: 0,
      // Total height of all the rows of all the pages
      viewportHeight: 0,
      // Current scroll position
      scrollTop: 0
    };
  },

  computed: {
    /**
      If the current page is 0, take a slice of the heights of all rows from index 0 to 49
      If the current page is 1, the slice goes from index 50 to 99

      We need the total height till the end of wherever we will scroll to
      Let's say we have scrolled 2 pages down, page 0 and page 1
      Page 0 had 50 rows with a height of 2000 px
      For page 0, total height is 2000px
      Page 1 had 50 rows with a height of 2500 px
      For page 1, total height is 2000 + 2500 = 4500px and this goes on increasing with each page
      rollingPageHeights currently would contain an array [2000, 4500]
      For any scroll top less than 2000, we know that we are on page 0 now

      Now we try to find how far each row is from the top of its current page
      If page 0 has 50 rows with heights say 25 30 35 40 ...
      Row 1 of page 0 is 0 from top of page 0
      Row 2 of page 0 is 25 from top of page 0
      Row 3 of page 0 is 25 + 30 = 55 from top of page 0
      Row 4 of page 0 is 25 + 30 + 35 = 90 from top of page 0
      If page 1 has 50 rows with heights 25 30 35 40, remember that page 1 itself is 2000px from
        top of the viewport
      Row 0 of page 1 is 0 + 2000 from top of page 1
      Row 1 of page 1 is 25 + 2000 = 2025 from top of page 1
      Row 2 of page 1 is 25 + 30 + 2000 = 2055 from top of page 1
      Row 3 of page 1 is 25 + 30 + 35 + 2000 = 2090 from top of page 1
      We ll get a bunch of ever increasing numbers for a given page and we need to find out where
        the scroll top lies to identify the start index
    */
    rowPositions() {
      const currentHeights = this.heights.slice(
        this.pageStartIndex * PAGE_SIZE,
        (this.pageStartIndex + 1) * PAGE_SIZE
      );
      const displacements = [];
      let totalDisplacement = this.rollingPageHeights[this.pageStartIndex - 1] || 0;

      for (let i = 0; i < currentHeights.length; i++) {
        displacements.push(totalDisplacement);
        totalDisplacement += currentHeights[i];
      }

      displacements.push(totalDisplacement);

      return displacements;
    },

    /**
      Subset of list items rendered on the DOM
    */
    visibleItems() {
      return this.items.slice(this.startIndex, this.endIndex);
    }
  },

  methods: {
    scrollTo(index) {
      const pageStartIndex = Math.floor(index / PAGE_SIZE);

      const currentHeights = this.heights.slice(
        pageStartIndex * PAGE_SIZE,
        (pageStartIndex + 1) * PAGE_SIZE
      );
      let totalDisplacement = this.rollingPageHeights[pageStartIndex - 1] || 0;
      const displacements = [];

      for (let i = 0; i < currentHeights.length; i++) {
        displacements.push(totalDisplacement);
        totalDisplacement += currentHeights[i];
      }

      displacements.push(totalDisplacement);

      // console.log(
      //   pageStartIndex,
      //   this.rollingPageHeights[pageStartIndex],
      //   this.heights.slice(pageStartIndex * PAGE_SIZE, (pageStartIndex + 1) * PAGE_SIZE),
      //   displacements[index]
      // );

      const top = displacements[index % PAGE_SIZE];
      const isVisible = top >= this.scrollTop && top <= this.scrollTop + this.$el.offsetHeight;

      if (!isVisible) {
        this.$el.scrollTo({
          left: 0,
          top: displacements[index % PAGE_SIZE],
          behavior: 'smooth'
        });
      }
    },

    update() {
      const normalChildren = [].slice.call(this.$refs.spacer.children).filter(
        (child) => child.__vnode.props.scrollerItem
      );

      for (const index in normalChildren) {
        const child = normalChildren[index];
        const height = child.scrollHeight;

        this.heights[index] = height;

        if (height < this.smallestRowHeight) {
          this.smallestRowHeight = height;
        }

        // Given an item index, compute the page index
        // For example, any item index from 0 to 40 would translate to page index 0
        // Any item with index 50 to 99 would translate to page index 1
        const pageIndex = Math.floor(index / PAGE_SIZE);

        if (!this.rollingPageHeights[pageIndex]) {
          if (pageIndex === 0) {
            this.rollingPageHeights[pageIndex] = 0;
          } else {
            this.rollingPageHeights[pageIndex] = this.rollingPageHeights[pageIndex - 1];
          }
        }

        // Add the height of the row to the total height of all rows on the current page
        this.rollingPageHeights[pageIndex] += height;
      }

      this.rootHeight = this.$el.offsetHeight;
      // Total height of the viewport is the sum of heights of all the rows on all the pages
      //   currently stored at the last index of page positions
      // For our example with page 0 of 2000px and page 1 of 2500px, the rollingPageHeights array
      //   looks like [2000, 4500]
      // Viewport height = 4500px
      this.viewportHeight = this.rollingPageHeights[this.rollingPageHeights.length - 1];
    },

    onScroll: throttle(function() {
      this.scrollTop = this.scrolly.viewport.scrollTop;

      /**
        We just need a start index and an end index based on our current scroll top to decide which
          subset of the items to render
        We also need to take care that the translateY value is according to our start index
        There are multiple ways of doing this, feel free to try any of the methods our or comment to
          suggest a better method if you know
        Let us again take the example of 2 pages 2000px and 2500px
        rollingPageHeights: [2000, 4500]

        Do a binary search for the start index
        The end index can be calculated either via binary search or from the start index using
          the formula below
        endIndex = startIndex + Math.floor(container height / smallest row height)
      */

      this.pageStartIndex = binarySearch(
        this.rollingPageHeights,
        this.scrollTop
      );

      const startNodeIndex = Math.max(
        0,
        findStartNode(
          this.scrollTop,
          this.rowPositions,
          this.rowPositions.length
        )
      );
      this.startIndex = this.pageStartIndex * PAGE_SIZE + startNodeIndex;

      this.endIndex =
        this.startIndex + Math.floor(this.rootHeight / this.smallestRowHeight);

      this.translateY = this.rowPositions[startNodeIndex];
    }, 17)
  },

  watch: {
    items() {
      this.update();
    }
  },

  mounted() {
    const resizeObserver = new ResizeObserver((entries) => {
      this.rootHeight = entries[0].contentRect.height;
    });

    resizeObserver.observe(this.$el);
  }
};
</script>

<style>
.dynamic_scroller {
  min-height: 100%;
}
</style>
