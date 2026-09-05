/**
 * Philosophical and literary concepts — the nodes of future concept genealogy.
 * Pure domain model.
 */

export type Concept = {
  id: string;
  /** каноническое имя концепта, напр. "mémoire involontaire" */
  name: string;
  /** альтернативные наименования и переводы, напр. "непроизвольная память" */
  aliases: string[];
  /** краткое рабочее описание */
  description: string;
  /** id связанных концептов (детали связей — в relations.ts) */
  relatedConceptIds: string[];
  /** авторы, ассоциированные с концептом (id AuthorRef или свободные имена) */
  associatedAuthors: ConceptAuthorRef[];
  /** язык канонического имени */
  language?: string | undefined;
  /** свободные пометки */
  notes?: string | undefined;
  createdAt: number;
  updatedAt: number;
};

/** Ссылка на автора внутри концепта: либо на сущность, либо свободное имя. */
export type ConceptAuthorRef = {
  /** id автора, если он заведён как сущность */
  authorId?: string | undefined;
  /** отображаемое имя, напр. "Marcel Proust" */
  name: string;
  /** роль автора по отношению к концепту */
  role?: "originator" | "developer" | "critic" | "popularizer" | undefined;
};

/** Автор как самостоятельная сущность домена. */
export type Author = {
  id: string;
  name: string;
  /** годы жизни, напр. "1871–1922" */
  lifespan?: string | undefined;
  /** основные языки творчества */
  languages: string[];
  /** традиции/школы, напр. ["modernism"] */
  traditions?: string[] | undefined;
  notes?: string | undefined;
};

/** Литературное/философское произведение как сущность домена. */
export type Work = {
  id: string;
  title: string;
  authorId?: string | undefined;
  authorName?: string | undefined;
  year?: number | undefined;
  language?: string | undefined;
};
