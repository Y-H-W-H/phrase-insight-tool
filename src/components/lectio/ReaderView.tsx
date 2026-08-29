import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { contextAt, expandWord, paragraphs, sentenceAt } from "@/lib/lectio/text";

export type SelectionPayload = {
  selection: string;
  sentence: string;
  context: string;
};

type Props = {
  content: string;
  fontSize: number;
  lineHeight: number;
  columnWidth: number;
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

export function ReaderView({ content, fontSize, lineHeight, columnWidth, onSelect }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<{ x: number; y: number; payload: SelectionPayload } | null>(
    null,
  );
  const paras = paragraphs(content);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return;
      const target = e.target as HTMLElement;
      const para = target.closest("p[data-para]") as HTMLElement | null;
      if (!para) return;
      const caret = caretFromPoint(e.clientX, e.clientY);
      if (!caret || caret.node.nodeType !== Node.TEXT_NODE) return;
      const text = caret.node.textContent ?? "";
      const found = expandWord(text, caret.offset);
      if (!found) return;
      setBubble(null);
      onSelect({
        selection: found.word,
        sentence: sentenceAt(text, found.start),
        context: contextAt(text, found.start),
      });
    },
    [onSelect],
  );

  const checkSelection = useCallback(() => {
    const sel = window.getSelection();
    const root = rootRef.current;
    if (!sel || sel.isCollapsed || !root) {
      setBubble(null);
      return;
    }
    const value = sel.toString().trim();
    if (!value || value.length > 800) {
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
    const text = anchor.textContent ?? "";
    const idx = Math.min(sel.anchorOffset, Math.max(0, text.length - 1));
    setBubble({
      x: Math.min(Math.max(rect.left + rect.width / 2, 80), window.innerWidth - 80),
      y: Math.max(rect.top - 8, 56),
      payload: {
        selection: value,
        sentence: sentenceAt(text, idx),
        context: contextAt(text, idx),
      },
    });
  }, []);

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
            {p}
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
