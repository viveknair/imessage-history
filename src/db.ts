import Database from "better-sqlite3";
import { homedir } from "os";
import { join } from "path";

const IMESSAGE_DB_PATH = join(homedir(), "Library/Messages/chat.db");

export function connectToIMessageDB() {
  try {
    return new Database(IMESSAGE_DB_PATH, { readonly: true });
  } catch (error) {
    console.error("Failed to connect to iMessage database:", error);
    throw error;
  }
}
