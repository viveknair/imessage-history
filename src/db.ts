import Database from "better-sqlite3";
import { homedir } from "os";
import { join } from "path";

const IMESSAGE_DB_PATH = join(homedir(), "Library/Messages/chat.db");

export function connectToIMessageDB() {
  console.log("📱 Attempting to connect to iMessage database...");
  console.log("📍 Database path:", IMESSAGE_DB_PATH);

  try {
    const db = new Database(IMESSAGE_DB_PATH, { readonly: true });
    console.log("✅ Successfully connected to database");
    return db;
  } catch (error) {
    console.error("Failed to connect to iMessage database:", error);
    throw error;
  }
}
