# IMS Lead Auditor — Practice Questions

**المدقق الرئيسي لنظام الإدارة المتكامل — أسئلة تدريبية**

A bilingual (Arabic RTL / English LTR) static practice site for the Integrated
Management System Lead Auditor course, covering:

- **ISO 9001:2026** — Quality management systems
- **ISO 14001:2026** — Environmental management systems
- **ISO 19011:2026** — Guidelines for auditing management systems
- **ISO/IEC 17021-1:2015** — Requirements for certification bodies

Built for **Takeed Academy**. This is a practice and revision tool — it is not an
official certification examination.

---

## The six exams

The bank is split to match the five course days, plus a full paper.

| Exam | Covers | Questions | Mode |
| --- | --- | ---: | --- |
| Day 1 | Introduction · Fundamentals IMS · QMS | 26 | Study |
| Day 2 | ISO 9001 and ISO 14001 requirements | 30 | Study |
| Day 3 | ISO 17021 · Intro to ISO 19011 | 29 | Study |
| Day 4 | Auditing | 28 | Study |
| Day 5 | Recap · Exam Rules · Mock exam | 27 | Study |
| **Full Mock Exam** | **All five days** | **140** | **Exam** |

Each exam keeps its own progress, so a delegate can have Day 2 half-finished and
still start Day 4 without losing anything.

### Study mode (the five day exams)

Answer a question, then press **Next**. The first press reveals the result rather
than navigating: the correct option turns green, a wrong pick turns red, and the
explanation appears. Press **Next** again to move on. The question locks once
revealed, so the explanation cannot be used to change the answer. Unanswered
questions are skipped on a single press.

### Exam mode (the full paper)

Nothing is revealed while you work — no correct answers, no explanations, and no
correctness hints in the question palette. The score, the pass/fail verdict
against the **70%** practice pass mark, and all explanations appear only after you
finish.

---

## Deploying to GitHub Pages

1. Push the contents of this folder to a repository's default branch.
2. **Settings → Pages → Source:** `Deploy from a branch`, branch `main`, folder
   `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/` within a minute or two.

Everything uses relative paths, so it also works from a subdirectory, from any
static web server, or by opening `index.html` straight from disk. A `.nojekyll`
file is included so Pages serves every file as-is.

---

## Project structure

```
IMS-Lead-Auditor-Practice/
├── index.html                  Page shell (all copy is injected by app.js)
├── styles.css                  Takeed design system, RTL-aware
├── app.js                      i18n dictionary + exam engine
├── data/
│   ├── questions.js            140-question bilingual bank (loaded by the page)
│   └── questions.json          Identical bank as JSON, for other tooling
├── assets/logos/               Takeed wordmark, mark, and SVG logo
├── .nojekyll
└── README.md
```

---

## Question bank

Built by `tools/build_bank.py`, which merges two source banks:

- `IMS_Bilingual_120_Question_Bank_V4_2026_BALANCED.json` — 100 core questions
  relabelled to the 2026 editions, plus 20 targeting what actually changed in
  2026 (remote and hybrid auditing, life-cycle perspective, change management,
  environmental context);
- `IMS_Bilingual_120_Question_Bank.json` — the same 100 core plus a **different**
  20 covering core IMS topics.

Merge: 100 + 20 + 20 = **140**.

### Day assignments

V4's content is byte-identical to the V3 bank before it; what V4 changed was
which day 7 questions sit on, to reach an even 24 per day. Five of those moves
are kept. Three are reverted, because each asks about a specific clause on a day
before the course teaches it:

| Question | V4 put it on | Restored to | Why |
| --- | --- | --- | --- |
| `IMS-D2-Q01` | Day 1 | **Day 2** | ISO 9001 clause 5.2 — a requirements topic |
| `IMS-D2-Q17` | Day 1 | **Day 2** | ISO 9001/14001 clause 6.1 — a requirements topic |
| `IMS-D3-Q19` | Day 5 | **Day 3** | ISO 19011 Clause 4 audit principles — core Day 3 material |

Kept as V4 placed them: `IMS-D5-Q01` and `IMS-D5-Q13` on Day 1 (genuinely
foundational IMS integration), and `IMS-D3-Q20` / `IMS-D4-Q20` on Day 5 (they
are end-of-day scenarios, and Day 5 is the recap).

The result is 26/30/29/28/27 rather than a flat 28 per day. An even column of
numbers is not worth asking a delegate about clause 5.2 on the introduction day.
`verify_all.sh` fails if any question drifts off its source day other than these
three.

| Property | Value |
| --- | --- |
| Total questions | 140 |
| Multiple choice (4 options) | 130 |
| True / False (2 options) | 10 |
| Core set | 100 |
| Supplemental — 2026 changes | 20 |
| Supplemental — core topics | 20 |
| Languages | Arabic + English |
| Answer indexing | zero-based, into the **presentation** options array |

Question text, options, explanations and correct answers are used exactly as
supplied. Only the *order* options appear in was changed — see below.

Regenerate with:

