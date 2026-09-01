import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReaderView, type SelectionPayload } from "@/components/lectio/ReaderView";
import { AnalysisPanel, type AnalysisRequestInput } from "@/components/lectio/AnalysisPanel";
import {
  getBooks,
  getSettings,
  setSettings,
  updateBook,
  useHydrated,
  useStore,
} from "@/lib/lectio/storage";

export const Route = createFileRoute("/reader/$bookId")({
  head: () => ({
    meta: [
      { title: "Чтение — LECTIO" },
      { name: "description", content: "Медленное чтение с разбором слов и фраз в LECTIO." },
      { property: "og:title", content: "Чтение — LECTIO" },
      { property: "og:description", content: "Медленное чтение с разбором слов и фраз." },
    ],
  }),
  component: Reader,
});

function Reader() {
  const { bookId } = Route.useParams();
  const hydrated = useHydrated();
  const [books] = useStore(getBooks);
  const [settings] = useStore(getSettings);
  const [request, setRequest] = useState<AnalysisRequestInput | null>(null);
  const book = books.find((b) => b.id === bookId);

  useEffect(() => {
    if (!book) return;
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      updateBook(book.id, { progress: p, scrollTop: window.scrollY });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [book]);

  useEffect(() => {
    if (hydrated && book?.scrollTop) window.scrollTo(0, book.scrollTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, bookId]);

  if (!hydrated) return null;
  if (!book)
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-muted-foreground">Текст не найден.</p>
        <Button className="mt-4" asChild>
          <Link to="/">В библиотеку</Link>
        </Button>
      </div>
    );

  const onSelect = (p: SelectionPayload) =>
    setRequest({ ...p, language: book.language, bookId: book.id, bookTitle: book.title });

  return (
    <div className={request ? "md:mr-[26rem] lg:mr-[30rem]" : ""}>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
        <Button variant="ghost" size="icon" asChild aria-label="Назад">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{book.title}</p>
          <p className="text-xs text-muted-foreground">{Math.round((book.progress ?? 0) * 100)}%</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Настройки чтения">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-5">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Размер шрифта · {settings.fontSize}px
              </p>
              <Slider
                min={15}
                max={30}
                step={1}
                value={[settings.fontSize]}
                onValueChange={([v]) => setSettings({ ...settings, fontSize: v! })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Интерлиньяж · {settings.lineHeight.toFixed(2)}
              </p>
              <Slider
                min={1.3}
                max={2.4}
                step={0.05}
                value={[settings.lineHeight]}
                onValueChange={([v]) => setSettings({ ...settings, lineHeight: v! })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Ширина колонки · {settings.columnWidth}px
              </p>
              <Slider
                min={420}
                max={900}
                step={20}
                value={[settings.columnWidth]}
                onValueChange={([v]) => setSettings({ ...settings, columnWidth: v! })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Тема</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["light", "sepia", "dark"] as const).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={settings.theme === t ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, theme: t })}
                  >
                    {t === "light" ? "Светлая" : t === "sepia" ? "Сепия" : "Тёмная"}
                  </Button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Отмечать изученные слова</span>
              <Switch
                checked={settings.markStudied}
                onCheckedChange={(v) => setSettings({ ...settings, markStudied: v })}
              />
            </label>
          </PopoverContent>
        </Popover>
      </header>

      <ReaderView
        content={book.content}
        fontSize={settings.fontSize}
        lineHeight={settings.lineHeight}
        columnWidth={settings.columnWidth}
        studied={studied}
        markStudied={settings.markStudied}
        onSelect={onSelect}
      />

      <AnalysisPanel request={request} onClose={() => setRequest(null)} />
    </div>
  );
}

