const WORD_RE = /[\p{L}\p{M}\p{N}'’\-]/u;

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

/** Находит предложение, содержащее позицию index. */
export function sentenceAt(text: string, index: number): string {
  const enders = /[.!?…]/;
  let start = 0;
  for (let i = index; i > 0; i--) {
    if (enders.test(text[i - 1]!) && /\s|»|"/.test(text[i] ?? " ")) {
      start = i;
      break;
    }
  }
  let end = text.length;
  for (let i = index; i < text.length; i++) {
    if (enders.test(text[i]!)) {
      let j = i + 1;
      while (j < text.length && /["»)]/.test(text[j]!)) j += 1;
      end = j;
      break;
    }
  }
  return text.slice(start, end).trim();
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
