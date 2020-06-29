<script>
  import { onMount, onDestroy } from 'svelte';
  import { flip } from 'svelte/animate';
  import { spring } from 'svelte/motion';
  import { supertab_dragging } from './stores.mjs';

  export let editable = false;
  export let split = "none";
  export let content = [];
  export let view = x => { return { title: "Untitled", component: x }; };
  export let gaps = 4;
  export let separator_size = 8;

  // initialize content
  {
    if (!Array.isArray(content))
      content = [content];

    let uid = 0;
    content = content.map(value => {
      return {
        uid: uid++,
        value,
      };
    });
  }

  let my_width;
  let my_height;
  let split_loc = 200;
  $: half_gaps = gaps / 2;
  $: half_seps = separator_size / 2;

  onMount(() => {
    split_loc = (split === "vertical" ? my_height : my_width) / 2;
  });

  function to_props(content) {
    let value = content.value;

    if (typeof value === "object" && value.split) {
      return {
        split: value.split,
        content: value.content,
        view: value.view ? value.view : view,
        gaps,
        separator_size,
        editable,
      };
    } else {
      return {
        split: "none",
        content: value,
        view,
        gaps,
        separator_size,
        editable,
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

  let pane_docks = [
    { side: "top", active: false },
    { side: "bottom", active: false },
    { side: "right", active: false },
    { side: "left", active: false },
  ];
  let tabs = [];
  let tabs_el = [];
  let cur_tab = 0;
  let cur_tab_rect = { x: 0, y: 0, width: 0, height: 0 };
  let tab_ghost;
  let tab_ghost_enabled;
  let tab_ghost_tab;
  let tab_move_local = { x: 0, y: 0 };
  let tab_ghost_origin = { x: 0, y: 0 };
  let tab_ghost_xform = spring({ x: 0, y: 0 });
  let dragging_tab = false;

  $: if (split !== "vertical" && split !== "horizontal") {
    tabs = content.map(tab => {
      return {
        uid: tab.uid,
        content_name: tab.value,
        ...view(tab.value)
      };
    });
  }

  function tabMousedown(e, i) {
    if (e.button !== 0)
      return;
    cur_tab = i;

    let rect = tabs_el[cur_tab].getBoundingClientRect();

    cur_tab_rect = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };

    tab_move_local.x = e.clientX - cur_tab_rect.x;
    tab_move_local.y = e.clientY - cur_tab_rect.y;

    dragging_tab = true;

    tab_ghost_xform.stiffness = tab_ghost_xform.damping = 1.0;
    tab_ghost_origin.x = cur_tab_rect.x;
    tab_ghost_origin.y = cur_tab_rect.y;
    tab_ghost_xform.set({
      x: e.clientX - tab_move_local.x,
      y: e.clientY - tab_move_local.y,
    });
  }

  function tabDragstart(e) {
    if (e.target !== tabs_el[cur_tab])
      return;

    // transparent image to disable drag image
    let img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.setData("application/x-supertab", tabs[cur_tab].content_name);

    supertab_dragging.set(true);

    // content = [...content.slice(0, cur_tab), ...content.slice(cur_tab + 1)];
    // cur_tab = Math.max(cur_tab - 1, 0);
  }

  function handleAnyMouseMove(x, y) {
    if (!dragging_tab)
      return;

    if (!tab_ghost_enabled) {
      tab_ghost_enabled = true;

      tab_ghost_tab = tabs[cur_tab];
    }

    tab_ghost_xform.set({
      x: x - tab_move_local.x,
      y: y - tab_move_local.y,
    });
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

    handleAnyMouseMove(e.clientX, e.clientY);
  }

  function winDragover(e) {
    handleAnyMouseMove(e.clientX, e.clientY);
  }

  function winMouseup(e) {
    if (e.button !== 0)
      return;
    e.preventDefault();
    resizing = false;

    if (dragging_tab) {
      dragging_tab = false;
      tab_ghost_enabled = false;

      tab_ghost_xform.stiffness = tab_ghost_xform.damping = 0.8;
      tab_ghost_xform.set({
        ...tab_ghost_origin
      });
    }
  }

  function winDragend(e) {
    if (dragging_tab) {
      dragging_tab = false;
      tab_ghost_enabled = false;

      supertab_dragging.set(false);
      tab_ghost_xform.stiffness = tab_ghost_xform.damping = 0.8;
      tab_ghost_xform.set({
        ...tab_ghost_origin
      });
    }
  }

  function dropzoneDragover(e, i, is_dock) {
    e.preventDefault();
  }

  function dropzoneDragenter(e, i, is_dock) {
    if (is_dock) {
      pane_docks[i].active = true;
    }
  }

  function dropzoneDragleave(e, i, is_dock) {
    if (is_dock) {
      pane_docks[i].active = false;
    }
  }

  function dropzoneDrop(e, i, is_dock) {
    if (is_dock) {
      pane_docks[i].active = false;
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

  .pane {
    overflow: hidden;
  }

  .pane, .separator {
    display: inline-block;
    position: absolute;
  }

  .separator {
    background: #000;
    opacity: 0.0;
    transition: opacity 200ms;
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

  .tab_ghost {
    pointer-events: none;
    position: fixed;
    top: 0px;
    left: 0px;
    opacity: 0.0;

    z-index: 1;

    transition: opacity 100ms, box-shadow 100ms;
  }

  .tab_ghost.enable {
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.5);
    opacity: 1.0;
  }

  .container.nosplit > nav > .tab, .tab_ghost {
    background: #181818;
    color: #eee;
    height: 28px;
    border-radius: 8px;
    padding: 0px 24px;

    display: inline-flex;
    align-items: center;
  }

  .container.nosplit > nav > .tab {
    position: relative;
    margin-right: 4px;

    transition:
      height 100ms,
      border-radius 100ms,
      background 100ms,
      box-shadow 100ms,
      opacity 100ms;
  }

  .container.nosplit > nav > .tab.dragged {
    opacity: 0.0;
  }

  .container.nosplit > nav > .tab > .label, .tab_ghost > .label {
    font-size: 13px;
  }

  .container.nosplit > nav > .tab.current, .tab_ghost {
    background: #222;
  }

  .container.nosplit > nav > .tab.current:not(.dragged) {
    box-shadow: 0px 10px #222;
    border-radius: 8px 8px 0px 0px;
    height: 32px;
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

  .container.nosplit > nav > .tab.current:not(.dragged)::before,
  .container.nosplit > nav > .tab.current:not(.dragged)::after {
    transform: translateY(0px) scale(1);
    opacity: 1.0;
  }

  .container.nosplit > nav > .tab::before {
    left: -10px;
    background: url("../Supertab/inv_rad_l.svg");
    transform-origin: bottom right;
  }

  .container.nosplit > nav > .tab::after {
    right: -10px;
    background: url("../Supertab/inv_rad_r.svg");
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

  .dropzone {
    display: inline-block;
    position: absolute;

    background: black;
    border-radius: 8px;
    border: 1px dashed white;
    opacity: 0.0;
    pointer-events: none;

    transition: transform 200ms, opacity 200ms;
  }

  .dropzone.enabled {
    pointer-events: initial;
  }

  .dropzone.active {
    opacity: 0.2;
  }

  .dropzone.top, .dropzone.bottom {
    height: 30%;
    left: 0px;
    right: 0px;
  }

  .dropzone.left, .dropzone.right {
    top: 0px;
    bottom: 0px;
    width: 30%;
  }

  .dropzone.top {
    top: 0px;
  }

  .dropzone.right {
    right: 0px;
  }

  .dropzone.bottom {
    bottom: 0px;
  }

  .dropzone.left {
    left: 0px;
  }
</style>

<svelte:window
  on:mousemove={winMousemove}
  on:mouseup={winMouseup}
  on:dragover={winDragover}
  on:dragend={winDragend}
/>

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
      {#each tabs as tab, i (tab.uid) }
        <div
          class="tab"
          class:current={i === cur_tab}
          class:dragged={i === cur_tab && tab_ghost_enabled && tab_ghost_tab && tab_ghost_tab.uid == tab.uid}
          draggable={editable}
          bind:this={tabs_el[i]}
          on:mousedown={e => tabMousedown(e, i)}
          on:dragstart={tabDragstart}
          animate:flip={{duration: 500}}
        >
          <span class="label">{tab.title}</span>
        </div>
      {/each}
    </nav>
    <div class="pane" class:first_is_current={tabs.length > 0 && cur_tab === 0}>
      {#if tabs.length === 0}
        <div></div>
      {:else}
        <svelte:component this={tabs[cur_tab].component} />
      {/if}
    </div>
    {#each pane_docks as dock, i}
      <div
        on:dragover={e => dropzoneDragover(e, i, true)}
        on:dragenter={e => dropzoneDragenter(e, i, true)}
        on:dragleave={e => dropzoneDragleave(e, i, true)}
        on:drop={e => dropzoneDrop(e, i, true)}
        class="dropzone {dock.side}"
        class:active={dock.active}
        class:enabled={$supertab_dragging}
      ></div>
    {/each}
    <div
      class="tab_ghost"
      class:enable={tab_ghost_enabled}
      bind:this={tab_ghost}
      style={`transform: translate(${$tab_ghost_xform.x}px, ${$tab_ghost_xform.y}px);`}
    >
      <span class="label">{tab_ghost_tab ? tab_ghost_tab.title : ""}</span>
    </div>
  {/if}
</div>
