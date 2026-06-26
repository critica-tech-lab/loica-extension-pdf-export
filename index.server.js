// critica-pdf — opinionated PDF house style for Critica installs.
//
// Drop-in Loica plugin. Bare-metal Loica renders PDFs with a pure-JS engine
// (pdfmake) and ships no document-export binaries. Enabling this extension
// (Admin → Extensions) replaces that for ALL docs via the `globalExporters.pdf`
// extension point with Critica's iA Writer–calibrated LaTeX pipeline
// (pandoc → tectonic).
//
// Self-contained: the preamble, Lua filters and IBM Plex fonts ship inside this
// package's assets/. The ONLY host requirement is `pandoc` + `tectonic` on PATH
// — install them in the host (they are intentionally NOT a core dependency).

import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderStyledPdf } from "./render-pdfmake.js";

const here = dirname(fileURLToPath(import.meta.url));
const asset = (name) => join(here, "assets", name);

// Mirror the host's data root so we read uploads from the same place core does
// (core: paths.server.ts `uploadsDir = join(DATA_DIR, "uploads")`). Falls back
// to cwd, which is what a default install uses.
const dataDir = process.env.DATA_DIR || process.cwd();

// Snap-confined tectonic can only access non-hidden dirs under $HOME.
const tmpDir = join(homedir(), "loica-tmp");
// Bundled fonts ship with this package; fall back to the host's if absent.
const fontsDir = existsSync(asset("fonts")) ? asset("fonts") : join(dataDir, "assets", "fonts");

// Only PDFs embed into LaTeX untouched. Every raster format — including .png /
// .jpg — is re-encoded through sharp below, because tectonic's libpng is
// stricter than browsers/sharp and rejects otherwise-valid images with a bad
// IDAT CRC ("libpng error: IDAT: CRC error"), failing the WHOLE export. The
// re-encode normalizes them to a clean PNG.
const PASSTHROUGH = new Set([".pdf"]);

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

// Convert a non-native image to PNG so LaTeX can embed it. Best-effort: tries
// sharp (resolved from the host's node_modules), then platform CLIs.
async function convertImage(srcPath, pngPath) {
  try {
    const sharp = (await import("sharp")).default;
    await sharp(srcPath).png().toFile(pngPath);
    return true;
  } catch {}
  const tools = process.platform === "darwin"
    ? [["sips", ["-s", "format", "png", srcPath, "--out", pngPath]]]
    : [["magick", [srcPath, pngPath]], ["convert", [srcPath, pngPath]]];
  for (const [cmd, args] of tools) {
    try { execFileSync(cmd, args, { timeout: 10000, stdio: "pipe" }); return true; } catch {}
  }
  return false;
}

