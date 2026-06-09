# critica-pdf

Opinionated **PDF house style** for [Loica](https://github.com/critica-tech-lab/loica),
shipped as a drop-in plugin. Bare-metal Loica renders PDFs as plain default
LaTeX; enabling this plugin layers Critica's iA Writer–calibrated typography
(IBM Plex fonts, monospace dates, source captions, heading scale) onto the core
pandoc/tectonic pipeline via the host's `pdfStyle` extension point.

This is a **standalone package**, intentionally not part of the Loica repo. It
has no build step and no dependency on Loica's source — it locates its own
assets via `import.meta.url` and uses the host's shared `assets/fonts`.

## Install

Drop it into a Loica install's `plugins/` directory and restart:

```sh
git clone <this-repo-url> /path/to/loica/plugins/critica-pdf
# or as a submodule:
# git submodule add <this-repo-url> plugins/critica-pdf
```

Then enable it in **Admin → Extensions** (`critica-pdf`). It is
`defaultEnabled: false`, so the install stays bare until toggled on.

## Contents

```
index.server.js      # ESM, default-exports the LoicaExtension (pdfStyle)
assets/
  preamble.tex       # LaTeX preamble (iA Writer Modern Sans calibration)
  date-code.lua      # render dates as monospace code
  source-caption.lua # "Source:" paragraphs -> small caption
  wordmark.png       # org wordmark (for future cover pages)
```

## Requirements

The host Loica must provide `pandoc`, `tectonic`, and IBM Plex fonts under its
`assets/fonts` (the default Loica ships these for DOCX export).

## Compatibility

Targets the Loica extension API `pdfStyle` / `defaultEnabled` points. Entry is
ESM `.js` so production `node` imports it with no build step.
