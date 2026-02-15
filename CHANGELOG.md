# npcts Changelog

## 0.1.6

### New: Document Viewer Components

Extracted `CsvViewer`, `DocxViewer`, and `PptxViewer` from npc-studio (incognide) into npcts as portable, reusable components.

**CsvViewer** — Full spreadsheet editor for CSV/XLSX files
- Inline cell editing, column sorting, filtering, search
- Sheet tab switching for multi-sheet XLSX workbooks
- Column statistics (sum, avg, min, max, unique count)
- Add/delete rows and columns, export to CSV/JSON/XLSX

**DocxViewer** — Rich text WYSIWYG editor for DOCX files
- Mammoth-based DOCX parsing with contentEditable editing
- Formatting toolbar (bold, italic, lists, alignment, colors)
- Table insertion, find & replace, word/character/page stats
- Export as HTML or Markdown

**PptxViewer** — Slide editor for PPTX presentations
- JSZip-based PPTX parsing with full shape/text rendering
- Slide navigation, add/delete/duplicate slides
- Shape text editing, background color, shape insertion
- Preserves theme colors, gradients, and layout positioning

### New: DocumentFileApi Adapter Pattern

All three viewers accept an optional `fileApi: DocumentFileApi` prop that abstracts file I/O. This allows the same component to work in:
- **Electron** (incognide): backed by `window.api` IPC calls
- **Web apps** (lavanzaro): backed by HTTP `fetch` calls
- **Standalone**: stub default that logs errors if no adapter provided

```typescript
import { DocumentFileApi } from 'npcts/core';
```

### New: forwardRef Imperative API

All three viewers now expose ref-based imperative handles for programmatic control (Studio Actions, AI tool integration, etc.):

- `CsvViewerHandle` — 16 methods: `readSpreadsheetData`, `evalSpreadsheet`, `updateSpreadsheetCell`, `updateSpreadsheetCells`, `addSpreadsheetRow`, `deleteSpreadsheetRow`, `addSpreadsheetColumn`, `deleteSpreadsheetColumn`, `sortSpreadsheet`, `filterSpreadsheet`, `clearSpreadsheetFilters`, `getSpreadsheetColumnStats`, `saveSpreadsheet`, `exportSpreadsheet`, `switchSpreadsheetSheet`, `updateSpreadsheetHeader`

- `DocxViewerHandle` — 11 methods: `readDocumentContent`, `evalDocument`, `writeDocumentContent`, `insertDocumentContent`, `formatDocument`, `insertDocumentTable`, `findInDocument`, `replaceInDocument`, `saveDocument`, `getDocumentStats`, `exportDocumentAs`

- `PptxViewerHandle` — 11 methods: `readPresentation`, `readSlide`, `evalPresentation`, `goToSlide`, `updateSlideText`, `addPresentationSlide`, `deletePresentationSlide`, `duplicatePresentationSlide`, `setPresentationSlideBackground`, `addPresentationShape`, `savePresentation`

```typescript
import { CsvViewer, CsvViewerHandle } from 'npcts/ui';

const ref = useRef<CsvViewerHandle>(null);
<CsvViewer ref={ref} filePath="/data.csv" fileApi={adapter} />

// Programmatic access:
const data = ref.current?.readSpreadsheetData();
ref.current?.sortSpreadsheet(0, 'desc');
```

### Dependencies Added
- `mammoth` ^1.11.0 (DOCX parsing)
- `xlsx` ^0.18.5 (CSV/XLSX parsing)

### Bug Fixes
- Fixed `ArrayBuffer.length` → `ArrayBuffer.byteLength` in PptxViewer
- Fixed `readFileContent` return type handling in DocxViewer
- Fixed `unknown[]` type on `sheet_to_json` result in CsvViewer
