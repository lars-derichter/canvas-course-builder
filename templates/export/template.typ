$-- Course export template for pandoc's Typst writer (shipped default).
$-- Override by placing a template.typ in sources/export-style/.
$if(highlighting-definitions)$
// syntax highlighting functions from skylighting:
$highlighting-definitions$

$endif$
#let horizontalrule = line(start: (25%, 0%), end: (75%, 0%))

#show terms.item: it => block(breakable: false)[
  #text(weight: "bold")[#it.term]
  #block(inset: (left: 1.5em, top: -0.4em))[#it.description]
]

#set table(
  inset: 6pt,
  stroke: none,
)

#show figure.where(kind: table): set figure.caption(position: top)

#show figure.where(kind: image): set figure.caption(position: bottom)

// Alert colors and kinds mirror ALERT_CONFIG in lib/convert/markdown-to-html.js.
// Keep both in sync when a kind or color changes.
#let alert-colors = (
  note: rgb("#4bafe1"),
  tip: rgb("#64c8c8"),
  important: rgb("#967dc8"),
  warning: rgb("#ffc87d"),
  caution: rgb("#fa6432"),
  check: rgb("#00283c"),
)

#let alert(kind, title, body) = {
  let color = alert-colors.at(kind, default: alert-colors.note)
  block(
    width: 100%,
    stroke: (left: 3pt + color),
    fill: color.lighten(88%),
    inset: (left: 12pt, right: 10pt, top: 8pt, bottom: 8pt),
    radius: (top-right: 3pt, bottom-right: 3pt),
    above: 1.2em,
    below: 1.2em,
  )[
    #text(weight: "bold", fill: color.darken(10%))[#title]
    #v(2pt)
    #body
  ]
}

#let linkcard(title, url) = block(
  width: 100%,
  stroke: 0.5pt + luma(170),
  radius: 4pt,
  inset: 10pt,
  above: 1.2em,
  below: 1.2em,
  breakable: false,
)[
  #text(weight: "bold")[#title]
  #linebreak()
  #link(url)[#text(size: 0.9em)[#url]]
]

#let attachment(name) = block(
  above: 1.2em,
  below: 1.2em,
)[
  #text(weight: "bold")[Bijlage:] #raw(name)
]

#let conf(
  title: none,
  subtitle: none,
  course: none,
  date: none,
  lang: "nl",
  region: "BE",
  paper: "a4",
  margin: (x: 2.5cm, y: 2.5cm),
  font: ("Libertinus Serif",),
  codefont: ("DejaVu Sans Mono",),
  fontsize: 11pt,
  sectionnumbering: none,
  pagenumbering: "1",
  toc: false,
  toc-depth: 2,
  doc,
) = {
  set page(paper: paper, margin: margin, numbering: pagenumbering)
  set text(font: font, size: fontsize, lang: lang, region: region)
  set par(justify: true)
  set heading(numbering: sectionnumbering)
  set list(indent: 1em)
  set enum(indent: 1em)

  show link: set text(fill: rgb("#1a5fb4"))

  show heading: set block(above: 1.4em, below: 0.8em)
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    it
  }

  show raw.where(block: true): it => block(
    width: 100%,
    fill: luma(246),
    inset: 8pt,
    radius: 3pt,
    text(font: codefont, size: 0.85em, it),
  )
  show raw.where(block: false): it => box(
    fill: luma(246),
    inset: (x: 3pt, y: 0pt),
    outset: (y: 3pt),
    radius: 2pt,
    text(font: codefont, size: 0.9em, it),
  )

  if title != none {
    v(1fr)
    align(center)[
      #text(size: 2.4em, weight: "bold")[#title]
      #if subtitle != none [
        #v(0.8em)
        #text(size: 1.4em, fill: luma(80))[#subtitle]
      ]
      #if course != none [
        #v(2.5em)
        #text(size: 1.1em)[#course]
      ]
      #if date != none [
        #v(0.6em)
        #text(fill: luma(100))[#date]
      ]
    ]
    v(1.6fr)
    pagebreak()
  }

  if toc {
    outline(depth: toc-depth, indent: auto)
    pagebreak(weak: true)
  }

  doc
}

$if(smart)$
$else$
#set smartquote(enabled: false)

$endif$
$for(header-includes)$
$header-includes$

$endfor$
#show: doc => conf(
$if(title)$
  title: [$title$],
$endif$
$if(subtitle)$
  subtitle: [$subtitle$],
$endif$
$if(course)$
  course: [$course$],
$endif$
$if(date)$
  date: [$date$],
$endif$
$if(lang)$
  lang: "$lang$",
$endif$
$if(region)$
  region: "$region$",
$endif$
$if(papersize)$
  paper: "$papersize$",
$endif$
$if(margin)$
  margin: ($for(margin/pairs)$$margin.key$: $margin.value$,$endfor$),
$endif$
$if(mainfont)$
  font: ("$mainfont$",),
$endif$
$if(codefont)$
  codefont: ($for(codefont)$"$codefont$",$endfor$),
$endif$
$if(fontsize)$
  fontsize: $fontsize$,
$endif$
$if(section-numbering)$
  sectionnumbering: "$section-numbering$",
$endif$
  pagenumbering: $if(page-numbering)$"$page-numbering$"$else$"1"$endif$,
$if(toc)$
  toc: true,
  toc-depth: $toc-depth$,
$endif$
  doc,
)

$for(include-before)$
$include-before$

$endfor$
$body$
$if(citations)$
$for(nocite-ids)$
#cite(label("${it}"), form: none)
$endfor$
$if(csl)$

#set bibliography(style: "$csl$")
$elseif(bibliographystyle)$

#set bibliography(style: "$bibliographystyle$")
$endif$
$if(bibliography)$

#bibliography(($for(bibliography)$"$bibliography$"$sep$,$endfor$)$if(full-bibliography)$, full: true$endif$)
$endif$
$endif$
$for(include-after)$

$include-after$
$endfor$
