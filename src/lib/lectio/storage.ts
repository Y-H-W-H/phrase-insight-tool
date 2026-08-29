import { useCallback, useEffect, useState } from "react";
import type { Book, HistoryItem, ReaderSettings, VocabEntry } from "./types";
import { defaultSettings } from "./types";
import { demoBook } from "./demo";

const KEYS = {
  books: "lectio.books.v1",
  vocab: "lectio.vocab.v1",
  history: "lectio.history.v1",
  settings: "lectio.settings.v1",
  seeded: "lectio.seeded.v1",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ---------- books ---------- */

export function getBooks(): Book[] {
  const seeded = read<boolean>(KEYS.seeded, false);
  let books = read<Book[]>(KEYS.books, []);
  if (!seeded) {
    books = [demoBook, ...books];
    write(KEYS.books, books);
    write(KEYS.seeded, true);
  }
  return books;
}

export function saveBooks(books: Book[]) {
  write(KEYS.books, books);
  notify();
}

export function addBook(input: { title: string; language: string; content: string }): Book {
  const book: Book = {
    id: uid(),
    title: input.title.trim() || "Без названия",
    language: input.language,
    content: input.content,
    createdAt: Date.now(),
    progress: 0,
  };
  saveBooks([book, ...getBooks()]);
  return book;
}

export function deleteBook(id: string) {
  saveBooks(getBooks().filter((b) => b.id !== id));
}

export function updateBook(id: string, patch: Partial<Book>) {
  saveBooks(getBooks().map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

/* ---------- vocabulary ---------- */

export function getVocab(): VocabEntry[] {
  return read<VocabEntry[]>(KEYS.vocab, []);
}

export function saveVocab(
  entry: Omit<VocabEntry, "id" | "createdAt" | "updatedAt">,
): "created" | "updated" {
  const all = getVocab();
  const key = entry.selection.trim().toLowerCase();
  const existing = all.find(
    (e) => e.selection.trim().toLowerCase() === key && e.language === entry.language,
  );
  if (existing) {
    const merged: VocabEntry = { ...existing, ...entry, updatedAt: Date.now() };
    write(
      KEYS.vocab,
      all.map((e) => (e.id === existing.id ? merged : e)),
    );
    notify();
    return "updated";
  }
  write(KEYS.vocab, [
    { ...entry, id: uid(), createdAt: Date.now(), updatedAt: Date.now() },
    ...all,
  ]);
  notify();
  return "created";
}

export function deleteVocab(id: string) {
  write(
    KEYS.vocab,
    getVocab().filter((e) => e.id !== id),
  );
  notify();
}

/* ---------- history ---------- */

export function getHistory(): HistoryItem[] {
  return read<HistoryItem[]>(KEYS.history, []);
}

export function pushHistory(item: Omit<HistoryItem, "id" | "createdAt">) {
  const all = getHistory().filter(
    (h) => !(h.selection === item.selection && h.bookId === item.bookId),
  );
  write(KEYS.history, [{ ...item, id: uid(), createdAt: Date.now() }, ...all].slice(0, 30));
  notify();
}

export function clearHistory() {
  write(KEYS.history, []);
  notify();
}

/* ---------- settings ---------- */

export function getSettings(): ReaderSettings {
  return { ...defaultSettings, ...read<Partial<ReaderSettings>>(KEYS.settings, {}) };
}

export function setSettings(s: ReaderSettings) {
  write(KEYS.settings, s);
  notify();
}

/* ---------- react glue ---------- */

export function useStore<T>(selector: () => T): [T, () => void] {
  const [value, setValue] = useState<T>(selector);
  const refresh = useCallback(() => setValue(selector()), [selector]);
  useEffect(() => {
    refresh();
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);
  return [value, refresh];
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
