/**
 * Lectio core research domain — pure types and helpers.
 * No UI, no network, no storage. Import point for future integrations.
 *
 * Browser persistence lives in ./storage.research and is deliberately NOT
 * re-exported here; import it explicitly or via "@/lib/lectio/research".
 */

export * from "./evidence";
export * from "./concepts";
export * from "./sources";
export * from "./relations";
export * from "./analysis-link";
export * from "./knowledge-extraction";
