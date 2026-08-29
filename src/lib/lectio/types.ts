export type Book = {
  id: string;
  title: string;
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

export type Analysis = {
  selection: string;
  sentence: string;
  language: string;
  source: "ai" | "demo";
  translationLiteral: string;
  translationContextual: string;
  lemma: string;
  partOfSpeech: string;
  morphology: string;
  grammar: string;
  meaning: string;
  nuances: string;
  synonyms: { word: string; difference: string }[];
  etymology: string;
  context: string;
  examples: { text: string; translation: string }[];
};

export type VocabEntry = {
  id: string;
  selection: string;
  lemma: string;
  translation: string;
  language: string;
  sentence: string;
  bookTitle: string;
  createdAt: number;
  updatedAt: number;
};

export type HistoryItem = {
  id: string;
  selection: string;
  sentence: string;
  language: string;
  bookId: string;
  bookTitle: string;
  createdAt: number;
};

export type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  columnWidth: number;
  theme: "light" | "dark";
};

export const defaultSettings: ReaderSettings = {
  fontSize: 20,
  lineHeight: 1.75,
  columnWidth: 680,
  theme: "light",
};
