import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Headphones, Play, Search, Settings2, Volume2, X } from "lucide-react";
import { sinhalaGlosses } from "../content/sinhala";
import { exampleSinhala } from "../content/example-sinhala";
import { listEnglishVoices } from "../services/speech";
import type { UserSettings, VocabularyEntry, WordProgress } from "../types";

type SpeechStatus = "idle" | "preparing" | "playing";

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  entries: VocabularyEntry[];
  allEntries: VocabularyEntry[];
  wordProgress: WordProgress[];
  word: VocabularyEntry;
  setWord: (word: VocabularyEntry) => void;
  onPlay: () => void;
  onQuickPlay: (word: VocabularyEntry) => void;
  speechStatus: SpeechStatus;
  activeExampleWord: number;
  detailOpen: boolean;
  onCloseDetail: () => void;
  saved: boolean;
  onSave: () => void;
  settings: UserSettings;
  onSettings: (settings: UserSettings) => void;
}

const levelLabel: Record<VocabularyEntry["level"], string> = {
  A2: "Foundation", B1: "Intermediate", B2: "Upper intermediate", C1: "Advanced", C2: "Mastery",
};
const levels: VocabularyEntry["level"][] = ["A2", "B1", "B2", "C1", "C2"];

const gloss = (entry: VocabularyEntry) => entry.sinhala ?? sinhalaGlosses[entry.id] ?? "Sinhala meaning will be added";

