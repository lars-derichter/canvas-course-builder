---
title: "Stijlvoorbeeld"
subtitle: "Overzicht van alle exportelementen"
course: "Voorbeeldcursus"
date: "2026-07-12"
lang: nl
toc: true
# The sample document is Dutch, so pin the Dutch labels here. Real exports get
# this block generated from course.config.yml — it doubles as a live example.
labels:
  note: "Info"
  tip: "Tip"
  important: "Belangrijk"
  warning: "Waarschuwing"
  caution: "Opgelet"
  check: "Check"
  attachment: "Bijlage:"
---

# Eerste hoofdstuk

Dit is een gewone paragraaf met **vet**, *cursief* en een [link naar
example.com](https://example.com). Ze toont hoe lopende tekst eruitziet in de
standaardstijl. Typst zorgt zelf voor uitlijning en woordafbreking.

## Een subkop

Nog een paragraaf, zodat je de verticale ritmiek tussen koppen en tekst kunt
beoordelen. Hier staat wat `inline code` tussen de woorden.

### Een sub-subkop

Een korte alinea onder de derde kopniveau. Deze zin krijgt een voetnoot om de
notenstijl te tonen.[^1]

[^1]: Zo ziet een voetnoot eruit onderaan de pagina.

#### Een vierde kopniveau

Het vierde kopniveau is cursief in marineblauw, zoals in het sjabloon.

## Citaat en definities

Een blokcitaat ziet er zo uit:

> Onderwijs is niet het vullen van een vat, maar het ontsteken van een vuur.

Een definitielijst:

Selector
: Een patroon dat bepaalt op welke elementen een CSS-regel van toepassing is.

Markup
: De structuur van een document, uitgedrukt in tags.

Een horizontale lijn als scheiding:

---

## Afbeelding

![Het logo van Thomas More als voorbeeldafbeelding](tm-logo.png)

## Alerts

::: {.alert .note}
Dit is een info-alert. Handig voor context en achtergrond.
:::

::: {.alert .tip}
Dit is een tip-alert met een nuttige suggestie.
:::

::: {.alert .important}
Dit is een belangrijk-alert dat de aandacht trekt.
:::

::: {.alert .warning}
Dit is een waarschuwing-alert.
:::

::: {.alert .caution}
Dit is een opgelet-alert voor risico's.
:::

::: {.alert .check}
Dit is een check-alert, bijvoorbeeld voor een controlepunt.
:::

## Code

Een codeblok in JavaScript:

```js
function groet(naam) {
  console.log(`Hallo, ${naam}!`);
}
groet("wereld");
```

## Lijsten

Ongeordende lijst:

- Eerste item
- Tweede item
- Derde item

Geordende lijst:

1. Stap een
2. Stap twee
3. Stap drie

## Tabel

| Kolom A | Kolom B | Kolom C |
| ------- | ------- | ------- |
| 1       | 2       | 3       |
| a       | b       | c       |

## Bijzondere blokken

::: {.link-card title="Externe bron" url="https://example.com/artikel"}
:::

::: {.attachment name="voorbeeld-document.pdf"}
:::

::: {.page-break}
:::

# Tweede hoofdstuk

Dit hoofdstuk begint op een nieuwe pagina, zodat je ziet hoe een H1 de
paginaovergang afdwingt.
