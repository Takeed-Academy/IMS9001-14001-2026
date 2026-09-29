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
| Mode | Study — each answer is revealed as you go |
| Question order | Random, drawn fresh per sitting |
| Option order | Fixed and balanced at build time |

Questions are pitched at audit judgement, evidence and certification decisions
rather than clause recall, and the distractors are deliberately close in
meaning and similar in length.

**Every sitting draws its own random question order** — see below.

### Study mode

Answer a question, then press **Next**. The first press reveals the result
rather than navigating: the correct option turns green, a wrong pick turns red,
and the verdict panel gives the explanation and the clause reference. Press
**Next** again to move on.

The question locks once revealed, so the explanation cannot be used to change
the answer. Unanswered questions are skipped on a single press. The palette
marks right and wrong, but only for questions already revealed.

The score and the pass/fail verdict against the 70% mark still come at the end,
as does the full review screen.

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

## Every sitting is a different paper

The source bank arrives in four solid blocks of 25: every ISO 9001 question,
then every ISO 14001 question, then 17021-1, then 19011. That is a sensible way
to author a bank and a poor way to sit one — a candidate settles into a single
standard's vocabulary for twenty-five questions at a stretch, and a weak area
arrives as one demoralising block.

So the site shuffles. **The question order is drawn fresh every time the paper
is started.** Two candidates side by side are never on the same question, and a
retake is not the same paper in the same sequence.

The shuffle is Fisher-Yates, not `sort(() => Math.random() - 0.5)`. That
one-liner is the classic way to do this and it is wrong twice over: it does not
produce a uniform permutation, and because the result depends on the engine's
sorting algorithm it is *differently* wrong in each browser. The test suite
scans for it.

The order is drawn once and then **persisted**, so Resume brings back the
identical sequence rather than reshuffling — a refresh mid-exam must not cost
anyone their place.

### What does not shuffle: the options

Question order and option order are separate decisions, and only one of them is
randomised.

Shuffling questions changes *what you are asked next*. Shuffling options would
change *which letter is correct* — and the answer key is balanced at build time
(next section) precisely so that letter is fair. Randomising it per session
would throw that work away and make any printed key meaningless. So option A is
always the same option A, for everyone.

### The consequence: ids, not numbers

Once the order is per-sitting, a position is meaningless as a reference.
"Question 7" is a different question for every person in the room, so a printed
key numbered 1–100 would match nobody's screen.

The **question id** (`LA-001` … `LA-100`) is therefore the anchor:

- every review card on the site shows its id;
- the model answer PDF is keyed by id, grouped by standard, and sorted by id;
- a trainer and a candidate discussing `LA-043` are always discussing the same
  question.

Set `SHUFFLE_QUESTIONS = false` in `app.js` to sit the paper in the bank's own
fixed order instead. That order is itself interleaved at build time — the four
standards alternate rather than running in blocks — so it is a usable fallback
rather than the source's original block layout.

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
4. run 135 site tests in jsdom against the real shipped HTML and JS.

---

## Model answer PDF

`tools/build_model_answer.py` produces **`IMS-Lead-Auditor-Expert-Model-Answer.pdf`** —
a 22-page answer key: a cover, a quick-key grid for fast marking, then every
question followed directly by its answer. The distractors are not printed; each
entry shows the question, the correct answer in green, the explanation, and the
clause reference.

Everything is keyed by **question id**, grouped by standard and sorted by id —
never by position. The site draws a fresh random order for each sitting, so a
printed position would match nobody. A marker looks up `LA-023` rather than
counting to 23, and the id is printed on every review card on the site.

The answer letter stays in each entry's header, so a marker can line an entry
up with the quick key and with the website even though the option list is
absent. True/False answers print as the word, not a letter.

It reads `data/questions.json`, the same file the site ships, so the printed
letters are the letters a delegate actually sees. That holds because the
*options* are fixed even though the questions are shuffled. `tools/check_pdf.py`
derives the on-screen answer independently and fails the build if the two ever
disagree.

Because there is no Arabic, the PDF needs no text shaping, no bidi pass and no
embedded font: it uses Helvetica, a base font present in every PDF reader.

---

## Features

- One question per screen, with progress bar, elapsed timer and answer counters.
- Question palette showing current / answered / unanswered / flagged, with
  direct jump to any question. It marks right and wrong only once revealed.
- Flag for review, clear answer, previous / next.
- Confirmation before finishing, naming how many questions are still unanswered.
- Results: score, correct / incorrect / unanswered, time taken, pass/fail
  against the 70% mark, and a breakdown per standard.
- Review: every question with its id, your answer, the correct answer, the
  clause reference and the explanation — filterable by All / Incorrect /
  Unanswered / Flagged.
- Retake draws a new random order; the option order stays fixed.
- Autosaves to `localStorage`; reopening offers **Resume**, restoring the same
  random order rather than reshuffling.
- Keyboard: `←` / `→` between questions, `1`–`4` to select an option, `Enter` to
  reveal then advance, `Esc` to dismiss a dialog.

---

## Configuration

Near the top of `app.js`:

```js
var PASS_MARK = 70;             // percent
var SHUFFLE_QUESTIONS = true;   // fresh random order for every sitting
var REBALANCE_OPTIONS = false;  // the bank is already balanced at build time

var EXAMS = [
  { key: "full", mode: "study" } // "exam" seals the paper until submission
];
```

Switching the paper to `"exam"` mode is a one-word change: nothing is then
revealed until the candidate finishes, and answers stay editable throughout.

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
