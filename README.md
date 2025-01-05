# iMessage History Analyzer

A TypeScript project to analyze your iMessage chat history on macOS.

## Prerequisites

- macOS (as iMessage is only available on Apple devices)
- Node.js 18+ installed
- Access to your iMessage database (typically located at `~/Library/Messages/chat.db`)

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd imessage-history
```

2. Install dependencies:

```bash
npm install
```

## Initial Setup

Before running the application, you need to grant Full Disk Access to Node.js due to macOS privacy protections:

1. Open System Settings
2. Go to Privacy & Security > Full Disk Access
3. Click the + button to add an application
4. Navigate to your Node.js executable (typically `/usr/local/bin/node` or use `which node` in terminal to find it)
5. Enable Full Disk Access for Node.js

## Usage

Run the development server:

```bash
npm run dev
```

This will:

- Connect to your iMessage database
- Display recent messages
- Show available chats
- List contact handles
- Show messages from your most recent chat

## Features

- Read messages from your iMessage database
- View recent conversations
- List all chats and contacts
- Query messages by chat

## Security Note

This tool reads your iMessage database in read-only mode and does not modify any data. All data stays on your local machine.

## Troubleshooting

If you see a "Failed to access iMessage database" error:

1. Make sure you've granted Full Disk Access to Node.js as described in the Initial Setup section
2. Verify that your iMessage database exists at `~/Library/Messages/chat.db`
3. Try restarting your terminal after granting permissions

## License

MIT
