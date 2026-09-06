import type { Analysis } from "./types";
import { findDemoAnalysis, demoFollowUp } from "./demo";
import {
  analyzeSelection,
  askDeeper,
  aiAvailable,
  extractResearchKnowledge,
} from "./analysis.functions";
import {
  normalizeResearchExtraction,
  type ResearchExtraction,
} from "./core/knowledge-extraction";


export type AnalysisRequest = {
  selection: string;
  sentence: string;
  prevSentence?: string;
  nextSentence?: string;
  context: string;
  language: string;
  bookTitle: string;
  author?: string;
  kind?: "word" | "phrase";
};

export function detectKind(selection: string): "word" | "phrase" {
  return selection.trim().split(/\s+/).length > 1 ? "phrase" : "word";
}

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

function payload(req: AnalysisRequest) {
  return {
    selection: req.selection,
    sentence: req.sentence ?? "",
    prevSentence: req.prevSentence ?? "",
    nextSentence: req.nextSentence ?? "",
    context: req.context ?? "",
    language: req.language,
    bookTitle: req.bookTitle ?? "",
    author: req.author ?? "",
    uiLanguage: "ru",
    kind: req.kind ?? detectKind(req.selection),
  };
}

/** Единая точка входа анализа. Позже сюда можно подключить другие движки. */
export async function requestAnalysis(
  req: AnalysisRequest,
): Promise<{ analysis: Analysis; note?: string }> {
  const kind = req.kind ?? detectKind(req.selection);
  try {
    const raw = (await analyzeSelection({ data: payload(req) })) as Partial<Analysis>;
    return {
      analysis: {
        selection: req.selection,
        sentence: req.sentence,
        language: req.language,
        source: "ai",
        kind,
        translationLiteral: raw.translationLiteral ?? "",
        translationContextual: raw.translationContextual ?? "",
        lemma: raw.lemma ?? "",
        pronunciation: raw.pronunciation ?? "",
        partOfSpeech: raw.partOfSpeech ?? "",
        morphology: raw.morphology ?? "",
        grammar: raw.grammar ?? "",
        meaning: raw.meaning ?? "",
        nuances: raw.nuances ?? "",
        wordChoice: raw.wordChoice ?? "",
        synonyms: raw.synonyms ?? [],
        etymology: raw.etymology ?? "",
        wordFamily: raw.wordFamily ?? [],
        collocations: raw.collocations ?? [],
        register: raw.register ?? "",
        context: raw.context ?? "",
        examples: raw.examples ?? [],
        confidence: raw.confidence ?? "",
        whatHappens: raw.whatHappens ?? "",
        syntax: raw.syntax ?? "",
        keyElements: raw.keyElements ?? [],
        styleWhy: raw.styleWhy ?? "",
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

/** Краткое текстовое представление разбора — передаётся в follow-up. */
export function analysisDigest(a: Analysis): string {
  const parts: (string | undefined)[] = [
    a.translationContextual && `Перевод: ${a.translationContextual}`,
    a.lemma && `Лемма: ${a.lemma}`,
    a.morphology && `Морфология: ${a.morphology}`,
    a.grammar && `Грамматика: ${a.grammar}`,
    a.syntax && `Синтаксис: ${a.syntax}`,
    a.meaning && `Значение: ${a.meaning}`,
    a.wordChoice && `Выбор слова: ${a.wordChoice}`,
    a.styleWhy && `Стиль: ${a.styleWhy}`,
    a.etymology && `Этимология: ${a.etymology}`,
  ];
  return parts.filter(Boolean).join("\n").slice(0, 6000);
}

export async function requestFollowUp(
  req: AnalysisRequest & {
    question: string;
    priorAnalysis?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  },
): Promise<{ answer: string; source: "ai" | "demo" }> {
  try {
    const r = await askDeeper({
      data: {
        ...payload(req),
        question: req.question,
        priorAnalysis: req.priorAnalysis ?? "",
        history: req.history ?? [],
      },
    });
    return { answer: r.answer, source: "ai" };
  } catch {
    return { answer: demoFollowUp, source: "demo" };
  }
}
