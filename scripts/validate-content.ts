import foundationVocabulary from "../src/content/foundation-vocabulary.json" with { type: "json" };
import vocabulary from "../src/content/vocabulary.json" with { type: "json" };
import { learningQuestions, lessons } from "../src/content/lessons";

const allVocabulary = [...foundationVocabulary, ...vocabulary];

const ids = new Set<string>();
const errors: string[] = [];

for (const entry of allVocabulary) {
  if (ids.has(entry.id)) errors.push(`Duplicate vocabulary ID: ${entry.id}`);
  ids.add(entry.id);
  if (!entry.word || !entry.definition || !entry.example) errors.push(`${entry.id} is missing a word, definition or example.`);
  if (!entry.wordFamilyIds.every((id) => allVocabulary.some((candidate) => candidate.id === id))) errors.push(`${entry.id} has a missing word-family reference.`);
}

const lessonIds = new Set(lessons.map((lesson) => lesson.id));
const questionIds = new Set<string>();
for (const lesson of lessons) {
  if (lesson.objectives.length === 0 || lesson.sections.length === 0) errors.push(`${lesson.id} needs objectives and lesson sections.`);
  if (!lesson.prerequisiteLessonIds.every((id) => lessonIds.has(id))) errors.push(`${lesson.id} has a missing prerequisite lesson.`);
  if (!lesson.recommendedLessonIds.every((id) => lessonIds.has(id))) errors.push(`${lesson.id} has a missing recommended lesson.`);
  if (!lesson.vocabularyIds.every((id) => ids.has(id))) errors.push(`${lesson.id} has a missing vocabulary reference.`);
  if (!lesson.exerciseIds.every((id) => learningQuestions.some((question) => question.exerciseId === id))) errors.push(`${lesson.id} has a missing exercise.`);
}

for (const question of learningQuestions) {
  if (questionIds.has(question.id)) errors.push(`Duplicate question ID: ${question.id}`);
  questionIds.add(question.id);
  if (!question.remediationLessonIds.every((id) => lessonIds.has(id))) errors.push(`${question.id} has a missing remediation lesson.`);
  if (question.type === "multiple-choice" && !question.options.some((option) => option.id === question.correctOptionId)) errors.push(`${question.id} has an invalid correct option.`);
  if (question.type === "fill-blank" && question.acceptedAnswers.length === 0) errors.push(`${question.id} needs an accepted answer.`);
  if (question.type === "word-order" && question.correctOrder.length !== question.tokens.length) errors.push(`${question.id} has an invalid word order.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Content valid: ${allVocabulary.length} vocabulary records, ${lessons.length} lessons and ${learningQuestions.length} questions checked.`);
