/**
 * Knowledge Extraction DTOs (Lectio Knowledge Extraction Engine v0.1.1).
 *
 * Transport shapes returned by the AI extraction step — deliberately separate
 * from the persisted domain records (Concept / EvidenceClaim / Relation).
 * Pure module: no network, no storage, no UI.
 *
 * v0.1.1 — Evidence Hardening:
 * — direct_quote is accepted only when the quote literally occurs in the
 *   supplied source material (whitespace-normalised, no semantic matching);
 * — scholarly_consensus is downgraded to interpretation while the extraction
 *   has no explicit secondary/academic source (none exist in v0.1.x);
 * — every relation must point at ≥1 supporting claim of the same extraction
 *   (by index); relations without valid support are dropped.
 */

import type { EvidenceLevel } from "./evidence";
import { EVIDENCE_LEVEL_STRENGTH } from "./evidence";
import type { RelationKind } from "./relations";

export type ExtractedConcept = {
  name: string;
  aliases: string[];
  description: string;
  confidence: number;
};

export type ExtractedClaim = {
  claim: string;
  level: EvidenceLevel;
  confidence: number;
  quote?: string | undefined;
};

export type ExtractedRelation = {
  fromName: string;
  toName: string;
  kind: RelationKind;
  note?: string | undefined;
  confidence: number;
  /** индексы утверждений (claims[]) этого же извлечения, обосновывающих связь */
  supportingClaims: number[];
};

export type ResearchExtraction = {
  concepts: ExtractedConcept[];
  claims: ExtractedClaim[];
  relations: ExtractedRelation[];
  note?: string | undefined;
};

/** Предоставленный модели материал — единственная допустимая база для direct_quote. */
export type SourceMaterial = {
  selection?: string | undefined;
  sentence?: string | undefined;
  prevSentence?: string | undefined;
  nextSentence?: string | undefined;
  context?: string | undefined;
};

export type NormalizeOptions = {
  /** материал для буквальной проверки цитат; без него direct_quote не проверяется */
  material?: SourceMaterial | undefined;
  /**
   * Разрешить scholarly_consensus. В v0.1.1 внешних/secondary источников нет,
   * поэтому по умолчанию false → понижение до interpretation.
   */
  allowScholarlyConsensus?: boolean | undefined;
};

const EVIDENCE_LEVELS: EvidenceLevel[] = [
  "direct_quote",
  "author_statement",
  "scholarly_consensus",
  "interpretation",
  "hypothesis",
];

const RELATION_KINDS: RelationKind[] = [
  "derives_from",
  "influenced",
  "responds_to",
  "opposes",
  "exemplifies",
  "defines",
  "discusses",
  "translates",
  "part_of",
  "synonym_of",
  "other",
];

export function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Нормализация имени концепта для дедупликации. */
export function normalizeConceptName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Только пробелы/переводы строк — никакой семантики, регистра или пунктуации. */
export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Буквальное вхождение цитаты в материал (после нормализации пробелов). */
export function quoteOccursIn(quote: string, material: SourceMaterial): boolean {
  const q = normalizeWhitespace(quote);
  if (!q) return false;
  const haystacks = [
    material.selection,
    material.sentence,
    material.prevSentence,
    material.nextSentence,
    material.context,
  ];
  return haystacks.some((h) => Boolean(h) && normalizeWhitespace(h as string).includes(q));
}

function normalizeLevel(v: unknown): EvidenceLevel {
  const s = text(v) as EvidenceLevel;
  return EVIDENCE_LEVELS.includes(s) ? s : "interpretation";
}

function normalizeRelationKind(v: unknown): RelationKind {
  const s = text(v) as RelationKind;
  return RELATION_KINDS.includes(s) ? s : "other";
}

export function normalizeConcepts(input: unknown): ExtractedConcept[] {
  const raw = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const out: ExtractedConcept[] = [];
  for (const item of raw as Record<string, unknown>[]) {
    const name = text(item?.["name"]);
    if (!name) continue;
    const key = normalizeConceptName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const aliases = (Array.isArray(item?.["aliases"]) ? (item["aliases"] as unknown[]) : [])
      .map(text)
      .filter((a) => a && normalizeConceptName(a) !== key);
    out.push({
      name,
      aliases: [...new Set(aliases)],
      description: text(item?.["description"]),
      confidence: clampConfidence(item?.["confidence"]),
    });
  }
  return out;
}

/**
 * Нормализация утверждений. Индексы сохраняются 1:1 с входным массивом ТОЛЬКО
 * для непустых claim; пустые пропускаются, поэтому relations должны
 * ссылаться на индексы уже нормализованного массива (см. normalizeResearchExtraction,
 * где карта индексов передаётся дальше).
 */
