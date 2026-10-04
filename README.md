# Hiraku / ひらく

A small, private workspace for turning Japanese screenplay PDFs into editable text.

The original `script.py` used pdfminer to extract a fixed page range. Hiraku brings that idea to the browser: drop a PDF, compare the original with horizontal text, edit, and export. The original Python script is preserved.

## Features

- Drag-and-drop or select a PDF; try an included, original three-page sample.
- Automatic vertical/horizontal detection, with manual overrides. Vertical text is reconstructed from top to bottom and right to left; vertical punctuation is converted to horizontal characters.
- Side-by-side PDF preview and per-page text editing. Mobile screens switch between the two views.
- Inclusive page selection, optional margin page-number removal, ruby removal, and joining wrapped dialogue inside Japanese quotation marks.
- Copy all selected pages or download a UTF-8 TXT file with a BOM. Optional page markers preserve the source page numbers. Edits survive page navigation; replacing edited content requires confirmation.
- Local processing with PDF.js. No upload endpoint, account, API key, analytics, third-party fonts, or application storage. Save before closing the tab.

## Run locally

Use Node.js 24 (or a compatible version >=22.13).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally <http://127.0.0.1:5173>. PDF.js workers, CMaps, standard fonts, and WASM files are served from the same origin. The `dev` and `build` scripts copy the required package assets automatically.

## Verify

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover reading order, explicit spaces, punctuation, cleanup, selection validation, and export. Browser tests exercise real vertical/horizontal PDFs, editing, downloads, clipboard behavior, invalid/protected/image-only PDFs, responsive layout, accessibility, and local-only requests.

To test the production output under a repository-style subpath:

```sh
npm run preview -- --port 4173 --base /kyakuhon-pdf/
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173/kyakuhon-pdf/ npm run test:e2e
```

The preview command stays running; run the tests in a second terminal.

## Deployment

`npm run build` creates a static `dist/` directory. Serve it over HTTP(S); opening `index.html` directly as a `file:` URL is unsupported. HTTPS or localhost is needed for clipboard access.

The included GitHub Actions workflow validates and deploys `main` to GitHub Pages. Enable **Settings → Pages → Source → GitHub Actions** before the first deployment. The relative Vite base supports both repository subpaths and root-level hosting. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Limits

- Text-bearing PDFs only. Scanned/image-only pages need OCR elsewhere first. Password-protected files must be unlocked before import.
- Up to 50 MB and 500 pages per document. Processing and preview memory depend on the document and device.
- PDF text order is reconstructed heuristically. Complex layouts, mixed writing directions, multi-column horizontal layouts, and rotated text may need manual correction. Keep the original preview beside the result.
- Ruby removal is a font-size heuristic and may remove small notes. Joining lines only joins continued dialogue inside `「」` or `『』`; it does not rewrite prose or infer screenplay semantics.
- No autosave or persistent project history. Refreshing or closing the page clears the workspace. TXT export contains the selected pages, including edits.

## Code map

| Path                            | Responsibility                                                      |
| ------------------------------- | ------------------------------------------------------------------- |
| `src/lib/extract.ts`            | Pure reading-order reconstruction, cleanup, ranges, and text export |
| `src/lib/pdf.ts`                | Lazy-loaded PDF.js integration and text-item coordinates            |
| `src/hooks/useWorkspace.ts`     | Document lifecycle, conversion, editing, cancellation, and export   |
| `src/components/PdfPreview.tsx` | Canvas rendering, responsive sizing, and zoom                       |
| `src/App.tsx`                   | Japanese workspace UI and replacement confirmation                  |
| `tests/`                        | Browser integration tests and PDF fixtures                          |

The app uses React, TypeScript, Vite, PDF.js, and Lucide icons. PDF.js assets retain their upstream license files. Learn more about the [PDF.js text and document APIs](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html).

## Regenerate fixtures

The sample screenplay is original fixture content created for this project; no user manuscript is bundled. The fixture generator needs `reportlab` and `pypdf`:

```sh
python -m venv .venv
.venv/bin/pip install reportlab pypdf
.venv/bin/python scripts/create-fixtures.py
```

## Legacy Python script

`script.py` is retained unchanged. Install `pdfminer.six`, supply `input.pdf`, and edit `start_page` / `end_page` before running it. The web app does not require Python.
