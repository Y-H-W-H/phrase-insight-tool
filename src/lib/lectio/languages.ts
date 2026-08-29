export const LANGUAGES: { code: string; label: string }[] = [
  { code: "fr", label: "Французский" },
  { code: "en", label: "Английский" },
  { code: "de", label: "Немецкий" },
  { code: "es", label: "Испанский" },
  { code: "it", label: "Итальянский" },
  { code: "pt", label: "Португальский" },
  { code: "la", label: "Латынь" },
  { code: "grc", label: "Древнегреческий" },
  { code: "he", label: "Иврит" },
  { code: "ar", label: "Арабский" },
  { code: "zh", label: "Китайский" },
  { code: "ja", label: "Японский" },
  { code: "other", label: "Другой" },
];

export function languageLabel(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
