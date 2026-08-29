import { useEffect, useState } from "react";
import { Bookmark, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestAnalysis, requestFollowUp } from "@/lib/lectio/ai";
import { pushHistory, saveVocab } from "@/lib/lectio/storage";
import type { Analysis } from "@/lib/lectio/types";
import { languageLabel } from "@/lib/lectio/languages";

export type AnalysisRequestInput = {
  selection: string;
  sentence: string;
  context: string;
  language: string;
  bookId: string;
  bookTitle: string;
};

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="border-b border-border py-3">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground marker:hidden">
        {title}
      </summary>
      <div className="mt-2 space-y-2 text-[0.94rem] leading-relaxed text-foreground">{children}</div>
    </details>
  );
}

export function AnalysisPanel({
  request,
  onClose,
}: {
  request: AnalysisRequestInput | null;
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ text: string; source: "ai" | "demo" } | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    setLoading(true);
    setAnalysis(null);
    setNote(null);
    setAnswer(null);
    setQuestion("");
    pushHistory({
      selection: request.selection,
      sentence: request.sentence,
      language: request.language,
      bookId: request.bookId,
      bookTitle: request.bookTitle,
    });
    requestAnalysis(request)
      .then((r) => {
        if (cancelled) return;
        setAnalysis(r.analysis);
        setNote(r.note ?? null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [request]);

  if (!request) return null;

  const save = () => {
    const res = saveVocab({
      selection: request.selection,
      lemma: analysis?.lemma && analysis.lemma !== "—" ? analysis.lemma : "",
      translation: analysis?.translationContextual || analysis?.translationLiteral || "",
      language: request.language,
      sentence: request.sentence,
      bookTitle: request.bookTitle,
    });
    toast.success(res === "created" ? "Сохранено в словарь" : "Запись в словаре обновлена");
  };

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true);
    try {
      const r = await requestFollowUp({ ...request, question: question.trim() });
      setAnswer({ text: r.answer, source: r.source });
    } finally {
      setAsking(false);
    }
  };

  return (
    <aside className="fixed inset-0 z-40 flex flex-col border-border bg-card md:inset-y-0 md:left-auto md:right-0 md:w-[26rem] md:border-l lg:w-[30rem]">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-serif text-lg leading-snug break-words" style={{ fontFamily: "var(--font-serif)" }}>
            {request.selection}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {languageLabel(request.language)}
            {analysis?.source === "demo" ? " · Демо-анализ" : analysis ? " · AI-анализ" : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        <blockquote className="mt-4 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
          {request.sentence || "—"}
        </blockquote>

        {note && (
          <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            {note}
          </p>
        )}

        {loading && (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Анализирую фрагмент…
          </div>
        )}

        {analysis && (
          <div className="mt-4">
            <Section title="Перевод" defaultOpen>
              {analysis.translationLiteral && (
                <p>
                  <span className="text-muted-foreground">Буквально: </span>
                  {analysis.translationLiteral}
                </p>
              )}
              {analysis.translationContextual && (
                <p>
                  <span className="text-muted-foreground">В контексте: </span>
                  {analysis.translationContextual}
                </p>
              )}
            </Section>

            <Section title="Форма" defaultOpen>
              {analysis.lemma && (
                <p>
                  <span className="text-muted-foreground">Лемма: </span>
                  {analysis.lemma}
                </p>
              )}
              {analysis.partOfSpeech && (
                <p>
                  <span className="text-muted-foreground">Часть речи: </span>
                  {analysis.partOfSpeech}
                </p>
              )}
              {analysis.morphology && <p>{analysis.morphology}</p>}
            </Section>

            {analysis.grammar && <Section title="Грамматика">{<p>{analysis.grammar}</p>}</Section>}

            {(analysis.meaning || analysis.nuances) && (
              <Section title="Значение" defaultOpen>
                {analysis.meaning && <p>{analysis.meaning}</p>}
                {analysis.nuances && <p className="text-muted-foreground">{analysis.nuances}</p>}
              </Section>
            )}

            {analysis.synonyms.length > 0 && (
              <Section title="Синонимы">
                <ul className="space-y-1.5">
                  {analysis.synonyms.map((s, i) => (
                    <li key={i}>
                      <span className="font-medium">{s.word}</span>
                      <span className="text-muted-foreground"> — {s.difference}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis.etymology && <Section title="Этимология">{<p>{analysis.etymology}</p>}</Section>}

            {analysis.context && <Section title="Контекст">{<p>{analysis.context}</p>}</Section>}

            {analysis.examples.length > 0 && (
              <Section title="Примеры">
                <ul className="space-y-2">
                  {analysis.examples.map((ex, i) => (
                    <li key={i}>
                      <p style={{ fontFamily: "var(--font-serif)" }}>{ex.text}</p>
                      <p className="text-sm text-muted-foreground">{ex.translation}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Спросить глубже">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Например: почему здесь passé composé, а не imparfait?"
                rows={3}
              />
              <Button size="sm" onClick={ask} disabled={asking || !question.trim()}>
                {asking ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                )}
                Спросить
              </Button>
              {answer && (
                <div className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-muted/60 p-3 text-sm">
                  {answer.source === "demo" && (
                    <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                      Демо-ответ
                    </p>
                  )}
                  {answer.text}
                </div>
              )}
            </Section>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card px-5 py-3">
        <Button className="w-full" onClick={save} disabled={loading}>
          <Bookmark className="mr-2 h-4 w-4" /> Сохранить в словарь
        </Button>
      </div>
    </aside>
  );
}
