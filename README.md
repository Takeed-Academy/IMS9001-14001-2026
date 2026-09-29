# IMS Lead Auditor — Expert Exam

A single-paper, English-only static exam site for the Integrated Management
System Lead Auditor course, covering:

- **ISO 9001:2026** — Quality management systems
- **ISO 14001:2026** — Environmental management systems
- **ISO/IEC 17021-1:2015** — Requirements for certification bodies
- **ISO 19011:2026** — Guidelines for auditing management systems

Built for **Takeed Academy**. This is a practice and revision tool — it is not
an official certification examination.

---

## The paper

| Property | Value |
| --- | ---: |
| Questions | 100 |
| Multiple choice (4 options) | 70 |
| True / False | 30 |
| Per standard | 25 each |
| Targeting 2026 changes | 31 |
| Pass mark | 70% |
| Mode | Exam — sealed until submission |

Questions are pitched at audit judgement, evidence and certification decisions
rather than clause recall, and the distractors are deliberately close in
meaning and similar in length.

### Exam mode

Nothing is revealed while you work — no correct answers, no explanations, and
no correctness hints in the question palette. The score, the pass/fail verdict
and every explanation appear only after you finish. Answers stay changeable
until submission.

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
IMS-Lead-Auditor-Expert/
├── index.html                  Page shell (all copy is injected by app.js)
├── styles.css                  Takeed design system
├── app.js                      Copy dictionary + exam engine
├── data/
│   ├── questions.js            100-question bank (loaded by the page)
│   └── questions.json          Identical bank as JSON, for other tooling
├── assets/logos/               Takeed wordmark, mark, and SVG logo
├── .nojekyll
└── README.md
```

---

## The answer key had to be rebalanced

The source bank arrives with what looks like a well-balanced key: across its 70
multiple-choice questions the correct answers land **A 18 · B 18 · C 17 · D 17**,
a spread of 1 and a 26% blind-guess ceiling against a 25% floor.

That total is an average, and it hides the real shape. Measured per standard,
as authored:

| Standard | A | B | C | D | Blind guess |
| --- | ---: | ---: | ---: | ---: | ---: |
| ISO 9001 | 9 | 9 | **0** | **0** | 50% |
| ISO 14001 | 9 | 9 | **0** | **0** | 50% |
| ISO/IEC 17021-1 | **0** | **0** | 9 | 8 | 53% |
| ISO 19011 | **0** | **0** | 8 | 9 | 53% |

Every question in the first half of the paper answers A or B. Every question in
the second half answers C or D. Two of the four options are dead in any given
section, the pattern is visible within about six questions, and a candidate who
spots it scores 50–53% without reading — against a 70% pass mark.

So `tools/build_bank.py` reorders each multiple-choice question's options so
the correct answer lands on a balanced letter. **No answer is changed.** The
correct option keeps its exact authored text and stays correct; only the label
in front of it moves. The shipped result:

| Standard | A | B | C | D | Blind guess |
| --- | ---: | ---: | ---: | ---: | ---: |
| ISO 9001 | 5 | 5 | 4 | 4 | 28% |
| ISO 14001 | 4 | 4 | 5 | 5 | 28% |
| ISO/IEC 17021-1 | 5 | 4 | 4 | 4 | 29% |
| ISO 19011 | 4 | 5 | 4 | 4 | 29% |
| **Whole paper** | **18** | **18** | **17** | **17** | **26%** |

The overall distribution is identical to the source — what changed is that it
is now true section by section as well as in aggregate.

Balance alone is not enough: a perfect A, B, C, D, A, B, C, D march would score
a spread of zero and be trivially guessable. So the round-robin decides only
the *multiset* of target letters per section, and a seeded Fisher-Yates decides
the order, re-seeded until no letter repeats more than twice consecutively. The
test suite asserts both the balance and the absence of a cycle.

**True/False items are never reordered.** Their two options *are* the answer,
and printing "A. False / B. True" reads as a trick rather than a rearrangement.
The key across them is True 15 / False 15 as authored.

Doing this at build time rather than per session means the distribution is
exact rather than approximately even, every candidate sits the same paper, and
the printed answer key stays valid.

---

## How answer mapping stays correct

Reordering options is the classic source of scoring bugs. The engine avoids it
with one rule:

1. Each question gets **one** permutation of its option indices.
2. A selection is stored as the **original** option index, never the on-screen
   position:

   ```js
   answers[questionId] = order[clickedDisplayPosition];
   ```

3. Scoring compares original indices: `answers[questionId] === question.answer`.

Nothing in the session record refers to a screen position, so the permutation
is free to change without touching correctness. It is persisted, so resuming
after a refresh restores the identical layout instead of reshuffling.

`tools/check_fidelity.py` re-reads the **original uploaded file** and proves,
for all 100 questions, that the correct answer is still the same *text* — not
merely the same index — and that the option set is unchanged. A silently moved
answer is the worst failure available to a training body, and no amount of UI
testing would catch it.

---

## Rebuilding

```
python3 tools/build_bank.py     # rebuild data/questions.js + .json
bash tools/verify_all.sh        # rebuild, prove fidelity, run the suite
```

`verify_all.sh` runs four gates and exits non-zero on any failure:

1. rebuild the bank from the uploaded source;
2. prove every correct answer survived the reordering, and that no section is
   guessable above 35%;
3. rebuild the PDF and prove the printed key equals what the screen shows;
4. run 110 site tests in jsdom against the real shipped HTML and JS.

---

## Model answer PDF

`tools/build_model_answer.py` produces **`IMS-Lead-Auditor-Expert-Model-Answer.pdf`** —
a 22-page answer key: a cover, a quick-key grid per standard for fast marking,
then every question followed directly by its answer. The distractors are not
printed; each entry shows the question, the correct answer in green, the
explanation, and the clause reference.

The answer letter stays in each entry's header, so a marker can line an entry
up with the quick key and with the website even though the option list is
absent. True/False answers print as the word, not a letter.

It reads `data/questions.json`, the same file the site ships, so the printed
letters are the letters a delegate actually sees. That only holds because the
bank is ordered and balanced at build time — with per-session shuffling a
printed key would be meaningless. `tools/check_pdf.py` derives the on-screen
answer independently and fails the build if the two ever disagree.

Because there is no Arabic, the PDF needs no text shaping, no bidi pass and no
embedded font: it uses Helvetica, a base font present in every PDF reader.

---

## Features

- One question per screen, with progress bar, elapsed timer and answer counters.
- Question palette showing current / answered / unanswered / flagged, with
  direct jump to any question. It never leaks correctness during the exam.
- Flag for review, clear answer, previous / next.
- Confirmation before finishing, naming how many questions are still unanswered.
- Results: score, correct / incorrect / unanswered, time taken, pass/fail
  against the 70% mark, and a breakdown per standard.
- Review: every question with your answer, the correct answer, the clause
  reference and the explanation — filterable by All / Incorrect / Unanswered /
  Flagged.
- Retake without losing the question or option order.
- Autosaves to `localStorage`; reopening offers **Resume**.
- Keyboard: `←` / `→` between questions, `1`–`4` to select an option, `Enter` to
  advance, `Esc` to dismiss a dialog.

---

## Configuration

Near the top of `app.js`:

```js
var PASS_MARK = 70;             // percent
var REBALANCE_OPTIONS = false;  // the bank is already balanced at build time

var EXAMS = [
  { key: "full", mode: "exam" } // "study" reveals each answer as you go
];
```

Switching the paper to `"study"` mode is a one-word change: **Next** then
reveals the answer before advancing, rather than moving straight on.

---

## Browser support

Modern evergreen browsers. The layout uses CSS logical properties and
`conic-gradient`, both supported since 2021.

Session saving uses `localStorage`. Where it is unavailable — private browsing
with storage disabled, or some browsers opening from `file://` — the site still
works fully for the current session; only resume-after-refresh is lost.

---

## Content caveats

**Clause references are indicative.** They are printed in the review screen and
in the PDF as the source bank supplied them. ISO/IEC 17021-1 is cited at its
**2015** edition, which the source records as current as of 29 September 2026
and under review; the other three are cited at their 2026 editions.

**Before using this for formal assessment, have a subject-matter expert verify
the clause references against the published texts.** The site carries this
caveat in its footer.

The question wording, options and explanations are reproduced exactly as
supplied — only the order the options appear in was changed, and only for
multiple-choice items.

---

## Licensing and content note

Educational practice material prepared for Takeed Academy. ISO standards are the
copyright of ISO. This practice tool paraphrases concepts for learning purposes
and does not reproduce the standard.
