import { Database } from "better-sqlite3";
import { connectToIMessageDB } from "./db";
import nodeMacContacts from "node-mac-contacts";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { Message } from "./types";

// Cache contact mapping
const CACHE_FILE = join(__dirname, ".contact-cache.json");

console.log("🟡 [CACHE_PATH] Cache file location:", { CACHE_FILE });

let contactMapCache: Map<string, string> | null = null;

// Add at the top with other interfaces
interface CSVOptions {
  outputPath?: string;
  delimiter?: string;
}

/**
 * Build a mapping of phone numbers/emails to contact names
 */
async function getContactMap(): Promise<Map<string, string>> {
  // Try to load from cache first
  if (contactMapCache) {
    console.log("📱 Using in-memory contact cache");
    return contactMapCache;
  }

  if (existsSync(CACHE_FILE)) {
    try {
      console.log("📱 Loading contacts from cache file...");
      const cached = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
      if (Object.keys(cached).length > 0) {
        contactMapCache = new Map(Object.entries(cached));
        console.log(`✅ Loaded ${contactMapCache.size} contacts from cache`);
        return contactMapCache;
      } else {
        console.log("⚠️ Cache file exists but is empty, rebuilding...");
      }
    } catch (error) {
      console.log("⚠️ Failed to load contact cache:", error);
    }
  }

  console.log("📱 Building fresh contact mapping...");

  // Build fresh mapping
  const authStatus = await nodeMacContacts.getAuthStatus();
  if (authStatus !== "Authorized") {
    const granted = await nodeMacContacts.requestAccess();
    if (!granted) {
      throw new Error("Access to Contacts was denied");
    }
  }

  nodeMacContacts.listener.setup();
  const macContacts = await nodeMacContacts.getAllContacts();
  const contactMap = new Map<string, string>();

  console.log(`📱 Processing ${macContacts.length} contacts...`);

  // Debug: Log contacts that might be Doug
  console.log("\n🔍 Contacts containing 'Doug' or 'Saf':");
  macContacts.forEach((contact) => {
    const fullName =
      contact.fullName ||
      (contact.givenName && contact.familyName
        ? `${contact.givenName} ${contact.familyName}`
        : undefined);
    if (
      fullName?.toLowerCase().includes("doug") ||
      fullName?.toLowerCase().includes("saf")
    ) {
      console.log("Found potential match:", {
        fullName,
        givenName: contact.givenName,
        familyName: contact.familyName,
        phones: contact.phoneNumbers,
        emails: contact.emailAddresses,
      });
    }
  });

  let skippedNoName = 0;
  let processedPhones = 0;
  let processedEmails = 0;

  macContacts.forEach((contact) => {
    // Try all possible name fields
    const displayName =
      contact.fullName ||
      (contact.givenName && contact.familyName
        ? `${contact.givenName} ${contact.familyName}`
        : undefined) ||
      contact.givenName ||
      contact.familyName ||
      // Try additional fields that might contain the name
      (contact as any).name ||
      (contact as any).firstName ||
      (contact as any).lastName ||
      (contact as any).nickname ||
      (contact as any).displayName;

    if (!displayName) {
      skippedNoName++;
      return;
    }

    contact.phoneNumbers?.forEach((phone) => {
      const normalized = phone.replace(/\D/g, "");
      if (normalized.length >= 10) {
        processedPhones++;
        const formats = [
          `+${normalized}`,
          normalized,
          `+1${normalized}`,
          normalized.length === 10 ? `+1${normalized}` : null,
        ].filter(Boolean);

        formats.forEach((format) => {
          contactMap.set(format!, displayName);
        });
      }
    });

    contact.emailAddresses?.forEach((email) => {
      processedEmails++;
      contactMap.set(email.toLowerCase(), displayName);
    });
  });

  nodeMacContacts.listener.remove();

  console.log(`📊 Contact processing stats:`, {
    total: macContacts.length,
    skippedNoName,
    processedPhones,
    processedEmails,
    mappings: contactMap.size,
  });

  // Cache the mapping if we have data
  if (contactMap.size > 0) {
    try {
      const cacheData = Object.fromEntries(contactMap);
      writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
      console.log(`✅ Cached ${contactMap.size} contacts to disk`);
    } catch (error) {
      console.log("⚠️ Failed to cache contacts:", error);
    }
  } else {
    console.log("⚠️ No contacts to cache");
  }

  contactMapCache = contactMap;
  return contactMap;
}

