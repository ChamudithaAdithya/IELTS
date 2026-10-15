import type { ExerciseQuestion } from "../types";

export const adverbExercise: ExerciseQuestion = {
  id: "question-adverb-usage-001",
  prompt: "Prices increased _____ between 2018 and 2022.",
  options: [
    { id: "option-significant", text: "significant", hint: "adjective" },
    { id: "option-significantly", text: "significantly", hint: "adverb" },
    { id: "option-significance", text: "significance", hint: "noun" }
  ],
  correctOptionId: "option-significantly",
  explanation: "Significantly is an adverb. It modifies the verb increased. Significant is an adjective, and significance is a noun.",
  remediationLessonId: "lesson-adverbs-basics"
};
