/**
 * Knowledge Extraction DTOs (Lectio Knowledge Extraction Engine v0.1).
 *
 * Transport shapes returned by the AI extraction step — deliberately separate
 * from the persisted domain records (Concept / EvidenceClaim / Relation).
 * Pure module: no network, no storage, no UI.
 */

import type { EvidenceLevel } from "./evidence";
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
};

export type ResearchExtraction = {
  concepts: ExtractedConcept[];
  claims: ExtractedClaim[];
  relations: ExtractedRelation[];
  note?: string | undefined;
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

export function normalizeClaims(input: unknown): ExtractedClaim[] {
  const raw = Array.isArray(input) ? input : [];
  const out: ExtractedClaim[] = [];
  for (const item of raw as Record<string, unknown>[]) {
    const claim = text(item?.["claim"]);
    if (!claim) continue;
    const level = normalizeLevel(item?.["level"]);
    const quote = text(item?.["quote"]);
    // direct_quote без цитаты понижается до интерпретации — не выдумываем цитат.
    const finalLevel: EvidenceLevel = level === "direct_quote" && !quote ? "interpretation" : level;
    out.push({
      claim,
      level: finalLevel,
      confidence: clampConfidence(item?.["confidence"]),
      ...(quote ? { quote } : {}),
    });
  }
  return out;
}

export function normalizeRelations(input: unknown): ExtractedRelation[] {
  const raw = Array.isArray(input) ? input : [];
  const out: ExtractedRelation[] = [];
  for (const item of raw as Record<string, unknown>[]) {
    const fromName = text(item?.["fromName"]);
    const toName = text(item?.["toName"]);
    if (!fromName || !toName) continue;
    if (normalizeConceptName(fromName) === normalizeConceptName(toName)) continue;
    const note = text(item?.["note"]);
    out.push({
      fromName,
      toName,
      kind: normalizeRelationKind(item?.["kind"]),
      confidence: clampConfidence(item?.["confidence"]),
      ...(note ? { note } : {}),
    });
  }
  return out;
}

/** Полная нормализация ответа модели. Ничего не выдумывает, только чистит. */
export function normalizeResearchExtraction(input: unknown): ResearchExtraction {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const note = text(raw["note"]);
  return {
    concepts: normalizeConcepts(raw["concepts"]),
    claims: normalizeClaims(raw["claims"]),
    relations: normalizeRelations(raw["relations"]),
    ...(note ? { note } : {}),
  };
}

export function isEmptyExtraction(e: ResearchExtraction): boolean {
  return e.concepts.length === 0 && e.claims.length === 0 && e.relations.length === 0;
}
