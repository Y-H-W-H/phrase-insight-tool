import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronDown, FlaskConical, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  analysisDigest,
  detectKind,
  requestAnalysis,
  requestFollowUp,
  requestResearchExtraction,
} from "@/lib/lectio/ai";
import { attachHistoryAnalysis, pushHistory, saveVocab } from "@/lib/lectio/storage";
import type { Analysis } from "@/lib/lectio/types";
import { languageLabel } from "@/lib/lectio/languages";
import type { Concept } from "@/lib/lectio/core/concepts";
import type { EvidenceClaim, EvidenceLevel } from "@/lib/lectio/core/evidence";
import { EVIDENCE_LEVEL_STRENGTH } from "@/lib/lectio/core/evidence";
import type { Relation } from "@/lib/lectio/core/relations";
import type { SourceRecord } from "@/lib/lectio/core/sources";
import {
  attachClaim,
  attachConcept,
  attachSource,
  toEnrichedAnalysis,
} from "@/lib/lectio/core/analysis-link";
import {
  findConceptByName,
  findSourceById,
  getEnrichedAnalysis,
  researchUid,
  saveConcept,
  saveEnrichedAnalysis,
  saveEvidenceClaim,
  saveRelation,
  saveSource,
} from "@/lib/lectio/core/storage.research";


export type AnalysisRequestInput = {
  selection: string;
  sentence: string;
  prevSentence?: string;
  nextSentence?: string;
  /** абзац / окружающий контекст */
  context: string;
  language: string;
  bookId: string;
  bookTitle: string;
  author?: string;
  kind?: "word" | "phrase";
  /** уже сохранённый разбор (открытие записи из истории) */
  initialAnalysis?: Analysis;
};

type Msg = { role: "user" | "assistant"; content: string; source?: "ai" | "demo" };

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-2 pb-4 text-[0.94rem] leading-relaxed text-foreground">
          {children}
        </div>
      )}
    </div>
  );
}

function has(v?: string) {
  return Boolean(v && v.trim() && v.trim() !== "—");
}

