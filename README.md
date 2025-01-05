# iMessage History Analyzer

A TypeScript tool to analyze your iMessage history, search messages, and export conversations.

## Installation

You can either install globally via npm:

```bash
npm install -g imessage-history
```

Or use directly with npx without installing:

```bash
npx imessage-history
```

## Development Setup

If you want to work on the codebase:

1. Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd imessage-history
npm install
```

## Prerequisites

- macOS
- Node.js 18+
- Terminal access (iTerm2, Ghostty, etc.)

## Setup

1. Grant Full Disk Access to your terminal:
   - Open System Settings
   - Navigate to Privacy & Security → Full Disk Access
   - Click the + button
   - Add your terminal application (e.g., iTerm2, Ghostty)
   - Restart your terminal

This step is required because macOS protects the iMessage database. Your terminal needs Full Disk Access to read the chat.db file.

2. Grant Contacts Access:
   - When you first run the tool, macOS will show a dialog asking for permission to access your Contacts
   - Click "OK" to allow access
   - This is required for mapping phone numbers/emails to contact names
   - If you deny access, the tool will still work but will only show phone numbers/emails instead of contact names

## Usage

The tool provides a command-line interface with the following commands.
If you installed globally, use:

```bash
# Show help and available commands
imessage-history help

# List all contacts with message history
imessage-history contacts

# Search messages by name
imessage-history search "John Smith"

# Search by phone number
imessage-history search "+12345678900"

# Search by email
imessage-history search "john@example.com"
```

Or if you prefer using npx without installing:

```bash
npx imessage-history search "John Smith"
```

### Search Options

```bash
# Show oldest messages first (chronological order)
imessage-history search "John" --asc
# or with npx:
npx imessage-history search "John" --asc

# Show all messages (no limit)
imessage-history search "John" --no-limit

# Limit to specific number of messages
imessage-history search "John" --limit=500

# Export messages to CSV
imessage-history search "John" --csv

# Export to specific CSV file
imessage-history search "John" --csv=john-messages.csv

# Combine options
imessage-history search "John" --no-limit --asc --csv=full-history.csv
```

### Cache Management

The tool caches contact information for better performance. To refresh:

```bash
# Clear contact cache and rebuild
imessage-history search --refresh-cache
```

## Features

- 🔍 Search messages by contact name, phone number, or email
- 📱 Automatic contact name resolution
- 📅 Chronological or reverse-chronological ordering
- 📊 Export conversations to CSV
- 📎 Track attachments and group chats
- 🚀 Fast searching with contact caching

## Security Note

This tool operates in read-only mode and never modifies your message database. All data stays on your machine.

## License

MIT