/**
 * Find all messages exchanged with a contact by their name or phone/email
 */
export async function findMessagesByContact(
  query: string,
  options: {
    limit?: number;
    includeAttachments?: boolean;
    orderDesc?: boolean;
  } = {}
): Promise<Message[]> {
  const db = connectToIMessageDB();
  const { includeAttachments = true, orderDesc = true, limit } = options;

  try {
    const contactMap = await getContactMap();
    console.log(`✅ Loaded ${contactMap.size} contact mappings`);

    // First try to find by name
    const matchingHandles = Array.from(contactMap.entries())
      .filter(([id, name]) => {
        const searchQuery = query.toLowerCase();
        const contactName = name.toLowerCase();

        // Debug log contact info
        if (
          name.toLowerCase().includes("doug") ||
          name.toLowerCase().includes("saf")
        ) {
          console.log("🔍 Checking contact:", {
            id,
            name,
            searchQuery,
            contactName,
          });
        }

        // If searching by phone number
        if (query.match(/^\+?\d+$/)) {
          // Normalize both the search query and the contact ID for comparison
          const normalizedQuery = query.replace(/\D/g, "");
          const normalizedId = id.replace(/\D/g, "");
          return (
            normalizedId.endsWith(normalizedQuery) ||
            normalizedId === normalizedQuery
          );
        }

        // If searching by email
        if (query.includes("@")) {
          return id.toLowerCase() === searchQuery;
        }

        // Otherwise search by name
        const isMatch =
          contactName === searchQuery || // Exact match
          contactName.split(/\s+/).includes(searchQuery) || // Full word match
          contactName.includes(searchQuery); // Partial match

        // Debug log matches
        if (isMatch) {
          console.log("✅ Found match:", { id, name, searchQuery });
        }

        return isMatch;
      })
      .map(([id]) => id);

    // If no name matches, try direct phone/email match
    if (matchingHandles.length === 0) {
      console.log("⚠️ No name matches, trying direct ID match...");

      // Normalize phone number for search
      const normalizedQuery = query.replace(/\D/g, "");
      const phonePatterns = [
        query, // Original format
        normalizedQuery, // Just numbers
        `+${normalizedQuery}`, // With plus
        normalizedQuery.length === 10 ? `+1${normalizedQuery}` : null, // With country code
      ].filter(Boolean);

      const handles = db
        .prepare(
          `
        SELECT DISTINCT id 
        FROM handle 
        WHERE id IN (${phonePatterns.map(() => "?").join(",")})
      `
        )
        .all(phonePatterns) as { id: string }[];

      if (handles.length === 0) {
        console.log(`❌ No contacts found matching "${query}"`);
        return [];
      }
      handles.forEach((h) => matchingHandles.push(h.id));
    }

    if (matchingHandles.length === 0) {
      console.log(`❌ No contacts found matching "${query}"`);
      return [];
    }

    // Show matching contacts and ask for confirmation
    console.log(`\n📱 Found ${matchingHandles.length} matching contacts:`);
    matchingHandles.forEach((id) => {
      const name = contactMap.get(id);
      console.log(`   ${name ? `${name} (${id})` : id}`);
    });
    console.log("\nℹ️  If these aren't the contacts you're looking for, try:");
    console.log("   1. Using a more specific name");
    console.log("   2. Using the full phone number");
    console.log("   3. Using --refresh-cache to rebuild contacts\n");

    // Get messages for matching handles
    const messages = db
      .prepare(
        `
      SELECT 
        message.ROWID as id,
        message.text,
        datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') as date,
        message.is_from_me as isFromMe,
        message.service,
        chat.display_name as groupName,
        ${
          includeAttachments
            ? `
        GROUP_CONCAT(attachment.filename, '|') as attachments,
        `
            : ""
        }
        handle.id as contact_id
      FROM message
      JOIN handle ON handle.ROWID = message.handle_id
      LEFT JOIN chat_message_join ON chat_message_join.message_id = message.ROWID
      LEFT JOIN chat ON chat.ROWID = chat_message_join.chat_id
      ${
        includeAttachments
          ? `
      LEFT JOIN message_attachment_join ON message_attachment_join.message_id = message.ROWID
      LEFT JOIN attachment ON attachment.ROWID = message_attachment_join.attachment_id
      `
          : ""
      }
      WHERE handle.id IN (${matchingHandles.map((h) => `'${h}'`).join(",")})
      GROUP BY message.ROWID
      ORDER BY message.date ${orderDesc ? "DESC" : "ASC"}
      ${typeof limit === "number" ? "LIMIT ?" : ""}
    `
      )
      .all(typeof limit === "number" ? [limit] : []) as any[];

    if (messages.length > 0) {
      console.log(`✅ Found ${messages.length} messages\n`);
    } else {
      console.log("❌ No messages found with these contacts\n");
    }

    return messages.map((msg) => ({
      ...msg,
      attachments: msg.attachments
        ? msg.attachments.split("|").filter(Boolean)
        : undefined,
      groupName: msg.groupName || undefined,
      contactName: contactMap.get(msg.contact_id),
    }));
  } finally {
    db.close();
  }
}

