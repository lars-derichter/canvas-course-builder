# Writing style

Course materials are in Dutch; this guide stays in English for AI tools.

## Audiences

Course writing has two audiences and two registers. Pick the right one for the
file you are editing.

- **Student-facing**: anything in `course/` and `evaluations/`, plus assignment
  and exam instructions. Warm, accessible, CEFR B2.
- **Collega-facing**: lesson plans in `sources/lesson-plans/`, source notes, and
  drafting documents in `sources/`. Direct, dry, no readability cap. Reads like
  talking to a fellow teacher or like a published teaching manual.

`sources/lesson-plans/lesson-01.md` is the worked example for the collega-facing
register.

The rest of this guide splits into **shared rules** (apply to both),
**student-facing**, and **collega-facing**.

## Shared rules

### Language

- **Standard Dutch, Flemish variant.** "je"/"jullie", never "u" or "jij".
- **Avoid Hollandisms:** filler "even", sentence-ending "hoor", "best wel",
  "lekker" as adverb, "tof", "gewoon" for emphasis, overused "leuk".
- **Prefer Flemish:** "proficiat", "kot", "nu en dan", "wel eens".
- **Keep English tech terms in English:** _markup_, _selector_, _property_,
  _whitespace_, _screenreader_, _deploy_, _commit_, _framework_. They take Dutch
  articles and plurals: _de selector_, _selectors_.
- **Natural Dutch, not translated English.** Text must read as fluent, naturally
  written Dutch. Watch for:
  - Literal renderings of English idioms: _"in hun gezicht"_ for _in their
    face_, _"iets draagbaar maken"_ for _make X bearable_, _"een vlag planten"_
    for _plant a flag_, _"sociaal bewijs"_ for _social proof_.
  - English sentence rhythm dragged into Dutch (stacked subordinate clauses,
    long parenthetical insertions in the middle of a sentence).
  - Calques of English collocations and metaphors that do not survive
    translation literally (_"een ingang heropenen"_ for _reopen an
    entry-point_).
- Plain over Latinate: "gebruiken" over "hanteren", "zorg ervoor" over "dien
  erop toe te zien".

### Structure of a page

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
- **Code blocks** for anything that is typed, shown, or copied.
- **Headings** to break up longer pages. Use `##` for main sections; `###`
  sparingly.

### Headings and titles

- **Sentence case only.** First word and proper nouns/acronyms. Never title
  case.
  - Good: `## Een logische mappenstructuur voor je website`
  - Bad: `## Een Logische Mappenstructuur Voor Je Website`
- Short and descriptive. No trailing punctuation except `?` for real questions.
- Acronyms in conventional form: HTML, CSS, URL, HTTP, SEO.

### Punctuation and typography

- **No em-dashes (—).** AI tell. Use a comma, colon, parentheses, or new
  sentence.
- **En-dashes (–)** for ranges (`2023–2024`).
- Smart quotes `‘’` and `“”`.
- Ellipsis `…`, sparingly.
- One exclamation mark at a time.

### Patterns to avoid (AI tells)

- Em-dashes as separators.
- "Laten we erin duiken", "In dit hoofdstuk zullen we…", "By the end of this
  lesson…".
- Decorative tricolons ("snel, eenvoudig en efficiënt").
- Bold scattered through prose. Bold belongs on list lead-ins or critical terms.
- Every paragraph ending in a summary sentence.
- Repeating the heading as the first line.
- "Het is belangrijk om op te merken dat…": just say it.
- Over-enthusiastic openings ("Geweldig!", "Fantastisch!").

### Links

- Official, durable sources (MDN, W3C, tool docs) for reference.
- Internal links use relative `.md` paths.

### Code examples

- Fenced blocks with language tag (` ```html `, ` ```css `, ` ```js `).
- Smallest snippet that makes the point.
- Code comments in Dutch.

## Student-facing materials

### Reading level

**CEFR B2.** Short, concrete sentences. Break a long sentence in two rather than
stacking clauses. Explain a term on first use, then use it freely.

### Voice and tone

Default voice for explanatory text:

- **Second person, direct.** "je maakt", "probeer", "sla op". Imperatives in
  steps.
- **"We" for shared work in class.** "We bekijken samen…"
- **"Ik" for personal experience and opinion.** Welcome, do not strip it out.
- **Warm, occasionally playful.** Congratulate ("Proficiat!"), acknowledge
  something is annoying, slip in a small joke or English phrase where it fits.
  Do not force it.
- **Honest.** If Windows has it easier this one time, say so.
- **Parenthetical asides are welcome** in explanatory text, not every paragraph.

### Exercises, assignments, and exams: clarity first

In instructions, a student must be able to start without asking. Drop the warm
voice where it costs clarity:

- No parenthetical asides, no jokes, no "ik"/"we", no playful English.
- Short imperatives, unambiguous steps, explicit deliverables and constraints.
- A light, warmer tone is fine in the _introduction_ to an assignment; from the
  actual instructions onward, clarity wins.

### Page-title emoji

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

### Callouts (GitHub-style alerts)

Keep them short. If content grows past a few lines, move it into the page.

- `[!NOTE]` background, "meer weten"
- `[!TIP]` hint or shortcut
- `[!IMPORTANT]` must not miss
- `[!WARNING]` common pitfall
- `[!ATTENTION]` urgent, act now
- `[!CHECK]` verification step

### "Meer weten" links

Put background or further-reading links inside a `[!NOTE]` at the end of a
section.

## Collega-facing materials

For lesson plans (`sources/lesson-plans/`), source notes, and drafting documents
in `sources/`. The audience is fellow teachers, not students.
`sources/lesson-plans/lesson-01.md` is the example to mirror.

### Reading level

Native or C2. Skip simplification. Compound sentences are fine when they carry
their weight; favour two short sentences over one stacked one anyway, because
rhythm matters.

### Voice and tone

- **Direct, dry, occasionally playful.** Like talking to a colleague in the
  staff room, or like a published teaching manual. Warmth comes from precision
  and dry observation, not from cushioning.
- **Front-load the point.** No setup paragraphs, no "In dit lesplan beschrijf
  ik…". Open with one context sentence, then get to it.
- **Fragments are welcome** when they hit harder: _"Drie concepten. Meer niet."_
  _"Iedereen slaagt."_
- **Both "ik" and "je" are fine.** _"Je modelleert leerdoel 4 door voor hun ogen
  voor te doen wat debuggen is."_ _"Ik loop rond en stel vragen."_ Use "ik"
  sparingly, for personal experience or a judgment call you want to flag as
  yours.
- **No trailing summaries.** Stop when the point is made.
- **State expectations directly.** No defensive hedging ("het zou kunnen zijn
  dat sommige studenten…"). If you expect it, say so.

### Structure

- No page-title emoji. Those are signage for students.
- Short paragraphs and bullets where useful, just like the shared structure
  rules above. Lesson plans typically use `##` for blocks/phases and `###` for
  time-bracketed sub-sections.
