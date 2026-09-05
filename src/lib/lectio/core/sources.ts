/**
 * Primary and secondary sources for evidence-grounded research.
 * Pure domain model.
 */

export type SourceType =
  | "primary" // художественный/философский первоисточник
  | "secondary" // исследование, монография, статья
  | "reference" // словарь, энциклопедия, грамматика
  | "correspondence" // письма, дневники
  | "manuscript" // рукопись, черновик
  | "other";

/** Библиографические метаданные (опциональны — не всегда известны). */
export type SourceReferenceMeta = {
  publisher?: string | undefined;
  edition?: string | undefined;
  volume?: string | undefined;
  pages?: string | undefined;
  isbn?: string | undefined;
  doi?: string | undefined;
  url?: string | undefined;
  /** язык перевода, если источник цитируется в переводе */
  translatedFrom?: string | undefined;
  translator?: string | undefined;
};

export type SourceRecord = {
  id: string;
  author: string;
  title: string;
  year?: number | undefined;
  language: string;
  type: SourceType;
  reference?: SourceReferenceMeta | undefined;
  notes?: string | undefined;
  createdAt: number;
  updatedAt: number;
};
