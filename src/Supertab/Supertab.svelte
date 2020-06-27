<script>
  import { onMount, onDestroy } from 'svelte';
  import { flip } from 'svelte/animate';
  import { spring } from 'svelte/motion';

  export let editable = false;
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
        editable,
      };
    } else {
      return {
        split: "none",
        content,
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

  let tabs = [];
  let tabs_el = [];
  let cur_tab = 0;
  let cur_tab_rect = { x: 0, y: 0, width: 0, height: 0 };
  let tab_ghost;
  let tab_ghost_enabled;
  let tab_move_start = { x: 0, y: 0 };
  let cursor_pos = { x: 0, y: 0 };
  let tab_ghost_xform = spring({ x: 0, y: 0 }, { stiffness: 0.8 });
  let tab_ghost_rot = spring(0);
  let moving_tab = false;

  $: if (split !== "vertical" && split !== "horizontal") {
    let uid = 0;

    if (Array.isArray(content)) {
      tabs = content.map(tab => {
        return {
          id: uid++,
          ...view(tab)
        };
      });
    } else {
      tabs = [{
        id: uid++,
        ...view(content)
      }];
    }
  }

  function tabMousedown(e, i) {
    if (e.button !== 0)
      return;
    cur_tab = i;
    moving_tab = editable;

    if (moving_tab) {
      let rect = tabs_el[cur_tab].getBoundingClientRect();

      cur_tab_rect = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };

      tab_move_start.x = e.clientX - cur_tab_rect.x;
      tab_move_start.y = e.clientY - cur_tab_rect.y;
    }
  }

  function winMouseup(e) {
    if (e.button !== 0)
      return;
    e.preventDefault();
    resizing = false;

    if (moving_tab) {
      moving_tab = false;
      tab_ghost_enabled = false;
      cursor_pos.x = 0;
      cursor_pos.y = 0;
      tab_ghost_xform.set({
        x: 0,
        y: 0,
      });
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
      if (!tab_ghost_enabled) {
        tab_ghost_enabled = true;

        window.requestAnimationFrame((() => {
          let old_x = $tab_ghost_xform.x;

          return function animate_rot() {
            if (!tab_ghost_enabled)
              return;

            let dx = $tab_ghost_xform.x - old_x;
            old_x = $tab_ghost_xform.x;

            tab_ghost_rot.set(dx);

            window.requestAnimationFrame(animate_rot);
          };
        })());
      }

      let rect = tabs_el[cur_tab].getBoundingClientRect();

      cursor_pos.x = e.clientX;
      cursor_pos.y = e.clientY;
      tab_ghost_xform.set({
        x: cursor_pos.x - (rect.x + tab_move_start.x),
        y: cursor_pos.y - (rect.y + tab_move_start.y),
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
    box-shadow: 0px 0px 4px black;
    pointer-events: none;
    position: fixed;
    top: 0px;
    left: 0px;
    opacity: 0.0;

    z-index: 1;

    transition: opacity 100ms;
  }

  .tab_ghost.enable {
    opacity: 0.8;
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
      {#each tabs as tab, i (tab.id) }
        <div
          class="tab"
          class:current={i === cur_tab}
          class:dragged={i === cur_tab && tab_ghost_enabled}
          bind:this={tabs_el[i]}
          on:mousedown={e => tabMousedown(e, i)}
        >
          <span class="label">{tab.title}</span>
        </div>
      {/each}
    </nav>
    <div class="pane" class:first_is_current={cur_tab === 0}>
      <svelte:component this={tabs[cur_tab].component} />
    </div>
    <div
      class="tab_ghost"
      class:enable={tab_ghost_enabled}
      bind:this={tab_ghost}
      style={`
        transform:
          translate(${cur_tab_rect.x}px, ${cur_tab_rect.y}px)
          translate(${$tab_ghost_xform.x}px, ${$tab_ghost_xform.y}px)
          rotateZ(${$tab_ghost_rot}deg);
      `}
    >
      <span class="label">{tabs[cur_tab].title}</span>
    </div>
  {/if}
</div>
