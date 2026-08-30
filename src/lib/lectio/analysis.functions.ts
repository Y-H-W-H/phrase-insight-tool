import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const analyzeInput = z.object({
  selection: z.string().min(1).max(2000),
  sentence: z.string().max(4000).default(""),
  prevSentence: z.string().max(4000).default(""),
  nextSentence: z.string().max(4000).default(""),
  context: z.string().max(8000).default(""),
  language: z.string().max(20).default("other"),
  bookTitle: z.string().max(300).default(""),
  author: z.string().max(200).default(""),
  uiLanguage: z.string().max(20).default("ru"),
  kind: z.enum(["word", "phrase"]).default("word"),
});

const askInput = analyzeInput.extend({
  question: z.string().min(1).max(1000),
  priorAnalysis: z.string().max(12000).default(""),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) }))
    .max(20)
    .default([]),
});

const MODEL = "google/gemini-3.7-flash";
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

const str = { type: "string" } as const;
const pairArray = (a: string, b: string) =>
  ({
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: [a, b],
      properties: { [a]: str, [b]: str },
    },
  }) as const;

const wordProps = {
  translationContextual: str,
  translationLiteral: str,
  lemma: str,
  pronunciation: str,
  partOfSpeech: str,
  morphology: str,
  grammar: str,
  meaning: str,
  nuances: str,
  wordChoice: str,
  synonyms: pairArray("word", "difference"),
  etymology: str,
  wordFamily: pairArray("word", "gloss"),
  collocations: { type: "array", items: str },
  register: str,
  examples: pairArray("text", "translation"),
  context: str,
  confidence: str,
} as const;

const phraseProps = {
  translationContextual: str,
  translationLiteral: str,
  whatHappens: str,
  syntax: str,
  keyElements: pairArray("text", "note"),
  styleWhy: str,
  context: str,
  meaning: str,
  nuances: str,
  examples: pairArray("text", "translation"),
  confidence: str,
} as const;

const wordSchema = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(wordProps),
  properties: wordProps,
} as const;

const phraseSchema = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(phraseProps),
  properties: phraseProps,
} as const;

const HONESTY = `Правила честности (обязательны):
— Различай уровни знания: лингвистический факт, устоявшаяся этимология, интерпретация, гипотеза. Помечай их словами.
— Никогда не выдумывай этимологию, цитаты, источники, исторические факты и значения.
— Если не уверен — прямо напиши об этом в соответствующем поле и в поле confidence.
— Лучше короткое «надёжных данных нет», чем красивая ложная справка.
— Пустая строка допустима: раздел, который здесь нерелевантен, оставляй пустым, не заполняй искусственно.
— Без эмодзи, без маркетингового тона, без литературоведческих фантазий.`;

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

function contextBlock(d: z.infer<typeof analyzeInput>) {
  return `Язык текста (код): ${d.language}
Источник: ${d.bookTitle || "неизвестен"}${d.author ? ` — ${d.author}` : ""}
Предыдущее предложение: «${d.prevSentence}»
Предложение с фрагментом: «${d.sentence}»
Следующее предложение: «${d.nextSentence}»
Окружающий абзац: «${d.context}»
Разбираемый фрагмент: «${d.selection}»
Язык твоих ответов и пояснений: ${d.uiLanguage === "ru" ? "русский" : d.uiLanguage}`;
}

export const aiAvailable = createServerFn({ method: "GET" }).handler(async () => {
  return { available: Boolean(process.env["LOVABLE_API_KEY"]) };
});

export const analyzeSelection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => analyzeInput.parse(d))
  .handler(async ({ data }) => {
    const isWord = data.kind === "word";
    const task = isWord
      ? `Разбери ОДНО СЛОВО именно в этом контексте, а не изолированно.
translationContextual — краткий естественный перевод именно здесь; если возможны другие переводы, объясни, почему выбран этот.
translationLiteral — буквальный перевод, если он помогает; иначе пустая строка.
lemma — словарная форма. pronunciation — IPA, если можешь надёжно.
partOfSpeech и morphology — полный разбор именно этой формы, только применимые к языку категории (род, число, падеж, лицо, время, наклонение, вид, состояние и т. д.). Не перечисляй неприменимые поля.
grammar — какую синтаксическую функцию слово выполняет в этом предложении.
meaning — что слово значит здесь; nuances — оттенок, который оно добавляет.
wordChoice — «почему именно это слово»: авторский выбор и как изменилось бы предложение с ближайшим аналогом. Это ключевой раздел.
synonyms — 2–5 ближайших слов с contrastive explanation: чем каждое отличается и почему не взаимозаменяемо.
etymology — только надёжное: происхождение, исторические формы, развитие значения; иначе честно об отсутствии данных.
wordFamily — наиболее полезные однокоренные/производные слова с кратким глоссом.
collocations — несколько характерных устойчивых сочетаний.
register — neutral/formal/informal/literary/archaic/technical и т. п., если это существенно, иначе пусто.
examples — 2–3 коротких естественных примера на языке оригинала с переводом, показывающих именно релевантное значение.
context — историко-культурный/философский контекст только если он действительно нужен, иначе пустая строка.`
      : `Разбери ФРАГМЕНТ как связное целое, не как одно слово.
translationContextual — естественный перевод. translationLiteral — буквальный, если он помогает увидеть устройство оригинала, иначе пусто.
whatHappens — кратко: что здесь происходит по смыслу в этом контексте.
syntax — разбор структуры человеческим языком: главное и придаточные, связи, референции местоимений, времена, наклонения, необычный порядок слов.
keyElements — несколько слов/конструкций, без понимания которых теряется смысл, с короткой пометкой.
styleWhy — почему автор написал именно так: стилистический и семантический анализ без домыслов.
meaning и nuances — при необходимости, иначе пусто. examples — только если действительно полезны, иначе пустой массив.
context — исторический/культурный/философский/религиозный только там, где он реально нужен.`;

    const content = await callGateway({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Ты — филолог-исследователь, помогающий в медленном close reading оригинальных текстов. Твоя задача — объяснить не только «что это значит», но и «почему здесь написано именно так».\n${HONESTY}`,
        },
        { role: "user", content: `${contextBlock(data)}\n\n${task}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: isWord ? "word_analysis" : "phrase_analysis",
          strict: true,
          schema: isWord ? wordSchema : phraseSchema,
        },
      },
    });
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return { ...parsed, kind: data.kind, source: "ai" as const };
  });

export const askDeeper = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => askInput.parse(d))
  .handler(async ({ data }) => {
    const content = await callGateway({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Ты филолог-исследователь и собеседник читателя. Отвечай кратко и точно, академично, без воды и эмодзи.\n${HONESTY}`,
        },
        {
          role: "user",
          content: `${contextBlock(data)}${
            data.priorAnalysis ? `\n\nРанее выданный тобой разбор:\n${data.priorAnalysis}` : ""
          }`,
        },
        ...data.history,
        { role: "user", content: data.question },
      ],
    });
    return { answer: content };
  });
