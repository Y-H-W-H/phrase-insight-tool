/**
 * Typed relationships between concepts, authors, works, and sources.
 * Foundation for future concept genealogy graphs.
 * Pure domain model: relations are plain records; graph traversal comes later.
 */

import type { EvidenceLevel } from "./evidence";

/** Типы сущностей, между которыми возможны связи. */
export type RelationNodeKind = "concept" | "author" | "work" | "source";

export type RelationNodeRef = {
  kind: RelationNodeKind;
  id: string;
  /** отображаемая подпись — денормализация для списков без join */
  label: string;
};

/** Семантика связи. Направление: from → to. */
export type RelationKind =
  | "derives_from" // концепт вырос из другого концепта
  | "influenced" // автор/произведение повлияло на автора/концепт
  | "responds_to" // ответ/полемика с концептом или произведением
  | "opposes" // сознательная оппозиция
  | "exemplifies" // произведение воплощает концепт
  | "defines" // источник даёт каноническое определение
  | "discusses" // источник обсуждает концепт/произведение
  | "translates" // перевод произведения
  | "part_of" // часть целого (глава — произведения и т.п.)
  | "synonym_of" // близкие концепты на разных языках
  | "other";

export type Relation = {
  id: string;
  from: RelationNodeRef;
  to: RelationNodeRef;
  kind: RelationKind;
  /** свободное пояснение, напр. "через чтение Bergson в 1890-е" */
  note?: string | undefined;
  /** период действия связи, напр. "1908–1922" */
  period?: string | undefined;
  /** источники, подтверждающие связь (id SourceRecord) */
  sourceIds?: string[] | undefined;
  /** уровень обоснованности связи — совместим с evidence.ts */
  evidenceLevel?: EvidenceLevel | undefined;
  createdAt: number;
  updatedAt: number;
};

/** Неориентированный запрос к будущему графу: все связи узла. */
export function relationTouches(relation: Relation, kind: RelationNodeKind, id: string): boolean {
  return (
    (relation.from.kind === kind && relation.from.id === id) ||
    (relation.to.kind === kind && relation.to.id === id)
  );
}

/** Исходящие связи узла (from). */
export function relationsFrom(relations: Relation[], kind: RelationNodeKind, id: string): Relation[] {
  return relations.filter((r) => r.from.kind === kind && r.from.id === id);
}

/** Входящие связи узла (to). */
export function relationsTo(relations: Relation[], kind: RelationNodeKind, id: string): Relation[] {
  return relations.filter((r) => r.to.kind === kind && r.to.id === id);
}
