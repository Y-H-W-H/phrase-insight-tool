import type { Analysis } from "./types";
import { findDemoAnalysis, demoFollowUp } from "./demo";
import { analyzeSelection, askDeeper, aiAvailable } from "./analysis.functions";

export type AnalysisRequest = {
  selection: string;
  sentence: string;
  context: string;
  language: string;
  bookTitle: string;
};

let availability: boolean | null = null;

export async function isAiAvailable(): Promise<boolean> {
  if (availability !== null) return availability;
  try {
    const r = await aiAvailable();
    availability = r.available;
  } catch {
    availability = false;
  }
  return availability;
}

/** Единая точка входа анализа. Позже сюда можно подключить другие движки. */
export async function requestAnalysis(
  req: AnalysisRequest,
): Promise<{ analysis: Analysis; note?: string }> {
  try {
    const raw = (await analyzeSelection({ data: req })) as Partial<Analysis>;
    return {
      analysis: {
        selection: req.selection,
        sentence: req.sentence,
        language: req.language,
        source: "ai",
        translationLiteral: raw.translationLiteral ?? "",
        translationContextual: raw.translationContextual ?? "",
        lemma: raw.lemma ?? "",
        partOfSpeech: raw.partOfSpeech ?? "",
        morphology: raw.morphology ?? "",
        grammar: raw.grammar ?? "",
        meaning: raw.meaning ?? "",
        nuances: raw.nuances ?? "",
        synonyms: raw.synonyms ?? [],
        etymology: raw.etymology ?? "",
        context: raw.context ?? "",
        examples: raw.examples ?? [],
      },
    };
  } catch (e) {
    availability = false;
    const note =
      e instanceof Error && e.message !== "NO_AI"
        ? `AI недоступен: ${e.message} Показан демо-разбор.`
        : "AI не подключён. Показан демо-разбор.";
    return { analysis: findDemoAnalysis(req.selection, req.sentence), note };
  }
}

export async function requestFollowUp(
  req: AnalysisRequest & { question: string },
): Promise<{ answer: string; source: "ai" | "demo" }> {
  try {
    const r = await askDeeper({ data: req });
    return { answer: r.answer, source: "ai" };
  } catch {
    return { answer: demoFollowUp, source: "demo" };
  }
}
