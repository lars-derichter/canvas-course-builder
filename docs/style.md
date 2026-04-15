# Writing style for student materials

Course materials are in Dutch; this guide stays in English for AI tools.

## Language

- **Standard Dutch, Flemish variant.** "je"/"jullie", never "u" or "jij".
- **Avoid Hollandisms:** filler "even", sentence-ending "hoor", "best wel",
  "lekker" as adverb, "tof", "gewoon" for emphasis, overused "leuk".
- **Prefer Flemish:** "proficiat", "kot", "nu en dan", "wel eens".
- **Keep English tech terms in English:** _markup_, _selector_, _property_,
  _whitespace_, _screenreader_, _deploy_, _commit_, _framework_. They take Dutch
  articles and plurals: _de selector_, _selectors_.
- **CEFR B2.** Short, concrete sentences. Break a long sentence in two rather
  than stacking clauses. Explain a term on first use, then use it freely.
- Plain over Latinate: "gebruiken" over "hanteren", "zorg ervoor" over "dien
  erop toe te zien".

## Voice and tone

Default voice for explanatory text:

- **Second person, direct.** "je maakt", "probeer", "sla op". Imperatives in
  steps.
- **"We" for shared work in class.** "We bekijken samen…"
- **"Ik" for personal experience and opinion.** Welcome — do not strip it out.
- **Warm, occasionally playful.** Congratulate ("Proficiat!"), acknowledge
  something is annoying, slip in a small joke or English phrase where it fits.
  Do not force it.
- **Honest.** If Windows has it easier this one time, say so.
- **Parenthetical asides are welcome** in explanatory text, not every paragraph.

## Exercises, assignments, and exams: clarity first

In instructions, a student must be able to start without asking. Drop the warm
voice where it costs clarity:

- No parenthetical asides, no jokes, no "ik"/"we", no playful English.
- Short imperatives, unambiguous steps, explicit deliverables and constraints.
- A light, warmer tone is fine in the _introduction_ to an assignment; from the
  actual instructions onward, clarity wins.

## Structure of a page

Open with one or two sentences of context, then get to the point. No "In this
section, we will…" meta-introductions.

- **Numbered lists** for ordered steps.
- **Bulleted lists** for enumerations and concept breakdowns. For concept lists,
  lead with a short **bold** phrase:
  ```md
  - **Leesbare code:** je code is beter leesbaar en duidelijker gestructureerd.
  - **SEO:** zoekmachines begrijpen je structuur en rangschikken je beter.
  ```
- **Short prose paragraphs** for explanation. No walls of text.
- **Code blocks** for anything the student types, sees, or copies.
- **Headings** to break up longer pages. Use `##` for main sections; `###`
  sparingly.

## Headings and titles

- **Sentence case only.** First word and proper nouns/acronyms. Never title
  case.
  - Good: `## Een logische mappenstructuur voor je website`
  - Bad: `## Een Logische Mappenstructuur Voor Je Website`
- Short and descriptive. No trailing punctuation except `?` for real questions.
- Acronyms in conventional form: HTML, CSS, URL, HTTP, SEO.

## Page-title emoji

Page titles may start with a single emoji signalling the page type. Use at most
one, only on the title, never decoratively elsewhere.

- ❗️ opdracht (in te dienen, al dan niet op punten)
- 🏠 thuiswerk
- 📅 heeft een deadline
- 📝 iets schrijven
- 🛠 iets maken
- 🧪 zelf proberen / experiment
- 🔎 onderzoeken
- 💪 oefenen
- 🚸 extra hulp
- 🧩 extra oefening
- 📘 uitleg / referentie
- 🎬 video
- 🅿️ presentatie
- 📕 samenvatting
- ⚠️ belangrijk
- 💣 opgepast / gevaarlijk
- ℹ️ extra info
- 🔁 herhaling

No other emoji in headings, bullets, or prose.

## Callouts (GitHub-style alerts)

Keep them short. If content grows past a few lines, move it into the page.

- `[!NOTE]` background, "meer weten"
- `[!TIP]` hint or shortcut
- `[!IMPORTANT]` must not miss
- `[!WARNING]` common pitfall
- `[!ATTENTION]` urgent, act now
- `[!CHECK]` verification step

## Punctuation and typography

- **No em-dashes (—).** AI tell. Use a comma, colon, parentheses, or new
  sentence.
- **En-dashes (–)** for ranges (`2023–2024`).
- Smart quotes `‘’` and `“”`.
- Ellipsis `…`, sparingly.
- One exclamation mark at a time.

## Patterns to avoid (AI tells)

- Em-dashes as separators.
- "Laten we erin duiken", "In dit hoofdstuk zullen we…", "By the end of this
  lesson…".
- Decorative tricolons ("snel, eenvoudig en efficiënt").
- Bold scattered through prose. Bold belongs on list lead-ins or critical terms.
- Every paragraph ending in a summary sentence.
- Repeating the heading as the first line.
- "Het is belangrijk om op te merken dat…" — just say it.
- Over-enthusiastic openings ("Geweldig!", "Fantastisch!").

## Links

- Official, durable sources (MDN, W3C, tool docs) for reference.
- "Meer weten" links inside a `[!NOTE]` at the end of a section.
- Internal links use relative `.md` paths.

## Code examples

- Fenced blocks with language tag (` ```html `, ` ```css `, ` ```js `).
- Smallest snippet that makes the point.
- Code comments in Dutch.
