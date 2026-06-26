// critica-pdf — opinionated PDF house style for Critica installs.
//
// Uses the core pdfmake renderer with Critica's iA Writer–calibrated
// typography. No external binaries (pandoc/tectonic) required.
//
// Features:
// - IBM Plex Sans/Mono fonts, 10.5pt base, 1.55 line height
// - Narrow text block (365pt, centered on A4) matching iA Writer print
// - Numeric dates rendered in monospace
// - "Source:" paragraphs rendered as small captions
// - Centered page numbers

import { renderPdf } from "../../lib/export/pdf.server.ts";
import { stripFrontmatter, parseFrontmatter } from "../../lib/templates.ts";

function safeFilename(title) {
  return (title || "Untitled").replace(/[^a-zA-Z0-9_\-. ]/g, "_");
}

// A4 width = 595pt. Center a 365pt text block → margins ~115pt each side.
const sideMargin = Math.round((595 - 365) / 2);

/** @type {import("../../lib/export/pdf.server.ts").PdfStyle} */
const criticaStyle = {
  fontSize: 10.5,
  lineHeight: 1.55,
  pageMargins: [sideMargin, 50, sideMargin, 60],
  headingSizes: [13.4, 13, 12, 10.5, 10.5, 10.5],
  headingMargins: {
    top:    [35, 35, 24, 17.5, 17.5, 17.5],
    bottom: [35, 17.5, 4, 0, 0, 0],
  },
  colors: {
    body: "#1A1A1A",
    link: "#3366CC",
    codeBg: "#F0F0F0",
    codeFg: "#1A1A1A",
    quote: "#1A1A1A",
    footnote: "#333333",
    rule: "#1A1A1A",
  },
  codeFontSize: 9.87,
  dateInMono: true,
  sourceCaptions: true,
  pageNumbers: "center",
};

/** @type {import("../../extensions/types").LoicaExtension} */
const extension = {
  id: "critica-pdf",
  description: "Critica PDF house style (iA Writer typography, mono dates, source captions).",
  defaultEnabled: false,

  globalExporters: {
    async pdf(doc, frontmatter, content) {
      const body = content ?? stripFrontmatter(doc.content || "");
      const fm = frontmatter ?? parseFrontmatter(doc.content || "");
      const landscape = fm?.orientation === "landscape";
      const pdf = await renderPdf(body, doc.title || "Untitled", landscape, criticaStyle);
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeFilename(doc.title)}.pdf"`,
        },
      });
    },
  },
};

export default extension;
