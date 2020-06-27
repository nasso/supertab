<script>
  import { onMount, onDestroy } from 'svelte';
  import { spring } from 'svelte/motion';

  export let split = "none";
  export let content = [];
  export let view = x => { return { title: "Untitled", component: x }; };
  export let gaps = 4;
  export let separator_size = 8;

  let my_width;
  let my_height;
  let split_loc = 200;
  $: half_gaps = gaps / 2;
  $: half_seps = separator_size / 2;

  onMount(() => {
    split_loc = (split === "vertical" ? my_height : my_width) / 2;
  });

  function to_props(content) {
    if (typeof content === "object" && content.split) {
      return {
        split: content.split,
        content: content.content,
        view: content.view ? content.view : view,
        gaps,
        separator_size,
      };
    } else {
      return {
        split: "none",
        content,
        view,
        gaps,
        separator_size,
      };
    }
  }

  let resizing = false;

  function sepMousedown(e) {
    if (resizing || e.button !== 0)
      return;
    e.preventDefault();
    resizing = true;
  }

  let tabs = [];
  let cur_tab = 0;
  let tab_move_start = { x: 0, y: 0 };
  let tab_move = spring({ x: 0, y: 0 });
  let moving_tab = false;

  $: if (split !== "vertical" && split !== "horizontal") {
    if (Array.isArray(content)) {
      tabs = content.map(tab => view(tab));
    } else {
      tabs = [view(content)];
    }
  }

  function tabMousedown(e, i) {
    if (e.button !== 0)
      return;
    cur_tab = i;
    moving_tab = true;
    tab_move_start.x = e.pageX;
    tab_move_start.y = e.pageY;
  }

  function winMouseup(e) {
    if (e.button !== 0)
      return;
    e.preventDefault();
    resizing = false;

    if (moving_tab) {
      moving_tab = false;
      tab_move.set({ x: 0, y: 0 });
    }
  }

  function winMousemove(e) {
    if (resizing) {
      switch (split) {
        case "vertical":
          split_loc += e.movementY;
          break;
        case "horizontal":
          split_loc += e.movementX;
          break;
      }
    }

    if (moving_tab) {
      tab_move.set({
        x: e.pageX - tab_move_start.x,
        y: 0,
      });
    }
  }
</script>

<style>
  .container {
    display: inline-block;
    position: absolute;
    top: 0px;
    left: 0px;
    bottom: 0px;
    right: 0px;
  }

  .pane, .separator {
    display: inline-block;
    position: absolute;
  }

  .separator {
    background: #000;
    opacity: 0.0;
    transition: opacity 200ms;
    z-index: 2;
  }

  .separator:hover, .separator.resizing {
    opacity: 1.0;
  }

  .container.vertical > .pane, .container.vertical > .separator {
    left: 0px;
    right: 0px;
  }

  .container.horizontal > .pane, .container.horizontal > .separator {
    top: 0px;
    bottom: 0px;
  }

  .container.vertical > .separator {
    cursor: row-resize;
  }

  .container.horizontal > .separator {
    cursor: col-resize;
  }

  .container.nosplit > nav {
    overflow: hidden;
    height: 32px;

    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
  }

  .container.nosplit > nav > .tab {
    background: #181818;
    border: none;
    color: #eee;
    height: 28px;
    border-radius: 8px;
    padding: 0px 24px;
    margin-right: 4px;
    position: relative;

    display: flex;
    align-items: center;

    transition:
      height 100ms,
      border-radius 100ms,
      background 100ms,
      box-shadow 100ms;
  }

  .container.nosplit > nav > .tab > .label {
    font-size: 13px;
  }

  .container.nosplit > nav > .tab.current {
    background: #222;
    height: 32px;
    border-radius: 8px 8px 0px 0px;
    box-shadow: 0px 10px #222;

    z-index: 1;
  }

  .container.nosplit > nav > .tab::before,
  .container.nosplit > nav > .tab::after {
    content: '';

    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 0px 0px 0px 0px;

    position: absolute;
    bottom: 0px;

    transform: translateY(4px) scale(0);
    opacity: 0.0;

    transition: transform 100ms, opacity 100ms;
  }

  .container.nosplit > nav > .tab.current::before,
  .container.nosplit > nav > .tab.current::after {
    transform: translateY(0px) scale(1);
    opacity: 1.0;
  }

  .container.nosplit > nav > .tab::before {
    left: -10px;
    background: url("/Supertab/inv_rad_l.svg");
    transform-origin: bottom right;
  }

  .container.nosplit > nav > .tab::after {
    right: -10px;
    background: url("/Supertab/inv_rad_r.svg");
    transform-origin: bottom left;
  }

  .container.nosplit > .pane {
    text-align: center;
    background: #222;
    border-radius: 8px;
    top: 32px;
    left: 0px;
    bottom: 0px;
    right: 0px;

    transition: border-radius 100ms;
  }

  .container.nosplit > .pane.first_is_current {
    border-radius: 0px 8px 8px 8px;
  }
</style>

<svelte:window on:mousemove={winMousemove} on:mouseup={winMouseup} />

<div
  class="container"
  class:vertical={split === "vertical"}
  class:horizontal={split === "horizontal"}
  class:nosplit={split !== "vertical" && split !== "horizontal"}
  bind:clientWidth={my_width}
  bind:clientHeight={my_height}
>
  {#if split === "vertical"}
    <div class="pane" style="top: 0px; bottom: {my_height - split_loc + half_gaps}px">
      <svelte:self {...to_props(content[0])} />
    </div>
    <div class="pane" style="top: {split_loc + half_gaps}px; bottom: 0px">
      <svelte:self {...to_props(content[1])} />
    </div>
    <div
      on:mousedown={sepMousedown}
      class="separator"
      class:resizing
      style="top: {split_loc - half_seps}px; bottom: {my_height - split_loc - half_seps}px;"
    ></div>
  {:else if split === "horizontal"}
    <div class="pane" style="left: 0px; right: {my_width - split_loc + half_gaps}px">
      <svelte:self {...to_props(content[0])} />
    </div>
    <div class="pane" style="left: {split_loc + half_gaps}px; right: 0px">
      <svelte:self {...to_props(content[1])} />
    </div>
    <div
      on:mousedown={sepMousedown}
      class="separator"
      class:resizing
      style="left: {split_loc - half_seps}px; right: {my_width - split_loc - half_seps}px;"
    ></div>
  {:else}
    <nav>
      {#each tabs as tab, i}
        <div
          class="tab"
          class:current={i === cur_tab}
          style={ i !== cur_tab ? '' :
            `transform: translate(${$tab_move.x}px, ${$tab_move.y}px)`
          }
          on:mousedown={e => tabMousedown(e, i)}
        >
          <span class="label">{tab.title}</span>
        </div>
      {/each}
    </nav>
    <div class="pane" class:first_is_current={cur_tab === 0}>
      <svelte:component this={tabs[cur_tab].component} />
    </div>
  {/if}
</div>
