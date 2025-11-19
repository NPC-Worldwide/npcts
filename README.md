# npcts

TypeScript library for building NPC-powered applications with split-pane 
layouts, file editors, terminals, chat interfaces, and file management.

## Architecture

### Core Interfaces
- `core/types.ts` - Base types (ModelInfo, Attachment, ToolCall)
- `core/chat.ts` - Chat client interface
- `core/files.ts` - File system client interface  
- `core/browser.ts` - Browser client interface
- `core/jobs.ts` - Jobs/cron client interface
- `core/layout.ts` - Layout node types

### Adapters
Platform-specific implementations of core interfaces:
- `adapters/base.ts` - AppServices interface definition
- `adapters/electron/bridge.ts` - Electron/window.api implementation

### UI Components

#### Layout System
- `LayoutProvider` - Context for split pane state management
- `LayoutNodeComponent` - Recursive layout tree renderer
- `SplitView` - Resizable horizontal/vertical splits
- `PaneHeader` - Pane title bar with close/rename
- `ContentPaneContainer` - Content type router
- `AppShell` - Complete application with sidebar + layout

#### File Management
- `FileSystemProvider` - File operations context
- `FileTree` - Recursive directory tree
- `Sidebar` - Workspace sidebar with search

#### Content Viewers
- `CodeEditor` - CodeMirror-based editor with syntax highlighting
- `Terminal` - Basic terminal emulator
- `BrowserViewer` - Embedded browser frame
- `PdfViewer` - PDF document viewer
- `CsvViewer` - Spreadsheet table view
- `ImageViewer` - Image display with zoom/rotate

#### Chat
- `ChatProvider` - Chat state management with streaming
- `ChatInterface` - Complete chat UI
- `ChatView` - Message list with auto-scroll
- `InputArea` - Message input with file attachments
- `ConversationList` - Conversation sidebar

#### Primitives
- `AutosizeTextarea` - Auto-growing textarea
- `Spinner` - Loading indicator

## Quick Start

### With Electron
```typescript
import { createElectronAdapter, AppShell } from "npcts";

const services = createElectronAdapter(window.api);

function App() {
  return (
    <AppShell 
      services={services} 
      workspacePath="/path/to/workspace"
    />
  );
}
```

### Custom Adapter
```typescript
import type { AppServices, ChatClient, FileSystemClient } from "npcts";

const customServices: AppServices = {
  chat: customChatClient,
  files: customFileClient,
  browser: customBrowserClient,
  jobs: customJobsClient,
};
```

### Layout Only
```typescript
import { LayoutProvider, Studio } from "npcts";

function App() {
  return <Studio services={services} />;
}
```

## Project Structure
```
src/
├── adapters/          # Platform implementations
│   ├── base.ts
│   └── electron/
├── core/              # Core interface definitions
│   ├── types.ts
│   ├── chat.ts
│   ├── files.ts
│   ├── browser.ts
│   ├── jobs.ts
│   └── layout.ts
└── ui/                # React components
    ├── chat/          # Chat UI components
    ├── layout/        # Split pane system
    ├── viewers/       # Content viewers
    ├── files/         # File management
    ├── primitives/    # Base components
    └── markdown/      # Markdown rendering
```

## Development
```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm run check        # Type check only
```

## Features

- 🎨 Split-pane layout system with drag-to-split
- 📁 File tree navigation with context menus
- 💬 Real-time chat with streaming support
- ✏️ Code editor with syntax highlighting
- 🖥️ Terminal emulator
- 🌐 Browser viewer
- 📄 PDF, CSV, and image viewers
- 🔌 Pluggable adapter system
- 📦 TypeScript-first with full type safety
- ⚛️ React 18+ compatible

## License

MIT
