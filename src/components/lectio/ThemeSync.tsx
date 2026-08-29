import { useEffect } from "react";
import { getSettings, useStore } from "@/lib/lectio/storage";

export function ThemeSync() {
  const [settings] = useStore(getSettings);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);
  return null;
}
