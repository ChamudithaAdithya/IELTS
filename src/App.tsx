import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BarChart3, Bookmark, BookOpen, Check, ChevronRight, Flame, Headphones, Home,
  Library, Menu, PenLine, Play, Search, Settings2, Sparkles, Target, Volume2, X
} from "lucide-react";
import foundationVocabularyData from "./content/foundation-vocabulary.json";
import vocabularyData from "./content/vocabulary.json";
import { sinhalaGlosses } from "./content/sinhala";
import { curriculum } from "./content/curriculum";
import { getLesson, learningQuestions, lessons } from "./content/lessons";
import { createAttemptId, gradeQuestion, nextReview } from "./services/grading";
import { defaultSettings, getLessonProgress, getMistakes, getSettings, getWordProgress, resolveMistake, saveAttempt, saveLessonProgress, saveMistake, saveSettings, saveVocabularyReview, saveWordProgress } from "./services/storage";
import { listEnglishVoices, speakVocabulary, stopSpeech } from "./services/speech";
import type { LearningQuestion, Lesson, MistakeRecord, UserSettings, VocabularyEntry } from "./types";

const vocabulary = [...(foundationVocabularyData as VocabularyEntry[]), ...(vocabularyData as VocabularyEntry[])];
type View = "home" | "learn" | "lesson" | "vocabulary" | "practice" | "writing" | "progress";
type SpeechStatus = "idle" | "preparing" | "playing";

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "learn", label: "Learn", icon: Library },
  { id: "vocabulary", label: "Vocabulary", icon: BookOpen },
  { id: "practice", label: "Practice", icon: Sparkles },
  { id: "writing", label: "Writing", icon: PenLine },
  { id: "progress", label: "Progress", icon: BarChart3 }
];

const levelOrder = { A2: 0, B1: 1, B2: 2, C1: 3, C2: 4 } as const;

function normaliseSearch(value: string) {
  return value.toLocaleLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ");
}

function similarity(first: string, second: string) {
  if (first === second) return 1;
  if (!first || !second) return 0;
  if (first.startsWith(second) || second.startsWith(first)) return 0.9;
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= second.length; column += 1) {
      const saved = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (first[row - 1] === second[column - 1] ? 0 : 1));
      diagonal = saved;
    }
  }
  return 1 - previous[second.length] / Math.max(first.length, second.length);
}

function searchVocabulary(query: string) {
  const term = normaliseSearch(query);
  if (!term) return [...vocabulary].sort((first, second) => levelOrder[first.level] - levelOrder[second.level] || first.word.localeCompare(second.word));
  const words = term.split(" ");
  return vocabulary
    .map((entry) => {
      const word = normaliseSearch(entry.word);
      const searchable = normaliseSearch([entry.word, entry.definition, entry.sinhala ?? sinhalaGlosses[entry.id] ?? "", ...entry.tags].join(" "));
      const wordScore = Math.max(similarity(term, word), ...words.map((piece) => similarity(piece, word)));
      const contains = searchable.includes(term) || words.some((piece) => searchable.includes(piece));
      return { entry, score: contains ? Math.max(wordScore, 0.94) : wordScore };
    })
    .filter(({ score }) => score >= 0.8)
    .sort((first, second) => second.score - first.score || levelOrder[first.entry.level] - levelOrder[second.entry.level] || first.entry.word.localeCompare(second.entry.word))
    .map(({ entry }) => entry);
}

