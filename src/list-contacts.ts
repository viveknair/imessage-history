import { Database } from "better-sqlite3";
import { connectToIMessageDB } from "./db";
import nodeMacContacts from "node-mac-contacts";

interface ContactInfo {
  id: string;
  service: string;
  messageCount: number;
  firstMessage: string;
  lastMessage: string;
  lastInteraction: string;
  groupChats: string[];
  displayName?: string;
}

async function lookupContactNames(
  contacts: ContactInfo[]
): Promise<ContactInfo[]> {
  try {
    // First check authorization
    const authStatus = await nodeMacContacts.getAuthStatus();
    console.log("✅ [CONTACTS] Current authorization status:", authStatus);

    if (authStatus !== "Authorized") {
      console.log("🔐 [CONTACTS] Requesting access to Contacts...");
      const granted = await nodeMacContacts.requestAccess();
      if (!granted) {
        console.log("❌ [CONTACTS] Access to Contacts was denied");
        return contacts;
      }
      console.log("✅ [CONTACTS] Access to Contacts was granted");
    }

    // Set up the contacts listener
    nodeMacContacts.listener.setup();

    // Get all contacts
    const macContacts = await nodeMacContacts.getAllContacts();
    console.log("❤️ [CONTACTS] Retrieved contacts from macOS", {
      contactCount: macContacts.length,
    });

    // Debug: Log the first few contacts to see their structure
    console.log("\n🔍 [DEBUG] First 5 Mac contacts structure:");
    macContacts.slice(0, 5).forEach((contact, i) => {
      console.log(`Contact ${i + 1}:`, JSON.stringify(contact, null, 2));
    });

    // Debug: Log sample iMessage contacts
    console.log("\n🔍 [DEBUG] Sample iMessage contacts:");
    contacts.slice(0, 5).forEach((contact, i) => {
      console.log(`${i + 1}. ID: "${contact.id}", Service: ${contact.service}`);
    });

    const contactMap = new Map<string, string>();
    let skippedNoName = 0;
    let processedPhones = 0;
    let processedEmails = 0;

    // Build a map of phone/email to display name
    macContacts.forEach((contact) => {
      // Try all possible name fields
      const displayName =
        contact.fullName ||
        (contact.givenName && contact.familyName
          ? `${contact.givenName} ${contact.familyName}`
          : undefined) ||
        contact.givenName ||
        contact.familyName ||
        // Try accessing potential raw fields
        (contact as any).name ||
        (contact as any).firstName ||
        (contact as any).lastName ||
        (contact as any).displayName;

      if (!displayName) {
        skippedNoName++;
        return; // Skip contacts without names
      }

      // Debug: Log successful name extraction
      console.log(`✅ [NAME] Found name "${displayName}" for contact with:`, {
        phones: contact.phoneNumbers,
        emails: contact.emailAddresses,
      });

      contact.phoneNumbers?.forEach((phone) => {
        // Normalize phone number to match iMessage format
        const normalized = phone.replace(/\D/g, "");
        if (normalized.length >= 10) {
          processedPhones++;
          // Try different formats since iMessage can use various ones
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

    // Debug logging for the contact mapping
    console.log("\n📊 [DEBUG] Contact processing stats:", {
      totalMacContacts: macContacts.length,
      skippedNoName,
      processedPhones,
      processedEmails,
      uniqueMappings: contactMap.size,
    });

    console.log("\n🔍 [DEBUG] First 5 contact mappings:");
    let count = 0;
    for (const [id, name] of contactMap.entries()) {
      if (count++ < 5) {
        console.log(`   "${id}" -> "${name}"`);
      }
    }

    // Look up names for our iMessage contacts
    const mappedContacts = contacts.map((contact) => {
      const displayName = contactMap.get(contact.id);
      if (displayName) {
        console.log(
          `✅ [MATCH] Found name for "${contact.id}": "${displayName}"`
        );
      } else {
        // Debug: Log failed matches
        console.log(`❌ [NO MATCH] Could not find name for "${contact.id}"`);
      }
      return {
        ...contact,
        displayName: displayName || undefined,
      };
    });

    // Debug logging for matches
    const matchCount = mappedContacts.filter((c) => c.displayName).length;
    console.log(`\n📊 [CONTACTS] Mapping stats:`, {
      totalContacts: contacts.length,
      matchedNames: matchCount,
      matchRate: `${((matchCount / contacts.length) * 100).toFixed(1)}%`,
    });

    return mappedContacts;
  } catch (error) {
    console.error("❌ [CONTACTS] Failed to access Contacts:", error);
    return contacts;
  }
}

async function getAllContacts(db: Database): Promise<ContactInfo[]> {
  const rows = db
    .prepare(
      `
    WITH contact_stats AS (
      SELECT 
        handle.id as contact_id,
        handle.service,
        COUNT(DISTINCT message.ROWID) as message_count,
        MIN(datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime')) as first_message,
        MAX(datetime(message.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime')) as last_message,
        GROUP_CONCAT(DISTINCT chat.display_name) as group_chats
      FROM handle
      LEFT JOIN message ON message.handle_id = handle.ROWID
      LEFT JOIN chat_handle_join ON chat_handle_join.handle_id = handle.ROWID
      LEFT JOIN chat ON chat.ROWID = chat_handle_join.chat_id
      GROUP BY handle.id, handle.service
      HAVING message_count > 0
      ORDER BY last_message DESC
    )
    SELECT 
      contact_id as id,
      service,
      message_count as messageCount,
      first_message as firstMessage,
      last_message as lastMessage,
      last_message as lastInteraction,
      group_chats as groupChats
    FROM contact_stats
  `
    )
    .all() as any[];

  return rows.map((row) => ({
    ...row,
    groupChats: row.groupChats ? row.groupChats.split(",").filter(Boolean) : [],
  }));
}

async function listAllContacts() {
  const db = await connectToIMessageDB();

  try {
    console.log("📱 Fetching all contacts...\n");
    let contacts = await getAllContacts(db);

    // Look up contact names
    contacts = await lookupContactNames(contacts);

    console.log(`✅ Found ${contacts.length} contacts with message history:\n`);

    // Print contact information in a structured way
    // contacts.forEach((contact, index) => {
    //   const displayInfo = contact.displayName
    //     ? `${contact.displayName} (${contact.id})`
    //     : contact.id;

    //   console.log(`${index + 1}. ${displayInfo} - ${contact.service}`);
    //   console.log(`   Messages: ${contact.messageCount}`);
    //   console.log(`   First interaction: ${contact.firstMessage}`);
    //   console.log(`   Last interaction: ${contact.lastMessage}`);
    //   if (contact.groupChats.length > 0) {
    //     console.log(`   Group chats: ${contact.groupChats.join(", ")}`);
    //   }
    //   console.log(""); // Empty line for readability
    // });

    // Print some statistics
    // const totalMessages = contacts.reduce(
    //   (sum, contact) => sum + contact.messageCount,
    //   0
    // );
    // const iMessageContacts = contacts.filter(
    //   (c) => c.service === "iMessage"
    // ).length;
    // const smsContacts = contacts.filter((c) => c.service === "SMS").length;
    // const namedContacts = contacts.filter((c) => c.displayName).length;

    // console.log("\n📊 Statistics:");
    // console.log(`Total contacts: ${contacts.length}`);
    // console.log(`Contacts with names: ${namedContacts}`);
    // console.log(`Total messages: ${totalMessages}`);
    // console.log(`iMessage contacts: ${iMessageContacts}`);
    // console.log(`SMS contacts: ${smsContacts}`);
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  listAllContacts().catch(console.error);
}
