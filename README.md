# critica-pdf

Opinionated **PDF house style** for [Loica](https://github.com/critica-tech-lab/loica).
Bare-metal Loica renders PDFs with a pure-JS engine (pdfmake) in a plain
style; enabling this extension **overrides** that for all docs with Critica's
iA Writer–calibrated look via the host's `globalExporters.pdf` extension point:

- US Letter, centered 365pt text column (full width in landscape)
- IBM Plex Sans/Mono, 10.5pt base, iA heading scale (small-caps-style h3)
- dates (2026-03-02, March 2, 2026…) set as inline code
- paragraphs starting with "Source" as small grey captions
- booktabs tables, padded code blocks, superscript footnote refs
- centered page numbers

It is **just a style**: the whole extension is a `PdfStyle` object passed to
core's `renderPdf` from the extension SDK (`~/extensions/sdk.server`). The
renderer, fonts and markdown handling all come from core, so core fixes
(images, callouts, footnotes) apply here automatically. No binaries, no
dependencies.

## Install

Check it out under the host's `app/extensions/` (it is compiled in at build
time and imports the SDK relatively, so the runtime `plugins/` directory does
**not** work for it):

```sh
git submodule add git@github.com:critica-tech-lab/loica-extension-pdf-export.git app/extensions/critica-pdf
```

Rebuild + restart Loica, then enable it in **Admin → Extensions**
(`critica-pdf`). It is `defaultEnabled: false`, so the install keeps core's
plain style until toggled on.

## Changing the style

Edit `criticaStyle` in `index.server.js`. Every `PdfStyle` field is optional;
see the `PdfStyle` type in the host's `app/lib/export/pdf.server.ts` for the
full list.

## Compatibility

Requires a Loica host whose SDK exports `renderPdf` / `PdfStyle`
(critica-tech-lab/loica#129).
