# critica-pdf

Opinionated **PDF house style** for [Loica](https://github.com/critica-tech-lab/loica), shipped as a drop-in plugin. Uses the core pdfmake renderer — no external binaries required.

Enabling this plugin replaces the default PDF output for all documents with Critica's iA Writer–calibrated typography: IBM Plex fonts, narrow 365pt text block centered on A4, monospace numeric dates, "Source:" caption paragraphs, and centered page numbers.

This is a `globalExporters.pdf` extension — it applies to every document, not just a specific `type:`. Per-document `exporters.pdf` in other extensions take precedence.

## Install

Drop into a Loica install's `plugins/` directory and restart:

```sh
git clone <this-repo-url> /path/to/loica/plugins/critica-pdf
```

Then enable in **Admin → Extensions** (`critica-pdf`). Default is off.

## Typography

| Setting | Value |
| ------- | ----- |
| Fonts | IBM Plex Sans (body) + IBM Plex Mono (code, dates) |
| Base size | 10.5pt |
| Line height | 1.55 |
| Text block | 365pt centered on A4 (~115pt side margins) |
| Page numbers | Centered footer |

## Contents

```text
index.server.js   # ESM — default-exports the LoicaExtension (globalExporters.pdf)
```

Fonts and rendering are provided by the host Loica's pdfmake dependency — no bundled assets.

## Requirements

The host Loica must have `pdfmake` installed (it does by default). No pandoc, tectonic, or LaTeX required.
