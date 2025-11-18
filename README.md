# npcts
a typescript library for building npc powered applications 
=======

TypeScript/React toolkit for AI-integrated UI primitives, viewers, and service adapters. Designed to be framework-friendly (React-first) and neutral to any host (browser, Electron, native wrappers).

## Goals
- Reusable viewers/editors: PDF, DOCX, XLSX/CSV, markdown, code, terminal.
- Chat and context engineering utilities: conversation state, streaming, attachments, tool calls.
- Layout primitives: pane/split management for multi-pane IDE-style apps.
- Adapter layer: bridge to host capabilities (Electron preload, browser APIs, mocks).
- Typed service contracts: chat, filesystem, cron/daemon, browser history/bookmarks.

## Packages (planned)
- `core`: domain models, pure logic, and interfaces.
- `adapters`: bridges to host APIs (starter: Electron preload).
- `ui`: React components/hooks built on `core` contracts.

## Development
```bash
pnpm install
pnpm build
```

Use `pnpm dev` for watch builds. Add new exports through `src/index.ts` to keep the public API stable.