export function normalizeClaims(
  input: unknown,
  options: NormalizeOptions = {},
): { claims: ExtractedClaim[]; indexMap: Map<number, number> } {
  const raw = Array.isArray(input) ? input : [];
  const out: ExtractedClaim[] = [];
  const indexMap = new Map<number, number>();
  raw.forEach((item: Record<string, unknown>, rawIndex) => {
    const claim = text(item?.["claim"]);
    if (!claim) return;
    let level = normalizeLevel(item?.["level"]);
    let quote = text(item?.["quote"]);

    // direct_quote без цитаты → интерпретация; цитата должна буквально встречаться в материале.
    if (level === "direct_quote") {
      const verified =
        Boolean(quote) && (options.material ? quoteOccursIn(quote, options.material) : true);
      if (!verified) {
        level = "interpretation";
        quote = "";
      }
    } else if (quote && options.material && !quoteOccursIn(quote, options.material)) {
      // цитата у не-direct_quote тоже не должна быть выдуманной
      quote = "";
    }

    // scholarly_consensus без явного secondary source недопустим (v0.1.1: таких источников нет).
    if (level === "scholarly_consensus" && !options.allowScholarlyConsensus) {
      level = "interpretation";
    }

    indexMap.set(rawIndex, out.length);
    out.push({
      claim,
      level,
      confidence: clampConfidence(item?.["confidence"]),
      ...(quote ? { quote } : {}),
    });
  });
  return { claims: out, indexMap };
}

/**
 * Нормализация связей. `claimIndexMap` переводит индексы сырого массива claims
 * в индексы нормализованного; связь без хотя бы одного валидного supporting
 * claim отбрасывается.
 */
export function normalizeRelations(
  input: unknown,
  claimIndexMap: Map<number, number>,
): ExtractedRelation[] {
  const raw = Array.isArray(input) ? input : [];
  const out: ExtractedRelation[] = [];
  for (const item of raw as Record<string, unknown>[]) {
    const fromName = text(item?.["fromName"]);
    const toName = text(item?.["toName"]);
    if (!fromName || !toName) continue;
    if (normalizeConceptName(fromName) === normalizeConceptName(toName)) continue;
    const rawSupport = Array.isArray(item?.["supportingClaims"])
      ? (item["supportingClaims"] as unknown[])
      : [];
    const supportingClaims = [
      ...new Set(
        rawSupport
          .map((n) => (typeof n === "number" ? n : Number(n)))
          .filter((n) => Number.isInteger(n) && claimIndexMap.has(n))
          .map((n) => claimIndexMap.get(n) as number),
      ),
    ];
    if (supportingClaims.length === 0) continue;
    const note = text(item?.["note"]);
    out.push({
      fromName,
      toName,
      kind: normalizeRelationKind(item?.["kind"]),
      confidence: clampConfidence(item?.["confidence"]),
      supportingClaims,
      ...(note ? { note } : {}),
    });
  }
  return out;
}

/** Самый слабый уровень среди supporting claims связи; без claims — hypothesis. */
export function weakestSupportingLevel(
  relation: ExtractedRelation,
  claims: ExtractedClaim[],
): EvidenceLevel {
  let weakest: EvidenceLevel | null = null;
  for (const i of relation.supportingClaims) {
    const c = claims[i];
    if (!c) continue;
    if (!weakest || EVIDENCE_LEVEL_STRENGTH[c.level] < EVIDENCE_LEVEL_STRENGTH[weakest]) {
      weakest = c.level;
    }
  }
  return weakest ?? "hypothesis";
}

/** Полная нормализация ответа модели. Ничего не выдумывает, только чистит и понижает. */
export function normalizeResearchExtraction(
  input: unknown,
  options: NormalizeOptions = {},
): ResearchExtraction {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const note = text(raw["note"]);
  const { claims, indexMap } = normalizeClaims(raw["claims"], options);
  return {
    concepts: normalizeConcepts(raw["concepts"]),
    claims,
    relations: normalizeRelations(raw["relations"], indexMap),
    ...(note ? { note } : {}),
  };
}

export function isEmptyExtraction(e: ResearchExtraction): boolean {
  return e.concepts.length === 0 && e.claims.length === 0 && e.relations.length === 0;
}

/* ---------- research record keys ---------- */

/** Небольшой стабильный хеш (djb2) для компактных ключей localStorage. */
function stableHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * Ключ записи исследования: bookId + selection + sentence, чтобы одинаковый
 * фрагмент в разных предложениях не перетирал запись.
 */
export function researchRecordKey(input: {
  bookId: string;
  selection: string;
  sentence?: string | undefined;
}): string {
  const sel = normalizeWhitespace(input.selection);
  const sent = normalizeWhitespace(input.sentence ?? "");
  return `rec:${input.bookId}:${stableHash(sel)}:${stableHash(sent)}`;
}

/** Ключ v0.1 (коллизии по selection) — только для чтения старых записей. */
export function legacyResearchRecordKey(input: { bookId: string; selection: string }): string {
  return `sel:${input.bookId}:${input.selection}`;
}
