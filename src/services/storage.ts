import { openDB, type DBSchema } from "idb";
import type { ExerciseAttempt, LessonProgress, MistakeRecord, UserSettings, VocabularyReview, WordProgress } from "../types";

interface AcademyDatabase extends DBSchema {
  settings: { key: string; value: UserSettings };
  wordProgress: { key: string; value: WordProgress };
  lessonProgress: { key: string; value: LessonProgress };
  attempts: { key: string; value: ExerciseAttempt; indexes: { "by-question": string; "by-exercise": string } };
  mistakes: { key: string; value: MistakeRecord; indexes: { "by-last-attempted": string } };
  reviews: { key: string; value: VocabularyReview; indexes: { "by-next-review": string } };
}

const db = openDB<AcademyDatabase>("ielts-academy", 2, {
  upgrade(database) {
    if (!database.objectStoreNames.contains("settings")) database.createObjectStore("settings");
    if (!database.objectStoreNames.contains("wordProgress")) database.createObjectStore("wordProgress", { keyPath: "vocabularyId" });
    if (!database.objectStoreNames.contains("lessonProgress")) database.createObjectStore("lessonProgress", { keyPath: "lessonId" });
    if (!database.objectStoreNames.contains("attempts")) {
      const attempts = database.createObjectStore("attempts", { keyPath: "id" });
      attempts.createIndex("by-question", "questionId");
      attempts.createIndex("by-exercise", "exerciseId");
    }
    if (!database.objectStoreNames.contains("mistakes")) {
      const mistakes = database.createObjectStore("mistakes", { keyPath: "id" });
      mistakes.createIndex("by-last-attempted", "lastAttemptedAt");
    }
    if (!database.objectStoreNames.contains("reviews")) {
      const reviews = database.createObjectStore("reviews", { keyPath: "vocabularyId" });
      reviews.createIndex("by-next-review", "nextReviewAt");
    }
  }
});

export const defaultSettings: UserSettings = { speechRate: 0.95, theme: "light" };

export async function getSettings(): Promise<UserSettings> {
  const settings = await (await db).get("settings", "user");
  return settings ?? defaultSettings;
}

export async function saveSettings(settings: UserSettings) {
  await (await db).put("settings", settings, "user");
}

export async function saveWordProgress(progress: WordProgress) {
  await (await db).put("wordProgress", progress);
}

export async function getWordProgress(id: string) {
  return (await db).get("wordProgress", id);
}

export async function getAllWordProgress() {
  return (await db).getAll("wordProgress");
}

export async function getLessonProgress(lessonId: string) {
  return (await db).get("lessonProgress", lessonId);
}

export async function saveLessonProgress(progress: LessonProgress) {
  await (await db).put("lessonProgress", progress);
}

export async function saveAttempt(attempt: ExerciseAttempt) {
  await (await db).put("attempts", attempt);
}

export async function getAttempts() {
  return (await db).getAll("attempts");
}

export async function getMistakes() {
  const mistakes = await (await db).getAll("mistakes");
  return mistakes.sort((first, second) => second.lastAttemptedAt.localeCompare(first.lastAttemptedAt));
}

export async function saveMistake(mistake: MistakeRecord) {
  await (await db).put("mistakes", mistake);
}

export async function resolveMistake(questionId: string) {
  const database = await db;
  const mistake = await database.get("mistakes", questionId);
  if (mistake) await database.delete("mistakes", questionId);
}

export async function getDueReviews(now = new Date().toISOString()) {
  const reviews = await (await db).getAll("reviews");
  return reviews.filter((review) => review.nextReviewAt <= now).sort((first, second) => first.nextReviewAt.localeCompare(second.nextReviewAt));
}

export async function saveVocabularyReview(review: VocabularyReview) {
  await (await db).put("reviews", review);
}
