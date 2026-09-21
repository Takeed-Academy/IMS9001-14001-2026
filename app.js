/*
 * Takeed Academy — IMS Lead Auditor Practice
 * ISO 9001:2026 · ISO 14001:2026 · ISO 19011:2026 · ISO/IEC 17021-1:2015
 * Bilingual (Arabic RTL / English LTR) static practice tool.
 *
 * ANSWER-MAPPING CONTRACT (do not change casually):
 *   - Each question gets ONE permutation `order` of its original option indices.
 *   - `order[displayPosition] === originalOptionIndex`.
 *   - The SAME `order` renders both ar.options and en.options, so switching
 *     language never reorders or remaps anything.
 *   - Selections are stored as the ORIGINAL option index:
 *         answers[questionId] = order[clickedDisplayPosition]
 *   - Correctness is therefore language- and layout-independent:
 *         answers[questionId] === question.answer
 *   - `order` is persisted, so Resume restores the identical display order.
 *
 * MIXED FORMATS: MCQ items have 4 options and receive a fixed id-derived
 * arrangement. True/False items have 2 options and keep their natural
 * True-then-False order, because reversing them reads as a trick rather than
 * a shuffle. Both are just permutations, so the contract above is unchanged.
 */

(function () {
  "use strict";

  var STORAGE_KEY = "takeedImsLeadAuditor.v1";
  var BANK = (typeof window !== "undefined" && window.IMS_QUESTIONS) || [];

  /* Must match the lang/dir that index.html is served with, and must precede
     `state`. If these disagree the page paints in one direction and then flips
     after first paint, which is a visible jump. Change both together. */
  var DEFAULT_LANG = "en";

  /* Day exams are for daily revision, so they reveal each answer as you go.
     The full paper simulates the Day-5 mock exam, so it stays sealed until
     the end. Change a mode here to alter that. */
  var EXAMS = [
    { key: "day1", day: 1, mode: "study" },
    { key: "day2", day: 2, mode: "study" },
    { key: "day3", day: 3, mode: "study" },
    { key: "day4", day: 4, mode: "study" },
    { key: "day5", day: 5, mode: "study" },
    { key: "full", day: null, mode: "exam" }
  ];

  var PASS_MARK = 70;          // percent, applied to the full mock paper only

  /* ------------------------------------------------- fixed option ordering
   *
   * Bank v3.0 balances its correct answers at source: across the 110 MCQs the
   * letters land A28 / B27 / C28 / D27, a spread of 1 and a hair above the
   * 25% floor for four options. Re-arranging on top of that only re-randomises
   * an already-fair distribution and measurably worsens it (it tested at a
   * spread of 10), so the authored order is presented as-is.
   *
   * The machinery below is kept because earlier revisions of this bank were
   * heavily A/B-weighted — if a future bank regresses, set REBALANCE_OPTIONS
   * to true to get a fixed, id-derived arrangement instead: stable on every
   * device and in every session, but not the authored order. The test suite
   * fails the build if the presented spread is ever worse than the authored
   * one, whichever mode is active. */
  var REBALANCE_OPTIONS = false;
  var OPTION_PERMS = [[0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,1,2],[0,3,2,1],
    [1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,0,2],[1,3,2,0],
    [2,0,1,3],[2,0,3,1],[2,1,0,3],[2,1,3,0],[2,3,0,1],[2,3,1,0],
    [3,0,1,2],[3,0,2,1],[3,1,0,2],[3,1,2,0],[3,2,0,1],[3,2,1,0]];

  /* Numeric seed from the string id, then a 32-bit mix. Math.imul keeps the
     multiply in 32 bits so the result is stable across engines. */
  function hashId(id) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < id.length; i++) {
      h = (h ^ id.charCodeAt(i)) >>> 0;
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function fixedOptionOrder(question) {
    var n = question.en.options.length;
    /* True/False keeps its natural order — "B. True / A. False" would read as
       a trick question rather than a fair rearrangement. */
    if (question.type === "tf" || !REBALANCE_OPTIONS) {
      return question.en.options.map(function (_, i) { return i; });
    }
    var h = hashId(question.id);
    h = (h ^ (h >>> 15)) >>> 0;
    h = Math.imul(h, 2246822519) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    return OPTION_PERMS[h % 24].slice();
  }

  /* ---------------------------------------------------------------- i18n */

  var I18N = {
    ar: {
      dir: "rtl", htmlLang: "ar",
      docTitle: "المدقق الرئيسي لنظام الإدارة المتكامل — أسئلة تدريبية",
      brandTitle: "المدقق الرئيسي — IMS",
      brandSubtitle: "ISO 9001:2026 و ISO 14001:2026",
      skip: "تخطٍّ إلى المحتوى",
      langLabel: "اللغة",

      heroEyebrow: "أداة مراجعة تدريبية",
      heroTitle: "المدقق الرئيسي لنظام الإدارة المتكامل",
      heroSubtitle: "ISO 9001:2026 · ISO 14001:2026 · ISO 19011:2026 · ISO/IEC 17021-1",
      heroDescription: "بنك تدريبي ثنائي اللغة يغطي أيام الدورة الخمسة، مع اختبار شامل يحاكي الامتحان النهائي. هذه الأسئلة لأغراض التدريب والمراجعة وليست اختبار اعتماد رسمي.",
      statQuestions: "سؤالًا",
      statExams: "اختبارات",
      statLanguages: "لغتان",

      hubTitle: "اختر الاختبار",
      hubHint: "اختبارات الأيام الخمسة تعرض الإجابة والشرح بعد كل سؤال. الاختبار الشامل يحاكي الامتحان: لا تظهر أي إجابة حتى الإنهاء.",
      dayLabel: "اليوم {n}",
      fullExamLabel: "الاختبار الشامل",
      fullExamSub: "محاكاة الامتحان النهائي — جميع الأيام",
      questionsCount: "{n} سؤالًا",
      modeStudyTag: "وضع التعلّم",
      modeExamTag: "وضع الاختبار",
      passMarkTag: "النجاح {n}%",
      startExam: "ابدأ",
      resumeExam: "استكمال",
      reviewExam: "عرض النتيجة",
      inProgress: "قيد الحل — {done} من {total}",
      completedTag: "مكتمل — {pct}%",

      day1Title: "المقدمة وأساسيات نظام الإدارة المتكامل",
      day1Sub: "Introduction · Fundamentals IMS · QMS",
      day2Title: "متطلبات ISO 9001 و ISO 14001",
      day2Sub: "ISO 9001 and ISO 14001 Requirements",
      day3Title: "ISO 17021 ومدخل إلى ISO 19011",
      day3Sub: "ISO 17021 · Intro to ISO 19011",
      day4Title: "التدقيق",
      day4Sub: "Auditing",
      day5Title: "المراجعة وقواعد الامتحان",
      day5Sub: "Recap · Exam Rules · Mock exam",

      practiceEyebrow: "جلسة تدريب",
      questionOf: "السؤال {current} من {total}",
      answeredCount: "{n} مُجاب",
      flaggedCount: "{n} مُعلَّم",
      studyProgress: "{n} تم التحقق منها",
      elapsed: "الوقت المنقضي",
      progressLabel: "التقدم",
      previous: "السابق",
      next: "التالي",
      clearAnswer: "مسح الإجابة",
      flag: "تعليم للمراجعة",
      unflag: "إلغاء التعليم",
      finish: "إنهاء الاختبار",
      pressNextToReveal: "اضغط «التالي» لعرض الإجابة الصحيحة والشرح.",
      feedbackCorrect: "إجابة صحيحة",
      feedbackIncorrect: "إجابة غير صحيحة",
      feedbackCorrectIs: "الإجابة الصحيحة هي الخيار {letter}.",
      answerLocked: "تم تسجيل إجابتك لهذا السؤال ولا يمكن تغييرها.",
      questionMap: "لوحة الأسئلة",
      legendCurrent: "الحالي",
      legendAnswered: "مُجاب",
      legendUnanswered: "غير مُجاب",
      legendFlagged: "مُعلَّم",
      goToQuestion: "الانتقال إلى السؤال {n}",

      confirmTitle: "إنهاء الاختبار",
      confirmUnanswered: "لديك {n} من الأسئلة غير مجابة. هل تريد الإنهاء وإظهار النتائج؟",
      confirmComplete: "لقد أجبت عن جميع الأسئلة. هل تريد الإنهاء وإظهار النتائج؟",
      confirmYes: "إنهاء وعرض النتائج",
      confirmNo: "العودة للأسئلة",

      resultsEyebrow: "ملخص الأداء",
      resultsTitle: "نتيجة الاختبار",
      scoreLabel: "النسبة",
      correct: "إجابات صحيحة",
      incorrect: "إجابات خاطئة",
      unanswered: "غير مجابة",
      totalQuestions: "إجمالي الأسئلة",
      timeTaken: "الوقت المستغرق",
      breakdownTitle: "التوزيع حسب المعيار",
      performanceLabel: "مستوى الأداء التدريبي",
      perfStrong: "أداء قوي",
      perfGood: "أداء جيد",
      perfDeveloping: "أداء يحتاج إلى تطوير",
      perfFoundational: "أداء يحتاج إلى مراجعة أساسية",
      mockPass: "تجاوز حد النجاح التدريبي ({n}%)",
      mockFail: "دون حد النجاح التدريبي ({n}%)",
      practiceOnlyNote: "هذه نتيجة تدريبية لأغراض المراجعة الذاتية فقط، وليست نتيجة اختبار اعتماد.",
      reviewAnswers: "مراجعة الإجابات",
      retakeExam: "إعادة الاختبار",
      backToHub: "كل الاختبارات",

      reviewEyebrow: "مراجعة تفصيلية",
      reviewTitle: "مراجعة الإجابات",
      backToResults: "العودة إلى النتيجة",
      filterAll: "الكل",
      filterIncorrect: "الخاطئة",
      filterUnanswered: "غير المجابة",
      filterFlagged: "المُعلَّمة",
      filterEmpty: "لا توجد أسئلة ضمن هذا التصنيف.",
      yourAnswer: "إجابتك",
      correctAnswer: "الإجابة الصحيحة",
      noAnswer: "لم تتم الإجابة",
      explanation: "الشرح",
      clauseLabel: "المرجع",
      statusCorrect: "صحيحة",
      statusIncorrect: "خاطئة",
      statusUnanswered: "غير مجابة",
      statusFlagged: "مُعلَّم",
      questionN: "سؤال {n}",

      restartConfirmTitle: "إعادة الاختبار",
      restartConfirmBody: "سيتم حذف إجاباتك في هذا الاختبار والبدء من جديد. هل تريد المتابعة؟",
      restartYes: "نعم، ابدأ من جديد",
      cancel: "إلغاء",

      footerBrand: "Takeed Academy — IMS Lead Auditor Practice Questions",
      footerNote: "مادة تدريبية تعليمية مُعدة لأغراض المراجعة. معايير ISO محمية بحقوق الملكية الخاصة بالمنظمة الدولية للتقييس، وهذا الموقع يعرض مفاهيم بصياغة تعليمية ولا يعيد نشر نص المعيار.",
      footerVerify: "مراجع البنود الواردة في شاشة المراجعة استرشادية، ويجري التحقق من بعضها مقابل نصوص إصدارات 2026. يُرجى الرجوع إلى المعيار المعتمد عند الاعتماد على أي بند.",

      bankErrorTitle: "تعذّر تحميل بنك الأسئلة",
      bankErrorBody: "لم يتم العثور على ملف الأسئلة. تأكد من وجود الملف data/questions.js بجانب الصفحة."
    },

    en: {
      dir: "ltr", htmlLang: "en",
      docTitle: "IMS Lead Auditor — Practice Questions",
      brandTitle: "IMS Lead Auditor",
      brandSubtitle: "ISO 9001:2026 & ISO 14001:2026",
      skip: "Skip to content",
      langLabel: "Language",

      heroEyebrow: "Practice and revision tool",
      heroTitle: "Integrated Management System Lead Auditor",
      heroSubtitle: "ISO 9001:2026 · ISO 14001:2026 · ISO 19011:2026 · ISO/IEC 17021-1",
      heroDescription: "A bilingual practice bank covering all five course days, plus a full paper that simulates the final exam. These questions are for learning and revision and are not an official certification examination.",
      statQuestions: "questions",
      statExams: "exams",
      statLanguages: "languages",

      hubTitle: "Choose an exam",
      hubHint: "The five day exams reveal the answer and explanation after each question. The full paper simulates the exam — nothing is revealed until you finish.",
      dayLabel: "Day {n}",
      fullExamLabel: "Full Mock Exam",
      fullExamSub: "Final exam simulation — all days",
      questionsCount: "{n} questions",
      modeStudyTag: "Study mode",
      modeExamTag: "Exam mode",
      passMarkTag: "Pass {n}%",
      startExam: "Start",
      resumeExam: "Resume",
      reviewExam: "View result",
      inProgress: "In progress — {done} of {total}",
      completedTag: "Completed — {pct}%",

      day1Title: "Introduction and IMS Fundamentals",
      day1Sub: "Introduction · Fundamentals IMS · QMS",
      day2Title: "ISO 9001 and ISO 14001 Requirements",
      day2Sub: "Clause-by-clause requirements",
      day3Title: "ISO 17021 and Introduction to ISO 19011",
      day3Sub: "Certification bodies · Audit guidelines",
      day4Title: "Auditing",
      day4Sub: "Planning · Conducting · Reporting",
      day5Title: "Recap and Exam Rules",
      day5Sub: "Recap · Exam Rules · Mock exam",

      practiceEyebrow: "Practice session",
      questionOf: "Question {current} of {total}",
      answeredCount: "{n} answered",
      flaggedCount: "{n} flagged",
      studyProgress: "{n} checked",
      elapsed: "Elapsed time",
      progressLabel: "Progress",
      previous: "Previous",
      next: "Next",
      clearAnswer: "Clear Answer",
      flag: "Flag for Review",
      unflag: "Unflag",
      finish: "Finish Exam",
      pressNextToReveal: "Press “Next” to reveal the correct answer and explanation.",
      feedbackCorrect: "Correct",
      feedbackIncorrect: "Not correct",
      feedbackCorrectIs: "The correct answer is option {letter}.",
      answerLocked: "Your answer to this question is recorded and cannot be changed.",
      questionMap: "Question Palette",
      legendCurrent: "Current",
      legendAnswered: "Answered",
      legendUnanswered: "Unanswered",
      legendFlagged: "Flagged",
      goToQuestion: "Go to question {n}",

      confirmTitle: "Finish exam",
      confirmUnanswered: "You have {n} unanswered questions. Do you want to finish and view your results?",
      confirmComplete: "You have answered every question. Do you want to finish and view your results?",
      confirmYes: "Finish and view results",
      confirmNo: "Back to questions",

      resultsEyebrow: "Performance summary",
      resultsTitle: "Exam Results",
      scoreLabel: "Score",
      correct: "Correct answers",
      incorrect: "Incorrect answers",
      unanswered: "Unanswered",
      totalQuestions: "Total questions",
      timeTaken: "Time taken",
      breakdownTitle: "Breakdown by standard",
      performanceLabel: "Practice performance",
      perfStrong: "Strong performance",
      perfGood: "Good performance",
      perfDeveloping: "Developing performance",
      perfFoundational: "Needs foundational review",
      mockPass: "Above the practice pass mark ({n}%)",
      mockFail: "Below the practice pass mark ({n}%)",
      practiceOnlyNote: "This is a practice result for self-revision only. It is not a certification examination result.",
      reviewAnswers: "Review Answers",
      retakeExam: "Retake Exam",
      backToHub: "All exams",

      reviewEyebrow: "Detailed review",
      reviewTitle: "Review Answers",
      backToResults: "Back to Results",
      filterAll: "All",
      filterIncorrect: "Incorrect",
      filterUnanswered: "Unanswered",
      filterFlagged: "Flagged",
      filterEmpty: "No questions match this filter.",
      yourAnswer: "Your answer",
      correctAnswer: "Correct answer",
      noAnswer: "Not answered",
      explanation: "Explanation",
      clauseLabel: "Reference",
      statusCorrect: "Correct",
      statusIncorrect: "Incorrect",
      statusUnanswered: "Unanswered",
      statusFlagged: "Flagged",
      questionN: "Question {n}",

      restartConfirmTitle: "Retake exam",
      restartConfirmBody: "This will discard your answers for this exam and start again. Continue?",
      restartYes: "Yes, start over",
      cancel: "Cancel",

      footerBrand: "Takeed Academy — IMS Lead Auditor Practice Questions",
      footerNote: "Educational practice material prepared for Takeed Academy. ISO standards are the copyright of ISO. This practice tool paraphrases concepts for learning purposes and does not reproduce the standard.",
      footerVerify: "Clause references shown in the review screen are indicative, and some are still being verified against the 2026 edition texts. Always consult the published standard before relying on a clause.",

      bankErrorTitle: "Question bank could not be loaded",
      bankErrorBody: "The question data file was not found. Make sure data/questions.js sits next to this page."
    }
  };

  /* --------------------------------------------------------------- state */

  var state = loadState();
  var timerHandle = null;
  var pendingModal = null;

  function defaultState() {
    return { lang: DEFAULT_LANG, view: "hub", activeExam: null, sessions: {} };
  }

  function examByKey(key) {
    for (var i = 0; i < EXAMS.length; i++) if (EXAMS[i].key === key) return EXAMS[i];
    return null;
  }

  function questionsForExam(exam) {
    if (!exam) return [];
    return exam.day === null ? BANK.slice()
      : BANK.filter(function (q) { return q.day === exam.day; });
  }

  function questionById(id) {
    for (var i = 0; i < BANK.length; i++) if (BANK[i].id === id) return BANK[i];
    return null;
  }

  function loadState() {
    var fallback = defaultState();
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      var saved = JSON.parse(raw);
      var sessions = {};
      Object.keys(saved.sessions || {}).forEach(function (key) {
        if (!examByKey(key)) return;
        var clean = sanitizeSession(saved.sessions[key], examByKey(key));
        if (clean) sessions[key] = clean;
      });
      return {
        lang: saved.lang === "ar" || saved.lang === "en" ? saved.lang : fallback.lang,
        view: "hub",
        activeExam: null,
        sessions: sessions
      };
    } catch (e) {
      return fallback;
    }
  }

  /* A stored session is trusted only if every id still exists, belongs to this
     exam, and every persisted permutation matches that question's option count. */
  function sanitizeSession(session, exam) {
    if (!session || !Array.isArray(session.ids) || !session.ids.length) return null;

    var allowed = {};
    questionsForExam(exam).forEach(function (q) { allowed[q.id] = q; });

    var ids = session.ids.filter(function (id) {
      return Object.prototype.hasOwnProperty.call(allowed, id);
    });
    if (ids.length !== session.ids.length) return null;

    var orders = {};
    for (var i = 0; i < ids.length; i++) {
      var q = allowed[ids[i]];
      var order = session.orders && session.orders[ids[i]];
      if (!isPermutation(order, q.en.options.length)) return null;
      orders[ids[i]] = order.slice();
    }

    var answers = {};
    Object.keys(session.answers || {}).forEach(function (key) {
      var value = session.answers[key];
      if (ids.indexOf(key) === -1) return;
      if (!Number.isInteger(value) || value < 0 || value >= allowed[key].en.options.length) return;
      answers[key] = value;
    });

    var flags = {};
    Object.keys(session.flags || {}).forEach(function (key) {
      if (ids.indexOf(key) !== -1 && session.flags[key] === true) flags[key] = true;
    });

    /* Revealed only counts where an answer was actually committed. */
    var revealed = {};
    Object.keys(session.revealed || {}).forEach(function (key) {
      if (ids.indexOf(key) !== -1 && session.revealed[key] === true &&
        Object.prototype.hasOwnProperty.call(answers, key)) revealed[key] = true;
    });

    var current = Number(session.current);
    if (!Number.isInteger(current) || current < 0 || current >= ids.length) current = 0;

    var elapsed = Number(session.elapsedSeconds);
    if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;

    return {
      examKey: exam.key,
      ids: ids,
      orders: orders,
      answers: answers,
      flags: flags,
      revealed: revealed,
      mode: exam.mode,
      current: current,
      elapsedSeconds: Math.floor(elapsed),
      finished: session.finished === true,
      reviewFilter: ["all", "incorrect", "unanswered", "flagged"].indexOf(session.reviewFilter) !== -1
        ? session.reviewFilter : "all"
    };
  }

  function isPermutation(arr, size) {
    if (!Array.isArray(arr) || arr.length !== size) return false;
    var seen = new Array(size).fill(false);
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (!Number.isInteger(v) || v < 0 || v >= size || seen[v]) return false;
      seen[v] = true;
    }
    return true;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        lang: state.lang,
        sessions: state.sessions
      }));
    } catch (e) { /* private mode / quota — keep the in-memory session alive */ }
  }

  function session() {
    return state.activeExam ? state.sessions[state.activeExam] : null;
  }

  /* ------------------------------------------------------------ utilities */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function t(key, vars) {
    var dict = I18N[state.lang] || I18N.en;
    var value = dict[key];
    if (value === undefined) value = (I18N.en[key] !== undefined ? I18N.en[key] : key);
    if (vars) Object.keys(vars).forEach(function (n) {
      value = value.split("{" + n + "}").join(String(vars[n]));
    });
    return value;
  }

  function esc(v) {
    return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function formatClock(total) {
    var s = Math.max(0, Math.floor(total));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return h > 0 ? h + ":" + pad(m) + ":" + pad(sec) : pad(m) + ":" + pad(sec);
  }

  function num(v) { return String(v); }

  function icon(name) {
    var paths = {
      play: '<path d="M6 4l14 8-14 8z"/>',
      arrowNext: '<path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      arrowPrev: '<path d="M19 12H6M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      flag: '<path d="M5 21V4M5 4h11l-1.5 3.5L16 11H5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      check: '<path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
      cross: '<path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
      dash: '<path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
      eraser: '<path d="M4 18h16M8 18 4 14l8-8 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
      send: '<path d="M4 12 20 5l-6 15-3-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      rotate: '<path d="M4 12a8 8 0 1 1 2.6 5.9M4 18v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      back: '<path d="M19 12H6M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      lock: '<path d="M6 11h12v9H6zM9 11V7.5a3 3 0 0 1 6 0V11" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
      book: '<path d="M4 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
    };
    var flip = (name === "arrowNext" || name === "arrowPrev" || name === "back") &&
      state.lang === "ar" ? ' style="transform:scaleX(-1)"' : "";
    return '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"' +
      flip + ">" + (paths[name] || "") + "</svg>";
  }

  function announce(msg) { var r = $("#liveRegion"); if (r) r.textContent = msg; }

  /* --------------------------------------------------- session lifecycle */

  function startExam(key) {
    var exam = examByKey(key);
    if (!exam) return;
    var list = questionsForExam(exam);
    var ids = [], orders = {};
    list.forEach(function (q) {
      ids.push(q.id);
      orders[q.id] = fixedOptionOrder(q);
    });
    state.sessions[key] = {
      examKey: key, ids: ids, orders: orders,
      answers: {}, flags: {}, revealed: {},
      mode: exam.mode, current: 0, elapsedSeconds: 0,
      finished: false, reviewFilter: "all"
    };
    state.activeExam = key;
    state.view = "practice";
    saveState();
    startTimer();
    render();
  }

  function openExam(key) {
    var s = state.sessions[key];
    if (!s) { startExam(key); return; }
    state.activeExam = key;
    state.view = s.finished ? "results" : "practice";
    saveState();
    if (!s.finished) startTimer();
    render();
  }

  function isStudyMode() { var s = session(); return !!s && s.mode === "study"; }
  function isLocked(q) { var s = session(); return isStudyMode() && !!s.revealed[q.id]; }

  function currentQuestion() {
    var s = session();
    return s ? questionById(s.ids[s.current]) : null;
  }

  function localized(q) { return q[state.lang] || q.en; }

  function displayOptions(q) {
    var s = session();
    var loc = localized(q);
    return s.orders[q.id].map(function (originalIndex) {
      return { originalIndex: originalIndex, text: loc.options[originalIndex] };
    });
  }

  function selectAnswer(q, displayPosition) {
    if (isLocked(q)) return;
    var s = session();
    s.answers[q.id] = s.orders[q.id][displayPosition];
    saveState(); render();
  }

  function revealAnswer(q) {
    var s = session();
    if (!isStudyMode()) return;
    if (!Object.prototype.hasOwnProperty.call(s.answers, q.id)) return;
    s.revealed[q.id] = true;
    saveState(); render();
    announce(isCorrect(q.id) ? t("feedbackCorrect") : t("feedbackIncorrect"));
  }

  function clearAnswer(q) {
    if (isLocked(q)) return;
    delete session().answers[q.id];
    saveState(); render();
  }

  function toggleFlag(q) {
    var s = session();
    if (s.flags[q.id]) delete s.flags[q.id]; else s.flags[q.id] = true;
    saveState(); render();
  }

  /* Forward navigation reveals an answered-but-unchecked question first, then
     moves on. Unanswered questions are skipped straight past. */
  function advance() {
    var q = currentQuestion(), s = session();
    if (q && isStudyMode() &&
      Object.prototype.hasOwnProperty.call(s.answers, q.id) && !s.revealed[q.id]) {
      revealAnswer(q);
      return;
    }
    goTo(s.current + 1);
  }

  function goTo(index) {
    var s = session();
    s.current = Math.min(Math.max(index, 0), s.ids.length - 1);
    saveState(); render();
    var main = $("#mainContent");
    if (main) main.focus({ preventScroll: true });
  }

  function answeredCount(s) {
    s = s || session(); if (!s) return 0;
    return s.ids.filter(function (id) {
      return Object.prototype.hasOwnProperty.call(s.answers, id);
    }).length;
  }

  function flaggedCount() {
    var s = session(); if (!s) return 0;
    return s.ids.filter(function (id) { return s.flags[id]; }).length;
  }

  function revealedCount() {
    var s = session(); if (!s) return 0;
    return s.ids.filter(function (id) { return s.revealed[id]; }).length;
  }

  function isCorrect(id, s) {
    s = s || session();
    var q = questionById(id);
    return !!q && s.answers[id] === q.answer;
  }

  function scoreSession(s) {
    s = s || session();
    var totals = { correct: 0, incorrect: 0, unanswered: 0, total: s.ids.length };
    var byStd = {};
    s.ids.forEach(function (id) {
      var q = questionById(id);
      var key = q.standard || "—";
      var bucket = byStd[key] || (byStd[key] = { correct: 0, total: 0 });
      bucket.total += 1;
      if (!Object.prototype.hasOwnProperty.call(s.answers, id)) totals.unanswered += 1;
      else if (isCorrect(id, s)) { totals.correct += 1; bucket.correct += 1; }
      else totals.incorrect += 1;
    });
    totals.percent = totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;
    totals.byStandard = byStd;
    return totals;
  }

  function finishSession() {
    session().finished = true;
    state.view = "results";
    stopTimer(); saveState(); render();
  }

  function retakeExam() {
    var key = state.activeExam;
    delete state.sessions[key];
    stopTimer(); saveState();
    startExam(key);
  }

  function backToHub() {
    state.view = "hub";
    state.activeExam = null;
    stopTimer(); saveState(); render();
  }

  /* ---------------------------------------------------------------- timer */

  function startTimer() {
    stopTimer();
    var s = session();
    if (!s || s.finished) return;
    timerHandle = window.setInterval(function () {
      var cur = session();
      if (!cur || cur.finished) { stopTimer(); return; }
      cur.elapsedSeconds += 1;
      var el = $("#elapsedValue");
      if (el) el.textContent = formatClock(cur.elapsedSeconds);
      if (cur.elapsedSeconds % 5 === 0) saveState();
    }, 1000);
  }

  function stopTimer() {
    if (timerHandle) { window.clearInterval(timerHandle); timerHandle = null; }
  }

  /* --------------------------------------------------------------- render */

  function render() {
    applyLanguageChrome();
    renderHub();
    renderPractice();
    renderResults();
    renderReview();

    $all(".view-pane").forEach(function (p) { p.classList.remove("is-active"); });
    var active = $("#" + state.view + "View");
    if (active) active.classList.add("is-active");

    var back = $("#backToHub");
    if (back) {
      back.hidden = state.view === "hub";
      back.innerHTML = icon("back") + "<span>" + esc(t("backToHub")) + "</span>";
    }
  }

  function applyLanguageChrome() {
    if (!I18N[state.lang]) state.lang = DEFAULT_LANG;
    var dict = I18N[state.lang];
    var html = document.documentElement;
    html.setAttribute("lang", dict.htmlLang);
    html.setAttribute("dir", dict.dir);
    document.title = dict.docTitle + " | Takeed Academy";

    var bt = $("#brandTitle"), bs = $("#brandSubtitle"), sk = $("#skipLink");
    if (bt) bt.textContent = t("brandTitle");
    if (bs) bs.textContent = t("brandSubtitle");
    if (sk) sk.textContent = t("skip");

    var sw = $("#langSwitch");
    if (sw) {
      sw.setAttribute("aria-label", t("langLabel"));
      $all(".lang-button", sw).forEach(function (b) {
        var on = b.getAttribute("data-lang") === state.lang;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    var fb = $("#footerBrand"), fn = $("#footerNote"), fv = $("#footerVerify");
    if (fb) fb.textContent = t("footerBrand");
    if (fn) fn.textContent = t("footerNote");
    if (fv) fv.textContent = t("footerVerify");
  }

  /* ------------------------------------------------------------- the hub */

  function examMeta(exam) {
    if (exam.day === null) {
      return { title: t("fullExamLabel"), sub: t("fullExamSub"), tag: t("dayLabel", { n: "1–5" }) };
    }
    return {
      title: t("day" + exam.day + "Title"),
      sub: t("day" + exam.day + "Sub"),
      tag: t("dayLabel", { n: num(exam.day) })
    };
  }

  function renderHub() {
    var host = $("#hubView");
    if (!host) return;

    if (!BANK.length) {
      host.innerHTML = '<section class="panel-card error-card">' +
        '<h1 id="hubTitle">' + esc(t("bankErrorTitle")) + "</h1>" +
        "<p>" + esc(t("bankErrorBody")) + "</p></section>";
      return;
    }

    var cards = EXAMS.map(function (exam) {
      var meta = examMeta(exam);
      var count = questionsForExam(exam).length;
      var s = state.sessions[exam.key];
      var isFull = exam.day === null;

      var status = "", action = t("startExam"), actionIcon = "play", extra = "";
      if (s && s.finished) {
        var pct = scoreSession(s).percent;
        status = '<p class="exam-status is-done">' +
          esc(t("completedTag", { pct: num(pct) })) + "</p>";
        action = t("reviewExam"); actionIcon = "list";
        extra = '<button class="ghost-button compact" type="button" data-retake="' + exam.key + '">' +
          icon("rotate") + "<span>" + esc(t("retakeExam")) + "</span></button>";
      } else if (s) {
        status = '<p class="exam-status is-live">' +
          esc(t("inProgress", { done: num(answeredCount(s)), total: num(s.ids.length) })) + "</p>";
        action = t("resumeExam");
      }

      return '<article class="exam-card' + (isFull ? " is-full" : "") + '">' +
        '<header class="exam-card-head">' +
        '<span class="exam-tag">' + esc(meta.tag) + "</span>" +
        '<span class="badge ' + (exam.mode === "study" ? "badge-study" : "badge-exam") + '">' +
        icon(exam.mode === "study" ? "book" : "lock") +
        esc(exam.mode === "study" ? t("modeStudyTag") : t("modeExamTag")) + "</span>" +
        "</header>" +
        "<h3>" + esc(meta.title) + "</h3>" +
        '<p class="exam-sub">' + esc(meta.sub) + "</p>" +
        '<p class="exam-count">' + esc(t("questionsCount", { n: num(count) })) +
        (isFull ? ' <span class="dot-sep">·</span> ' + esc(t("passMarkTag", { n: num(PASS_MARK) })) : "") +
        "</p>" + status +
        '<div class="button-row">' +
        '<button class="primary-button" type="button" data-open="' + exam.key + '">' +
        icon(actionIcon) + "<span>" + esc(action) + "</span></button>" + extra +
        "</div></article>";
    }).join("");

    host.innerHTML =
      '<section class="hero">' +
      '<p class="eyebrow">' + esc(t("heroEyebrow")) + "</p>" +
      '<h1 id="hubTitle">' + esc(t("heroTitle")) + "</h1>" +
      '<p class="hero-subtitle">' + esc(t("heroSubtitle")) + "</p>" +
      '<p class="hero-description">' + esc(t("heroDescription")) + "</p>" +
      '<div class="stat-row">' +
      "<span><strong>" + num(BANK.length) + "</strong>" + esc(t("statQuestions")) + "</span>" +
      "<span><strong>" + num(EXAMS.length) + "</strong>" + esc(t("statExams")) + "</span>" +
      "<span><strong>2</strong>" + esc(t("statLanguages")) + "</span>" +
      "</div></section>" +
      '<section class="hub-head">' +
      "<h2>" + esc(t("hubTitle")) + "</h2>" +
      '<p class="muted-text">' + esc(t("hubHint")) + "</p>" +
      "</section>" +
      '<div class="exam-grid">' + cards + "</div>";
  }

  /* ----------------------------------------------------- practice screen */

  /* MCQ options get an A–D badge. True/False options get none: the option text
     already says True or False, so a badge beside it would just repeat it (and
     the bank's own wording won't always match a hardcoded label). */
  function optionLabel(q, position) {
    return q.type === "tf" ? null : String.fromCharCode(65 + position);
  }

  function labelSpan(q, position) {
    var label = optionLabel(q, position);
    return label === null ? "" : '<span class="answer-letter">' + esc(label) + "</span>";
  }

  /* How the feedback line names the correct option: a letter for MCQ, the
     option's own words for True/False. */
  function correctAnswerName(q, order) {
    var pos = order.indexOf(q.answer);
    return q.type === "tf"
      ? localized(q).options[q.answer]
      : String.fromCharCode(65 + pos);
  }

  function renderPractice() {
    var host = $("#practiceView");
    if (!host) return;
    var s = session();
    if (!s || s.finished) { host.innerHTML = ""; return; }

    var q = currentQuestion();
    if (!q) { host.innerHTML = ""; return; }

    var total = s.ids.length, position = s.current + 1;
    var selected = s.answers[q.id];
    var hasAnswer = Object.prototype.hasOwnProperty.call(s.answers, q.id);
    var flagged = !!s.flags[q.id];
    var revealed = isStudyMode() && !!s.revealed[q.id];
    var right = revealed && selected === q.answer;
    var percent = Math.round((answeredCount() / total) * 100);
    var loc = localized(q);
    var meta = examMeta(examByKey(s.examKey));

    var options = displayOptions(q).map(function (opt, pos) {
      var isSel = hasAnswer && selected === opt.originalIndex;
      var cls = ["answer-option"], mark = "";
      if (q.type === "tf") cls.push("is-tf");
      if (isSel) cls.push("is-selected");
      if (revealed) {
        cls.push("is-revealed");
        if (opt.originalIndex === q.answer) {
          cls.push("is-right");
          mark = '<span class="option-mark is-right">' + icon("check") + "</span>";
        } else if (isSel) {
          cls.push("is-wrong");
          mark = '<span class="option-mark is-wrong">' + icon("cross") + "</span>";
        }
      }
      return '<button class="' + cls.join(" ") + '" type="button" data-select="' + pos +
        '" aria-pressed="' + (isSel ? "true" : "false") + '"' + (revealed ? " disabled" : "") + ">" +
        labelSpan(q, pos) +
        '<span class="answer-text">' + esc(opt.text) + "</span>" + mark + "</button>";
    }).join("");

    var feedback = "";
    if (revealed) {
      feedback = '<section class="feedback-panel ' + (right ? "is-correct" : "is-incorrect") +
        '" role="status" aria-live="polite">' +
        '<p class="feedback-verdict"><span class="feedback-icon">' +
        icon(right ? "check" : "cross") + "</span>" +
        esc(right ? t("feedbackCorrect") : t("feedbackIncorrect")) + "</p>" +
        (right ? "" : '<p class="feedback-correct-line">' +
          esc(t("feedbackCorrectIs", { letter: correctAnswerName(q, s.orders[q.id]) })) + "</p>") +
        '<div class="explanation"><strong>' + esc(t("explanation")) + "</strong><p>" +
        esc(loc.explanation) + "</p></div></section>";
    }

    var willReveal = isStudyMode() && hasAnswer && !revealed;
    var hint = "";
    if (isStudyMode() && hasAnswer) {
      hint = revealed
        ? '<span class="locked-note">' + esc(t("answerLocked")) + "</span>"
        : '<span class="reveal-hint">' + icon("arrowNext") + esc(t("pressNextToReveal")) + "</span>";
    }

    host.innerHTML =
      '<div class="section-head">' +
      "<div>" +
      '<p class="eyebrow">' + esc(meta.tag + " — " + meta.title) + "</p>" +
      '<h1 id="practiceTitle">' +
      esc(t("questionOf", { current: num(position), total: num(total) })) + "</h1>" +
      "</div>" +
      '<div class="metric-row">' +
      "<span>" + esc(t("answeredCount", { n: num(answeredCount()) })) + "</span>" +
      (isStudyMode() ? "<span>" + esc(t("studyProgress", { n: num(revealedCount()) })) + "</span>" : "") +
      "<span>" + esc(t("flaggedCount", { n: num(flaggedCount()) })) + "</span>" +
      '<span class="timer-metric"><small>' + esc(t("elapsed")) +
      '</small><strong id="elapsedValue">' + formatClock(s.elapsedSeconds) + "</strong></span>" +
      "</div></div>" +

      '<div class="progress-block">' +
      '<div class="progress-label"><span>' + esc(t("progressLabel")) + "</span><strong>" +
      num(percent) + "%</strong></div>" +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      percent + '"><span style="width:' + percent + '%"></span></div></div>' +

      '<div class="practice-grid">' +
      '<section class="panel-card question-card">' +
      '<p class="question-text">' + esc(loc.question) + "</p>" +
      '<div class="answer-list' + (q.type === "tf" ? " is-tf-list" : "") + '">' + options + "</div>" +
      (hint ? '<div class="study-action-row">' + hint + "</div>" : "") +
      feedback +
      '<div class="question-actions">' +
      '<div class="button-row">' +
      '<button class="exam-nav-button" type="button" data-action="prev"' +
      (s.current === 0 ? " disabled" : "") + ">" + icon("arrowPrev") +
      "<span>" + esc(t("previous")) + "</span></button>" +
      '<button class="' + (willReveal || revealed ? "primary-button" : "exam-nav-button") +
      '" type="button" data-action="next"' +
      (s.current === total - 1 && !willReveal ? " disabled" : "") + "><span>" +
      esc(t("next")) + "</span>" + icon("arrowNext") + "</button>" +
      "</div>" +
      '<div class="button-row">' +
      '<button class="ghost-button" type="button" data-action="clear"' +
      (hasAnswer && !revealed ? "" : " disabled") + ">" + icon("eraser") +
      "<span>" + esc(t("clearAnswer")) + "</span></button>" +
      '<button class="ghost-button' + (flagged ? " is-flagged" : "") +
      '" type="button" data-action="flag">' + icon("flag") +
      "<span>" + esc(flagged ? t("unflag") : t("flag")) + "</span></button>" +
      '<button class="' + (isStudyMode() ? "ghost-button" : "primary-button") +
      '" type="button" data-action="confirm-finish">' + icon("send") +
      "<span>" + esc(t("finish")) + "</span></button>" +
      "</div></div></section>" +

      '<aside class="panel-card palette-card">' +
      '<details class="palette-details" open>' +
      "<summary>" + icon("grid") + "<span>" + esc(t("questionMap")) + "</span></summary>" +
      '<div class="jump-grid">' + renderPalette() + "</div>" +
      '<ul class="palette-legend">' +
      '<li><span class="dot is-current"></span>' + esc(t("legendCurrent")) + "</li>" +
      '<li><span class="dot is-answered"></span>' + esc(t("legendAnswered")) + "</li>" +
      '<li><span class="dot is-unanswered"></span>' + esc(t("legendUnanswered")) + "</li>" +
      '<li><span class="dot is-flagged"></span>' + esc(t("legendFlagged")) + "</li>" +
      "</ul></details></aside></div>";
  }

  function renderPalette() {
    var s = session();
    return s.ids.map(function (id, index) {
      var cls = ["question-jump"];
      if (index === s.current) cls.push("is-current");
      cls.push(Object.prototype.hasOwnProperty.call(s.answers, id) ? "is-answered" : "is-unanswered");
      /* Exam mode must never leak correctness through the palette. */
      if (isStudyMode() && s.revealed[id]) cls.push(isCorrect(id) ? "is-right" : "is-wrong");
      if (s.flags[id]) cls.push("is-flagged");
      return '<button class="' + cls.join(" ") + '" type="button" data-jump="' + index +
        '" aria-label="' + esc(t("goToQuestion", { n: num(index + 1) })) + '"' +
        (index === s.current ? ' aria-current="true"' : "") + ">" + num(index + 1) + "</button>";
    }).join("");
  }

  /* ------------------------------------------------------ results screen */

  function renderResults() {
    var host = $("#resultsView");
    if (!host) return;
    var s = session();
    if (!s || !s.finished) { host.innerHTML = ""; return; }

    var totals = scoreSession(s);
    var exam = examByKey(s.examKey);
    var meta = examMeta(exam);
    var isFull = exam.day === null;

    var verdict;
    if (isFull) {
      verdict = totals.percent >= PASS_MARK
        ? '<p class="verdict is-pass">' + icon("check") +
          esc(t("mockPass", { n: num(PASS_MARK) })) + "</p>"
        : '<p class="verdict is-fail">' + icon("cross") +
          esc(t("mockFail", { n: num(PASS_MARK) })) + "</p>";
    } else {
      var perf = totals.percent >= 85 ? "perfStrong" : totals.percent >= 70 ? "perfGood"
        : totals.percent >= 50 ? "perfDeveloping" : "perfFoundational";
      verdict = '<p class="performance-label">' + esc(t("performanceLabel")) +
        ": <strong>" + esc(t(perf)) + "</strong></p>";
    }

    var rows = Object.keys(totals.byStandard).sort().map(function (k) {
      var b = totals.byStandard[k];
      var pct = b.total ? Math.round((b.correct / b.total) * 100) : 0;
      return '<li class="breakdown-row">' +
        '<span class="breakdown-name">' + esc(k) + "</span>" +
        '<span class="breakdown-bar"><span style="width:' + pct + '%"></span></span>' +
        '<span class="breakdown-score">' + num(b.correct) + " / " + num(b.total) + "</span></li>";
    }).join("");

    host.innerHTML =
      '<div class="section-head"><div>' +
      '<p class="eyebrow">' + esc(meta.tag + " — " + t("resultsEyebrow")) + "</p>" +
      '<h1 id="resultsTitle">' + esc(t("resultsTitle")) + "</h1>" +
      "</div></div>" +

      '<section class="panel-card score-card">' +
      '<div class="score-dial" style="--pct:' + totals.percent + '">' +
      "<strong>" + num(totals.percent) + "%</strong><small>" + esc(t("scoreLabel")) + "</small></div>" +
      '<div class="score-facts">' + verdict +
      '<ul class="fact-list">' +
      '<li><span class="fact-icon is-correct">' + icon("check") + "</span><span>" +
      esc(t("correct")) + "</span><strong>" + num(totals.correct) + "</strong></li>" +
      '<li><span class="fact-icon is-incorrect">' + icon("cross") + "</span><span>" +
      esc(t("incorrect")) + "</span><strong>" + num(totals.incorrect) + "</strong></li>" +
      '<li><span class="fact-icon is-blank">' + icon("dash") + "</span><span>" +
      esc(t("unanswered")) + "</span><strong>" + num(totals.unanswered) + "</strong></li>" +
      "<li><span></span><span>" + esc(t("totalQuestions")) + "</span><strong>" +
      num(totals.total) + "</strong></li>" +
      "<li><span></span><span>" + esc(t("timeTaken")) + "</span><strong>" +
      formatClock(s.elapsedSeconds) + "</strong></li>" +
      "</ul></div></section>" +

      '<section class="panel-card"><h2>' + esc(t("breakdownTitle")) + "</h2>" +
      '<ul class="breakdown-list">' + rows + "</ul></section>" +

      '<p class="practice-disclaimer">' + esc(t("practiceOnlyNote")) + "</p>" +

      '<div class="button-row">' +
      '<button class="primary-button" type="button" data-action="open-review">' + icon("list") +
      "<span>" + esc(t("reviewAnswers")) + "</span></button>" +
      '<button class="ghost-button" type="button" data-action="confirm-retake">' + icon("rotate") +
      "<span>" + esc(t("retakeExam")) + "</span></button>" +
      '<button class="ghost-button" type="button" data-action="back-hub">' + icon("back") +
      "<span>" + esc(t("backToHub")) + "</span></button>" +
      "</div>";
  }

  /* ------------------------------------------------------- review screen */

  function renderReview() {
    var host = $("#reviewView");
    if (!host) return;
    var s = session();
    if (!s || !s.finished) { host.innerHTML = ""; return; }

    var filter = s.reviewFilter || "all";
    var visible = s.ids.filter(function (id) {
      var answered = Object.prototype.hasOwnProperty.call(s.answers, id);
      if (filter === "incorrect") return answered && !isCorrect(id, s);
      if (filter === "unanswered") return !answered;
      if (filter === "flagged") return !!s.flags[id];
      return true;
    });

    var counts = {
      all: s.ids.length,
      incorrect: s.ids.filter(function (id) {
        return Object.prototype.hasOwnProperty.call(s.answers, id) && !isCorrect(id, s);
      }).length,
      unanswered: s.ids.filter(function (id) {
        return !Object.prototype.hasOwnProperty.call(s.answers, id);
      }).length,
      flagged: s.ids.filter(function (id) { return !!s.flags[id]; }).length
    };

    var filters = [["all", t("filterAll"), counts.all],
      ["incorrect", t("filterIncorrect"), counts.incorrect],
      ["unanswered", t("filterUnanswered"), counts.unanswered],
      ["flagged", t("filterFlagged"), counts.flagged]].map(function (f) {
        var on = filter === f[0];
        return '<button class="filter-button' + (on ? " is-active" : "") +
          '" type="button" data-filter="' + f[0] + '" aria-pressed="' + (on ? "true" : "false") +
          '">' + esc(f[1]) + '<span class="filter-count">' + num(f[2]) + "</span></button>";
      }).join("");

    var cards = visible.map(function (id) {
      return reviewCard(id, s.ids.indexOf(id) + 1, s);
    }).join("");

    host.innerHTML =
      '<div class="section-head"><div>' +
      '<p class="eyebrow">' + esc(t("reviewEyebrow")) + "</p>" +
      '<h1 id="reviewTitle">' + esc(t("reviewTitle")) + "</h1></div>" +
      '<div class="button-row">' +
      '<button class="ghost-button" type="button" data-action="back-to-results"><span>' +
      esc(t("backToResults")) + "</span></button></div></div>" +
      '<div class="filter-row" role="group">' + filters + "</div>" +
      (cards || '<p class="empty-note">' + esc(t("filterEmpty")) + "</p>");
  }

  function reviewCard(id, position, s) {
    var q = questionById(id);
    var loc = localized(q);
    var order = s.orders[id];
    var answered = Object.prototype.hasOwnProperty.call(s.answers, id);
    var chosen = s.answers[id];
    var right = answered && chosen === q.answer;

    var statusKey = !answered ? "statusUnanswered" : (right ? "statusCorrect" : "statusIncorrect");
    var statusClass = !answered ? "is-blank" : (right ? "is-correct" : "is-incorrect");

    var rows = order.map(function (originalIndex, pos) {
      var cls = ["review-option"], mark = "";
      if (originalIndex === q.answer) {
        cls.push("is-correct");
        mark = '<span class="review-mark is-correct">' + icon("check") + "</span>";
      }
      if (answered && originalIndex === chosen && originalIndex !== q.answer) {
        cls.push("is-chosen-wrong");
        mark = '<span class="review-mark is-incorrect">' + icon("cross") + "</span>";
      }
      return '<li class="' + cls.join(" ") + '">' +
        labelSpan(q, pos) +
        '<span class="answer-text">' + esc(loc.options[originalIndex]) + "</span>" + mark + "</li>";
    }).join("");

    return '<article class="panel-card review-card ' + statusClass + '">' +
      '<header class="review-head">' +
      '<span class="review-index">' + esc(t("questionN", { n: num(position) })) + "</span>" +
      (q.standard ? '<span class="badge badge-standard">' + esc(q.standard) + "</span>" : "") +
      (s.flags[id] ? '<span class="badge badge-flagged">' + icon("flag") +
        esc(t("statusFlagged")) + "</span>" : "") +
      '<span class="badge badge-status ' + statusClass + '">' + esc(t(statusKey)) + "</span>" +
      "</header>" +
      '<p class="question-text">' + esc(loc.question) + "</p>" +
      '<ul class="review-options">' + rows + "</ul>" +
      '<dl class="review-summary">' +
      "<dt>" + esc(t("yourAnswer")) + "</dt><dd" + (answered ? "" : ' class="is-blank"') + ">" +
      esc(answered ? loc.options[chosen] : t("noAnswer")) + "</dd>" +
      "<dt>" + esc(t("correctAnswer")) + "</dt><dd>" + esc(loc.options[q.answer]) + "</dd>" +
      (q.clause ? "<dt>" + esc(t("clauseLabel")) + "</dt><dd>" + esc(q.clause) + "</dd>" : "") +
      "</dl>" +
      '<div class="explanation"><strong>' + esc(t("explanation")) + "</strong><p>" +
      esc(loc.explanation) + "</p></div></article>";
  }

  /* ---------------------------------------------------------------- modal */

  function openModal(cfg) {
    pendingModal = cfg;
    var layer = $("#modalLayer"), card = $("#modalCard");
    if (!layer || !card) return;
    card.innerHTML = '<h2 id="modalTitle">' + esc(cfg.title) + "</h2><p>" + esc(cfg.body) + "</p>" +
      '<div class="button-row">' +
      '<button class="primary-button" type="button" data-modal="confirm">' +
      esc(cfg.confirmLabel) + "</button>" +
      '<button class="ghost-button" type="button" data-modal="cancel">' +
      esc(cfg.cancelLabel) + "</button></div>";
    layer.hidden = false;
    document.body.classList.add("modal-open");
    var first = card.querySelector("[data-modal='confirm']");
    if (first) first.focus();
    announce(cfg.title);
  }

  function closeModal() {
    pendingModal = null;
    var layer = $("#modalLayer");
    if (layer) layer.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function confirmFinish() {
    var remaining = session().ids.length - answeredCount();
    openModal({
      title: t("confirmTitle"),
      body: remaining > 0 ? t("confirmUnanswered", { n: num(remaining) }) : t("confirmComplete"),
      confirmLabel: t("confirmYes"), cancelLabel: t("confirmNo"),
      onConfirm: finishSession
    });
  }

  function confirmRetake(key) {
    openModal({
      title: t("restartConfirmTitle"), body: t("restartConfirmBody"),
      confirmLabel: t("restartYes"), cancelLabel: t("cancel"),
      onConfirm: function () {
        if (key) { state.activeExam = key; }
        retakeExam();
      }
    });
  }

  /* --------------------------------------------------------------- events */

  function setLanguage(lang) {
    if ((lang !== "ar" && lang !== "en") || state.lang === lang) return;
    state.lang = lang;
    saveState();
    /* ids, orders, answers, flags and revealed are all language-neutral, so
       re-rendering only swaps strings. */
    render();
  }

  function onClick(e) {
    var lang = e.target.closest("[data-lang]");
    if (lang) { setLanguage(lang.getAttribute("data-lang")); return; }

    var modal = e.target.closest("[data-modal]");
    if (modal) {
      var kind = modal.getAttribute("data-modal");
      var handler = pendingModal && pendingModal.onConfirm;
      closeModal();
      if (kind === "confirm" && handler) handler();
      return;
    }

    var retake = e.target.closest("[data-retake]");
    if (retake) { confirmRetake(retake.getAttribute("data-retake")); return; }

    var open = e.target.closest("[data-open]");
    if (open) { openExam(open.getAttribute("data-open")); return; }

    var back = e.target.closest("#backToHub");
    if (back) { backToHub(); return; }

    var sel = e.target.closest("[data-select]");
    if (sel && session() && !session().finished) {
      selectAnswer(currentQuestion(), Number(sel.getAttribute("data-select")));
      return;
    }

    var jump = e.target.closest("[data-jump]");
    if (jump && session()) { goTo(Number(jump.getAttribute("data-jump"))); return; }

    var filter = e.target.closest("[data-filter]");
    if (filter && session()) {
      session().reviewFilter = filter.getAttribute("data-filter");
      saveState(); renderReview();
      return;
    }

    var action = e.target.closest("[data-action]");
    if (action) handleAction(action.getAttribute("data-action"));
  }

  function handleAction(action) {
    switch (action) {
      case "prev": goTo(session().current - 1); break;
      case "next": advance(); break;
      case "clear": clearAnswer(currentQuestion()); break;
      case "flag": toggleFlag(currentQuestion()); break;
      case "confirm-finish": confirmFinish(); break;
      case "open-review": state.view = "review"; saveState(); render(); break;
      case "back-to-results": state.view = "results"; saveState(); render(); break;
      case "confirm-retake": confirmRetake(state.activeExam); break;
      case "back-hub": backToHub(); break;
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape" && pendingModal) { closeModal(); render(); return; }
    var s = session();
    if (!s || s.finished || state.view !== "practice" || pendingModal) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    var forward = state.lang === "ar" ? "ArrowLeft" : "ArrowRight";
    var back = state.lang === "ar" ? "ArrowRight" : "ArrowLeft";
    if (e.key === forward) { e.preventDefault(); advance(); }
    else if (e.key === back) { e.preventDefault(); goTo(s.current - 1); }
    else if (/^[1-4]$/.test(e.key)) {
      var q = currentQuestion();
      var pos = Number(e.key) - 1;
      if (q && pos < s.orders[q.id].length) { e.preventDefault(); selectAnswer(q, pos); }
    } else if (e.key === "Enter" && isStudyMode() && tag !== "button") {
      e.preventDefault(); advance();
    }
  }

  /* ----------------------------------------------------------------- init */

  function init() {
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("beforeunload", saveState);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) saveState();
    });
    var layer = $("#modalLayer");
    if (layer) layer.addEventListener("click", function (e) {
      if (e.target === layer) { closeModal(); render(); }
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
