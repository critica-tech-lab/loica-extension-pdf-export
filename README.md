# critica-pdf

Opinionated **PDF house style** for [Loica](https://github.com/critica-tech-lab/loica),
shipped as a drop-in plugin. Bare-metal Loica renders PDFs with a pure-JS engine
(pdfmake) and ships no export binaries; enabling this plugin **replaces** that
for all docs with Critica's iA Writer–calibrated pandoc/tectonic LaTeX pipeline
(IBM Plex fonts, monospace dates, source captions, heading scale) via the host's
`globalExporters.pdf` extension point.

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
index.server.js      # ESM, default-exports the LoicaExtension (globalExporters.pdf)
package.json         # manifest — version + engines.loica (host API compat)
assets/
  preamble.tex       # LaTeX preamble (iA Writer Modern Sans calibration)
  date-code.lua      # render dates as monospace code
  source-caption.lua # "Source:" paragraphs -> small caption
  wordmark.png       # org wordmark (unused today; for future cover pages)
  fonts/             # bundled IBM Plex Sans + Mono (.otf), via OSFONTDIR
```

## Engines

Two renderers sit behind the one `globalExporters.pdf` point:

- **`latex`** (default) — `pandoc` → `tectonic`. Highest typographic quality;
  requires those two binaries on PATH.
- **`pdfmake`** — pure-JS (`render-pdfmake.js`), the same iA house style with
  **no binaries**. ~90% of the LaTeX look; good when a host can't install TeX.

Select per install with `CRITICA_PDF_ENGINE=pdfmake`, or per document with
frontmatter `pdf_engine: pdfmake`. Unset → `latex`.

## Requirements

For the `latex` engine, the host must provide `pandoc` and `tectonic` on PATH.
The `pdfmake` engine needs neither — only the host's npm deps (`pdfmake`,
`marked`, `marked-footnote`, `sharp`). Fonts ship with this package either way.

## Compatibility

Targets the Loica extension API `globalExporters` / `defaultEnabled` points.
Entry is ESM `.js` so production `node` imports it with no build step.
