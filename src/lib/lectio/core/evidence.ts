/**
 * Evidence-backed claims for source-grounded analysis.
 * Pure domain model — no UI, no storage, no AI calls.
 * Prepared for future integration with Analysis (Lectio 0.3+).
 */

/** How strongly a claim is grounded in sources. */
export type EvidenceLevel =
  | "direct_quote" // дословная цитата из первоисточника
  | "author_statement" // высказывание автора (письма, дневники, предисловия)
  | "scholarly_consensus" // устоявшаяся позиция в исследовательской литературе
  | "interpretation" // обоснованная интерпретация
  | "hypothesis"; // гипотеза, требующая проверки

/** Указание на конкретный источник внутри утверждения. */
export type EvidenceSourceRef = {
  /** id источника из SourceRecord (sources.ts) */
  sourceId: string;
  /** страница, глава, фрагмент или иной локатор */
  locator?: string | undefined;
  /** дословная цитата, если применимо */
  quote?: string | undefined;
  /** язык цитаты (ISO-код или внутренний код проекта) */
  quoteLanguage?: string | undefined;
};

/** 0..1 — субъективная уверенность в утверждении при данном уровне evidence. */
export type Confidence = number;

/** Одно проверяемое утверждение с привязкой к источникам. */
export type EvidenceClaim = {
  id: string;
  /** текст утверждения */
  claim: string;
  level: EvidenceLevel;
  confidence: Confidence;
  /** источники, на которые опирается утверждение */
  sources: EvidenceSourceRef[];
  /** свободные пометки исследователя */
  notes?: string | undefined;
  /** язык утверждения */
  language?: string | undefined;
  createdAt: number;
  updatedAt: number;
};

/** Коллекция утверждений, относящихся к одному предмету (слову, фразе, концепту). */
export type EvidenceSet = {
  id: string;
  /** на что ссылается набор: selection, лемма, id концепта и т.п. */
  subject: string;
  subjectKind: "selection" | "lemma" | "concept" | "work" | "author";
  claims: EvidenceClaim[];
  createdAt: number;
  updatedAt: number;
};

/** Порядок убывания надёжности — для сортировки и отображения. */
export const EVIDENCE_LEVEL_STRENGTH: Record<EvidenceLevel, number> = {
  direct_quote: 5,
  author_statement: 4,
  scholarly_consensus: 3,
  interpretation: 2,
  hypothesis: 1,
};