```
python3 tools/build_bank.py     # rebuild data/questions.js + .json
bash tools/verify_all.sh        # rebuild, prove fidelity, run the suite
```

### Mixed question formats

`type` is `"mcq"` (four options, labelled A–D) or `"tf"` (two options). True/False
items render side by side with no letter badge, because the option text already
says True or False. The engine treats both as the same contract — only the option
count differs.

---

## How answer mapping stays correct

Shuffling options is the usual source of scoring bugs in bilingual quizzes. The
engine avoids it with one rule:

1. Each question gets **one** permutation of its option indices.
2. That same permutation renders **both** `ar.options` and `en.options`. The two
   languages are never ordered independently.
3. A selection is stored as the **original** option index, never the on-screen
   position:

   ```js
   answers[questionId] = order[clickedDisplayPosition];
   ```

4. Scoring compares original indices: `answers[questionId] === question.answer`.

Nothing in the session record refers to a screen position or a language, so
switching between Arabic and English mid-exam only swaps the strings. The
question, the option order, the selection, and the flag all stay put. The
permutation is persisted, so resuming after a refresh restores the identical
layout instead of reshuffling.

### Why the answer key is balanced at build time

Merging the two banks would otherwise produce a badly skewed key: the second
bank's supplemental questions are almost all A or B, and on its own that file
scores **A 57 / B 52 / C 6 / D 5** — a learner ticking "A" throughout would get
48% without reading a word.

`tools/build_bank.py` therefore chooses each 4-option question's option order so
that the correct letter lands evenly, round-robin **within each day** as well as
overall. The shipped result is:

```
MCQ letters   A 33  B 33  C 32  D 32      spread 1
best blind guess   33/130 = 25%           (the floor for four options)
every day individually balanced
```

The round-robin counter runs **across** days rather than restarting each day:
days whose MCQ count is not a multiple of four leave a remainder, and restarting
at A every day piles every remainder onto A and B (measured at a spread of 4).

True/False items are left alone: their letter follows directly from the answer,
and swapping True and False reads as a trick rather than a fair rearrangement.

Doing this at build time rather than at runtime means the distribution is exact
rather than approximately even, every learner sees the same layout so a printed
answer key stays valid, and the runtime simply renders what it is given.

`verify_all.sh` re-derives the bank and fails if any correct answer text stopped
matching its source, in either language, or if the spread drifts above 1.

---

## Configuration

Near the top of `app.js`:

```js
var PASS_MARK = 70;             // pass mark for the full mock paper
var REBALANCE_OPTIONS = false;  // true = fixed id-derived option rearrangement

var EXAMS = [                   // which exams exist, and each one's mode
  { key: "day1", day: 1, mode: "study" },
  …
  { key: "full", day: null, mode: "exam" }
];
```

Switching a day exam to `"exam"` mode, or the full paper to `"study"`, is a
one-word change.

---

## Features

- Six independent exams with their own saved progress.
- One question per screen, with progress bar, elapsed timer and answer counters.
- Question palette showing current / answered / unanswered / flagged, with direct
  jump to any question. In study mode it also shows right and wrong.
- Flag for review, clear answer, previous / next.
- Confirmation before finishing, naming how many questions are still unanswered.
- Results: score, correct / incorrect / unanswered, time taken, and a breakdown
  per standard.
- Review: every question with your answer, the correct answer, the clause
  reference and the explanation — filterable by All / Incorrect / Unanswered /
  Flagged.
- Retake any exam without affecting the others.
- Autosaves to `localStorage`; reopening offers **Resume**.
- Keyboard: `←` / `→` between questions (mirrored in RTL), `1`–`4` to select an
  option, `Enter` to reveal then advance, `Esc` to dismiss a dialog.

---

## Browser support

Modern evergreen browsers. The layout uses CSS logical properties and
`conic-gradient`, both supported since 2021.

Session saving uses `localStorage`. Where it is unavailable — private browsing
with storage disabled, or some browsers opening from `file://` — the site still
works fully for the current session; only resume-after-refresh is lost.

---

## Content caveat

Clause references shown in the review screen are indicative. The bank flags 66 of
the 100 core questions as `requires_2026_text_verification`: they were authored
against the 2015 editions and their clause mappings were carried across when the
standards were relabelled to the 2026 editions. The 20 supplemental questions
target content that is new in 2026 (remote and hybrid auditing, life-cycle
perspective, change management, environmental context).

**Before using this for formal assessment, have a subject-matter expert verify
the carried-over clause references against the published 2026 texts.** The site
carries this caveat in its footer.

---

## Licensing and content note

Educational practice material prepared for Takeed Academy. ISO standards are the
copyright of ISO. This practice tool paraphrases concepts for learning purposes
and does not reproduce the standard.

مادة تدريبية تعليمية مُعدة لأغراض المراجعة. معايير ISO محمية بحقوق الملكية الخاصة
بالمنظمة الدولية للتقييس، وهذا الموقع يعرض مفاهيم بصياغة تعليمية ولا يعيد نشر نص
المعيار.