export function VocabularyExperience({ query, onQueryChange, entries, allEntries, wordProgress, word, setWord, onPlay, onQuickPlay, speechStatus, activeExampleWord, detailOpen, onCloseDetail, saved, onSave, settings, onSettings }: Props) {
  const [familyPreview, setFamilyPreview] = useState<VocabularyEntry | null>(null);
  const uniqueEntries = useMemo(() => Array.from(new Map(entries.map((entry) => [entry.word.toLowerCase(), entry])).values()), [entries]);
  const progressByWord = useMemo(() => new Map(wordProgress.map((progress) => [progress.vocabularyId, progress])), [wordProgress]);
  const levelGroups = useMemo(() => levels
    .map((level) => ({ level, label: levelLabel[level], entries: uniqueEntries.filter((entry) => entry.level === level) }))
    .filter((group) => group.entries.length > 0), [uniqueEntries]);
  const familyWords = word.wordFamilyIds.map((id) => allEntries.find((entry) => entry.id === id)).filter((entry): entry is VocabularyEntry => Boolean(entry));
  const exampleWords = word.example.trim().split(/\s+/);
  const voices = listEnglishVoices();
  const playing = speechStatus !== "idle";

  useEffect(() => {
    if (!detailOpen && !familyPreview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [detailOpen, familyPreview]);

  return <div className="page vocabulary-page">
    <section className="vocabulary-catalogue" aria-label="Vocabulary word list">
      <div className="catalogue-heading"><label className="catalogue-search"><Search size={17} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search words, meanings, or Sinhala" aria-label="Search vocabulary" />{query && <button type="button" onClick={() => onQueryChange("")} aria-label="Clear vocabulary search"><X size={16} /></button>}</label></div>
      <div className="vocabulary-list">
        {levelGroups.map((group) => <section className="vocabulary-level-group" key={group.level}>
          <header><div><span>Level {group.level}</span><strong>{group.label}</strong></div></header>
          <div className="vocabulary-rows">{group.entries.map((entry) => <article className="vocabulary-list-card" key={entry.id}>
            <button className="vocabulary-open" onClick={() => setWord(entry)} aria-label={`Open ${entry.word}`}><strong>{entry.word}</strong><span className="word-card-sinhala" lang="si">{gloss(entry)}</span><span className="word-card-meta">{entry.partOfSpeech}</span></button>
            <ProgressMeters progress={progressByWord.get(entry.id)} />
            <button className="list-play" onClick={() => onQuickPlay(entry)} aria-label={`Hear ${entry.word}`}><Play size={18} fill="currentColor" /></button>
          </article>)}</div>
        </section>)}
      </div>
    </section>

    {detailOpen && createPortal(<div className="word-modal-backdrop" role="presentation" onMouseDown={onCloseDetail}>
      <section className="word-modal" role="dialog" aria-modal="true" aria-labelledby="word-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-topbar"><span className="eyebrow">Word study</span><button className="modal-close" onClick={onCloseDetail} aria-label="Close word details"><X size={21} /></button></div>
        <div className="word-modal-hero"><div><span className="word-card-meta">{levelLabel[word.level]} / {word.partOfSpeech}</span><h2 id="word-modal-title">{word.word}</h2><p className="sinhala-near-word" lang="si">{gloss(word)}</p><span className="ipa">{word.ipa}</span></div><button className={`primary-audio ${playing ? "is-playing" : ""}`} onClick={onPlay}>{playing ? <Volume2 size={21} /> : <Headphones size={21} />}<span>{speechStatus === "preparing" ? "Starting..." : playing ? "Playing" : "Hear word + example"}</span></button></div>
        <p className="word-definition">{word.definition}</p>

        <div className="audio-panel word-audio-panel"><div><Headphones size={20} /><div><strong>Pronunciation</strong><span>{voices.length ? `${voices.length} installed English voices` : "No English voice found"}</span></div></div><label className="voice-control"><span>Voice</span><select value={settings.preferredVoiceName ?? ""} onChange={(event) => onSettings({ ...settings, preferredVoiceName: event.target.value || undefined })}><option value="">Best available voice</option>{voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}</select></label><label className="speed-control"><span>Speed <output>{settings.speechRate.toFixed(2)}x</output></span><input type="range" min="0.85" max="1.1" step="0.05" value={settings.speechRate} onChange={(event) => onSettings({ ...settings, speechRate: Number(event.target.value) })} /></label></div>

        <section className="natural-example"><span className="section-kicker">Natural example</span><p aria-live="polite">{exampleWords.map((exampleWord, index) => <span className={index === activeExampleWord ? "spoken-word" : ""} key={`${exampleWord}-${index}`}>{exampleWord}{index < exampleWords.length - 1 ? " " : ""}</span>)}</p><div className="example-translation"><span>Sinhala translation</span><p lang="si">{exampleSinhala[word.id] ?? "Translation is under review."}</p></div></section>

        <section className="word-family-section"><div className="section-row"><div><span className="section-kicker">Word family</span><p>Open a related form without leaving this word.</p></div></div><div className="family-grid compact-family-grid">{familyWords.length ? familyWords.map((family) => <button key={family.id} className="family-card" onClick={() => setFamilyPreview(family)}><strong>{family.word}</strong><span>{family.partOfSpeech}</span><small lang="si">{gloss(family)}</small></button>) : <p className="empty-inline">No related forms added yet.</p>}</div></section>

        <div className="word-modal-actions"><button className={`save-word ${saved ? "saved" : ""}`} onClick={onSave}><Bookmark size={18} fill={saved ? "currentColor" : "none"} />{saved ? "Saved for review" : "Save for review"}</button><span><Settings2 size={16} /> Voice uses the voices installed on this device.</span></div>
      </section>
    </div>, document.body)}

    {familyPreview && createPortal(<div className="family-preview-backdrop" role="presentation" onMouseDown={() => setFamilyPreview(null)}><section className="family-preview" role="dialog" aria-modal="true" aria-label={`${familyPreview.word} word family form`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setFamilyPreview(null)} aria-label="Close family word"><X size={20} /></button><span className="eyebrow">Word family</span><h3>{familyPreview.word}</h3><p lang="si" className="sinhala-near-word">{gloss(familyPreview)}</p><span className="family-pos">{familyPreview.partOfSpeech}</span><button className="primary-audio" onClick={() => onQuickPlay(familyPreview)}><Play size={19} fill="currentColor" />Hear this word</button></section></div>, document.body)}
  </div>;
}

function ProgressMeters({ progress }: { progress?: WordProgress }) {
  const masteryRank = { seen: 1, practised: 2, understood: 3, retained: 4, applied: 5 } as const;
  const rank = progress ? masteryRank[progress.mastery] : 0;
  const meters = [
    { label: "learned", value: rank >= 1 ? 100 : 0, tone: "learned" },
    { label: "practiced", value: rank >= 2 ? 100 : 0, tone: "practiced" },
    { label: "mastered", value: rank >= 5 ? 100 : 0, tone: "mastered" },
  ];
  return <div className="progress-meters" aria-label={progress ? `Progress: ${progress.mastery}` : "Not studied yet"}>{meters.map((meter) => <div className={`progress-meter ${meter.tone}`} key={meter.label}><span><i style={{ width: `${meter.value}%` }} /></span><small>{meter.label}</small></div>)}</div>;
}
