import { useCallback, useEffect, useState } from "react";
import type {
  Analysis,
  Book,
  HistoryItem,
  ReaderSettings,
  VocabEntry,
  VocabOccurrence,
} from "./types";
import { defaultSettings } from "./types";
import { demoBook } from "./demo";
import { normalizeForm } from "./text";

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

type LegacyVocab = Partial<VocabEntry> & {
  id?: string;
  selection?: string;
  translation?: string;
  language?: string;
  sentence?: string;
  bookTitle?: string;
  createdAt?: number;
};

/** Миграция записей 0.1 → 0.2: достраивает lemma и occurrences, ничего не удаляя. */
function migrateEntry(raw: LegacyVocab): VocabEntry {
  const selection = raw.selection ?? "";
  const createdAt = raw.createdAt ?? Date.now();
  const lemma = raw.lemma && raw.lemma !== "—" ? raw.lemma : normalizeForm(selection) || selection;
  const occurrences: VocabOccurrence[] =
    raw.occurrences && raw.occurrences.length > 0
      ? raw.occurrences
      : [
          {
            id: uid(),
            selection,
            sentence: raw.sentence ?? "",
            context: raw.analysis?.context,
            bookTitle: raw.bookTitle ?? "",
            author: raw.author,
            translation: raw.translation ?? "",
            createdAt,
          },
        ];
  return {
    id: raw.id ?? uid(),
    lemma,
    selection,
    translation: raw.translation ?? "",
    language: raw.language ?? "other",
    sentence: raw.sentence ?? "",
    bookTitle: raw.bookTitle ?? "",
    author: raw.author,
    note: raw.note,
    analysis: raw.analysis,
    occurrences,
    createdAt,
    updatedAt: raw.updatedAt ?? createdAt,
  };
}

export function getVocab(): VocabEntry[] {
  const raw = read<LegacyVocab[]>(KEYS.vocab, []);
  const needsMigration = raw.some((e) => !e.occurrences || !e.lemma);
  const list = raw.map(migrateEntry);
  if (needsMigration && list.length > 0) write(KEYS.vocab, list);
  return list;
}

export type VocabInput = {
  selection: string;
  lemma?: string | undefined;
  translation: string;
  language: string;
  sentence: string;
  context?: string | undefined;
  bookId?: string | undefined;
  bookTitle: string;
  author?: string | undefined;
  analysis?: Analysis | undefined;
  note?: string | undefined;
};

function lemmaKey(input: { lemma?: string | undefined; selection: string }) {
  const l = input.lemma && input.lemma !== "—" ? input.lemma : input.selection;
  return normalizeForm(l);
}

export function saveVocab(input: VocabInput): "created" | "updated" {
  const all = getVocab();
  const key = lemmaKey(input);
  const now = Date.now();
  const occurrence: VocabOccurrence = {
    id: uid(),
    selection: input.selection,
    sentence: input.sentence,
    context: input.context,
    bookId: input.bookId,
    bookTitle: input.bookTitle,
    author: input.author,
    translation: input.translation,
    createdAt: now,
  };
  const existing = all.find(
    (e) => normalizeForm(e.lemma || e.selection) === key && e.language === input.language,
  );
  if (existing) {
    const already = existing.occurrences.some(
      (o) =>
        normalizeForm(o.selection) === normalizeForm(input.selection) &&
        o.sentence.trim() === input.sentence.trim(),
    );
    const merged: VocabEntry = {
      ...existing,
      translation: input.translation || existing.translation,
      analysis: input.analysis ?? existing.analysis,
      author: input.author ?? existing.author,
      note: input.note ?? existing.note,
      occurrences: already ? existing.occurrences : [occurrence, ...existing.occurrences],
      updatedAt: now,
    };
    write(
      KEYS.vocab,
      all.map((e) => (e.id === existing.id ? merged : e)),
    );
    notify();
    return "updated";
  }
  const entry: VocabEntry = {
    id: uid(),
    lemma: input.lemma && input.lemma !== "—" ? input.lemma : input.selection,
    selection: input.selection,
    translation: input.translation,
    language: input.language,
    sentence: input.sentence,
    bookTitle: input.bookTitle,
    author: input.author,
    note: input.note,
    analysis: input.analysis,
    occurrences: [occurrence],
    createdAt: now,
    updatedAt: now,
  };
  write(KEYS.vocab, [entry, ...all]);
  notify();
  return "created";
}

export function setVocabNote(id: string, note: string) {
  write(
    KEYS.vocab,
    getVocab().map((e) => (e.id === id ? { ...e, note, updatedAt: Date.now() } : e)),
  );
  notify();
}

/** Нормализованные формы и леммы всех сохранённых слов — для отметки изученного. */
export function getStudiedForms(language?: string): Set<string> {
  const set = new Set<string>();
  for (const e of getVocab()) {
    if (language && e.language !== language) continue;
    if (e.lemma) set.add(normalizeForm(e.lemma));
    set.add(normalizeForm(e.selection));
    for (const o of e.occurrences) set.add(normalizeForm(o.selection));
  }
  set.delete("");
  return set;
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

export function pushHistory(item: Omit<HistoryItem, "id" | "createdAt">): string {
  const all = getHistory().filter(
    (h) => !(h.selection === item.selection && h.bookId === item.bookId),
  );
  const id = uid();
  write(KEYS.history, [{ ...item, id, createdAt: Date.now() }, ...all].slice(0, 60));
  notify();
  return id;
}

/** Дописывает готовый разбор в уже созданную запись истории. */
export function attachHistoryAnalysis(id: string, analysis: Analysis) {
  write(
    KEYS.history,
    getHistory().map((h) =>
      h.id === id
        ? {
            ...h,
            analysis,
            kind: analysis.kind,
            meaning: analysis.translationContextual || analysis.meaning || h.meaning,
          }
        : h,
    ),
  );
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
