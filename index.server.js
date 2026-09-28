// critica-pdf — opinionated PDF house style for Critica installs.
//
// Bare-metal Loica renders PDFs with a pure-JS engine (pdfmake) in a plain
// style. Enabling this extension (Admin → Extensions) overrides that for ALL
// docs via the `globalExporters.pdf` extension point: same core renderer, with
// Critica's iA Writer–calibrated `PdfStyle` (centered text column, monospace
// dates, source captions, booktabs tables). No binaries, no renderer of our own.

import { renderPdf } from "../sdk.server.ts";

const BODY = "#1A1A1A";
const CAPTION = "#8C8C8C"; // black 55%
const COL = 365; // iA text column width (pt), centered on US Letter
const BASE = 10.5;
const side = (612 - COL) / 2;

/** @type {import("../sdk.server.ts").PdfStyle} */
const criticaStyle = {
  pageSize: "LETTER",
  fontSize: BASE,
  lineHeight: 1.42, // pdfmake renders lineHeight looser than TeX's 1.55
  pageMargins: [side, 50, side, 60],
  landscapePageMargins: [50, 40, 50, 50],
  headings: [
    { fontSize: 13.42, margin: [24, 10] },
    { fontSize: 13, margin: [22, 8] },
    { fontSize: BASE, caps: true, characterSpacing: 0.5, margin: [16, 4] },
    { fontSize: BASE, italics: true, margin: [14, 2] },
    { fontSize: BASE, bold: false, margin: [14, 2] },
    { fontSize: BASE, bold: false, color: CAPTION, margin: [14, 2] },
  ],
  colors: {
    body: BODY,
    link: "#3366CC",
    codeBg: "#F4F4F4",
    codeBlockBg: "#F0F0F0",
    codeFg: BODY,
    quote: BODY,
    footnote: CAPTION,
    rule: BODY,
    caption: CAPTION,
  },
  linkUnderline: false,
  codeFontSize: 9.87,
  codeBlockFontSize: 9.5,
  quote: { italics: false, indent: [23, 23] },
  tableLayout: "booktabs",
  dateInMono: true,
  sourceCaptions: true,
  footnoteRefs: "superscript",
  pageNumbers: "center",
};

/** @type {import("../sdk.server.ts").LoicaExtension} */
const extension = {
  id: "critica-pdf",
  description: "Critica PDF house style (iA Writer typography, mono dates, source captions), pure-JS.",
  // Off until an admin turns it on, so a fresh install keeps core's plain style.
  defaultEnabled: false,

  globalExporters: {
    pdf: async (doc, frontmatter, content) => {
      const body = content ?? doc.content ?? "";
      const title = doc.title || "Untitled";
      const landscape = frontmatter?.orientation === "landscape";
      const pdf = await renderPdf(body, title, landscape, criticaStyle);
      const filename = title.replace(/[^a-zA-Z0-9_\-. ]/g, "_") + ".pdf";
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    },
  },
};

export default extension;
