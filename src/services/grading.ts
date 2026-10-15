import type { LearningQuestion } from "../types";

export function normaliseAnswer(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ").replace(/[.?!]+$/g, "");
}

export function gradeQuestion(question: LearningQuestion, answer: string | string[]) {
  if (question.type === "multiple-choice") return typeof answer === "string" && answer === question.correctOptionId;
  if (question.type === "fill-blank") return typeof answer === "string" && question.acceptedAnswers.map(normaliseAnswer).includes(normaliseAnswer(answer));
  return Array.isArray(answer) && answer.length === question.correctOrder.length && answer.every((token, index) => token === question.correctOrder[index]);
}

export function createAttemptId(questionId: string) {
  return `${questionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nextReview(intervalDays: number, wasCorrect: boolean) {
  const nextInterval = wasCorrect ? Math.min(Math.max(intervalDays * 2, 1), 30) : 1;
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + nextInterval);
  return { intervalDays: nextInterval, nextReviewAt: nextReviewAt.toISOString() };
}