async function generate(content, title, landscape) {
  mkdirSync(tmpDir, { recursive: true });
  const uploadsDir = join(dataDir, "uploads");
  const id = rid();
  const imgDir = join(tmpDir, `crit-img-${id}`);
  const tmpFiles = [];

  // Rewrite /api/uploads/* → absolute paths; convert non-native to PNG.
  const imgRegex = /!\[([^\]]*)\]\(\/api\/uploads\/([^)]+)\)/g;
  const repl = await Promise.all(
    Array.from(content.matchAll(imgRegex)).map(async (m) => {
      const [match, alt, file] = m;
      const srcPath = join(uploadsDir, file);
      if (!existsSync(srcPath)) return { match, replacement: `![${alt}]()` };
      if (PASSTHROUGH.has(extname(file).toLowerCase())) return { match, replacement: `![${alt}](${srcPath})` };
      // Re-encode every raster image (png/jpg/webp/…) to a clean PNG so a bad
      // IDAT CRC can't kill the export. Drop the image if conversion fails.
      mkdirSync(imgDir, { recursive: true });
      const pngPath = join(imgDir, file.replace(/\.[^.]+$/, ".png"));
      if (await convertImage(srcPath, pngPath)) { tmpFiles.push(pngPath); return { match, replacement: `![${alt}](${pngPath})` }; }
      return { match, replacement: `![${alt}]()` };
    }),
  );
  for (const { match, replacement } of repl) content = content.replace(match, replacement);

  const mdPath = join(tmpDir, `crit-${id}.md`);
  const pdfPath = join(tmpDir, `crit-${id}.pdf`);
  const extraTmp = [];

  try {
    writeFileSync(mdPath, content, "utf-8");
    const env = { ...process.env, TMPDIR: tmpDir, OSFONTDIR: fontsDir };

    const args = [
      mdPath, "-f", "gfm+footnotes", "-o", pdfPath,
      "--pdf-engine=tectonic", "--metadata", `title=${title}`,
      "--lua-filter", asset("date-code.lua"),
      "--lua-filter", asset("source-caption.lua"),
      "-V", "mainfont=IBM Plex Sans",
      "-V", "sansfont=IBM Plex Sans",
      "-V", "monofont=IBM Plex Mono",
      "-V", "fontsize=11pt",
      "-V", "colorlinks=true",
      "-V", "urlcolor=linkblue",
      "-V", "linkcolor=body",
      "--highlight-style=kate",
      "-H", asset("preamble.tex"),
    ];

    // Wide-table shrink + landscape geometry, paired with the preamble.
    const maxCols = content.split("\n")
      .filter((l) => l.trimStart().startsWith("|") && l.trimEnd().endsWith("|"))
      .reduce((max, line) => Math.max(max, line.split("|").length - 2), 0);
    let override = "";
    if (!landscape) {
      if (maxCols >= 8) override = "\\AtBeginEnvironment{longtable}{\\scriptsize\\setlength{\\tabcolsep}{3pt}}";
      else if (maxCols >= 6) override = "\\AtBeginEnvironment{longtable}{\\footnotesize}";
    }
    if (override) {
      const p = join(tmpDir, `crit-wide-${id}.tex`);
      writeFileSync(p, override, "utf-8"); extraTmp.push(p); args.push("-H", p);
    }
    if (landscape) {
      const p = join(tmpDir, `crit-land-${id}.tex`);
      writeFileSync(p, "\\geometry{landscape,top=40pt,bottom=50pt,left=50pt,right=50pt}", "utf-8");
      extraTmp.push(p); args.push("-H", p);
    }

    execFileSync("pandoc", args, { timeout: 120000, stdio: "pipe", env });

    const pdf = readFileSync(pdfPath);
    const filename = title.replace(/[^a-zA-Z0-9_\-. ]/g, "_") + ".pdf";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[critica-pdf] generation failed:", err?.stderr?.toString() || err?.message);
    throw new Response("PDF generation failed", { status: 500 });
  } finally {
    for (const f of [mdPath, pdfPath, ...extraTmp, ...tmpFiles]) { try { unlinkSync(f); } catch {} }
    try { rmSync(imgDir, { recursive: true }); } catch {}
  }
}

/** @type {import("../../app/extensions/types").LoicaExtension} */
const extension = {
  id: "critica-pdf",
  description: "Critica PDF house style (iA Writer typography, mono dates, source captions) via pandoc/tectonic.",
  // Off until an admin turns it on, so a fresh install stays pure-JS.
  defaultEnabled: false,

  globalExporters: {
    // Two engines behind one extension point. Default = LaTeX (pandoc/tectonic).
    // Opt into the pure-JS pdfmake renderer — same iA house style, zero binaries
    // — per-install via CRITICA_PDF_ENGINE=pdfmake or per-doc via frontmatter
    // `pdf_engine: pdfmake`. Lets you A/B the two against the same document.
    pdf: (doc, frontmatter, content) => {
      const body = content ?? doc.content ?? "";
      const title = doc.title || "Untitled";
      const landscape = frontmatter?.orientation === "landscape";
      const engine = (process.env.CRITICA_PDF_ENGINE || frontmatter?.pdf_engine || "latex").toLowerCase();
      if (engine === "pdfmake" || engine === "purejs" || engine === "js") {
        return renderStyledPdf(body, title, landscape).then((pdf) =>
          new Response(new Uint8Array(pdf), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${title.replace(/[^a-zA-Z0-9_\-. ]/g, "_")}.pdf"`,
            },
          }),
        );
      }
      return generate(body, title, landscape);
    },
  },
};

export default extension;
