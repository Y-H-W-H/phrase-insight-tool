/**
 * Research storage layer (Lectio Core v0.3).
 *
 * Separate localStorage namespace ("lectio.research.*") for the research
 * domain: concepts, sources, evidence claims, relations, enriched analyses.
 * Existing vocabulary/history/book storage in ../storage.ts is NOT touched;
 * old saved analyses keep working because enrichment is stored beside them,
 * keyed by analysis id, never inside them.
 *
 * Preparation for future work (not implemented yet):
 * — Guénon corpus: sources + concepts become a curated, shippable dataset.
 * — bilingual original/translation reading mode: SourceRecord.reference holds
 *   translator/translatedFrom, relations of kind "translates" link the pair.
 * — genealogy of ideas graph: Relation records are already graph edges.
 * — evidence verification layer: EvidenceClaim levels + confidence let the AI
 *   output be checked against real sources instead of being trusted wholesale.
 */

import type { Concept } from "./concepts";
import type { EvidenceClaim } from "./evidence";
import type { Relation } from "./relations";
import type { SourceRecord } from "./sources";
import type { EnrichedAnalysis } from "./analysis-link";

/** Bump when the shape of any research bucket changes; see migrate() below. */
export const RESEARCH_SCHEMA_VERSION = 1;

const KEYS = {
  version: "lectio.research.version",
  concepts: "lectio.research.concepts.v1",
  sources: "lectio.research.sources.v1",
  claims: "lectio.research.claims.v1",
  relations: "lectio.research.relations.v1",
  enriched: "lectio.research.enriched.v1",
} as const;

/* ---------- low-level, SSR-safe ---------- */

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — research data is non-critical, fail silently */
  }
}

const arr = <T>(key: string): T[] => {
  const value = read<T[]>(key, []);
  return Array.isArray(value) ? value : [];
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

/** Subscribe to research-store changes (for future UI). */
export function subscribeResearch(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function researchUid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ---------- versioned migration ---------- */

/**
 * Same strategy as the vocabulary 0.1→0.2 migration: read stored version,
 * apply forward-only steps, write the new version. v1 is the initial shape,
 * so there is nothing to transform yet — the hook exists so later versions
 * (e.g. adding fields to Concept) can migrate in place without data loss.
 */
export function migrateResearchStore(): void {
  if (typeof window === "undefined") return;
  const current = read<number>(KEYS.version, 0);
  if (current === RESEARCH_SCHEMA_VERSION) return;
  // case 0 → 1: fresh namespace, nothing to rewrite.
  write(KEYS.version, RESEARCH_SCHEMA_VERSION);
}

/** Upsert by id into a bucket, newest first. */
function upsert<T extends { id: string }>(key: string, item: T): T {
  migrateResearchStore();
  const rest = arr<T>(key).filter((x) => x.id !== item.id);
  write(key, [item, ...rest]);
  notify();
  return item;
}

/* ---------- concepts ---------- */

export function getConcepts(): Concept[] {
  migrateResearchStore();
  return arr<Concept>(KEYS.concepts);
}

export function saveConcept(concept: Concept): Concept {
  return upsert(KEYS.concepts, { ...concept, updatedAt: Date.now() });
}

export function findConceptById(id: string): Concept | undefined {
  return getConcepts().find((c) => c.id === id);
}

/** Lookup by canonical name or alias, case-insensitive. */
export function findConceptByName(name: string): Concept | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return getConcepts().find(
    (c) =>
      c.name.toLowerCase() === needle ||
      (c.aliases ?? []).some((a) => a.toLowerCase() === needle),
  );
}

export function deleteConcept(id: string): void {
  write(KEYS.concepts, getConcepts().filter((c) => c.id !== id));
  notify();
}

/* ---------- sources ---------- */

export function getSources(): SourceRecord[] {
  migrateResearchStore();
  return arr<SourceRecord>(KEYS.sources);
}

export function saveSource(source: SourceRecord): SourceRecord {
  return upsert(KEYS.sources, { ...source, updatedAt: Date.now() });
}

export function findSourceById(id: string): SourceRecord | undefined {
  return getSources().find((s) => s.id === id);
}

export function deleteSource(id: string): void {
  write(KEYS.sources, getSources().filter((s) => s.id !== id));
  notify();
}

/* ---------- evidence claims ---------- */

export function getEvidenceClaims(): EvidenceClaim[] {
  migrateResearchStore();
  return arr<EvidenceClaim>(KEYS.claims);
}

export function saveEvidenceClaim(claim: EvidenceClaim): EvidenceClaim {
  return upsert(KEYS.claims, { ...claim, updatedAt: Date.now() });
}

export function findEvidenceClaimById(id: string): EvidenceClaim | undefined {
  return getEvidenceClaims().find((c) => c.id === id);
}

export function deleteEvidenceClaim(id: string): void {
  write(KEYS.claims, getEvidenceClaims().filter((c) => c.id !== id));
  notify();
}

/* ---------- relations (future genealogy graph) ---------- */

export function getRelations(): Relation[] {
  migrateResearchStore();
  return arr<Relation>(KEYS.relations);
}

export function saveRelation(relation: Relation): Relation {
  return upsert(KEYS.relations, { ...relation, updatedAt: Date.now() });
}

export function deleteRelation(id: string): void {
  write(KEYS.relations, getRelations().filter((r) => r.id !== id));
  notify();
}

/* ---------- enriched analyses ---------- */

/**
 * Stored as a map keyed by the id of the thing the analysis belongs to
 * (history item id or vocabulary entry id). Nothing is written into the
 * legacy analysis records, so reading an old analysis never depends on this.
 */
type EnrichedMap = Record<string, EnrichedAnalysis>;

export function getAllEnrichedAnalyses(): EnrichedMap {
  migrateResearchStore();
  const value = read<EnrichedMap>(KEYS.enriched, {});
  return value && typeof value === "object" ? value : {};
}

export function getEnrichedAnalysis(key: string): EnrichedAnalysis | undefined {
  if (!key) return undefined;
  return getAllEnrichedAnalyses()[key];
}

export function saveEnrichedAnalysis(key: string, enriched: EnrichedAnalysis): EnrichedAnalysis {
  migrateResearchStore();
  const stored: EnrichedAnalysis = { ...enriched, updatedAt: Date.now() };
  write(KEYS.enriched, { ...getAllEnrichedAnalyses(), [key]: stored });
  notify();
  return stored;
}

export function deleteEnrichedAnalysis(key: string): void {
  const all = getAllEnrichedAnalyses();
  if (!(key in all)) return;
  delete all[key];
  write(KEYS.enriched, all);
  notify();
}

/** Wipe only the research namespace; reader data is untouched. */
export function clearResearchStore(): void {
  write(KEYS.concepts, []);
  write(KEYS.sources, []);
  write(KEYS.claims, []);
  write(KEYS.relations, []);
  write(KEYS.enriched, {});
  notify();
}
