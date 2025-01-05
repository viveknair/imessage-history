#!/usr/bin/env node

import {
  findMessagesByContact,
  printMessages,
  exportMessagesToCSV,
} from "./message-search";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";

const COMMANDS = {
  search: "search",
  contacts: "contacts",
  help: "help",
} as const;

type Command = (typeof COMMANDS)[keyof typeof COMMANDS];

function showHelp() {
  console.log(`
📱 iMessage History Analyzer

Usage:
  imessage <command> [options]

Commands:
  search <query>     Search messages by contact name, phone, or email
  contacts           List all contacts with message history
  help              Show this help message

Search Options:
  --asc             Sort messages oldest first
  --limit=N         Limit to N messages (default: 1000)
  --no-limit        Show all messages
  --csv[=path]      Export messages to CSV (optional path)
  --refresh-cache   Clear contact cache

Examples:
  # Search for messages
  imessage search "John Smith"
  imessage search "+12345678900"
  imessage search "john@example.com"

  # List all contacts
  imessage contacts

  # Export all messages with a contact to CSV
  imessage search "John" --csv=john-messages.csv --no-limit --asc
`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const flags = args.filter((arg) => arg.startsWith("--"));
  const params = args.filter((arg) => !arg.startsWith("--"));

  // Show help if no command or help requested
  if (!command || command === COMMANDS.help) {
    showHelp();
    process.exit(0);
  }

  // Parse limit flag
  const limitFlag = flags.find((f) => f.startsWith("--limit="));
  const limit = limitFlag
    ? parseInt(limitFlag.split("=")[1])
    : flags.includes("--no-limit")
    ? undefined
    : 1000;

  // Parse CSV flag
  const csvFlag = flags.find((f) => f.startsWith("--csv="));
  const csvPath = csvFlag
    ? csvFlag.split("=")[1]
    : flags.includes("--csv")
    ? undefined
    : null;

  // Handle cache refresh
  if (flags.includes("--refresh-cache")) {
    const cacheFile = join(__dirname, ".contact-cache.json");
    if (existsSync(cacheFile)) {
      unlinkSync(cacheFile);
      console.log("🗑️  Cleared contact cache");
    }
    console.log("🔄 Run your search again to rebuild the cache");
    return;
  }

  switch (command) {
    case COMMANDS.search: {
      const query = params[0];
      if (!query) {
        console.error("❌ Please provide a search query");
        process.exit(1);
      }

      console.log(`🔍 Searching for messages with "${query}"...`);
      const messages = await findMessagesByContact(query, {
        orderDesc: !flags.includes("--asc"),
        limit,
      });

      if (messages.length > 0) {
        // Print messages to console
        printMessages(messages);

        // Export to CSV if requested
        if (csvPath !== null) {
          exportMessagesToCSV(messages, { outputPath: csvPath });
        }
      }
      break;
    }

    case COMMANDS.contacts: {
      // Import dynamically to avoid circular dependencies
      const listContacts = require("./list-contacts").default;
      await listContacts();
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
}
