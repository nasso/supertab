<script>
  import { EffectView, PreviewView, TimelineView, ConsoleView } from './Views.mjs';
  import Supertab from './Supertab/Supertab.svelte';

  const views = {
    effects: EffectView,
    preview: PreviewView,
    timeline: TimelineView,
    console: ConsoleView,
  };

  function makeView(name) {
    return {
      title: name.replace(/^\w/, c => c.toUpperCase()),
      component: views[name],
    };
  }

  let layout = {
    split: {
      orientation: "horizontal",
      position: 0.2,
    },
    panes: [
      "effects",
      {
        split: {
          orientation: "vertical",
          position: 0.7,
        },
        panes: [
          ["preview", "preview", "console"],
          ["timeline", "console"],
        ]
      }
    ]
  };

  function handleKeydown(e) {
    if (e.key === "w") {
      console.log(JSON.stringify(layout, null, 4));
    }
  }
</script>

<style>
  main {
    background: #111;
    color: #eee;
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
  }

  .container {
    display: inline-block;
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    bottom: 4px;
  }
</style>

<svelte:window on:keydown={handleKeydown} />

<main>
  <div class="container">
    <Supertab editable makeView={makeView} bind:layout={layout} />
  </div>
</main>
