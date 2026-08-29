import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const analyzeInput = z.object({
  selection: z.string().min(1).max(2000),
  sentence: z.string().max(4000).default(""),
  context: z.string().max(6000).default(""),
  language: z.string().max(20).default("other"),
  bookTitle: z.string().max(300).default(""),
});

const askInput = analyzeInput.extend({ question: z.string().min(1).max(1000) });

const MODEL = "google/gemini-3.7-flash";
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "translationLiteral",
    "translationContextual",
    "lemma",
    "partOfSpeech",
    "morphology",
    "grammar",
    "meaning",
    "nuances",
    "synonyms",
    "etymology",
    "context",
    "examples",
  ],
  properties: {
    translationLiteral: { type: "string" },
    translationContextual: { type: "string" },
    lemma: { type: "string" },
    partOfSpeech: { type: "string" },
    morphology: { type: "string" },
    grammar: { type: "string" },
    meaning: { type: "string" },
    nuances: { type: "string" },
    synonyms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "difference"],
        properties: { word: { type: "string" }, difference: { type: "string" } },
      },
    },
    etymology: { type: "string" },
    context: { type: "string" },
    examples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "translation"],
        properties: { text: { type: "string" }, translation: { type: "string" } },
      },
    },
  },
} as const;

function gatewayError(status: number, message: string) {
  const map: Record<number, string> = {
    400: "Некорректный запрос к AI.",
    401: "AI не настроен: отсутствует ключ.",
    402: "Недостаточно AI-кредитов в рабочем пространстве.",
    403: "AI заблокирован политикой рабочего пространства.",
    429: "Слишком много запросов к AI. Попробуйте через минуту.",
  };
  return new Error(map[status] ?? `Ошибка AI (${status}). ${message}`.trim());
}

async function callGateway(body: unknown) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("NO_AI");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw gatewayError(res.status, text.slice(0, 300));
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export const aiAvailable = createServerFn({ method: "GET" }).handler(async () => {
  return { available: Boolean(process.env["LOVABLE_API_KEY"]) };
});

export const analyzeSelection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => analyzeInput.parse(d))
  .handler(async ({ data }) => {
    const prompt = `Ты — филолог-исследователь, помогающий в медленном close reading.
Язык текста (код): ${data.language}. Источник: ${data.bookTitle || "неизвестен"}.
Предложение: «${data.sentence}»
Более широкий контекст: «${data.context}»
Разбираемый фрагмент: «${data.selection}»

Дай глубокий, точный, академичный разбор ИМЕННО этого фрагмента в этом контексте.
Все пояснения пиши по-русски. Примеры — на языке оригинала с переводом.
Если не уверен (особенно в этимологии), прямо оговори степень уверенности.
Поле context заполняй только если исторический/культурный/литературный/предметный контекст действительно релевантен, иначе оставь пустую строку.
Не используй эмодзи и маркетинговый тон. Будь конкретен, избегай воды.`;

    const content = await callGateway({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "analysis", strict: true, schema },
      },
    });
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return { ...parsed, source: "ai" as const };
  });

export const askDeeper = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => askInput.parse(d))
  .handler(async ({ data }) => {
    const content = await callGateway({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Ты филолог-исследователь. Отвечай по-русски, точно, академично, без воды и эмодзи. Если не уверен — скажи об этом.",
        },
        {
          role: "user",
          content: `Язык текста: ${data.language}. Предложение: «${data.sentence}». Контекст: «${data.context}». Фрагмент: «${data.selection}».\n\nВопрос: ${data.question}`,
        },
      ],
    });
    return { answer: content };
  });
