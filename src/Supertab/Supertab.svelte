<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { spring } from 'svelte/motion';
  import { supertab_dragging, makeContentsFromLayout } from './common.mjs';

  export let editable = false;
  export let gaps = 4;
  export let separator_size = 8;
  export let makeView = x => { return { title: "Untitled", component: x }; };
  export let layout = null;
  export let contents;

  $: if (layout !== null) {
    contents = makeContentsFromLayout(layout);
  }

  let root_el;
  let root_width = 0;
  let root_height = 0;
  $: half_gaps = gaps / 2;
  $: half_seps = separator_size / 2;

  $: split_loc_px = contents.split ? contents.split.position * (contents.split.orientation === "horizontal" ? root_width : root_height) : 0;

  function pane_props(i) {
    return {
      editable,
      gaps,
      separator_size,
      makeView,
      contents: contents.panes[i],
    };
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
  let cur_tab = 0;
  let cur_tab_rect = { x: 0, y: 0, width: 0, height: 0 };
  let tab_ghost;
  let tab_ghost_enabled;
  let tab_ghost_tab;
  let tab_move_local = { x: 0, y: 0 };
  let tab_ghost_origin = { x: 0, y: 0 };
  let tab_ghost_xform = spring({ x: 0, y: 0 });
  let clicked_tab = null;

  $: tabs = !contents.tabs ? [] :
    contents.tabs.map(tab => {
      return {
        uid: tab.uid,
        view_name: tab.view,
        dragged_out: false,
        dragged: false,
        ...makeView(tab.view)
      };
    });

  $: if (cur_tab > tabs.length - 1) {
    cur_tab = tabs.length - 1;
  }

  function endTabDrag() {
    cur_tab = clicked_tab;
    tabs[clicked_tab].dragged = false;
    tabs[clicked_tab].dragged_out = false;
    clicked_tab = null;
    console.log("ENDED");
    tab_ghost_enabled = false;
    supertab_dragging.set(false);
  }

  function cancelTabDrag() {
    if (clicked_tab === null)
      return;
    endTabDrag();
    tab_ghost_xform.stiffness = 0.8;
    tab_ghost_xform.damping = 1.0;
    tab_ghost_xform.set({
      ...tab_ghost_origin
    });
  }

  function tabMousedown(e) {
    if (e.button !== 0)
      return;

    let rect = this.getBoundingClientRect();

    cur_tab_rect = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };

    tab_move_local.x = e.clientX - cur_tab_rect.x;
    tab_move_local.y = e.clientY - cur_tab_rect.y;

    clicked_tab = cur_tab;
    console.log("CLICKED");

    tab_ghost_xform.stiffness = tab_ghost_xform.damping = 1.0;
    tab_ghost_origin.x = cur_tab_rect.x;
    tab_ghost_origin.y = cur_tab_rect.y;
    tab_ghost_xform.set({
      x: e.clientX - tab_move_local.x,
      y: e.clientY - tab_move_local.y,
    });
  }

  function tabDragstart(e) {
    // transparent image to disable drag image
    let img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.setData("application/x-supertab", tabs[cur_tab].view_name);
    e.dataTransfer.dropEffect = "move";

    supertab_dragging.set(true);

    tabs[cur_tab].dragged_out = true;
    if (cur_tab === tabs.length - 1) {
      cur_tab--;
    } else {
      cur_tab++;
    }
  }

  function handleAnyMouseMove(x, y) {
    if (clicked_tab === null)
      return;

    if (!tab_ghost_enabled) {
      tab_ghost_enabled = true;
      tab_ghost_tab = tabs[clicked_tab];
      tabs[clicked_tab].dragged = true;
    }

    tab_ghost_xform.set({
      x: x - tab_move_local.x,
      y: y - tab_move_local.y,
    });
  }

  function winMousemove(e) {
    if (resizing) {
      switch (contents.split.orientation) {
        case "vertical":
          contents.split.position += e.movementY / root_height;
          break;
        case "horizontal":
          contents.split.position += e.movementX / root_width;
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

    cancelTabDrag();
  }

  function tabDragend(e) {
    if (e.dataTransfer.dropEffect === "move") {
      // dragged somewhere! now it's gone
      contents.tabs = [...contents.tabs.slice(0, clicked_tab), ...contents.tabs.slice(clicked_tab + 1)];
      endTabDrag();
    } else {
      // drag was cancelled
      cancelTabDrag();
    }
  }

  function dropzoneDragover(e, i, is_dock) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
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
    e.preventDefault();

    if (is_dock) {
      pane_docks[i].active = false;

      const view_name = e.dataTransfer.getData("application/x-supertab");
      let side = pane_docks[i].side;
      let new_layout = {
        split: {
          orientation: "horizontal",
          position: 0.5,
        },

        panes: [],
      };

      let my_tabs = contents.tabs.map(tab => tab.view);

      // if we are moving in self, filter out the moved tab
      if (clicked_tab !== null) {
        my_tabs.splice(clicked_tab, 1);
        endTabDrag();
      }

      if (side === "top" || side === "left") {
        new_layout.panes = [view_name, my_tabs];
      } else if (side === "bottom" || side === "right") {
        new_layout.panes = [my_tabs, view_name];
      }

      if (side === "left" || side === "right") {
        new_layout.split.orientation = "horizontal";
      } else if (side === "top" || side === "bottom") {
        new_layout.split.orientation = "vertical";
      }

      contents = makeContentsFromLayout(new_layout);

      // this is needed because for some reason svelte doesn't do it???
      tick().then(() => {
        let rect = root_el.getBoundingClientRect();

        root_width = rect.width;
        root_height = rect.height;
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
    white-space: nowrap;

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

  .container.nosplit > nav > .tab.dragged_out {
    display: none;
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
/>

<div
  class="container"
  class:vertical={contents.split && contents.split.orientation === "vertical"}
  class:horizontal={contents.split && contents.split.orientation === "horizontal"}
  class:nosplit={!contents.split}
  bind:this={root_el}
  bind:clientWidth={root_width}
  bind:clientHeight={root_height}
>
  {#if contents.split}
    {#if contents.split.orientation === "vertical"}
      <div class="pane" style="top: 0px; bottom: {root_height - split_loc_px + half_gaps}px">
        <svelte:self {...pane_props(0)} />
      </div>
      <div class="pane" style="top: {split_loc_px + half_gaps}px; bottom: 0px">
        <svelte:self {...pane_props(1)} />
      </div>
      <div
        on:mousedown={sepMousedown}
        class="separator"
        class:resizing
        style="top: {split_loc_px - half_seps}px; bottom: {root_height - split_loc_px - half_seps}px;"
      ></div>
    {:else if contents.split.orientation === "horizontal"}
      <div class="pane" style="left: 0px; right: {root_width - split_loc_px + half_gaps}px">
        <svelte:self {...pane_props(0)} />
      </div>
      <div class="pane" style="left: {split_loc_px + half_gaps}px; right: 0px">
        <svelte:self {...pane_props(1)} />
      </div>
      <div
        on:mousedown={sepMousedown}
        class="separator"
        class:resizing
        style="left: {split_loc_px - half_seps}px; right: {root_width - split_loc_px - half_seps}px;"
      ></div>
    {/if}
  {:else}
    <nav>
      {#each tabs as tab, i (tab.uid) }
        <div
          class="tab"
          class:current={i === cur_tab}
          class:dragged={tab.dragged}
          class:dragged_out={tab.dragged_out}
          draggable={i === cur_tab && editable}
          on:mousedown={e => { if (e.button === 0) cur_tab = i; }}
          on:mousedown={tabMousedown}
          on:dragend={tabDragend}
          on:dragstart={tabDragstart}
          animate:flip={{duration: 500}}
        >
          <span class="label">{tab.title}</span>
        </div>
      {/each}
    </nav>
    <div class="pane" class:first_is_current={tabs.length > 0 && (cur_tab === 0 || (tabs[0].dragged_out && cur_tab === 1))}>
      {#if !tabs[cur_tab] || (tabs.length === 1 && tabs[0].dragged_out)}
        <div></div>
      {:else}
        <svelte:component this={tabs[cur_tab].component} />
      {/if}
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
    </div>
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
