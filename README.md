# critica-pdf

Opinionated **PDF house style** for [Loica](https://github.com/critica-tech-lab/loica),
shipped as a drop-in plugin. Bare-metal Loica already renders PDFs with a
pure-JS engine (pdfmake) in a plain style; enabling this plugin **overrides**
that for all docs with Critica's iA Writer–calibrated look (IBM Plex fonts,
monospace dates, source captions, heading scale, booktabs tables) via the host's
`globalExporters.pdf` extension point.

Pure-JS, **no binaries** — no pandoc, no tectonic, no TeX. Same rendering path
core uses (`marked` → `pdfmake`), just a richer house style.

This is a **standalone package**, intentionally not part of the Loica repo. It
has no build step and no dependency on Loica's source or assets — it locates its
own bundled IBM Plex fonts via `import.meta.url`.

## Install

Drop it into a Loica install's `plugins/` directory and restart:

```sh
git clone <this-repo-url> /path/to/loica/plugins/critica-pdf
# or as a submodule:
# git submodule add <this-repo-url> plugins/critica-pdf
```

Then enable it in **Admin → Extensions** (`critica-pdf`). It is
`defaultEnabled: false`, so the install keeps core's plain style until toggled on.

## Contents

```
index.server.js      # ESM, default-exports the LoicaExtension (globalExporters.pdf)
render-pdfmake.js    # the renderer: marked tokens → pdfmake → PDF, no binaries
package.json         # manifest — version + engines.loica (host API compat)
assets/
  wordmark.png       # org wordmark (unused today; for future cover pages)
  fonts/             # bundled IBM Plex Sans + Mono (.otf)
```

## Requirements

Only the host's npm deps: `pdfmake`, `marked`, `marked-footnote`, `sharp` —
all of which Loica core already depends on. Fonts ship with this package.

## Compatibility

Targets the Loica extension API `globalExporters` / `defaultEnabled` points.
Entry is ESM `.js` so production `node` imports it with no build step.
