export type PartOfSpeech = "noun" | "verb" | "adjective" | "adverb" | "phrase";
export type Mastery = "seen" | "practised" | "understood" | "retained" | "applied";

export interface VocabularyEntry {
  id: string;
  word: string;
  partOfSpeech: PartOfSpeech;
  level: "A2" | "B1" | "B2" | "C1" | "C2";
  ipa: string;
  definition: string;
  sinhala?: string;
  example: string;
  collocations: string[];
  wordFamilyIds: string[];
  tags: string[];
  relatedLessonIds: string[];
}

export interface CurriculumLevel {
  id: string;
  title: string;
  description: string;
  outcome: string;
  lessonCount: number;
  color: "teal" | "blue" | "violet" | "amber" | "rose" | "ink";
}

export interface ExerciseQuestion {
  id: string;
  prompt: string;
  options: { id: string; text: string; hint: string }[];
  correctOptionId: string;
  explanation: string;
  remediationLessonId: string;
}

export type LessonSection =
  | { id: string; type: "explanation"; title: string; body: string }
  | { id: string; type: "example"; correct: string; incorrect?: string; explanation: string }
  | { id: string; type: "warning"; title: string; body: string };

export interface Lesson {
  id: string;
  title: string;
  module: string;
  level: "A2" | "B1" | "B2" | "C1" | "C2";
  estimatedMinutes: number;
  objectiveIds: string[];
  objectives: string[];
  prerequisiteLessonIds: string[];
  recommendedLessonIds: string[];
  vocabularyIds: string[];
  sections: LessonSection[];
  exerciseIds: string[];
  tags: string[];
}

export type LearningQuestion =
  | {
    id: string;
    exerciseId: string;
    type: "multiple-choice";
    prompt: string;
    options: { id: string; text: string; hint?: string }[];
    correctOptionId: string;
    explanation: string;
    conceptIds: string[];
    remediationLessonIds: string[];
  }
  | {
    id: string;
    exerciseId: string;
    type: "fill-blank";
    prompt: string;
    acceptedAnswers: string[];
    explanation: string;
    conceptIds: string[];
    remediationLessonIds: string[];
  }
  | {
    id: string;
    exerciseId: string;
    type: "word-order";
    prompt: string;
    tokens: string[];
    correctOrder: string[];
    explanation: string;
    conceptIds: string[];
    remediationLessonIds: string[];
  };

export interface LessonProgress {
  lessonId: string;
  status: "not-started" | "in-progress" | "completed";
  completedSectionIds: string[];
  masteryEstimate: number;
  startedAt?: string;
  lastStudiedAt: string;
  completedAt?: string;
}

export interface ExerciseAttempt {
  id: string;
  exerciseId: string;
  questionId: string;
  submittedAnswer: string | string[];
  isCorrect: boolean;
  testedConceptIds: string[];
  remediationLessonIds: string[];
  attemptedAt: string;
}

export interface MistakeRecord {
  id: string;
  questionId: string;
  exerciseId: string;
  conceptIds: string[];
  remediationLessonIds: string[];
  latestAnswer: string | string[];
  latestExplanation: string;
  occurrences: number;
  lastAttemptedAt: string;
}

export interface VocabularyReview {
  vocabularyId: string;
  repetitionCount: number;
  intervalDays: number;
  nextReviewAt: string;
  lastReviewedAt: string;
}

export interface UserSettings {
  speechRate: number;
  preferredVoiceName?: string;
  theme: "light" | "system";
}

export interface WordProgress {
  vocabularyId: string;
  mastery: Mastery;
  saved: boolean;
  nextReviewAt?: string;
}
