import type { LearningQuestion, Lesson } from "../types";

export const lessons: Lesson[] = [
  {
    id: "lesson-parts-of-speech",
    title: "Build a clear English sentence",
    module: "Foundations",
    level: "A2",
    estimatedMinutes: 8,
    objectiveIds: ["objective-identify-nouns-verbs"],
    objectives: ["Identify a noun and a verb.", "Build a simple subject–verb sentence."],
    prerequisiteLessonIds: [],
    recommendedLessonIds: ["lesson-adverbs-basics"],
    vocabularyIds: ["word-learn", "word-practice", "word-example"],
    tags: ["grammar", "foundation"],
    sections: [
      { id: "section-subject-verb", type: "explanation", title: "A sentence needs a subject and a verb", body: "The subject tells us who or what we are talking about. The verb tells us the action or state. In ‘Students practise daily’, students is the subject and practise is the verb." },
      { id: "section-basic-example", type: "example", correct: "Students practise English every day.", incorrect: "Students practice English every day.", explanation: "In British English, practise is normally the verb. Practice is normally the noun." },
      { id: "section-meaning-first", type: "warning", title: "Choose words by their job", body: "Before choosing a word, ask what the sentence needs: a person or thing, an action, or a description." }
    ],
    exerciseIds: ["exercise-foundation-001", "exercise-foundation-002"]
  },
  {
    id: "lesson-adverbs-basics",
    title: "Use adverbs to describe change",
    module: "Grammar & IELTS Task 1",
    level: "B1",
    estimatedMinutes: 12,
    objectiveIds: ["objective-identify-adverbs", "objective-use-adverbs-with-verbs"],
    objectives: ["Identify an adverb.", "Use an adverb with a verb of change.", "Avoid adjective–adverb confusion."],
    prerequisiteLessonIds: ["lesson-parts-of-speech"],
    recommendedLessonIds: ["lesson-trends-language"],
    vocabularyIds: ["word-significant", "word-significantly", "word-increase-verb"],
    tags: ["grammar", "writing-task-1"],
    sections: [
      { id: "section-adverb-rule", type: "explanation", title: "Adverbs modify actions", body: "An adverb can explain how or to what degree an action happens. In ‘Prices increased significantly’, significantly modifies the verb increased." },
      { id: "section-adverb-example", type: "example", correct: "Prices increased significantly.", incorrect: "Prices increased significant.", explanation: "Significant is an adjective. Significantly is the adverb form needed after the verb increased." },
      { id: "section-adverb-warning", type: "warning", title: "Do not rely on -ly alone", body: "Many adverbs end in -ly, but not every word ending in -ly is an adverb. Learn the whole word family and the sentence pattern." }
    ],
    exerciseIds: ["exercise-adverb-001", "exercise-adverb-002", "exercise-adverb-003"]
  },
  {
    id: "lesson-trends-language",
    title: "Describe chart trends accurately",
    module: "IELTS Writing Task 1",
    level: "B1",
    estimatedMinutes: 10,
    objectiveIds: ["objective-describe-trends"],
    objectives: ["Choose a precise verb of change.", "Combine a trend verb with an adverb."],
    prerequisiteLessonIds: ["lesson-adverbs-basics"],
    recommendedLessonIds: [],
    vocabularyIds: ["word-increase-verb", "word-decline-verb", "word-fluctuate"],
    tags: ["writing-task-1", "vocabulary"],
    sections: [
      { id: "section-trend-verbs", type: "explanation", title: "Name the direction first", body: "Use increase, rise or grow for upward movement. Use decline, fall or decrease for downward movement. Use fluctuate for repeated movement up and down." },
      { id: "section-trend-example", type: "example", correct: "Bus use declined gradually, whereas rail use rose.", explanation: "The verbs give the direction and the adverb gradually gives the speed or degree of the change." }
    ],
    exerciseIds: ["exercise-trends-001"]
  }
];

export const learningQuestions: LearningQuestion[] = [
  { id: "question-foundation-001", exerciseId: "exercise-foundation-001", type: "multiple-choice", prompt: "Which word is the verb in ‘Learners practise every day’?", options: [{ id: "option-learners", text: "Learners" }, { id: "option-practise", text: "practise" }, { id: "option-every", text: "every" }], correctOptionId: "option-practise", explanation: "Practise is the action. Learners is the subject.", conceptIds: ["grammar-verb"], remediationLessonIds: ["lesson-parts-of-speech"] },
  { id: "question-foundation-002", exerciseId: "exercise-foundation-002", type: "word-order", prompt: "Put the words in a natural order.", tokens: ["every day", "English", "practise", "Students"], correctOrder: ["Students", "practise", "English", "every day"], explanation: "A basic English statement normally starts with the subject, then the verb, then the object or extra information.", conceptIds: ["grammar-sentence-order"], remediationLessonIds: ["lesson-parts-of-speech"] },
  { id: "question-adverb-001", exerciseId: "exercise-adverb-001", type: "multiple-choice", prompt: "Prices increased _____ between 2018 and 2022.", options: [{ id: "option-significant", text: "significant", hint: "adjective" }, { id: "option-significantly", text: "significantly", hint: "adverb" }, { id: "option-significance", text: "significance", hint: "noun" }], correctOptionId: "option-significantly", explanation: "Significantly is an adverb. It modifies the verb increased.", conceptIds: ["grammar-adverb-modification", "word-family-significant"], remediationLessonIds: ["lesson-adverbs-basics"] },
  { id: "question-adverb-002", exerciseId: "exercise-adverb-002", type: "fill-blank", prompt: "Complete the sentence: The number of visitors rose _____.", acceptedAnswers: ["significantly"], explanation: "Use significantly because the blank modifies the verb rose.", conceptIds: ["grammar-adverb-modification"], remediationLessonIds: ["lesson-adverbs-basics"] },
  { id: "question-adverb-003", exerciseId: "exercise-adverb-003", type: "word-order", prompt: "Arrange a correct Task 1 sentence.", tokens: ["significantly", "increased", "The proportion", "of online shoppers"], correctOrder: ["The proportion", "of online shoppers", "increased", "significantly"], explanation: "The sentence starts with the subject, followed by the verb and its adverbial modifier.", conceptIds: ["grammar-adverb-modification", "grammar-sentence-order"], remediationLessonIds: ["lesson-adverbs-basics", "lesson-parts-of-speech"] },
  { id: "question-trends-001", exerciseId: "exercise-trends-001", type: "multiple-choice", prompt: "Choose the best verb for a repeated rise and fall.", options: [{ id: "option-rise", text: "rose" }, { id: "option-fluctuate", text: "fluctuated" }, { id: "option-decline", text: "declined" }], correctOptionId: "option-fluctuate", explanation: "Fluctuated means that a value moved up and down repeatedly.", conceptIds: ["vocabulary-trends"], remediationLessonIds: ["lesson-trends-language"] }
];

export function getLesson(id: string) {
  return lessons.find((lesson) => lesson.id === id);
}
