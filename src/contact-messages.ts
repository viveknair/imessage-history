import { Database } from "sqlite3";
import { Message, Handle, MessageRow } from "./types";
import { connectToIMessageDB } from "./db";

interface ContactSearchOptions {
  searchByPhone?: boolean;
  searchByEmail?: boolean;
  caseSensitive?: boolean;
  includeGroupChats?: boolean;
}

interface MessageWithMetadata extends Message {
  attachments?: string[];
  groupName?: string;
}

// Enhanced contact search with multiple criteria
async function findContact(
  db: Database,
  searchTerm: string,
  options: ContactSearchOptions = {}
): Promise<Handle[]> {
  const {
    searchByPhone = true,
    searchByEmail = true,
    caseSensitive = false,
    includeGroupChats = false,
  } = options;

  return new Promise((resolve, reject) => {
    const whereClauses = [];
    const params = [];

    // Build search conditions
    if (searchByPhone) {
      whereClauses.push(`handle.id LIKE ?`);
      params.push(`%${searchTerm}%`);
    }
    if (searchByEmail) {
      whereClauses.push(`handle.id LIKE ?`);
      params.push(`%${searchTerm}@%`);
    }
    if (includeGroupChats) {
      whereClauses.push(`chat.display_name LIKE ?`);
      params.push(`%${searchTerm}%`);
    }

    const whereClause = whereClauses.join(" OR ");
    const caseModifier = caseSensitive ? "" : "COLLATE NOCASE";

    db.all(
      `
      SELECT DISTINCT
        handle.ROWID as id,
        handle.id as contact_id,
        handle.service,
        chat.display_name as group_name
      FROM handle
      LEFT JOIN chat_handle_join ON chat_handle_join.handle_id = handle.ROWID
      LEFT JOIN chat ON chat.ROWID = chat_handle_join.chat_id
      WHERE (${whereClause}) ${caseModifier}
      ORDER BY handle.id
    `,
      params,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Handle[]);
      }
    );
  });
}

// Get total message count for a contact
async function getMessageCount(
  db: Database,
  contactId: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT COUNT(*) as count
      FROM message 
      JOIN handle ON message.handle_id = handle.ROWID
      WHERE handle.id = ?
    `,
      [contactId],
      (err, row: { count: number }) => {
        if (err) reject(err);
        else resolve(row.count);
      }
    );
  });
}

// Get messages with pagination and attachments
async function getMessagesWithMetadata(
  db: Database,
  contactId: string,
  offset = 0,
  limit = 50
): Promise<MessageWithMetadata[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        message.ROWID as id,
        message.guid,
        message.text,
        message.handle_id,
        message.service,
        datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') as formatted_date,
        message.date,
        message.is_from_me,
        message.cache_roomnames,
        handle.id as contact_identifier,
        chat.display_name as group_name,
        GROUP_CONCAT(attachment.filename, '|') as attachments
      FROM message 
      JOIN handle ON message.handle_id = handle.ROWID
      LEFT JOIN message_attachment_join ON message_attachment_join.message_id = message.ROWID
      LEFT JOIN attachment ON attachment.ROWID = message_attachment_join.attachment_id
      LEFT JOIN chat_message_join ON chat_message_join.message_id = message.ROWID
      LEFT JOIN chat ON chat.ROWID = chat_message_join.chat_id
      WHERE handle.id = ?
      GROUP BY message.ROWID
      ORDER BY message.date DESC
      LIMIT ? OFFSET ?
    `,
      [contactId, limit, offset],
      (err, rows: MessageRow[]) => {
        if (err) reject(err);
        else {
          const messages = rows.map((row) => ({
            ...row,
            attachments: row.attachments
              ? row.attachments.split("|").filter(Boolean)
              : [],
            groupName: row.group_name,
          }));
          resolve(messages as MessageWithMetadata[]);
        }
      }
    );
  });
}

// Main function to enumerate all messages
async function enumerateAllMessages(
  searchTerm: string,
  options: ContactSearchOptions = {}
) {
  const db = await connectToIMessageDB();

  try {
    // Find matching contacts
    console.log(`🔍 Searching for contacts matching: "${searchTerm}"...`);
    const contacts = await findContact(db, searchTerm, options);

    if (contacts.length === 0) {
      console.log("❌ No matching contacts found");
      return;
    }

    console.log(`✅ Found ${contacts.length} matching contacts:`);
    contacts.forEach((contact) => {
      console.log(
        `- ${contact.contact_id}${
          contact.group_name ? ` (Group: ${contact.group_name})` : ""
        }`
      );
    });

    // Process each contact
    for (const contact of contacts) {
      console.log(`\n📱 Processing messages for: ${contact.contact_id}`);

      const totalMessages = await getMessageCount(db, contact.contact_id);
      console.log(`📊 Total messages: ${totalMessages}`);

      const BATCH_SIZE = 50;
      let processedMessages = 0;

      // Process messages in batches
      while (processedMessages < totalMessages) {
        const messages = await getMessagesWithMetadata(
          db,
          contact.contact_id,
          processedMessages,
          BATCH_SIZE
        );

        messages.forEach((msg) => {
          const direction = msg.is_from_me ? "→" : "←";
          const attachmentInfo = msg.attachments?.length
            ? ` [${msg.attachments.length} attachment(s)]`
            : "";
          const groupInfo = msg.groupName ? ` (in ${msg.groupName})` : "";

          console.log(
            `${msg.formatted_date} ${direction}${groupInfo}: ${
              msg.text || "[media message]"
            }${attachmentInfo}`
          );
        });

        processedMessages += messages.length;
        if (messages.length < BATCH_SIZE) break; // Handle case where total count might be off

        console.log(`Progress: ${processedMessages}/${totalMessages} messages`);
      }
    }
  } finally {
    db.close();
  }
}

// Example usage
if (require.main === module) {
  const searchTerm = process.argv[2] || "Nandika";
  const options: ContactSearchOptions = {
    searchByPhone: true,
    searchByEmail: true,
    caseSensitive: false,
    includeGroupChats: true,
  };

  enumerateAllMessages(searchTerm, options).catch(console.error);
}
