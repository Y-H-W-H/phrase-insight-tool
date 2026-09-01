import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  contextAt,
  expandWord,
  normalizeForm,
  paragraphs,
  sentenceWindow,
  tokenize,
} from "@/lib/lectio/text";

export type SelectionPayload = {
  selection: string;
  sentence: string;
  prevSentence: string;
  nextSentence: string;
  /** абзац целиком (или его окрестность) */
  context: string;
  kind: "word" | "phrase";
};

type Props = {
  content: string;
  fontSize: number;
  lineHeight: number;
  columnWidth: number;
  /** нормализованные формы уже сохранённых слов */
  studied?: Set<string>;
  markStudied?: boolean;
  onSelect: (p: SelectionPayload) => void;
};

function caretFromPoint(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
  }
  if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    return r ? { node: r.startContainer, offset: r.startOffset } : null;
  }
  return null;
}

/** Абсолютная позиция каретки внутри текста абзаца. */
function resolvePosition(node: Node, offset: number): { paraIndex: number; index: number } | null {
  const el = node.parentElement;
  if (!el) return null;
  const para = el.closest("p[data-para]") as HTMLElement | null;
  if (!para) return null;
  const paraIndex = Number(para.dataset["para"]);
  if (Number.isNaN(paraIndex)) return null;
  const token = el.closest("[data-off]") as HTMLElement | null;
  const base = token ? Number(token.dataset["off"] ?? 0) : 0;
  return { paraIndex, index: base + offset };
}

function detectKind(s: string): "word" | "phrase" {
  return s.trim().split(/\s+/).filter(Boolean).length > 1 ? "phrase" : "word";
}

export function ReaderView({
  content,
  fontSize,
  lineHeight,
  columnWidth,
  studied,
  markStudied = false,
  onSelect,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<{ x: number; y: number; payload: SelectionPayload } | null>(
    null,
  );
  const paras = useMemo(() => paragraphs(content), [content]);
  const highlight = markStudied && !!studied && studied.size > 0;

  const rendered = useMemo(() => {
    if (!highlight) return null;
    return paras.map((p) => {
      const out: { text: string; off: number; studied: boolean }[] = [];
      let off = 0;
      for (const t of tokenize(p)) {
        out.push({ text: t.text, off, studied: t.word && studied!.has(normalizeForm(t.text)) });
        off += t.text.length;
      }
      return out;
    });
  }, [paras, highlight, studied]);

  const buildPayload = useCallback(
    (paraIndex: number, index: number, selection: string): SelectionPayload | null => {
      const text = paras[paraIndex];
      if (!text) return null;
      const w = sentenceWindow(text, index);
      return {
        selection,
        sentence: w.sentence,
        prevSentence: w.prev,
        nextSentence: w.next,
        context: text.length <= 1200 ? text : contextAt(text, index, 600),
        kind: detectKind(selection),
      };
    },
    [paras],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return;
      const caret = caretFromPoint(e.clientX, e.clientY);
      if (!caret || caret.node.nodeType !== Node.TEXT_NODE) return;
      const pos = resolvePosition(caret.node, caret.offset);
      if (!pos) return;
      const paraText = paras[pos.paraIndex];
      if (!paraText) return;
      const found = expandWord(paraText, pos.index);
      if (!found) return;
      const payload = buildPayload(pos.paraIndex, found.start, found.word);
      if (!payload) return;
      setBubble(null);
      onSelect(payload);
    },
    [buildPayload, onSelect, paras],
  );

  const checkSelection = useCallback(() => {
    const sel = window.getSelection();
    const root = rootRef.current;
    if (!sel || sel.isCollapsed || !root) {
      setBubble(null);
      return;
    }
    const value = sel.toString().trim();
    if (!value || value.length > 2000) {
      setBubble(null);
      return;
    }
    const anchor = sel.anchorNode;
    if (!anchor || !root.contains(anchor)) {
      setBubble(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const start =
      range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer : anchor;
    const pos = resolvePosition(start, range.startOffset);
    if (!pos) {
      setBubble(null);
      return;
    }
    const payload = buildPayload(pos.paraIndex, pos.index, value);
    if (!payload) {
      setBubble(null);
      return;
    }
    setBubble({
      x: Math.min(Math.max(rect.left + rect.width / 2, 80), window.innerWidth - 80),
      y: Math.max(rect.top - 8, 56),
      payload,
    });
  }, [buildPayload]);

  useEffect(() => {
    const onUp = () => window.setTimeout(checkSelection, 10);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("selectionchange", onUp);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("selectionchange", onUp);
    };
  }, [checkSelection]);

  return (
    <>
      <div
        ref={rootRef}
        className="lectio-reader mx-auto px-5 pb-40 pt-8 sm:px-8"
        style={{
          maxWidth: columnWidth,
          fontSize,
          lineHeight,
        }}
        onClick={handleClick}
      >
        {paras.map((p, i) => (
          <p key={i} data-para={i}>
            {rendered
              ? rendered[i]!.map((t, j) => (
                  <span
                    key={j}
                    data-off={t.off}
                    className={t.studied ? "lectio-studied" : undefined}
                  >
                    {t.text}
                  </span>
                ))
              : p}
          </p>
        ))}
      </div>

      {bubble && (
        <button
          type="button"
          className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground shadow-lg"
          style={{ left: bubble.x, top: bubble.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onSelect(bubble.payload);
            setBubble(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          <span className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Исследовать
          </span>
        </button>
      )}
    </>
  );
}
