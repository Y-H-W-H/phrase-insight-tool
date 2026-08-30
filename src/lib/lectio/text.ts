const WORD_RE = /[\p{L}\p{M}\p{N}'’\-]/u;

export function isWordChar(ch: string) {
  return WORD_RE.test(ch);
}

export function expandWord(text: string, offset: number): { word: string; start: number; end: number } | null {
  if (!text) return null;
  let i = Math.min(Math.max(offset, 0), text.length - 1);
  if (!WORD_RE.test(text[i] ?? "")) {
    if (i > 0 && WORD_RE.test(text[i - 1] ?? "")) i -= 1;
    else return null;
  }
  let start = i;
  while (start > 0 && WORD_RE.test(text[start - 1]!)) start -= 1;
  let end = i + 1;
  while (end < text.length && WORD_RE.test(text[end]!)) end += 1;
  const word = text.slice(start, end).replace(/^[-'’]+|[-'’]+$/g, "");
  if (!word) return null;
  return { word, start, end };
}

/** Разбивает текст на предложения с сохранением границ. */
export function splitSentences(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  const enders = /[.!?…]/;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (!enders.test(text[i]!)) continue;
    let j = i + 1;
    while (j < text.length && /["»)\]]/.test(text[j]!)) j += 1;
    if (j < text.length && !/\s/.test(text[j]!)) continue;
    const slice = text.slice(start, j);
    if (slice.trim()) out.push({ text: slice.trim(), start, end: j });
    start = j;
    i = j - 1;
  }
  const rest = text.slice(start);
  if (rest.trim()) out.push({ text: rest.trim(), start, end: text.length });
  return out;
}

/** Находит предложение, содержащее позицию index. */
export function sentenceAt(text: string, index: number): string {
  return sentenceWindow(text, index).sentence;
}

/** Предложение + соседние предложения того же абзаца. */
export function sentenceWindow(
  text: string,
  index: number,
): { prev: string; sentence: string; next: string } {
  const parts = splitSentences(text);
  if (parts.length === 0) return { prev: "", sentence: text.trim(), next: "" };
  let k = parts.findIndex((p) => index >= p.start && index < p.end);
  if (k === -1) k = index <= 0 ? 0 : parts.length - 1;
  return {
    prev: parts[k - 1]?.text ?? "",
    sentence: parts[k]?.text ?? "",
    next: parts[k + 1]?.text ?? "",
  };
}

/** Небольшой контекст вокруг позиции. */
export function contextAt(text: string, index: number, radius = 400): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).trim();
}

export function paragraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

/** Нормализация словоформы для сопоставления с личным словарём. */
export function normalizeForm(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

/** Разбивает абзац на токены слов и разделителей (для подсветки изученных слов). */
export function tokenize(text: string): { text: string; word: boolean }[] {
  const out: { text: string; word: boolean }[] = [];
  let buf = "";
  let isWord = false;
  for (const ch of text) {
    const w = WORD_RE.test(ch);
    if (buf && w !== isWord) {
      out.push({ text: buf, word: isWord });
      buf = "";
    }
    isWord = w;
    buf += ch;
  }
  if (buf) out.push({ text: buf, word: isWord });
  return out;
}
