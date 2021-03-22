<template>
  <Scrolly
    ref="scrolly"
    :lock="lockScroll"
    @scroll="onScroll"
  >
    <div :style="{ height: viewportHeight + 'px' }">
      <div ref="spacer" :class="vclass" :style="{ transform: `translateY(${translateY}px)` }">
        <slot :startIndex="startIndex" :endIndex="endIndex" />
      </div>
    </div>
  </Scrolly>
</template>

<script>
import { throttle } from 'js/utils';

import Scrolly from '../Scrolly.vue';

const PAGE_SIZE = 50;

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
  props: ['items', 'lockScroll', 'vclass'],

  components: {
    Scrolly
  },

  setup() {
    return {
      scrolly: null
    };
  },

  data: () => ({
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
  }),

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
      const { children } = this.$refs.spacer;

      for (const index in [].slice.call(children)) {
        const child = children[index];

        // Get the scroll height and update the height of the item at index
        const height = child.scrollHeight;
        this.heights[index] = height;
        // Update the smallest row height
        this.smallestRowHeight = height < this.smallestRowHeight
          ? height
          : this.smallestRowHeight;
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
      this.viewportHeight = this.rollingPageHeights[
        this.rollingPageHeights.length - 1
      ];
    },

    onScroll: throttle(function() {
      this.scrollTop = this.$el.scrollTop;
    }, 17)
  },

  watch: {
    items() {
      this.update();
    },

    /**
      We just need a start index and an end index based on our current scroll top to decide which
        subset of the items to render
      We also need to take care that the translateY value is according to our start index
      There are multiple ways of doing this, feel free to try any of the methods our or comment to
        suggest a better method if you know
      Let us again take the example of 2 pages 2000px and 2500px
      rollingPageHeights: [2000, 4500]

      Method 1
      Using the scroll top, get the current page index
      pageStartIndex = 0 if scroll top < 2000
      startIndex = 0 x 50 = 0
      pageStartIndex = 1 if scroll top >= 2000 and scroll top <= 4500
      startIndex = 1 x 50 = 50
      and so on...
      End index for this combination can be calculated in many ways
      One simple way is start index + 50
      At page 0 we translate by 0 px
      At page 1 we translate by height of page 0 = 2000px and so on
      The change from 0 50 in the start index is rather abrupt and you can observe a flicker if
        going by this route
      Also since the end index does not change, when you are at item 45, you can only see 5 more
        items because you ll have to scroll beyond 50 to see the next 50 items
      If the height of the page is more than 50 items, we have a problem in this approach
      startIndex = pageStartIndex * PAGE_SIZE
      endIndex = startIndex + PAGE_SIZE
      translateY = rollingPageHeights[pageStartIndex - 1] || 0 (for the 0th page)
      This method does NOT give a smooth scrolling experience because when you reach the end of
        the page, blank space is seen until you scroll beyond and the next page is loaded

      Method 2
      Here we are talking about a different method that involves guesstimating startIndex
      Take 10 rows of different heights and their respective displacements from the top of the
        current page
      10px => 0
      20px => 0 + 10 = 10
      30px => 10 + 20 = 30
      40px => 10 + 20 + 30 = 60
      35px => 10 + .. + 40 = 100
      30px => 10 + .. + 35 = 135
      25px => 10 + .. + 30 = 165
      20px => 10 + .. + 25 = 190
      35px => 10 + .. + 20 = 210
      30px => 10 + .. + 35 = 245
           => 10 + .. + 30 = 275
      Given a scroll top we just need to find the start index
      When the scroll top is below 10 we know that row 0 is at the top
      We can find this by doing a binary search or a better alternative
      We simply take the scroll top and integer divide by the largest item
      It will always give a start index slighly above the scroll top

      For example, let's say scroll top is 91 and largest row height is 40

      startIndex = Math.floor(scrollTop / largest row height)
      startIndex = Math.floor(91 / 40) = 2

      If you did a binary search, 91 lies between 60 and 100 so the row start index could be
        either 3 or 4 depending on how you round it
      But we arrived at a number 2 quickly without doing any search didn't we? That is the beauty
        of this method, its a O(1) operation instead of binary search which is O(logN)
      The end index can be obtained by doing the exact opposite, which is to take the scroll top
        and height of the root element and dividing that by the smallest number
      If the height of the root container is 100px and current scroll is the same

      endIndex = Math.floor((scrollTop + container height) / smallest row height)
      endIndex = Math.floor((91 + 100) / 10) = 19

      Another way of calculating the endIndex would be

      endIndex = startIndex + Math.floor(container height / smallest row height)
      = 2 + Math.floor(100 / 10) = 12

      As the scroll top is 91 and the total height of the visible area is 100 px, the user can see
        upto 191 px on screen
      Any of the above ways of calculating the end index should give you an end index that lies
        well beyond the visible area
      If you did a binary search to find where the end index lies, your value 191 lies between
        positions 7 and 8 depending on how you round it
      But we did it in O(1) time without a binary search
      Now all we need to do is apply the translate properly, our start index is 2, so we are
        starting at the row at index 2 which is 30px tall, translate is 10 + 20 = 30px
      The only problem is that as we scroll down and down, the start and end index starts getting
        further and further apart and more and more items are rendered on the DOM
      translateY = rowPositions[startIndex]

      The solution to this problem is to adjust the start and end index on each
      Take the example of 2 pages

      Page 0
      10px => 0
      20px => 0 + 10 = 10
      30px => 10 + 20 = 30
      40px => 10 + 20 + 30 = 60
      35px => 10 + .. + 40 = 100
      30px => 10 + .. + 35 = 135
      25px => 10 + .. + 30 = 165
      20px => 10 + .. + 25 = 190
      35px => 10 + .. + 20 = 210
      30px => 10 + .. + 35 = 245
           => 10 + .. + 30 = 275
      Total height of page 0 = 10 + .. + 30 = 275px

      Page 1
      20px => 275
      25px => 275 + 20 = 295
      30px => 275 + 20 + 25 = 320
      35px => 275 + .. + 30 = 350
      35px => 275 + .. + 35 = 385
      40px => 275 + .. + 35 = 420
      30px => 275 + .. + 40 = 460
      15px => 275 + .. + 30 = 490
      30px => 275 + .. + 15 = 505
      15px => 275 + .. + 30 = 535
           => 275 + .. + 15 = 550
      Total height of page 1 = 275px
      Total height till the end of page 1 = 275 + 275 = 550px

      Let us say the scroll top is currently at 325 and container height is 100px

      Without adjustment

      startIndex = Math.floor(scrollTop / largest row height)
      startIndex = Math.floor(325 / 40) = 8, row 8 is actually on Page 0

      endIndex = Math.floor((scrollTop + container height) / smallest row height)
      endIndex = Math.floor((325 + 100) / 10) = 42 which is not even there!

      If we use the previous technique of calculating the endIndex directly from the startIndex

      endIndex = startIndex + Math.floor(container height / smallest row height)
      endIndex = 8 + Math.floor((325 + 100) / 100)

      As we scroll further and further, the DRIFT gets higher and higher

      With adjustment

      We know that the 1st 275px is of page 0 and has  10 rows, all we need to do is remove this
        from the current calculation

      startIndex = total number of rows before current page +
        Math.floor((scrollTop - total height of all rows before current page) / largest row height)
      startIndex = 10 rows of page 0 + Math.floor((325 - 275 px of page 0) / 40)	= 11

      endIndex = total number of rows before current page + Math.floor(
        (scrollTop + container height - total height of all rows before current page)
        \/ smallest row height
      )
      endIndex = 10 + Math.floor((325 + 100 - 275) / 10) = 25

      If we use the previous technique of calculating the endIndex directly from the startIndex

      endIndex = startIndex + Math.floor(container height / smallest row height)
      endIndex = 11 + Math.floor(100 / 10) = 21

      The translate in this method is not applied properly and what I observed is the spacer keeps
        moving higher and higher and we see an increasing amount of blank space as we scroll down
        till the entire page is blank

      Method 3
      Do a binary search for the start index
      The end index can be calculated either via binary search or from the start index using
        the formula below
      endIndex = startIndex + Math.floor(container height / smallest row height)

      This is the method currently USED
    */
    scrollTop() {
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
    }
  },

  mounted() {
    // https://stackoverflow.com/questions/641857/javascript-window-resize-event/641874#641874
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        console.log('Element:', entry.target, cr);
        this.rootHeight = cr.height;
      }
    });

    resizeObserver.observe(this.$el);
  }
};
</script>
