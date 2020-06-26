<script>
  import { EffectView, PreviewView, TimelineView, ConsoleView } from './Views.mjs';
  import Supertab from './Supertab/Supertab.svelte';

  const views = {
    effects: EffectView,
    preview: PreviewView,
    timeline: TimelineView,
    console: ConsoleView,
  };

  const config = {
    view: x => { return { title: x.replace(/^\w/, c => c.toUpperCase()), component: views[x] }; },
    split: "horizontal",
    content: [
      ["effects", "preview", "console", "timeline"],
      {
        split: "vertical",
        content: [
          "preview",
          ["timeline", "console"]
        ]
      }
    ]
  };
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
    top: 2px;
    left: 2px;
    right: 2px;
    bottom: 2px;
  }
</style>

<main>
  <div class="container">
    <Supertab {...config} />
  </div>
</main>
