/**
 * Compatibility layer between the existing Analysis type (../types) and the
 * core research domain (concepts / evidence / sources / relations).
 *
 * The existing Analysis type is NOT modified. Enrichment lives beside it in a
 * separate envelope, so the Reader/Analysis UI keeps working untouched while
 * the domain layer can grow independently.
 */

import type { Analysis } from "../types";
import type { Concept } from "./concepts";
import type { EvidenceClaim, EvidenceLevel, EvidenceSourceRef } from "./evidence";
import { EVIDENCE_LEVEL_STRENGTH } from "./evidence";
import type { SourceRecord } from "./sources";

/** Ссылка на концепт из разбора. Денормализована ради списков без join. */
export type AnalysisConceptRef = {
  conceptId: string;
  /** отображаемое имя на момент привязки */
  name: string;
  /** к какому месту разбора относится: поле Analysis или свободный ключ */
  field?: string | undefined;
  /** насколько уверенно фрагмент относится к концепту, 0..1 */
  confidence?: number | undefined;
};

/** Привязка источника к разбору как подтверждающего материала. */
export type AnalysisSourceRef = {
  sourceId: string;
  /** страница/глава/фрагмент */
  locator?: string | undefined;
  /** зачем этот источник здесь */
  role?: "supports" | "contradicts" | "background" | "reference" | undefined;
};

/**
 * Разбор + необязательный исследовательский слой.
 * Все поля слоя опциональны: старые сохранённые разборы валидны как есть.
 */
export type EnrichedAnalysis = {
  analysis: Analysis;
  conceptRefs?: AnalysisConceptRef[] | undefined;
  claims?: EvidenceClaim[] | undefined;
  sourceRefs?: AnalysisSourceRef[] | undefined;
  updatedAt?: number | undefined;
};

/* ------------------------------------------------------------------ */
/* Конструкторы и безопасные аксессоры                                  */
/* ------------------------------------------------------------------ */

/** Оборачивает обычный Analysis в конверт без исследовательских данных. */
export function toEnrichedAnalysis(analysis: Analysis): EnrichedAnalysis {
  return { analysis };
}

/** Достаёт исходный Analysis — граница для UI, который ничего не знает о core. */
export function toPlainAnalysis(input: Analysis | EnrichedAnalysis): Analysis {
  return isEnrichedAnalysis(input) ? input.analysis : input;
}

export function isEnrichedAnalysis(value: unknown): value is EnrichedAnalysis {
  return (
    typeof value === "object" &&
    value !== null &&
    "analysis" in value &&
    typeof (value as { analysis: unknown }).analysis === "object" &&
    (value as { analysis: unknown }).analysis !== null
  );
}

const list = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);

export const getConceptRefs = (e: EnrichedAnalysis | undefined): AnalysisConceptRef[] =>
  list(e?.conceptRefs);
export const getClaims = (e: EnrichedAnalysis | undefined): EvidenceClaim[] => list(e?.claims);
export const getSourceRefs = (e: EnrichedAnalysis | undefined): AnalysisSourceRef[] =>
  list(e?.sourceRefs);

/* ------------------------------------------------------------------ */
/* Присоединение данных (иммутабельно, с дедупликацией)                 */
/* ------------------------------------------------------------------ */

const stamp = (e: EnrichedAnalysis, patch: Partial<EnrichedAnalysis>): EnrichedAnalysis => ({
  ...e,
  ...patch,
  updatedAt: Date.now(),
});

/** Привязывает концепт. Повторная привязка того же id обновляет запись. */
export function attachConcept(
  enriched: EnrichedAnalysis,
  ref: AnalysisConceptRef | Concept,
  field?: string,
): EnrichedAnalysis {
  const next: AnalysisConceptRef =
    "conceptId" in ref
      ? ref
      : { conceptId: ref.id, name: ref.name, ...(field ? { field } : {}) };
  const rest = getConceptRefs(enriched).filter(
    (c) => !(c.conceptId === next.conceptId && c.field === next.field),
  );
  return stamp(enriched, { conceptRefs: [...rest, next] });
}

export function detachConcept(enriched: EnrichedAnalysis, conceptId: string): EnrichedAnalysis {
  return stamp(enriched, {
    conceptRefs: getConceptRefs(enriched).filter((c) => c.conceptId !== conceptId),
  });
}

/** Добавляет проверяемое утверждение; по id — обновляет существующее. */
export function attachClaim(enriched: EnrichedAnalysis, claim: EvidenceClaim): EnrichedAnalysis {
  const rest = getClaims(enriched).filter((c) => c.id !== claim.id);
  return stamp(enriched, { claims: [...rest, claim] });
}

export function detachClaim(enriched: EnrichedAnalysis, claimId: string): EnrichedAnalysis {
  return stamp(enriched, { claims: getClaims(enriched).filter((c) => c.id !== claimId) });
}

/** Привязывает источник как подтверждающий материал. */
export function attachSource(
  enriched: EnrichedAnalysis,
  source: AnalysisSourceRef | SourceRecord,
): EnrichedAnalysis {
  const next: AnalysisSourceRef =
    "sourceId" in source ? source : { sourceId: source.id, role: "reference" };
  const rest = getSourceRefs(enriched).filter(
    (s) => !(s.sourceId === next.sourceId && s.locator === next.locator),
  );
  return stamp(enriched, { sourceRefs: [...rest, next] });
}

export function detachSource(enriched: EnrichedAnalysis, sourceId: string): EnrichedAnalysis {
  return stamp(enriched, {
    sourceRefs: getSourceRefs(enriched).filter((s) => s.sourceId !== sourceId),
  });
}

/* ------------------------------------------------------------------ */
/* Производные величины                                                 */
/* ------------------------------------------------------------------ */

/** Все источники, упомянутые и напрямую, и внутри утверждений (уникальные id). */
export function collectSourceIds(enriched: EnrichedAnalysis | undefined): string[] {
  const ids = new Set<string>();
  for (const s of getSourceRefs(enriched)) ids.add(s.sourceId);
  for (const c of getClaims(enriched)) {
    for (const s of c.sources ?? ([] as EvidenceSourceRef[])) ids.add(s.sourceId);
  }
  return [...ids];
}

/** Самый слабый уровень обоснования среди утверждений — честная нижняя граница. */
export function weakestEvidenceLevel(
  enriched: EnrichedAnalysis | undefined,
): EvidenceLevel | undefined {
  const claims = getClaims(enriched);
  if (claims.length === 0) return undefined;
  return claims.reduce((weakest, c) =>
    EVIDENCE_LEVEL_STRENGTH[c.level] < EVIDENCE_LEVEL_STRENGTH[weakest.level] ? c : weakest,
  ).level;
}

/** Есть ли хоть какой-то исследовательский слой (для будущих индикаторов в UI). */
export function hasResearchLayer(enriched: EnrichedAnalysis | undefined): boolean {
  return (
    getConceptRefs(enriched).length > 0 ||
    getClaims(enriched).length > 0 ||
    getSourceRefs(enriched).length > 0
  );
}
