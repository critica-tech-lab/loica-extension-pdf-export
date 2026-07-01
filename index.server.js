// critica-pdf — opinionated PDF house style for Critica installs.
//
// Drop-in Loica plugin. Bare-metal Loica already renders PDFs with a pure-JS
// engine (pdfmake) in a plain style. Enabling this extension (Admin →
// Extensions) overrides that for ALL docs via the `globalExporters.pdf`
// extension point, swapping in Critica's iA Writer–calibrated house style
// (centered text column, monospace dates, source captions, booktabs tables).
//
// Self-contained and binary-free: the renderer (render-pdfmake.js) and the
// bundled IBM Plex fonts ship inside this package's assets/. No pandoc, no
// tectonic, no host binaries — only the host's npm deps (pdfmake, marked,
// marked-footnote, sharp), which core already depends on.

import { renderStyledPdf } from "./render-pdfmake.js";

/** @type {import("../../app/extensions/types").LoicaExtension} */
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
      const pdf = await renderStyledPdf(body, title, landscape);
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
