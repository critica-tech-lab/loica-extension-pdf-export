// critica-pdf — opinionated PDF house style for Critica installs.
//
// Drop-in Loica plugin. The bare-metal core renders PDFs as plain default
// LaTeX; enabling this extension (Admin → Extensions) layers Critica's iA
// Writer–calibrated typography onto the core pandoc/tectonic pipeline via the
// `pdfStyle` extension point.
//
// Self-contained: the preamble, Lua filters, and IBM Plex fonts all ship
// inside this package's assets/ — no dependency on the host's files.

import { join } from "node:path";

// Vite's SSR build bundles this module into build/server/assets/, so
// import.meta.url-relative paths no longer point at this package's own
// assets/ dir. The submodule is always checked out at this fixed path
// relative to the repo root (the registration contract in
// app/extensions/index.server.ts), which matches process.cwd() in both
// dev and the production WorkingDirectory.
const here = join(process.cwd(), "app/extensions/critica-pdf");
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
    // Loaded directly via fontspec `Path=` (tectonic ignores OSFONTDIR).
    fontsDir: join(here, "assets", "fonts"),
    fonts: [
      { command: "mainfont", family: "IBMPlexSans" },
      { command: "sansfont", family: "IBMPlexSans" },
      { command: "monofont", family: "IBMPlexMono" },
    ],
    extraPandocArgs: [
      "-V", "fontsize=11pt",
      "-V", "colorlinks=true",
      "-V", "urlcolor=linkblue",
      "-V", "linkcolor=body",
      "--highlight-style=kate",
    ],
  },
};

export default extension;
