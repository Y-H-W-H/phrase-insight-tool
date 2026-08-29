import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteVocab, getVocab, useHydrated, useStore } from "@/lib/lectio/storage";
import { languageLabel } from "@/lib/lectio/languages";

export const Route = createFileRoute("/vocabulary")({
  head: () => ({
    meta: [
      { title: "Словарь — LECTIO" },
      { name: "description", content: "Личный словарь сохранённых слов и фраз с контекстом." },
      { property: "og:title", content: "Словарь — LECTIO" },
      { property: "og:description", content: "Сохранённые слова и фразы с исходным контекстом." },
    ],
  }),
  component: Vocabulary,
});

function Vocabulary() {
  const hydrated = useHydrated();
  const [vocab] = useStore(getVocab);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("all");
  const [book, setBook] = useState("all");

  const languages = useMemo(() => [...new Set(vocab.map((v) => v.language))], [vocab]);
  const bookTitles = useMemo(
    () => [...new Set(vocab.map((v) => v.bookTitle).filter(Boolean))],
    [vocab],
  );

  const items = vocab.filter(
    (v) =>
      (lang === "all" || v.language === lang) &&
      (book === "all" || v.bookTitle === book) &&
      (q.trim() === "" ||
        `${v.selection} ${v.lemma} ${v.translation}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <header className="flex items-center gap-3 border-b border-border pb-5">
        <Button variant="ghost" size="icon" asChild aria-label="Назад">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-serif text-2xl">Словарь</h1>
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

      <ul className="mt-6 divide-y divide-border border-y border-border">
        {items.map((v) => (
          <li key={v.id} className="flex gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg">
                {v.selection}
                {v.lemma && v.lemma !== v.selection && (
                  <span className="text-muted-foreground"> · {v.lemma}</span>
                )}
              </p>
              {v.translation && <p className="mt-1 text-sm">{v.translation}</p>}
              {v.sentence && (
                <p className="mt-1 text-sm italic text-muted-foreground">{v.sentence}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {languageLabel(v.language)}
                {v.bookTitle ? ` · ${v.bookTitle}` : ""} ·{" "}
                {new Date(v.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Удалить" onClick={() => deleteVocab(v.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </main>
  );
}
