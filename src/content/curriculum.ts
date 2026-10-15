import type { CurriculumLevel } from "../types";

export const curriculum: CurriculumLevel[] = [
  { id: "level-foundations", title: "English Foundations", description: "Build reliable sentences from parts of speech, basic grammar and core vocabulary.", outcome: "Construct accurate simple sentences.", lessonCount: 36, color: "teal" },
  { id: "level-vocabulary", title: "Vocabulary Mastery", description: "Learn words as families, collocations and natural sentence patterns.", outcome: "Use useful words precisely.", lessonCount: 52, color: "blue" },
  { id: "level-grammar", title: "Grammar & Sentences", description: "Understand tenses, agreement, clauses and the patterns behind accuracy.", outcome: "Explain and correct key grammar choices.", lessonCount: 64, color: "violet" },
  { id: "level-practical", title: "Practical English", description: "Paraphrase, compare ideas and develop connected academic paragraphs.", outcome: "Express ideas with coherence.", lessonCount: 44, color: "amber" },
  { id: "level-ielts", title: "IELTS Skills", description: "Learn question types, strategies and criterion-based task practice.", outcome: "Apply skills in every test paper.", lessonCount: 68, color: "rose" },
  { id: "level-readiness", title: "Exam Readiness", description: "Use timed practice, error analysis and targeted revision to prepare calmly.", outcome: "Know your remaining priorities.", lessonCount: 28, color: "ink" }
];
