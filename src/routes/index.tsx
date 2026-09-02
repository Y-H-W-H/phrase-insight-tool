import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { BookOpen, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, languageLabel } from "@/lib/lectio/languages";
import { addBook, deleteBook, getBooks, getHistory, useHydrated, useStore } from "@/lib/lectio/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LECTIO — Библиотека для медленного чтения" },
      {
        name: "description",
        content:
          "LECTIO — личная среда close reading: добавляйте тексты на иностранных языках, разбирайте слова и фразы, собирайте словарь.",
      },
      { property: "og:title", content: "LECTIO — Close Reading" },
      {
        property: "og:description",
        content: "Личная среда медленного исследовательского чтения текстов на иностранных языках.",
      },
    ],
  }),
  component: Library,
});

function Library() {
  const hydrated = useHydrated();
  const [books] = useStore(getBooks);
  const [history] = useStore(getHistory);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("fr");
  const [content, setContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const create = () => {
    if (!content.trim()) return;
    const book = addBook({ title, language, content });
    setOpen(false);
    setTitle("");
    setContent("");
    router.navigate({ to: "/reader/$bookId", params: { bookId: book.id } });
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setContent(text);
    if (!title) setTitle(file.name.replace(/\.txt$/i, ""));
  };

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">LECTIO</h1>
          <p className="mt-1 text-sm uppercase tracking-[0.22em] text-muted-foreground">
            Close Reading
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link to="/history">История</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/vocabulary">Лексикон</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1.5 h-4 w-4" /> Новый текст
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Добавить текст</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Название"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  rows={10}
                  placeholder="Вставьте текст…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                  }}
                />
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-1.5 h-4 w-4" /> Импорт .txt
                  </Button>
                  <Button onClick={create} disabled={!content.trim()}>
                    Добавить и читать
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Библиотека
        </h2>
        {!hydrated ? null : books.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Пока нет текстов.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {books.map((b) => (
              <li key={b.id} className="flex items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/reader/$bookId"
                    params={{ bookId: b.id }}
                    className="font-serif text-lg hover:underline"
                  >
                    {b.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {languageLabel(b.language)} · прочитано {Math.round((b.progress ?? 0) * 100)}%
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/reader/$bookId" params={{ bookId: b.id }}>
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    Читать
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Удалить">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить «{b.title}»?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Текст и позиция чтения будут удалены безвозвратно.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteBook(b.id)}>Удалить</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hydrated && history.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Последние исследования
            </h2>
            <Link to="/history" className="text-xs text-muted-foreground hover:underline">
              вся история
            </Link>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {history.slice(0, 10).map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                <span className="font-serif text-foreground">{h.selection}</span>
                <span>— {h.bookTitle}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
