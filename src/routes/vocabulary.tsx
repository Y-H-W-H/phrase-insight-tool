import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteVocab, getVocab, setVocabNote, useHydrated, useStore } from "@/lib/lectio/storage";
import { languageLabel } from "@/lib/lectio/languages";
import type { VocabEntry } from "@/lib/lectio/types";

export const Route = createFileRoute("/vocabulary")({
  head: () => ({
    meta: [
      { title: "Личный лексикон — LECTIO" },
      {
        name: "description",
        content: "Личный лексикон: леммы, история встреч слова в текстах и собственные заметки.",
      },
      { property: "og:title", content: "Личный лексикон — LECTIO" },
      {
        property: "og:description",
        content: "Каждое слово — одна запись и вся история ваших встреч с ним.",
      },
    ],
  }),
  component: Vocabulary,
});

function dt(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EntryCard({ v }: { v: VocabEntry }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(v.note ?? "");
  const occ = v.occurrences ?? [];
  const last = occ[0];
  const count = occ.length || 1;

  return (
    <li className="py-5">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="font-serif text-xl">
            {v.lemma || v.selection}
            {last?.selection && last.selection !== (v.lemma || v.selection) && (
              <span className="text-muted-foreground"> · {last.selection}</span>
            )}
          </p>
          {(last?.translation || v.translation) && (
            <p className="mt-1 text-[0.95rem]">{last?.translation || v.translation}</p>
          )}
          <p className="mt-1.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
            <span>{languageLabel(v.language)}</span>
            <span>· встреч: {count}</span>
            {(last?.bookTitle || v.bookTitle) && <span>· {last?.bookTitle || v.bookTitle}</span>}
            {(last?.author || v.author) && <span>· {last?.author || v.author}</span>}
            <span>· {dt(last?.createdAt ?? v.updatedAt ?? v.createdAt)}</span>
          </p>
        </button>
        <div className="flex shrink-0 items-start gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Свернуть" : "Показать встречи"}
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Удалить"
            onClick={() => deleteVocab(v.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-5 border-l border-border pl-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Встречи
            </p>
            <ol className="mt-2 space-y-4">
              {(occ.length > 0
                ? occ
                : [
                    {
                      id: v.id,
                      selection: v.selection,
                      sentence: v.sentence,
                      bookTitle: v.bookTitle,
                      author: v.author,
                      translation: v.translation,
                      createdAt: v.createdAt,
                    },
                  ]
              ).map((o) => (
                <li key={o.id} className="text-sm">
                  <p className="font-serif text-base">{o.selection}</p>
                  {o.translation && <p className="mt-0.5">{o.translation}</p>}
                  {o.sentence && <p className="mt-1 italic text-muted-foreground">{o.sentence}</p>}
                  {"context" in o && o.context && o.context.trim() !== o.sentence.trim() && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {o.context.length > 400 ? `${o.context.slice(0, 400)}…` : o.context}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[o.bookTitle, o.author, dt(o.createdAt)].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Заметка
            </p>
            {editing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ваше наблюдение о слове…"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setVocabNote(v.id, draft.trim());
                      setEditing(false);
                    }}
                  >
                    Сохранить
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDraft(v.note ?? "");
                      setEditing(false);
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1.5">
                <p className="text-sm text-muted-foreground">
                  {v.note?.trim() ? v.note : "Пока нет заметки."}
                </p>
                <Button
                  size="sm"
                  variant="link"
                  className="h-auto px-0"
                  onClick={() => {
                    setDraft(v.note ?? "");
                    setEditing(true);
                  }}
                >
                  {v.note?.trim() ? "Редактировать" : "Добавить заметку"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Vocabulary() {
  const hydrated = useHydrated();
  const [vocab] = useStore(getVocab);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("all");
  const [book, setBook] = useState("all");

  const languages = useMemo(() => [...new Set(vocab.map((v) => v.language))], [vocab]);
  const bookTitles = useMemo(
    () => [...new Set(vocab.flatMap((v) => (v.occurrences ?? []).map((o) => o.bookTitle)).filter(Boolean))],
    [vocab],
  );

  const items = vocab.filter(
    (v) =>
      (lang === "all" || v.language === lang) &&
      (book === "all" ||
        v.bookTitle === book ||
        (v.occurrences ?? []).some((o) => o.bookTitle === book)) &&
      (q.trim() === "" ||
        `${v.selection} ${v.lemma} ${v.translation} ${v.note ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <header className="flex items-center gap-3 border-b border-border pb-5">
        <Button variant="ghost" size="icon" asChild aria-label="Назад">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-serif text-2xl">Лексикон</h1>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <Input
          className="min-w-40 flex-1"
          placeholder="Поиск…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все языки</SelectItem>
            {languages.map((l) => (
              <SelectItem key={l} value={l}>
                {languageLabel(l)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={book} onValueChange={setBook}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все тексты</SelectItem>
            {bookTitles.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hydrated && items.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">Записей нет.</p>
      )}

      <ul className="mt-4 divide-y divide-border border-y border-border">
        {hydrated && items.map((v) => <EntryCard key={v.id} v={v} />)}
      </ul>

    </main>
  );
}
