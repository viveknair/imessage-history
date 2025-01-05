# iMessage History Analyzer

A TypeScript tool to analyze your iMessage history, search messages, and export conversations.

## Prerequisites

- macOS
- Node.js 18+
- Terminal access (iTerm2, Ghostty, etc.)

## Setup

1. Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd imessage-history
npm install
```

2. Grant Full Disk Access to your terminal:
   - Open System Settings
   - Navigate to Privacy & Security → Full Disk Access
   - Click the + button
   - Add your terminal application (e.g., iTerm2, Ghostty)
   - Restart your terminal

This step is required because macOS protects the iMessage database. Your terminal needs Full Disk Access to read the chat.db file.

3. Grant Contacts Access:
   - When you first run the tool, macOS will show a dialog asking for permission to access your Contacts
   - Click "OK" to allow access
   - This is required for mapping phone numbers/emails to contact names
   - If you deny access, the tool will still work but will only show phone numbers/emails instead of contact names

## Usage

### List All Contacts

```bash
npx tsx src/list-contacts.ts
```

This will show all contacts you've messaged, along with their phone numbers/emails and message counts.

### Search Messages

Basic search by name:

```bash
npx tsx src/find-messages.ts "John Smith"

# Search by phone number
npx tsx src/find-messages.ts "+12345678900"

# Search by email
npx tsx src/find-messages.ts "john@example.com"
```

### Search Options

```bash
# Show all available options
npx tsx src/find-messages.ts --help

# Show oldest messages first (chronological order)
npx tsx src/find-messages.ts "John" --asc

# Show all messages (no limit)
npx tsx src/find-messages.ts "John" --no-limit

# Limit to specific number of messages
npx tsx src/find-messages.ts "John" --limit=500

# Export messages to CSV
npx tsx src/find-messages.ts "John" --csv

# Export to specific CSV file
npx tsx src/find-messages.ts "John" --csv=john-messages.csv

# Combine options
npx tsx src/find-messages.ts "John" --no-limit --asc --csv=full-history.csv
```

### Cache Management

The tool caches contact information for better performance. To refresh:

```bash
# Clear contact cache and rebuild
npx tsx src/find-messages.ts --refresh-cache
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
