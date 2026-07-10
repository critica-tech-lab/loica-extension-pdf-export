// Pure-JS Critica PDF renderer — marked tokens → pdfmake → PDF, NO binaries.
// The iA-Writer house style: centered text column, monospace auto-detected
// dates, "Source:" captions, booktabs tables, IBM Plex fonts. This is the sole
// engine behind the extension's `globalExporters.pdf` point.

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(here, "assets", "fonts");
const dataDir = process.env.DATA_DIR || process.cwd();

// All npm deps (pdfmake, marked, marked-footnote, sharp) live in the HOST's
// node_modules, not this package's — it ships none. When the plugin is a
// symlink into plugins/, Node's ESM resolves bare imports from this file's
// REAL path (the extension checkout, which has no node_modules), so `import
// "marked"` would fail. Resolve every dep from the host root instead, so the
// plugin works whether it's symlinked or cloned in.
const hostRequire = createRequire(join(dataDir, "package.json"));
const hostImport = (name) => import(pathToFileURL(hostRequire.resolve(name)).href);

// ── House-style constants (from preamble.tex) ───────────────────────────────
const BODY = "#1A1A1A";
const LINK = "#3366CC";
const CODE_BG = "#F4F4F4";
const CODE_BLOCK_BG = "#F0F0F0";
const CAPTION = "#8C8C8C"; // black 55%
const RULE = "#1A1A1A";
const COL = 365;            // iA text column width (pt)
const BASE = 10.5;
const LINE = 1.42;          // pdfmake renders lineHeight looser than TeX's 1.55

const fonts = {
  IBMPlexSans: {
    normal: `${fontsDir}/IBMPlexSans-Regular.otf`,
    bold: `${fontsDir}/IBMPlexSans-Bold.otf`,
    italics: `${fontsDir}/IBMPlexSans-Italic.otf`,
    bolditalics: `${fontsDir}/IBMPlexSans-BoldItalic.otf`,
  },
  IBMPlexMono: {
    normal: `${fontsDir}/IBMPlexMono-Regular.otf`,
    bold: `${fontsDir}/IBMPlexMono-Bold.otf`,
    italics: `${fontsDir}/IBMPlexMono-Italic.otf`,
    bolditalics: `${fontsDir}/IBMPlexMono-BoldItalic.otf`,
  },
};

// iA heading scale: [size, bold, smallcaps-ish, italic] + [marginTop, marginBottom]
const HEADING = {
  1: { fontSize: 13.42, bold: true, margin: [0, 24, 0, 10] },
  2: { fontSize: 13, bold: true, margin: [0, 22, 0, 8] },
  3: { fontSize: 10.5, bold: true, caps: true, characterSpacing: 0.5, margin: [0, 16, 0, 4] },
  4: { fontSize: BASE, bold: true, italics: true, margin: [0, 14, 0, 2] },
  5: { fontSize: BASE, margin: [0, 14, 0, 2] },
  6: { fontSize: BASE, color: CAPTION, margin: [0, 14, 0, 2] },
};

// ── Date detection (port of date-code.lua) ──────────────────────────────────
const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const DATE_RE = new RegExp(
  "(" +
    "\\d{4}[-–]\\d{2}[-–]\\d{2}" +        // ISO 2026-03-02
    "|\\d{1,2}/\\d{1,2}/\\d{4}|\\d{4}/\\d{1,2}/\\d{1,2}" + // slash
    "|\\d{1,2}\\.\\d{1,2}\\.\\d{4}" +              // dot
    `|(?:${MONTHS}) \\d{1,2},? \\d{4}` +            // March 2, 2026
    `|\\d{1,2} (?:${MONTHS}) \\d{4}` +              // 2 March 2026
  ")",
  "g",
);

// Split a plain string into runs, wrapping date matches in IBMPlexMono.
function splitDates(text, base) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(DATE_RE)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), ...base });
    out.push({ text: m[0].replace(/–/g, "-"), font: "IBMPlexMono", fontSize: 9.87, background: CODE_BG, ...base });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), ...base });
  return out.length ? out : [{ text, ...base }];
}

// ── Image resolution (uploads → base64, sharp-sanitized) ────────────────────
async function resolveImage(href, sharp) {
  const m = /^\/api\/uploads\/(.+)$/.exec(href);
  if (!m) return null;
  const srcPath = join(dataDir, "uploads", m[1]);
  if (!existsSync(srcPath)) return null;
  try {
    // Always re-encode through sharp → clean PNG (tectonic-safe parity + dims).
    const out = await sharp(srcPath).png().toBuffer({ resolveWithObject: true });
    return {
      dataUrl: `data:image/png;base64,${out.data.toString("base64")}`,
      width: out.info.width,
      height: out.info.height,
    };
  } catch {
    return null;
  }
}

