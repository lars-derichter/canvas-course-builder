// Source for logo.png, the cover watermark of the generic export style.
//
// Regenerate after editing:
//
//   typst compile export-styles/generic/logo.typ export-styles/generic/logo.png --ppi 600
//
// `fill: none` gives a transparent background and `width/height: auto` sizes
// the page to the wordmark, so the PNG has no margin to crop.

#set page(width: auto, height: auto, margin: 2pt, fill: none)
#set text(font: ("Helvetica", "Arial"))

#let muted = rgb("#8c959f")
#let ink = rgb("#59636e")

#block[
  #text(size: 7pt, weight: "bold", fill: muted, tracking: 0.32em)[BUILT WITH]
  #v(4pt, weak: true)
  #text(size: 19pt, weight: "regular", fill: ink, tracking: -0.01em)[Canvas Course Builder]
]