/**
 * Print messages in a readable format
 */
export function printMessages(messages: Message[]): void {
  messages.forEach((msg, i) => {
    const direction = msg.isFromMe ? "→" : "←";
    const date = new Date(msg.date).toLocaleString();
    const sender = msg.isFromMe ? "You" : msg.contactName || msg.contact_id;

    console.log(
      `\n${i + 1}. [${date}] ${sender} ${direction} ${
        msg.groupName ? `(${msg.groupName})` : ""
      }`
    );
    if (msg.text) {
      console.log(`   ${msg.text}`);
    }
    if (msg.attachments?.length) {
      console.log(`   📎 Attachments: ${msg.attachments.length}`);
    }
  });

  // Print summary
  console.log(`\n📊 Summary:`);
  console.log(`Total messages: ${messages.length}`);
  console.log(`From you: ${messages.filter((m) => m.isFromMe).length}`);
  console.log(`From them: ${messages.filter((m) => !m.isFromMe).length}`);
  if (messages.some((m) => m.attachments?.length)) {
    console.log(
      `Messages with attachments: ${
        messages.filter((m) => m.attachments?.length).length
      }`
    );
  }
}

export function exportMessagesToCSV(
  messages: Message[],
  options: CSVOptions = {}
): string {
  const {
    outputPath = `messages-${new Date().toISOString().split("T")[0]}.csv`,
    delimiter = ",",
  } = options;

  // Define CSV columns
  const headers = [
    "Date",
    "Direction",
    "Sender",
    "Recipient",
    "Message",
    "Has Attachments",
    "Group Chat",
    "Service",
  ];

  // Convert messages to CSV rows
  const rows = messages.map((msg) => [
    new Date(msg.date).toISOString(), // Date
    msg.isFromMe ? "Sent" : "Received", // Direction
    msg.isFromMe ? "You" : msg.contactName || msg.contact_id, // Sender
    msg.isFromMe ? msg.contactName || msg.contact_id : "You", // Recipient
    // Escape quotes and newlines in message text
    msg.text ? `"${msg.text.replace(/"/g, '""').replace(/\n/g, " ")}"` : "", // Message
    msg.attachments?.length ? "Yes" : "No", // Has Attachments
    msg.groupName || "", // Group Chat
    msg.service, // Service
  ]);

  // Combine headers and rows
  const csv = [
    headers.join(delimiter),
    ...rows.map((row) => row.join(delimiter)),
  ].join("\n");

  // Write to file if outputPath is provided
  if (outputPath) {
    writeFileSync(outputPath, csv);
    console.log(`\n💾 Exported ${messages.length} messages to ${outputPath}`);
  }

  return csv;
}