async function resolveImages(tokens, sharp) {
  const srcs = new Set();
  const walk = (toks) => {
    for (const t of toks ?? []) {
      if (t.type === "image") srcs.add(t.href);
      walk(t.tokens);
      if (t.type === "table") { for (const c of t.header) walk(c.tokens); for (const r of t.rows) for (const c of r) walk(c.tokens); }
      if (t.type === "list") for (const it of t.items) walk(it.tokens);
    }
  };
  walk(tokens);
  const map = new Map();
  await Promise.all([...srcs].map(async (s) => { const img = await resolveImage(s, sharp); if (img) map.set(s, img); }));
  return map;
}

function fitWidth(img, maxWidth) {
  if (!img.width) return maxWidth;
  return Math.min(img.width * 0.75, maxWidth);
}

// ── Inline rendering ─────────────────────────────────────────────────────────
function renderInline(tokens, base = {}) {
  const out = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "text":
        if (t.tokens?.length) out.push(...renderInline(t.tokens, base));
        else out.push(...splitDates(t.text, base));
        break;
      case "escape": out.push({ text: t.text, ...base }); break;
      case "strong": out.push(...renderInline(t.tokens, { ...base, bold: true })); break;
      case "em": out.push(...renderInline(t.tokens, { ...base, italics: true })); break;
      case "del": out.push(...renderInline(t.tokens, { ...base, decoration: "lineThrough" })); break;
      case "codespan": out.push({ text: t.text, font: "IBMPlexMono", fontSize: 9.87, background: CODE_BG, ...base }); break;
      case "link": {
        const runs = renderInline(t.tokens, { ...base, color: LINK });
        for (const r of runs) r.link = t.href;
        out.push(...runs);
        break;
      }
      case "br": out.push({ text: "\n", ...base }); break;
      case "footnoteRef": out.push({ text: `${t.id}`, sup: true, fontSize: 7.5, ...base }); break;
      default: if (typeof t.text === "string") out.push(...splitDates(t.text, base));
    }
  }
  return out.length ? out : [{ text: "", ...base }];
}

// ── Block rendering ──────────────────────────────────────────────────────────
function firstText(tokens) {
  for (const t of tokens ?? []) {
    if (t.type === "text") return t.tokens?.length ? firstText(t.tokens) : t.text;
    if (t.type === "strong" || t.type === "em") return firstText(t.tokens);
  }
  return "";
}

function renderBlocks(tokens, images, contentWidth) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case "heading": {
        const h = HEADING[t.depth] ?? HEADING[6];
        let runs = renderInline(t.tokens);
        if (h.caps) runs = runs.map((r) => ({ ...r, text: (r.text || "").toUpperCase() }));
        out.push({ text: runs, fontSize: h.fontSize, bold: !!h.bold, italics: !!h.italics, color: h.color || BODY, characterSpacing: h.characterSpacing, margin: h.margin });
        break;
      }
      case "paragraph": {
        if (t.tokens?.length === 1 && t.tokens[0].type === "image") {
          out.push(...renderImage(t.tokens[0], images, contentWidth));
          break;
        }
        // Source caption (port of source-caption.lua): "Source…" → small/light.
        if (/^Source/i.test(firstText(t.tokens).trimStart())) {
          out.push({ text: renderInline(t.tokens), fontSize: 9, color: CAPTION, margin: [0, 2, 0, 8] });
          break;
        }
        out.push({ text: renderInline(t.tokens), margin: [0, 0, 0, 8] });
        break;
      }
      case "image": out.push(...renderImage(t, images, contentWidth)); break;
      case "list": out.push(renderList(t, images, contentWidth)); break;
      case "blockquote":
        out.push({ margin: [23, 2, 23, 9], stack: renderBlocks(t.tokens, images, contentWidth - 46) });
        break;
      case "code":
        out.push({
          table: { widths: ["*"], body: [[{ text: t.text, font: "IBMPlexMono", fontSize: 9.5, color: BODY, preserveLeadingSpaces: true }]] },
          layout: { defaultBorder: false, fillColor: () => CODE_BLOCK_BG, paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6 },
          margin: [0, 2, 0, 9],
        });
        break;
      case "table": out.push(renderTable(t, contentWidth)); break;
      case "hr":
        out.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: 0.4, lineColor: RULE }], margin: [0, 10, 0, 12] });
        break;
      case "space": break;
      default: if (typeof t.text === "string" && t.text.trim()) out.push({ text: t.text, margin: [0, 0, 0, 8] });
    }
  }
  return out;
}