function Meta({ label, value }: { label: string; value?: string | undefined }) {
  if (!has(value)) return null;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </p>
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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [asking, setAsking] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [researched, setResearched] = useState(false);
  const researchKeyRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    setAnalysis(request.initialAnalysis ?? null);
    setNote(null);
    setMessages([]);
    setQuestion("");
    setExtracting(false);
    scrollRef.current?.scrollTo({ top: 0 });
    const kind = request.kind ?? detectKind(request.selection);
    if (request.initialAnalysis) {
      const key = `sel:${request.bookId}:${request.selection}`;
      researchKeyRef.current = key;
      setResearched(Boolean(getEnrichedAnalysis(key)));
      setLoading(false);
      return;
    }
    setLoading(true);
    const historyId = pushHistory({
      selection: request.selection,
      sentence: request.sentence,
      context: request.context,
      language: request.language,
      kind,
      bookId: request.bookId,
      bookTitle: request.bookTitle,
      author: request.author,
    });
    researchKeyRef.current = historyId;
    setResearched(Boolean(getEnrichedAnalysis(historyId)));
    requestAnalysis({ ...request, kind })
      .then((r) => {
        if (cancelled) return;
        setAnalysis(r.analysis);
        setNote(r.note ?? null);
        attachHistoryAnalysis(historyId, r.analysis);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [request]);


  if (!request) return null;

  const kind = analysis?.kind ?? request.kind ?? detectKind(request.selection);
  const isWord = kind === "word";

  const save = () => {
    const res = saveVocab({
      selection: request.selection,
      lemma: analysis?.lemma,
      translation: analysis?.translationContextual || analysis?.translationLiteral || "",
      language: request.language,
      sentence: request.sentence,
      context: request.context,
      bookId: request.bookId,
      bookTitle: request.bookTitle,
      author: request.author,
      analysis: analysis ?? undefined,
    });
    toast.success(
      res === "created" ? "Сохранено в словарь" : "Добавлена новая встреча в словаре",
    );
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setQuestion("");
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: q }]);
    setAsking(true);
    try {
      const r = await requestFollowUp({
        ...request,
        kind,
        question: q,
        priorAnalysis: analysis ? analysisDigest(analysis) : "",
        history,
      });
      setMessages((m) => [...m, { role: "assistant", content: r.answer, source: r.source }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Не удалось получить ответ. Попробуйте ещё раз." },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <aside className="fixed inset-0 z-40 flex flex-col border-border bg-card md:inset-y-0 md:left-auto md:right-0 md:w-[26rem] md:border-l lg:w-[30rem]">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p
            className="break-words font-serif text-lg leading-snug"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {request.selection}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {languageLabel(request.language)} · {isWord ? "слово" : "фрагмент"}
            {analysis?.source === "demo" ? " · демо-разбор" : analysis ? " · AI-разбор" : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Закрыть" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-8">
        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Разбор…
          </div>
        )}

        {note && <p className="mt-4 text-xs text-muted-foreground">{note}</p>}

        {analysis && (
          <>
            <div className="border-b border-border py-4">
              {has(analysis.translationContextual) && (
                <p className="text-[1.02rem] leading-relaxed">{analysis.translationContextual}</p>
              )}
              {has(analysis.translationLiteral) && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Буквально: {analysis.translationLiteral}
                </p>
              )}
              {isWord && (
                <div className="mt-3 space-y-1">
                  <Meta label="Лемма" value={analysis.lemma} />
                  <Meta label="Произношение" value={analysis.pronunciation} />
                  <Meta label="Часть речи" value={analysis.partOfSpeech} />
                  <Meta label="Морфология" value={analysis.morphology} />
                  <Meta label="Роль в предложении" value={analysis.grammar} />
                  <Meta label="Регистр" value={analysis.register} />
                </div>
              )}
              {has(analysis.confidence) && (
                <p className="mt-3 text-xs italic text-muted-foreground">
                  Надёжность: {analysis.confidence}
                </p>
              )}
            </div>

            {isWord ? (
              <div>
                {(has(analysis.meaning) || has(analysis.nuances)) && (
                  <Section title="Значение" defaultOpen>
                    {has(analysis.meaning) && <p>{analysis.meaning}</p>}
                    {has(analysis.nuances) && (
                      <p className="text-muted-foreground">{analysis.nuances}</p>
                    )}
                  </Section>
                )}
                {has(analysis.grammar) && (
                  <Section title="Грамматика">
                    <p>{analysis.grammar}</p>
                    {has(analysis.morphology) && (
                      <p className="text-muted-foreground">{analysis.morphology}</p>
                    )}
                  </Section>
                )}
                {has(analysis.wordChoice) && (
                  <Section title="Почему именно это слово" defaultOpen>
                    <p>{analysis.wordChoice}</p>
                  </Section>
                )}
                {(analysis.synonyms?.length ?? 0) > 0 && (
                  <Section title="Синонимы">
                    <ul className="space-y-1.5">
                      {analysis.synonyms.map((s, i) => (
                        <li key={i}>
                          <span className="font-serif">{s.word}</span>
                          {s.difference ? (
                            <span className="text-muted-foreground"> — {s.difference}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {has(analysis.etymology) && (
                  <Section title="Этимология">
                    <p>{analysis.etymology}</p>
                  </Section>
                )}
                {(analysis.wordFamily?.length ?? 0) > 0 && (
                  <Section title="Словообразование">
                    <ul className="space-y-1.5">
                      {analysis.wordFamily!.map((w, i) => (
                        <li key={i}>
                          <span className="font-serif">{w.word}</span>
                          {w.gloss ? (
                            <span className="text-muted-foreground"> — {w.gloss}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {(analysis.collocations?.length ?? 0) > 0 && (
                  <Section title="Коллокации">
                    <ul className="list-inside list-disc space-y-1">
                      {analysis.collocations!.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </Section>
                )}
                {has(analysis.context) && (
                  <Section title="Контекст">
                    <p>{analysis.context}</p>
                  </Section>
                )}
                {(analysis.examples?.length ?? 0) > 0 && (
                  <Section title="Примеры">
                    <ul className="space-y-2">
                      {analysis.examples.map((ex, i) => (
                        <li key={i}>
                          <p className="font-serif">{ex.text}</p>
                          {ex.translation && (
                            <p className="text-sm text-muted-foreground">{ex.translation}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            ) : (
              <div>
                {has(analysis.whatHappens) && (
                  <Section title="Что здесь происходит" defaultOpen>
                    <p>{analysis.whatHappens}</p>
                  </Section>
                )}
                {has(analysis.syntax) && (
                  <Section title="Синтаксис" defaultOpen>
                    <p>{analysis.syntax}</p>
                  </Section>
                )}
                {(analysis.keyElements?.length ?? 0) > 0 && (
                  <Section title="Ключевые элементы">
                    <ul className="space-y-1.5">
                      {analysis.keyElements!.map((k, i) => (
                        <li key={i}>
                          <span className="font-serif">{k.text}</span>
                          {k.note ? <span className="text-muted-foreground"> — {k.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {has(analysis.styleWhy) && (
                  <Section title="Почему автор написал так">
                    <p>{analysis.styleWhy}</p>
                  </Section>
                )}
                {(has(analysis.meaning) || has(analysis.nuances)) && (
                  <Section title="Значение и оттенки">
                    {has(analysis.meaning) && <p>{analysis.meaning}</p>}
                    {has(analysis.nuances) && (
                      <p className="text-muted-foreground">{analysis.nuances}</p>
                    )}
                  </Section>
                )}
                {has(analysis.context) && (
                  <Section title="Контекст">
                    <p>{analysis.context}</p>
                  </Section>
                )}
                {(analysis.examples?.length ?? 0) > 0 && (
                  <Section title="Примеры">
                    <ul className="space-y-2">
                      {analysis.examples.map((ex, i) => (
                        <li key={i}>
                          <p className="font-serif">{ex.text}</p>
                          {ex.translation && (
                            <p className="text-sm text-muted-foreground">{ex.translation}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            )}

            <div className="mt-5">
              <Button variant="outline" className="w-full" onClick={save}>
                <Bookmark className="mr-1.5 h-4 w-4" />
                {isWord ? "Сохранить слово" : "Сохранить фрагмент"}
              </Button>
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Спросить об этом {isWord ? "слове" : "фрагменте"}
              </p>
              {messages.length > 0 && (
                <ul className="mt-3 space-y-3 text-[0.94rem] leading-relaxed">
                  {messages.map((m, i) => (
                    <li
                      key={i}
                      className={
                        m.role === "user"
                          ? "rounded-md bg-secondary px-3 py-2 text-secondary-foreground"
                          : "whitespace-pre-wrap"
                      }
                    >
                      {m.content}
                      {m.source === "demo" && (
                        <span className="ml-1 text-xs text-muted-foreground">(демо)</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {asking && (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Думаю…
                </p>
              )}
              <div className="mt-3 flex items-end gap-2">
                <Textarea
                  rows={2}
                  placeholder="Например: почему здесь именно это время?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void ask();
                    }
                  }}
                />
                <Button
                  size="icon"
                  aria-label="Отправить вопрос"
                  disabled={asking || !question.trim()}
                  onClick={() => void ask()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