export default function App() {
  const [view, setView] = useState<View>(() => readViewFromHash());
  const [query, setQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState(vocabulary[0]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle");
  const [activeLetter, setActiveLetter] = useState(-1);
  const [selectedLessonId, setSelectedLessonId] = useState("lesson-adverbs-basics");
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [, refreshVoices] = useState(0);
  const spellingTimer = useRef<number | undefined>(undefined);
  const spellingStartTimer = useRef<number | undefined>(undefined);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    let active = true;
    void Promise.all([getSettings(), getMistakes(), new Promise<void>((resolve) => window.setTimeout(resolve, 420))]).then(([storedSettings, storedMistakes]) => {
      if (!active) return;
      setSettings(storedSettings);
      setMistakes(storedMistakes);
      setReady(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { void getWordProgress(selectedWord.id).then((record) => setSaved(Boolean(record?.saved))); }, [selectedWord.id]);
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const loadVoices = () => refreshVoices((revision) => revision + 1);
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);
  useEffect(() => {
    const followHistory = () => {
      const lessonId = readLessonIdFromHash();
      if (lessonId && getLesson(lessonId)) setSelectedLessonId(lessonId);
      setView(readViewFromHash());
    };
    window.addEventListener("hashchange", followHistory);
    window.addEventListener("popstate", followHistory);
    return () => {
      window.removeEventListener("hashchange", followHistory);
      window.removeEventListener("popstate", followHistory);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  const stopSpellingAnimation = () => {
    if (spellingStartTimer.current !== undefined) window.clearTimeout(spellingStartTimer.current);
    if (spellingTimer.current !== undefined) window.clearInterval(spellingTimer.current);
    spellingStartTimer.current = undefined;
    spellingTimer.current = undefined;
    setActiveLetter(-1);
  };
  const startSpellingAnimation = () => {
    stopSpellingAnimation();
    let current = 0;
    spellingStartTimer.current = window.setTimeout(() => {
      spellingStartTimer.current = undefined;
      setActiveLetter(current);
      spellingTimer.current = window.setInterval(() => {
        current += 1;
        if (current >= selectedWord.word.length) {
          stopSpellingAnimation();
          return;
        }
        setActiveLetter(current);
      }, 170);
    }, 360);
  };
  useEffect(() => () => stopSpellingAnimation(), []);

  const setCurrentView = (next: View) => {
    if (next === "lesson") return;
    if (window.location.hash !== `#/${next}`) window.history.pushState({ view: next }, "", `#/${next}`);
    setView(next);
    setSidebarOpen(false);
  };
  const play = () => {
    if (speechStatus !== "idle") {
      stopSpeech();
      stopSpellingAnimation();
      setSpeechStatus("idle");
      return;
    }
    setSpeechStatus("preparing");
    const supported = speakVocabulary(selectedWord, settings, {
      onStart: () => { setSpeechStatus("playing"); startSpellingAnimation(); },
      onEnd: () => { setSpeechStatus("idle"); stopSpellingAnimation(); },
      onError: () => { setSpeechStatus("idle"); stopSpellingAnimation(); notify("That voice could not play this word. Choose another installed English voice."); }
    });
    if (!supported) {
      setSpeechStatus("idle");
      stopSpellingAnimation();
      notify("Speech playback is not supported in this browser.");
    }
  };
  const toggleSaved = async () => {
    const next = !saved;
    await saveWordProgress({ vocabularyId: selectedWord.id, mastery: "seen", saved: next });
    setSaved(next);
    notify(next ? "Word saved to your review list." : "Word removed from saved words.");
  };
  const updateSettings = async (next: UserSettings) => { setSettings(next); await saveSettings(next); };
  const showWord = (word: VocabularyEntry) => {
    stopSpeech();
    stopSpellingAnimation();
    setSpeechStatus("idle");
    setSelectedWord(word);
    setCurrentView("vocabulary");
  };
  const openLesson = async (lessonId: string) => {
    const now = new Date().toISOString();
    setSelectedLessonId(lessonId);
    window.history.pushState({ view: "lesson", lessonId }, "", `#/lesson/${lessonId}`);
    setView("lesson");
    setSidebarOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const existing = await getLessonProgress(lessonId);
    await saveLessonProgress({ lessonId, status: existing?.status === "completed" ? "completed" : "in-progress", completedSectionIds: existing?.completedSectionIds ?? [], masteryEstimate: existing?.masteryEstimate ?? 0, startedAt: existing?.startedAt ?? now, lastStudiedAt: now, completedAt: existing?.completedAt });
  };
  const recordAttempt = async (question: LearningQuestion, answer: string | string[], correct: boolean) => {
    const now = new Date().toISOString();
    await saveAttempt({ id: createAttemptId(question.id), exerciseId: question.exerciseId, questionId: question.id, submittedAnswer: answer, isCorrect: correct, testedConceptIds: question.conceptIds, remediationLessonIds: question.remediationLessonIds, attemptedAt: now });
    if (correct) {
      await resolveMistake(question.id);
      setMistakes((current) => current.filter((mistake) => mistake.questionId !== question.id));
    } else {
      const existing = mistakes.find((mistake) => mistake.questionId === question.id);
      const mistake: MistakeRecord = { id: question.id, questionId: question.id, exerciseId: question.exerciseId, conceptIds: question.conceptIds, remediationLessonIds: question.remediationLessonIds, latestAnswer: answer, latestExplanation: question.explanation, occurrences: (existing?.occurrences ?? 0) + 1, lastAttemptedAt: now };
      await saveMistake(mistake);
      setMistakes((current) => [mistake, ...current.filter((item) => item.questionId !== question.id)]);
      await Promise.all(question.remediationLessonIds.flatMap((lessonId) => {
        const lesson = getLesson(lessonId);
        return (lesson?.vocabularyIds ?? []).map(async (vocabularyId) => {
          const review = nextReview(1, false);
          await saveVocabularyReview({ vocabularyId, repetitionCount: 0, intervalDays: review.intervalDays, nextReviewAt: review.nextReviewAt, lastReviewedAt: now });
        });
      }));
    }
  };
  const completeLesson = async (lesson: Lesson) => {
    const now = new Date().toISOString();
    await saveLessonProgress({ lessonId: lesson.id, status: "completed", completedSectionIds: lesson.sections.map((section) => section.id), masteryEstimate: 100, lastStudiedAt: now, completedAt: now });
    notify("Lesson completed. Your progress has been saved locally.");
  };

  if (!ready) return <LoadingScreen />;

  return <div className="app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Sidebar active={view} onSelect={setCurrentView} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <section className="workspace">
      <Header query={query} setQuery={setQuery} onMenu={() => setSidebarOpen(true)} onSearch={() => setCurrentView("vocabulary")} />
      <main id="main-content" className="main-content">
        {view === "home" && <HomePage onView={setCurrentView} />}
        {view === "learn" && <LearnPage onView={setCurrentView} onOpenLesson={(id) => void openLesson(id)} />}
        {view === "lesson" && <LessonPage lesson={getLesson(selectedLessonId) ?? lessons[0]} onBack={() => setCurrentView("learn")} onOpenLesson={(id) => void openLesson(id)} onAttempt={recordAttempt} onComplete={completeLesson} />}
        {view === "vocabulary" && <VocabularyPage query={query} word={selectedWord} setWord={showWord} onPlay={play} speechStatus={speechStatus} activeLetter={activeLetter} saved={saved} onSave={() => void toggleSaved()} settings={settings} onSettings={updateSettings} />}
        {view === "practice" && <PracticePage onOpenLesson={(id) => void openLesson(id)} onAttempt={recordAttempt} />}
        {view === "writing" && <WritingPage />}
        {view === "progress" && <ProgressPage mistakes={mistakes} onOpenLesson={(id) => void openLesson(id)} />}
      </main>
    </section>
    <MobileNav active={view} onSelect={setCurrentView} />
    {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
  </div>;
}

function readViewFromHash(): View {
  const value = window.location.hash.replace(/^#\/?/, "") as View;
  if (value.startsWith("lesson/")) return "lesson";
  return navItems.some((item) => item.id === value) ? value : "home";
}

function readLessonIdFromHash() {
  const match = window.location.hash.match(/^#\/lesson\/([^/]+)$/);
  return match?.[1];
}

function LoadingScreen() {
  return <main className="loading-screen" aria-busy="true" aria-live="polite"><div className="loading-brand"><div className="crest">IA</div><div><strong>IELTS Academy</strong><span>Preparing your learning space</span></div></div><div className="loading-card"><i /><i /><i /></div><p>Loading your local progress and reviewed vocabulary…</p></main>;
}

function Sidebar({ active, onSelect, open, onClose }: { active: View; onSelect: (view: View) => void; open: boolean; onClose: () => void }) {
  return <><button className={`scrim ${open ? "show" : ""}`} onClick={onClose} aria-label="Close navigation" />
    <aside className={`sidebar ${open ? "open" : ""}`}><div className="brand"><div className="crest">IA</div><div><strong>IELTS Academy</strong><span>Academic English Suite</span></div><button className="close-nav" onClick={onClose} aria-label="Close navigation"><X /></button></div>
      <p className="side-label">Learning spaces</p><nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => onSelect(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <div className="focus-card"><span>Today’s focus</span><strong>Academic trends</strong><p>Build precise language for IELTS Task 1 data descriptions.</p><button onClick={() => onSelect("practice")}>Continue lesson <ChevronRight size={15} /></button></div>
    </aside></>;
}

function Header({ query, setQuery, onMenu, onSearch }: { query: string; setQuery: (value: string) => void; onMenu: () => void; onSearch: () => void }) {
  return <header className="app-header"><button className="menu-button" onClick={onMenu} aria-label="Open navigation"><Menu /></button><div className="crumb"><span>Candidate AC-8849</span><i /> <span>IELTS Learning Academy</span></div><label className="global-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={onSearch} placeholder="Search words, lessons and skills" aria-label="Search vocabulary and lessons" /></label><div className="header-actions"><span className="offline"><i />Offline ready</span><span className="streak"><Flame size={16} />14</span><span className="avatar">K</span></div></header>;
}

function MobileNav({ active, onSelect }: { active: View; onSelect: (view: View) => void }) {
  const items = navItems.filter(({ id }) => ["home", "learn", "vocabulary", "practice", "progress"].includes(id));
  return <nav className="mobile-nav" aria-label="Primary navigation">{items.map(({ id, label, icon: Icon }) => <button className={active === id ? "active" : ""} key={id} onClick={() => onSelect(id)}><Icon size={21} /><span>{label}</span></button>)}</nav>;
}

function HomePage({ onView }: { onView: (view: View) => void }) {
  return <div className="page"><section className="home-grid"><article className="hero-card"><span className="eyebrow">Good morning, Kasun</span><h1>Make every English word do useful work.</h1><p>Today’s sequence connects vocabulary, grammar and a short IELTS writing application.</p><div className="hero-progress"><span>Lesson 04 of 12</span><div><i /></div><b>58%</b></div><button className="button light" onClick={() => onView("practice")}>Continue today’s sequence <ChevronRight size={18} /></button></article><article className="review-card"><div className="section-row"><div><span className="eyebrow teal">Daily review</span><h2>Your recall is due.</h2></div><b className="review-number">12</b></div><p>Seven vocabulary cards and five grammar patterns are ready for retrieval practice.</p><div className="stat-row"><Stat value="8m" label="estimated" /><Stat value="84%" label="last recall" /><Stat value="3" label="new words" /></div><button className="button outline" onClick={() => onView("vocabulary")}>Start review <ChevronRight size={17} /></button></article></section>
    <Card heading="Academic Trends & Adverb Precision" label="Connected path" action="12 min remaining"><div className="journey">{[["✓", "Word family", "Significant, significance, significantly", "done"], ["02", "Grammar pattern", "Adverbs modify dynamic verbs of change", "now"], ["03", "Sentence repair", "Correct a typical Task 1 word-form error", "future"], ["04", "Apply in writing", "Use the language in a data-description sentence", "future"]].map(([number, title, copy, type]) => <div className={`journey-step ${type}`} key={number}><b>{number}</b><strong>{title}</strong><p>{copy}</p></div>)}</div></Card>
    <Card heading="Your developing skills" label="Evidence, not guesses" action="Open mastery" onAction={() => onView("progress")}><div className="skill-grid"><Skill title="Vocabulary depth" value={74} /><Skill title="Grammar control" value={61} tone="teal" /><Skill title="Writing application" value={48} tone="violet" /></div></Card>
  </div>;
}

function LearnPage({ onView, onOpenLesson }: { onView: (view: View) => void; onOpenLesson: (lessonId: string) => void }) { return <div className="page"><PageTitle label="A connected curriculum" title="Find your next useful step." text="Move freely through the map. Every advanced lesson shows the foundations that can make it easier." /><div className="level-grid">{curriculum.map((level, index) => <article className={`level-card ${level.color}`} key={level.id}><span>LEVEL {String(index + 1).padStart(2, "0")}</span><h2>{level.title}</h2><p>{level.description}</p><div className="lesson-pips">{Array.from({ length: 5 }, (_, pip) => <i className={pip < (index < 3 ? 2 : 0) ? "complete" : ""} key={pip} />)}</div><small>{level.outcome}</small><button onClick={() => onView(index < 3 ? "practice" : "writing")}>{index === 1 ? "Study vocabulary" : "Open level"}<ChevronRight size={16} /></button></article>)}</div><section className="content-card lesson-library"><div className="section-row"><div><span className="eyebrow">Data-driven starter lessons</span><h2>Study a complete lesson path</h2></div><span className="status-pill">{lessons.length} lessons</span></div><div className="lesson-list">{lessons.map((lesson) => <button key={lesson.id} onClick={() => onOpenLesson(lesson.id)}><span>{lesson.level} · {lesson.estimatedMinutes} min</span><strong>{lesson.title}</strong><p>{lesson.objectives[0]}</p><ChevronRight size={18} /></button>)}</div></section></div>; }

function VocabularyPage({ query, word, setWord, onPlay, speechStatus, activeLetter, saved, onSave, settings, onSettings }: { query: string; word: VocabularyEntry; setWord: (word: VocabularyEntry) => void; onPlay: () => void; speechStatus: SpeechStatus; activeLetter: number; saved: boolean; onSave: () => void; settings: UserSettings; onSettings: (settings: UserSettings) => void }) {
  const [showSettings, setShowSettings] = useState(false);
  const results = useMemo(() => {
    const uniqueWords = new Map<string, VocabularyEntry>();
    for (const entry of searchVocabulary(query)) {
      const key = normaliseSearch(entry.word);
      if (!uniqueWords.has(key)) uniqueWords.set(key, entry);
    }
    return [...uniqueWords.values()];
  }, [query]);
  const family = word.wordFamilyIds.map((id) => vocabulary.find((entry) => entry.id === id)).filter((entry): entry is VocabularyEntry => Boolean(entry));
  const voices = listEnglishVoices();
  const sinhala = word.sinhala ?? sinhalaGlosses[word.id];
  const isSpeaking = speechStatus !== "idle";
  return <div className="page vocabulary-page">
    <PageTitle label="Vocabulary academy" title="Learn words as a connected system." text="Start with everyday English, then build toward IELTS language. Search accepts close spellings from 80%." />
    <div className="vocab-layout">
      <aside className="word-results">
        <div className="result-heading"><strong>{results.length} unique words</strong><span>{query ? "Close matches need 80% similarity" : "Arranged from A2 foundations upward"}</span></div>
        {results.length ? results.slice(0, 40).map((entry) => <button className={entry.word === word.word ? "selected" : ""} key={entry.id} onClick={() => setWord(entry)}><b>{entry.word}</b><span>{entry.partOfSpeech} · {entry.level}</span><p>{entry.definition}</p></button>) : <p className="empty-results">No close match yet. Try a shorter word or another spelling.</p>}
      </aside>
      <section className="word-detail">
        <div className="word-detail-top">
          <div>
            <div className="word-name">
              <h1>{word.word}</h1>
              {sinhala && <span className="headword-sinhala" lang="si">{sinhala}</span>}
              <button className={`sound-button ${isSpeaking ? "playing" : ""}`} onClick={onPlay} aria-label={isSpeaking ? `Stop ${word.word}` : `Hear ${word.word} pronounced`} aria-pressed={isSpeaking} aria-busy={speechStatus === "preparing"}>
                {speechStatus === "preparing" ? <span className="sound-loader" /> : speechStatus === "playing" ? <Volume2 size={20} /> : <Play size={19} fill="currentColor" />}
              </button>
            </div>
            <span className="ipa">{word.ipa}</span>
            <div className="spelling" aria-label={`Spelling: ${word.word}`}><b>Spelling</b><span>{[...word.word].map((letter, index) => <i className={index === activeLetter ? "active" : ""} key={`${letter}-${index}`}>{letter}</i>)}</span></div>
          </div>
          <button className={`bookmark ${saved ? "saved" : ""}`} onClick={onSave} aria-label={saved ? "Remove saved word" : "Save word"}><Bookmark size={20} fill={saved ? "currentColor" : "none"} /></button>
        </div>
        <div className="tags"><span className={word.partOfSpeech}>{word.partOfSpeech}</span><span className="level-tag">{word.level}</span><span className="retained">Ready for review</span></div>
        <p className="definition">{word.definition}</p>
        <div className="audio-panel"><Headphones size={19} /><div><b>{speechStatus === "preparing" ? "Preparing pronunciation…" : speechStatus === "playing" ? "Playing word, spelling and example" : "Pronunciation"}</b><span>{speechStatus === "preparing" ? "Your device is starting its selected voice." : "Play the word, its letter-by-letter spelling, then the natural example."}</span></div><button onClick={() => setShowSettings(!showSettings)}><Settings2 size={18} /> Voice settings</button></div>
        {showSettings && <div className="voice-settings"><label>Voice<select value={settings.preferredVoiceName ?? ""} onChange={(event) => void onSettings({ ...settings, preferredVoiceName: event.target.value || undefined })}><option value="">Recommended English voice</option>{voices.map((voice) => <option value={voice.name} key={`${voice.name}-${voice.lang}`}>{voice.name} ({voice.lang})</option>)}</select></label><label>Speed <input type="range" min="0.85" max="1.1" step="0.05" value={settings.speechRate} onChange={(event) => void onSettings({ ...settings, speechRate: Number(event.target.value) })} /><output>{settings.speechRate.toFixed(2)}×</output></label></div>}
        <section className="example"><span>Natural example</span><p>{word.example}</p></section>
        <h2>Word family</h2><div className="family-grid"><FamilyCard entry={word} selected />{family.map((entry) => <FamilyCard entry={entry} key={entry.id} onClick={() => setWord(entry)} />)}</div>
        <h2>Useful collocations</h2><div className="collocations">{word.collocations.map((item) => <span key={item}>{item}</span>)}</div>
      </section>
    </div>
  </div>;
}

function PracticePage({ onOpenLesson, onAttempt }: { onOpenLesson: (lessonId: string) => void; onAttempt: (question: LearningQuestion, answer: string | string[], correct: boolean) => Promise<void> }) {
  const [index, setIndex] = useState(0);
  const question = learningQuestions[index];
  return <div className="page"><PageTitle label={`Guided practice · ${index + 1} of ${learningQuestions.length}`} title="Learn the pattern, then use it." text="Every answer is saved locally, explained, and connected to a precise lesson when revision will help." /><div className="practice-layout"><article className="lesson-panel"><span className="lesson-kind">Connected practice</span><h2>{question.conceptIds[0].replace(/-/g, " ")}</h2><p>Complete one reviewed question at a time. An incorrect response appears in your Mistake Notebook with a direct path back to the relevant lesson.</p><button className="button outline" onClick={() => onOpenLesson(question.remediationLessonIds[0])}>Open linked lesson <ChevronRight size={17} /></button></article><ExerciseCard question={question} onAttempt={onAttempt} onNext={() => setIndex((current) => (current + 1) % learningQuestions.length)} /></div></div>;
}

function LessonPage({ lesson, onBack, onOpenLesson, onAttempt, onComplete }: { lesson: Lesson; onBack: () => void; onOpenLesson: (lessonId: string) => void; onAttempt: (question: LearningQuestion, answer: string | string[], correct: boolean) => Promise<void>; onComplete: (lesson: Lesson) => Promise<void> }) {
  const questions = learningQuestions.filter((question) => lesson.exerciseIds.includes(question.exerciseId));
  const [correctQuestionIds, setCorrectQuestionIds] = useState<string[]>([]);
  useEffect(() => setCorrectQuestionIds([]), [lesson.id]);
  const markCorrect = (questionId: string) => setCorrectQuestionIds((current) => {
    if (current.includes(questionId)) return current;
    const next = [...current, questionId];
    if (next.length === questions.length) void onComplete(lesson);
    return next;
  });
  return <div className="page lesson-page"><button className="text-button lesson-back" onClick={onBack}>← Back to curriculum</button><PageTitle label={`${lesson.module} · ${lesson.level} · ${lesson.estimatedMinutes} min`} title={lesson.title} text={lesson.objectives.join(" ")} /><section className="lesson-objectives"><span className="eyebrow">In this lesson</span>{lesson.objectives.map((objective) => <p key={objective}><Check size={16} />{objective}</p>)}</section>{lesson.prerequisiteLessonIds.length > 0 && <section className="prerequisite-note"><BookOpen size={18} /><div><strong>Helpful foundation</strong><p>Review this first if the new pattern feels difficult.</p></div><button onClick={() => onOpenLesson(lesson.prerequisiteLessonIds[0])}>Open prerequisite</button></section>}<div className="lesson-content">{lesson.sections.map((section) => <LessonSectionCard key={section.id} section={section} />)}</div><section className="lesson-practice"><div className="section-row"><div><span className="eyebrow">Practice and feedback</span><h2>Check your understanding</h2></div><span className="status-pill">{correctQuestionIds.length}/{questions.length} correct</span></div>{questions.map((question) => <ExerciseCard key={question.id} question={question} onAttempt={onAttempt} onCorrect={() => markCorrect(question.id)} />)}</section>{lesson.recommendedLessonIds.length > 0 && <section className="related-lessons"><h2>Next useful lesson</h2>{lesson.recommendedLessonIds.map((lessonId) => { const related = getLesson(lessonId); return related ? <button key={lessonId} onClick={() => onOpenLesson(lessonId)}><span>{related.level} · {related.estimatedMinutes} min</span><strong>{related.title}</strong><ChevronRight size={18} /></button> : null; })}</section>}</div>;
}

function LessonSectionCard({ section }: { section: Lesson["sections"][number] }) {
  if (section.type === "explanation") return <article className="lesson-section explanation"><span className="eyebrow">{section.title}</span><p>{section.body}</p></article>;
  if (section.type === "warning") return <article className="lesson-section warning"><strong>{section.title}</strong><p>{section.body}</p></article>;
  return <article className="lesson-section worked-example"><span className="eyebrow">Worked example</span><p><b>Correct:</b> {section.correct}</p>{section.incorrect && <p><b>Not for this meaning:</b> <del>{section.incorrect}</del></p>}<small>{section.explanation}</small></article>;
}

function ExerciseCard({ question, onAttempt, onNext, onCorrect }: { question: LearningQuestion; onAttempt: (question: LearningQuestion, answer: string | string[], correct: boolean) => Promise<void>; onNext?: () => void; onCorrect?: () => void }) {
  const [choice, setChoice] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const answer: string | string[] = question.type === "multiple-choice" ? choice : question.type === "fill-blank" ? textAnswer : ordered;
  const hasAnswer = Array.isArray(answer) ? answer.length > 0 : answer.trim().length > 0;
  const correct = checked && gradeQuestion(question, answer);
  const submit = async () => {
    if (!hasAnswer || isSaving) return;
    const isCorrect = gradeQuestion(question, answer);
    setChecked(true);
    setIsSaving(true);
    await onAttempt(question, answer, isCorrect);
    if (isCorrect) onCorrect?.();
    setIsSaving(false);
  };
  const reset = () => { setChoice(""); setTextAnswer(""); setOrdered([]); setChecked(false); };
  return <article className="question-card engine-question"><span className="eyebrow">{question.type.replace(/-/g, " ")}</span><h2>{question.prompt}</h2>{question.type === "multiple-choice" && <div className="answers">{question.options.map((option, index) => <button className={`${choice === option.id ? "chosen" : ""} ${checked && option.id === question.correctOptionId ? "correct" : ""} ${checked && choice === option.id && option.id !== question.correctOptionId ? "wrong" : ""}`} key={option.id} onClick={() => { setChoice(option.id); setChecked(false); }}><b>{String.fromCharCode(65 + index)}</b><span><strong>{option.text}</strong>{option.hint && <small>{option.hint}</small>}</span></button>)}</div>}{question.type === "fill-blank" && <label className="fill-answer">Your answer<input value={textAnswer} onChange={(event) => { setTextAnswer(event.target.value); setChecked(false); }} placeholder="Type one word" /></label>}{question.type === "word-order" && <div className="word-order"><p>Tap each token in the order it should appear. Tap a selected token to remove it.</p><div className="ordered-line">{ordered.map((token, index) => <button key={`${token}-${index}`} onClick={() => { setOrdered((current) => current.filter((_, tokenIndex) => tokenIndex !== index)); setChecked(false); }}>{token} ×</button>)}</div><div className="token-bank">{question.tokens.filter((token) => !ordered.includes(token)).map((token) => <button key={token} onClick={() => { setOrdered((current) => [...current, token]); setChecked(false); }}>{token}</button>)}</div></div>}{checked && <div className={`answer-feedback ${correct ? "success" : "error"}`}><strong>{correct ? "Correct — keep this pattern." : "Not yet — here is the useful rule."}</strong><p>{question.explanation}</p>{!correct && <p><b>Recommended:</b> {question.remediationLessonIds.length} linked lesson{question.remediationLessonIds.length > 1 ? "s" : ""} is now in your Mistake Notebook.</p>}</div>}<div className="question-actions"><button className="button" onClick={() => void submit()} disabled={!hasAnswer || isSaving}>{isSaving ? "Saving…" : "Check answer"}</button><button className="button outline" onClick={reset}>Try again</button>{checked && onNext && <button className="text-button" onClick={onNext}>Next question <ChevronRight size={16} /></button>}</div></article>;
}

function WritingPage() { const [text, setText] = useState(""); const [submitted, setSubmitted] = useState(false); const words = text.trim() ? text.trim().split(/\s+/).length : 0; const targetWord = /\b(significant|significantly|increase|whereas|decline)\b/i.test(text); const changeVerb = /\b(increase[ds]?|decrease[ds]?|rose|fell|grew|declined)\b/i.test(text); return <div className="page"><PageTitle label="Guided Writing Lab" title="Practice with a clear brief." text="Feedback reports only the specific checks it can actually perform—never a fake IELTS band score." /><div className="writing-layout"><aside className="prompt-panel"><span className="eyebrow">Your prompt</span><h2>Describe the change shown in the data.</h2><p>Write one focused academic sentence about changes in transport use. Use a precise verb of change and an appropriate word form.</p><div>{["significant", "increase", "whereas", "decline"].map((term) => <span className="prompt-chip" key={term}>{term}</span>)}</div><dl><div><dt>Target length</dt><dd>40–70 words</dd></div><div><dt>Language target</dt><dd>Word forms</dd></div><div><dt>What is checked</dt><dd>Specific rules only</dd></div></dl></aside><section className="editor-card"><div className="editor-heading"><div><h2>Your response</h2><p>Saved locally in this browser.</p></div><b>{words} words</b></div><textarea value={text} onChange={(event) => { setText(event.target.value); setSubmitted(false); }} placeholder="For example: Between 2010 and 2023, private vehicle use increased significantly..." aria-label="Your IELTS writing response" /><div className="writing-checks"><CheckStatus good={words >= 40 && words <= 70} text={words > 70 ? "Over the 70-word guide" : words >= 40 ? "Length target met" : `${40 - words} words to target`} /><CheckStatus good={targetWord} text={targetWord ? "Target language used" : "Use a target word"} /><CheckStatus good={changeVerb} text={changeVerb ? "Change verb found" : "Include a change verb"} /></div><button className="button" onClick={() => setSubmitted(true)}>Review my checks <ChevronRight size={17} /></button>{submitted && <div className={`writing-feedback ${targetWord && changeVerb ? "success" : "error"}`}><strong>{targetWord && changeVerb ? "Checks complete." : "A few checks are still open."}</strong><p>{targetWord && changeVerb ? "Your response includes a target word and a supported change verb. A human examiner is still needed for holistic IELTS feedback." : "Add a target word and a clear change verb. The app does not claim to check rules it cannot assess reliably."}</p></div>}</section></div></div>; }

function ProgressPage({ mistakes, onOpenLesson }: { mistakes: MistakeRecord[]; onOpenLesson: (lessonId: string) => void }) { return <div className="page"><PageTitle label="Mistake notebook" title="Turn errors into a precise next step." text="Only incorrect attempts appear here. A correct retry clears the item, so your notebook stays useful." />{mistakes.length === 0 ? <section className="empty-notebook"><Check size={25} /><h2>Your notebook is clear.</h2><p>Complete a practice question. If an answer needs revision, its explanation and linked lesson will appear here.</p></section> : <div className="mistake-list">{mistakes.map((mistake) => { const question = learningQuestions.find((item) => item.id === mistake.questionId); const linkedLesson = getLesson(mistake.remediationLessonIds[0]); return <article className="dossier" key={mistake.id}><span className="eyebrow rose">Needs revision · {mistake.occurrences} attempt{mistake.occurrences > 1 ? "s" : ""}</span><h2>{question?.prompt ?? "Practice question"}</h2><p>Last attempted {new Date(mistake.lastAttemptedAt).toLocaleDateString()}</p><div className="resolution"><Target size={18} /><div><strong>Why this matters</strong><p>{mistake.latestExplanation}</p></div></div>{linkedLesson && <button className="button outline" onClick={() => onOpenLesson(linkedLesson.id)}>Review: {linkedLesson.title} <ChevronRight size={17} /></button>}</article>; })}</div>}</div>; }

function PageTitle({ label, title, text }: { label: string; title: string; text: string }) { return <header className="page-title"><span className="eyebrow">{label}</span><h1>{title}</h1><p>{text}</p></header>; }
function Card({ heading, label, action, onAction, children }: { heading: string; label: string; action?: string; onAction?: () => void; children: ReactNode }) { return <section className="content-card"><div className="section-row"><div><span className="eyebrow">{label}</span><h2>{heading}</h2></div>{action && <button className={onAction ? "text-button" : "status-pill"} onClick={onAction}>{action}{onAction && <ChevronRight size={16} />}</button>}</div>{children}</section>; }
function Stat({ value, label }: { value: string; label: string }) { return <div className="stat"><b>{value}</b><span>{label}</span></div>; }
function Skill({ title, value, tone = "blue" }: { title: string; value: number; tone?: string }) { return <div className={`skill ${tone}`}><div><strong>{title}</strong><b>{value}%</b></div><span><i style={{ width: `${value}%` }} /></span></div>; }
function FamilyCard({ entry, selected, onClick }: { entry: VocabularyEntry; selected?: boolean; onClick?: () => void }) { return <button className={`family-card ${selected ? "selected" : ""}`} onClick={onClick}><b>{entry.word}</b><span>{entry.partOfSpeech}</span><p>{entry.definition}</p></button>; }
function CheckStatus({ good, text }: { good: boolean; text: string }) { return <div className={good ? "good" : ""}>{good ? <Check size={15} /> : <i />}{text}</div>; }
