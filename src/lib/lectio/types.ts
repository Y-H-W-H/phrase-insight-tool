export type Book = {
  id: string;
  title: string;
  author?: string | undefined;
  language: string;
  content: string;
  createdAt: number;
  progress: number; // 0..1
  scrollTop?: number | undefined;
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
  confidence?: string | undefined;

  /* слово */
  lemma: string;
  pronunciation?: string | undefined;
  partOfSpeech: string;
  morphology: string;
  wordChoice?: string | undefined;
  wordFamily?: { word: string; gloss: string }[] | undefined;
  collocations?: string[] | undefined;
  register?: string | undefined;

  /* фрагмент */
  whatHappens?: string | undefined;
  syntax?: string | undefined;
  keyElements?: { text: string; note: string }[] | undefined;
  styleWhy?: string | undefined;
};

export type VocabOccurrence = {
  id: string;
  selection: string;
  sentence: string;
  context?: string | undefined;
  bookId?: string | undefined;
  bookTitle: string;
  author?: string | undefined;
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
  author?: string | undefined;
  note?: string | undefined;
  analysis?: Analysis | undefined;
  occurrences: VocabOccurrence[];
  createdAt: number;
  updatedAt: number;
};

export type HistoryItem = {
  id: string;
  selection: string;
  sentence: string;
  context?: string | undefined;
  language: string;
  kind?: "word" | "phrase" | undefined;
  bookId: string;
  bookTitle: string;
  author?: string | undefined;
  /** краткий контекстный смысл для списка истории */
  meaning?: string | undefined;
  /** сохранённый разбор, чтобы открыть его повторно без нового запроса */
  analysis?: Analysis | undefined;
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
