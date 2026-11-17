/** Браузерный разбор EPUB → plain text с абзацами через пустую строку. */
export type EpubResult = { title?: string; author?: string; language?: string; content: string };

const BLOCKS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE", "PRE", "DD", "DT"]);

function resolve(base: string, href: string) {
  const parts = (base ? base.split("/").slice(0, -1) : []).concat(decodeURIComponent(href.split("#")[0] ?? "").split("/"));
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
}

function collect(el: Element, out: string[]) {
  for (const child of Array.from(el.children)) {
    const tag = child.tagName.toUpperCase();
    if (["SCRIPT", "STYLE", "NAV", "HEAD"].includes(tag)) continue;
    const hasBlockChild = Array.from(child.querySelectorAll("*")).some(
      (c) => BLOCKS.has(c.tagName.toUpperCase()) || c.tagName.toUpperCase() === "DIV",
    );
    if ((BLOCKS.has(tag) || tag === "DIV") && !hasBlockChild) {
      const t = (child.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t) out.push(t);
    } else collect(child, out);
  }
}

export async function parseEpub(file: File): Promise<EpubResult> {
  const { default: JSZip } = await import("jszip");
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("Файл не похож на EPUB или повреждён");
  }
  const enc = await zip.file("META-INF/encryption.xml")?.async("string");
  if (enc && /EncryptedData/.test(enc) && !/font/i.test(enc)) throw new Error("Книга защищена DRM");
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) throw new Error("В EPUB нет container.xml");
  const xml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
  const opfPath = xml(container).querySelector("rootfile")?.getAttribute("full-path");
  const opfText = opfPath ? await zip.file(opfPath)?.async("string") : undefined;
  if (!opfPath || !opfText) throw new Error("В EPUB не найдено описание книги");
  const opf = xml(opfText);
  const meta = (n: string) => opf.getElementsByTagNameNS("*", n)[0]?.textContent?.trim() || undefined;
  const manifest = new Map<string, string>();
  for (const it of Array.from(opf.getElementsByTagNameNS("*", "item")))
    manifest.set(it.getAttribute("id") ?? "", it.getAttribute("href") ?? "");
  const paras: string[] = [];
  for (const ref of Array.from(opf.getElementsByTagNameNS("*", "itemref"))) {
    const href = manifest.get(ref.getAttribute("idref") ?? "");
    if (!href) continue;
    const html = await zip.file(resolve(opfPath, href))?.async("string");
    if (!html) continue;
    let doc = new DOMParser().parseFromString(html, "application/xhtml+xml");
    if (doc.getElementsByTagName("parsererror").length) doc = new DOMParser().parseFromString(html, "text/html");
    const body = doc.getElementsByTagName("body")[0];
    if (body) collect(body, paras);
  }
  if (!paras.length) throw new Error("В EPUB не найден текст");
  const r: EpubResult = { content: paras.join("\n\n") };
  const t = meta("title"), a = meta("creator"), l = meta("language");
  if (t) r.title = t;
  if (a) r.author = a;
  if (l) r.language = l.toLowerCase();
  return r;
}
