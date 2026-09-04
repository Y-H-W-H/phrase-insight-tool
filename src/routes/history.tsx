import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisPanel, type AnalysisRequestInput } from "@/components/lectio/AnalysisPanel";
import { clearHistory, getHistory, useHydrated, useStore } from "@/lib/lectio/storage";
import { languageLabel } from "@/lib/lectio/languages";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "История исследований — LECTIO" },
      {
        name: "description",
        content: "Хронология разобранных слов и фрагментов с возможностью открыть сохранённый разбор.",
      },
      { property: "og:title", content: "История исследований — LECTIO" },
      {
        property: "og:description",
        content: "Все слова и фрагменты, которые вы разбирали, в обратном хронологическом порядке.",
      },
    ],
  }),
  component: History,
});

function History() {
  const hydrated = useHydrated();
  const [history] = useStore(getHistory);
  const [request, setRequest] = useState<AnalysisRequestInput | null>(null);

  return (
    <main className={`mx-auto max-w-3xl px-5 py-8 sm:px-8 ${request ? "md:mr-[26rem]" : ""}`}>
      <header className="flex items-center gap-3 border-b border-border pb-5">
        <Button variant="ghost" size="icon" asChild aria-label="Назад">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="flex-1 font-serif text-2xl">История</h1>
        {hydrated && history.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory}>
            Очистить
          </Button>
        )}
      </header>

      {hydrated && history.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">Исследований пока нет.</p>
      )}

      <ul className="mt-4 divide-y divide-border border-y border-border">
        {hydrated && history.map((h) => (

          <li key={h.id}>
            <button
              type="button"
              className="w-full py-4 text-left"
              onClick={() =>
                setRequest({
                  selection: h.selection,
                  sentence: h.sentence,
                  context: h.context ?? h.sentence,
                  language: h.language,
                  bookId: h.bookId,
                  bookTitle: h.bookTitle,
                  ...(h.author ? { author: h.author } : {}),
                  ...(h.kind ? { kind: h.kind } : {}),
                  ...(h.analysis ? { initialAnalysis: h.analysis } : {}),
                })
              }
            >
              <p className="flex items-baseline gap-2">
                <span
                  className={
                    h.kind === "phrase"
                      ? "font-serif text-base italic"
                      : "font-serif text-lg"
                  }
                >
                  {h.selection}
                </span>
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {h.kind === "phrase" ? "фрагмент" : "слово"}
                </span>
              </p>
              {h.meaning && <p className="mt-1 text-sm">{h.meaning}</p>}
              {!h.meaning && h.sentence && (
                <p className="mt-1 text-sm italic text-muted-foreground">{h.sentence}</p>
              )}
              <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span>{languageLabel(h.language)}</span>
                {h.bookTitle && <span>· {h.bookTitle}</span>}
                {h.author && <span>· {h.author}</span>}
                <span>· {new Date(h.createdAt).toLocaleString("ru-RU")}</span>
                {!h.analysis && <span>· разбор не сохранён</span>}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <AnalysisPanel request={request} onClose={() => setRequest(null)} />
    </main>
  );
}
