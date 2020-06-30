import { writable } from 'svelte/store';

export const supertab_dragging = writable(false);

// example layout:
//
// const layout = {
//   split: {
//     orientation: "horizontal",
//     position: 0.3,
//   },
//   panes: [
//     ["effects", "preview", "console", "timeline"],
//     {
//       split: {
//         orientation: "vertical",
//         position: 0.7,
//       },
//       panes: [
//         ["preview"],
//         ["timeline", "console"],
//       ]
//     }
//   ]
// };
//
// example contents:
//
// const contents = {
//   split: {
//     orientation: "horizontal",
//     position: 0.3,
//   },
//   panes: [
//     {
//       tabs: [
//         { uid: 0, view: "effects" },
//         { uid: 1, view: "preview" },
//         { uid: 2, view: "console" },
//         { uid: 3, view: "timeline" },
//       ],
//     },
//     {
//       split: {
//         orientation: "vertical",
//         position: 0.7,
//       },
//       panes: [
//         {
//           tabs: [
//             { uid: 0, view: "preview" },
//           ],
//         }
//         {
//           tabs: [
//             { uid: 0, view: "console" },
//             { uid: 1, view: "timeline" },
//           ],
//         }
//       ]
//     }
//   ]
// };
export function makeContentsFromLayout(layout) {
  if (Array.isArray(layout)) {
    // array = tabs
    let uid = 0;

    return {
      tabs: layout.map(view => {
        return {
          uid: uid++,
          view,
        };
      }),
    };
  } else if (typeof layout === "object") {
    // object = splitted
    let split = {
      orientation: "vertical",
      position: 0.5,
    };

    if (typeof layout.split === "string" && layout.split === "horizontal")
      split.orientation = layout.split;
    else if (typeof layout.split === "number")
      split.position = Math.min(Math.max(layout.split, 0.0), 1.0);
    else if (typeof layout.split === "object") {
      split = {
        orientation: layout.split.orientation === "horizontal" ?
          layout.split.orientation : split.orientation,
        position: typeof layout.split.position === "number" ?
          Math.min(Math.max(layout.split.position, 0.0), 1.0) : split.position,
      };
    }

    let panes = layout.panes.map(makeContentsFromLayout);

    return {
      split,
      panes,
    };
  } else {
    // anything else = implied single tab
    return makeContentsFromLayout([layout]);
  }
}
