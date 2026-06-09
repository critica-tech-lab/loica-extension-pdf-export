// critica-pdf — opinionated PDF house style for Critica installs.
//
// Drop-in Loica plugin. The bare-metal core renders PDFs as plain default
// LaTeX; enabling this extension (Admin → Extensions) layers Critica's iA
// Writer–calibrated typography onto the core pandoc/tectonic pipeline via the
// `pdfStyle` extension point.
//
// Self-contained: the preamble, Lua filters, and IBM Plex fonts all ship
// inside this package's assets/ — no dependency on the host's files.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const asset = (name) => join(here, "assets", name);

/** @type {import("../../app/extensions/types").LoicaExtension} */
const extension = {
  id: "critica-pdf",
  description: "Critica PDF house style (iA Writer typography, mono dates, source captions).",
  // Off until an admin turns it on, so a fresh install stays bare metal.
  defaultEnabled: false,

  pdfStyle: {
    preamblePath: asset("preamble.tex"),
    luaFilters: [asset("date-code.lua"), asset("source-caption.lua")],
    // Bundled IBM Plex fonts — self-contained, no dependency on the host.
    // Exposed to XeTeX/tectonic via OSFONTDIR.
    fontsDir: join(here, "assets", "fonts"),
    extraPandocArgs: [
      "-V", "mainfont=IBM Plex Sans",
      "-V", "sansfont=IBM Plex Sans",
      "-V", "monofont=IBM Plex Mono",
      "-V", "fontsize=11pt",
      "-V", "colorlinks=true",
      "-V", "urlcolor=linkblue",
      "-V", "linkcolor=body",
      "--highlight-style=kate",
    ],
  },
};

export default extension;