function renderImage(t, images, contentWidth) {
  const img = images.get(t.href);
  if (!img) return [];
  return [{ image: img.dataUrl, width: fitWidth(img, contentWidth), margin: [0, 4, 0, 10] }];
}

function renderList(t, images, contentWidth) {
  const items = t.items.map((item) => {
    const blocks = renderBlocks(item.tokens, images, contentWidth - 20);
    return blocks.length === 1 ? blocks[0] : { stack: blocks };
  });
  return t.ordered
    ? { ol: items, margin: [6, 0, 0, 8] }
    : { ul: items, margin: [6, 0, 0, 8] };
}

// booktabs: top + below-header + bottom rules only, no vertical lines.
function renderTable(t, contentWidth) {
  const cols = t.header.length;
  const fontSize = cols >= 8 ? 7.5 : cols >= 6 ? 8.5 : 9;
  const header = t.header.map((c) => ({ text: renderInline(c.tokens), bold: true }));
  const body = t.rows.map((row) => row.map((c) => ({ text: renderInline(c.tokens) })));
  return {
    table: { headerRows: 1, widths: t.header.map(() => "*"), body: [header, ...body] },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0.4 : 0),
      vLineWidth: () => 0,
      hLineColor: () => RULE,
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: (i) => (i === 0 ? 0 : 6),
      paddingRight: () => 6,
    },
    fontSize,
    margin: [0, 2, 0, 11],
  };
}

// Flatten footnote body blocks into one inline run (port of footnoteInline).
function footnoteInline(content) {
  const out = [];
  for (const t of content ?? []) {
    if (t.type === "space") continue;
    if (t.type === "paragraph") { if (out.length) out.push({ type: "text", text: " ", raw: " " }); out.push(...(t.tokens ?? [])); }
    else out.push(t);
  }
  return out;
}

// ── Entry point ──────────────────────────────────────────────────────────────
export async function renderStyledPdf(markdown, title, landscape = false) {
  const { Marked } = await hostImport("marked");
  const markedFootnote = (await hostImport("marked-footnote")).default;
  const sharp = (await hostImport("sharp")).default;

  const cleaned = markdown.replace(/(!\[[^\]]*\]\([^)]+\))\{width=\d+px\}/g, "$1");
  const marked = new Marked().use(markedFootnote());
  const tokens = marked.lexer(cleaned);

  let footnotes = [];
  const idx = tokens.findIndex((t) => t.type === "footnotes");
  if (idx !== -1) { footnotes = tokens[idx].items ?? []; tokens.splice(idx, 1); }

  const images = await resolveImages(tokens, sharp);

  // US Letter, matching pandoc's default paper. Landscape mirrors the LaTeX
  // override: 50pt margins all round (full width); portrait keeps the centered
  // 365pt iA column.
  const paperW = 612, paperWL = 792;
  const margins = landscape
    ? [50, 40, 50, 50]
    : [(paperW - COL) / 2, 50, (paperW - COL) / 2, 60];
  const contentWidth = landscape ? paperWL - 100 : COL;

  const content = renderBlocks(tokens, images, contentWidth);

  if (footnotes.length) {
    content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: 0.4, lineColor: RULE }], margin: [0, 18, 0, 8] });
    content.push({
      ol: footnotes.map((fn) => ({ text: renderInline(footnoteInline(fn.content ?? fn.tokens)) })),
      fontSize: 9,
      color: CAPTION,
      margin: [0, 0, 0, 0],
    });
  }

  const docDefinition = {
    pageSize: "LETTER",
    pageOrientation: landscape ? "landscape" : "portrait",
    pageMargins: margins,
    info: { title },
    defaultStyle: { font: "IBMPlexSans", fontSize: BASE, lineHeight: LINE, color: BODY, alignment: "left" },
    footer: (page) => ({ text: String(page), alignment: "center", fontSize: 8, color: CAPTION, margin: [0, 16, 0, 0] }),
    content,
  };

  const PdfPrinter = hostRequire("pdfmake/src/printer");
  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return await new Promise((res, rej) => {
    const chunks = [];
    pdfDoc.on("data", (c) => chunks.push(c));
    pdfDoc.on("end", () => res(Buffer.concat(chunks)));
    pdfDoc.on("error", rej);
    pdfDoc.end();
  });
}
