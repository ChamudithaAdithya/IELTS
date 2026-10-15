import type { UserSettings, VocabularyEntry } from "../types";

const preferredVoice = (voices: SpeechSynthesisVoice[]) => voices
  .filter((voice) => /^en([_-]|$)/i.test(voice.lang))
  .sort((a, b) => score(b) - score(a))[0];

function score(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  return (voice.lang.toLowerCase().startsWith("en-gb") ? 100 : 0)
    + (/natural|neural|enhanced|premium/.test(name) ? 50 : 0)
    + (/sonia|libby|hazel|ryan|daniel|oliver|samantha|serena/.test(name) ? 20 : 0)
    + (voice.localService ? 3 : 0);
}

export function listEnglishVoices() {
  return window.speechSynthesis?.getVoices().filter((voice) => /^en([_-]|$)/i.test(voice.lang)) ?? [];
}

export interface SpeechEvents {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export function stopSpeech() {
  window.speechSynthesis?.cancel();
}


export function speakVocabulary(entry: VocabularyEntry, settings: UserSettings, events: SpeechEvents = {}) {
  if (!window.speechSynthesis) return false;
  const voices = listEnglishVoices();
  const voice = voices.find((item) => item.name === settings.preferredVoiceName) ?? preferredVoice(voices);
  stopSpeech();
  const spelling = [...entry.word].join(". ");
  const utterance = new SpeechSynthesisUtterance(`${entry.word}. ${spelling} ..... .. .. ${entry.example}`);
  utterance.voice = voice ?? null;
  utterance.lang = voice?.lang ?? "en-GB";
  utterance.rate = settings.speechRate;
  utterance.pitch = 1;
  utterance.onstart = events.onStart ?? null;
  utterance.onend = events.onEnd ?? null;
  utterance.onerror = events.onError ?? null;
  window.speechSynthesis.speak(utterance);
  return true;
}
