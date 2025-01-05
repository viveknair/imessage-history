import {
  findMessagesByContact,
  printMessages,
  exportMessagesToCSV,
} from "./message-search";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((arg) => arg.startsWith("--"));
  const searchName = args.find((arg) => !arg.startsWith("--"));

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

  // Check for --refresh-cache flag
  if (flags.includes("--refresh-cache")) {
    const cacheFile = join(__dirname, ".contact-cache.json");
    if (existsSync(cacheFile)) {
      unlinkSync(cacheFile);
      console.log("🗑️  Cleared contact cache");
    }
    console.log("🔄 Run your search again to rebuild the cache");
    return;
  }

  if (!searchName) {
    console.error("❌ Please provide a name to search for");
    console.error('Usage: npx tsx src/find-messages.ts "Name" [options]');
    console.error("Options:");
    console.error("  --asc           Sort messages oldest first");
    console.error("  --limit=N       Limit to N messages (default: 1000)");
    console.error("  --no-limit      Show all messages");
    console.error("  --csv[=path]    Export messages to CSV (optional path)");
    console.error("  --refresh-cache Clear contact cache");
    process.exit(1);
  }

  console.log(`🔍 Searching for messages with "${searchName}"...`);
  const messages = await findMessagesByContact(searchName, {
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
}

if (require.main === module) {
  main().catch(console.error);
}
