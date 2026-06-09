# critica-pdf

Opinionated **PDF house style** for [Loica](https://github.com/critica-tech-lab/loica),
shipped as a drop-in plugin. Bare-metal Loica renders PDFs as plain default
LaTeX; enabling this plugin layers Critica's iA Writer–calibrated typography
(IBM Plex fonts, monospace dates, source captions, heading scale) onto the core
pandoc/tectonic pipeline via the host's `pdfStyle` extension point.

This is a **standalone package**, intentionally not part of the Loica repo. It
has no build step and no dependency on Loica's source or assets — it locates its
own preamble, Lua filters, and bundled IBM Plex fonts via `import.meta.url`.

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
  wordmark.png       # org wordmark (unused today; for future cover pages)
  fonts/             # bundled IBM Plex Sans + Mono (.otf), via OSFONTDIR
```

## Requirements

The host Loica must provide `pandoc` and `tectonic` on PATH. Fonts ship with
this package — no host font dependency.

## Compatibility

Targets the Loica extension API `pdfStyle` / `defaultEnabled` points. Entry is
ESM `.js` so production `node` imports it with no build step.
