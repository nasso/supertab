<script>
  import { onMount } from 'svelte';

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

  function winMouseup(e) {
    if (!resizing || e.button !== 0)
      return;
    e.preventDefault();
    resizing = false;
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
  }

  let tabs = [];
  let cur_tab = 0;

  $: if (split !== "vertical" && split !== "horizontal") {
    if (Array.isArray(content)) {
      tabs = content.map(tab => view(tab));
    } else {
      tabs = [view(content)];
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

  .container.nosplit > nav {
    height: 32px;

    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
  }

  .container.nosplit > nav > button {
    background: #181818;
    border: none;
    color: #eee;
    height: 28px;
    border-radius: 4px;
    padding: 0px 24px;
    margin-right: 4px;

    transition:
      height 100ms,
      border-radius 100ms,
      background 100ms;
  }

  .container.nosplit > nav > button.current {
    background: #222;
    height: 32px;
    border-radius: 4px 4px 0px 0px;
  }

  .container.nosplit > .pane {
    text-align: center;
    background: #222;
    border-radius: 4px;
    top: 32px;
    left: 0px;
    bottom: 0px;
    right: 0px;

    transition: border-radius 100ms;
  }

  .container.nosplit > .pane.first_is_current {
    border-radius: 0px 4px 4px 4px;
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
        <button
          class:current={cur_tab === i}
          on:click={() => cur_tab = i}
          type="button"
        >{tab.title}</button>
      {/each}
    </nav>
    <div class="pane" class:first_is_current={cur_tab === 0}>
      <svelte:component this={tabs[cur_tab].component} />
    </div>
  {/if}
</div>
