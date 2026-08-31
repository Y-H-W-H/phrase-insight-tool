export type Book = {
  id: string;
  title: string;
  author?: string;
  language: string;
  content: string;
  createdAt: number;
  progress: number; // 0..1
  scrollTop?: number;
};

export type AnalysisSection = {
  key: string;
  title: string;
  body: string;
};

export type SynonymItem = { word: string; difference: string };
export type ExampleItem = { text: string; translation: string };

export type Analysis = {
  selection: string;
  sentence: string;
  language: string;
  source: "ai" | "demo";
  kind: "word" | "phrase";

  /* общее */
  translationLiteral: string;
  translationContextual: string;
  meaning: string;
  nuances: string;
  grammar: string;
  context: string;
  examples: ExampleItem[];
  synonyms: SynonymItem[];
  etymology: string;
  /** честная оценка надёжности: факт / устоявшееся / интерпретация / гипотеза */
  confidence?: string;

  /* слово */
  lemma: string;
  pronunciation?: string;
  partOfSpeech: string;
  morphology: string;
  wordChoice?: string;
  wordFamily?: { word: string; gloss: string }[];
  collocations?: string[];
  register?: string;

  /* фрагмент */
  whatHappens?: string;
  syntax?: string;
  keyElements?: { text: string; note: string }[];
  styleWhy?: string;
};

export type VocabOccurrence = {
  id: string;
  selection: string;
  sentence: string;
  context?: string;
  bookId?: string;
  bookTitle: string;
  author?: string;
  translation: string;
  createdAt: number;
};

export type VocabEntry = {
  id: string;
  /** ключ записи: лемма (или сама форма, если леммы нет) */
  lemma: string;
  selection: string;
  translation: string;
  language: string;
  sentence: string;
  bookTitle: string;
  author?: string;
  note?: string;
  analysis?: Analysis;
  occurrences: VocabOccurrence[];
  createdAt: number;
  updatedAt: number;
};

export type HistoryItem = {
  id: string;
  selection: string;
  sentence: string;
  context?: string;
  language: string;
  kind?: "word" | "phrase";
  bookId: string;
  bookTitle: string;
  author?: string;
  /** краткий контекстный смысл для списка истории */
  meaning?: string;
  /** сохранённый разбор, чтобы открыть его повторно без нового запроса */
  analysis?: Analysis;
  createdAt: number;
};

export type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  columnWidth: number;
  theme: "light" | "dark" | "sepia";
  markStudied: boolean;
};

export const defaultSettings: ReaderSettings = {
  fontSize: 20,
  lineHeight: 1.75,
  columnWidth: 680,
  theme: "light",
  markStudied: true,
};
