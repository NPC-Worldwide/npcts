# npcts

TypeScript library for building NPC-powered applications with split-pane
layouts, file editors, terminals, chat interfaces, spatial UI systems, and VM management.

## Architecture

### Core Interfaces
- `core/types.ts` - Base types (ModelInfo, Attachment, ToolCall)
- `core/chat.ts` - Chat client interface
- `core/files.ts` - File system client interface
- `core/browser.ts` - Browser client interface
- `core/jobs.ts` - Jobs/cron client interface
- `core/layout.ts` - Layout node types
- `core/spatial.ts` - Spatial room/character types
- `core/vm.ts` - Virtual machine management

### Adapters
Platform-specific implementations of core interfaces:
- `adapters/base.ts` - AppServices interface definition
- `adapters/electron/bridge.ts` - Electron/window.api implementation
- `adapters/http/spatialServices.ts` - HTTP client for spatial backend

### UI Components

#### Layout System
- `LayoutProvider` - Context for split pane state management
- `LayoutNodeComponent` - Recursive layout tree renderer
- `SplitView` - Resizable horizontal/vertical splits
- `PaneHeader` - Pane title bar with close/rename
- `ContentPaneContainer` - Content type router
- `AppShell` - Complete application with sidebar + layout

#### Spatial UI System
Components for building explorable 2D room-based interfaces:
- `SpatialProvider` - Context for room/character state management
- `SpatialWorld` - Main container combining room, character, and input
- `Room` - Room renderer with walls, floor, doors, applications
- `Character` - Animated sprite character with directional movement
- `Wall` - Wall segment renderer
- `Door` - Door/portal component for room transitions
- `Application` - Interactive application icon in rooms
- `FloorPattern` - Floor texture/pattern renderer
- `Minimap` - Overview minimap of current room
- `KeyLegend` - Keyboard controls legend
- `HelpOverlay` - Full help overlay with all keybindings
- `EditModeOverlay` - Edit mode indicator overlay

#### Spatial Hooks
- `useKeyboardInput` - Keyboard movement and interaction
- `useCharacter` - Character state and movement
- `useCollisionDetection` - Wall/door/app collision detection

#### Spatial Utilities
- `transforms.ts` - Coordinate transforms (percent to pixels, door positioning)
- `collision.ts` - Collision detection algorithms

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

### Server Components
Backend utilities for spatial applications:
- `server/spatial/routes.ts` - Express routes for spatial API
- `server/spatial/configStore.ts` - Configuration storage
- `server/spatial/imageHandler.ts` - Image/sprite handling
- `server/spatial/commandExecutor.ts` - Command execution

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

### Spatial UI
```typescript
import { SpatialProvider, SpatialWorld, createHttpSpatialServices } from "npcts";

const spatialServices = createHttpSpatialServices("http://localhost:5000");

function App() {
  return (
    <SpatialProvider
      services={spatialServices}
      configPath="/path/to/config.json"
    >
      <SpatialWorld
        width={window.innerWidth}
        height={window.innerHeight}
        showMinimap={true}
        showKeyLegend={true}
        onAppOpen={(app, name) => console.log(`Opening ${name}`)}
        onRoomChange={(newRoom, oldRoom) => console.log(`Room: ${oldRoom} -> ${newRoom}`)}
      />
    </SpatialProvider>
  );
}
```

### VM Management
```typescript
import { createHttpVMClient, createCommandVMClient } from "npcts/core/vm";

// HTTP-based VM control
const vmClient = createHttpVMClient("http://localhost:5000");
await vmClient.start("my-vm");
await vmClient.connect("my-vm");

// Command-based VM control
const cmdVMClient = createCommandVMClient();
await cmdVMClient.start("my-vm", { command: "virsh start my-vm" });
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
├── adapters/              # Platform implementations
│   ├── base.ts
│   ├── electron/
│   └── http/
│       └── spatialServices.ts
├── core/                  # Core interface definitions
│   ├── types.ts
│   ├── chat.ts
│   ├── files.ts
│   ├── browser.ts
│   ├── jobs.ts
│   ├── layout.ts
│   ├── spatial.ts         # Spatial types
│   └── vm.ts              # VM management
├── server/                # Backend components
│   └── spatial/
│       ├── routes.ts
│       ├── configStore.ts
│       ├── imageHandler.ts
│       └── commandExecutor.ts
└── ui/                    # React components
    ├── chat/              # Chat UI components
    ├── layout/            # Split pane system
    ├── viewers/           # Content viewers
    ├── files/             # File management
    ├── primitives/        # Base components
    ├── markdown/          # Markdown rendering
    └── spatial/           # Spatial UI system
        ├── components/    # Room, Character, Door, etc.
        ├── context/       # SpatialProvider
        ├── hooks/         # useKeyboardInput, etc.
        ├── utils/         # transforms, collision
        └── editors/       # ConfigEditor
```

## Spatial UI Controls

| Key | Action |
|-----|--------|
| wasd / arrows | Move character |
| o | Open/interact with nearby item |
| f | Toggle edit mode |
| e | Add new application (edit mode) |
| r | Add new room (edit mode) |
| ? | Show help overlay |
| esc | Close overlay / exit edit mode |

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
- 🗺️ Spatial room-based UI with character navigation
- 🚪 Room transitions via doors
- 🎮 Keyboard-driven interaction
- 💻 VM management (start/stop/connect)
- 🔌 Pluggable adapter system
- 📦 TypeScript-first with full type safety
- ⚛️ React 18+ compatible

## License

MIT
