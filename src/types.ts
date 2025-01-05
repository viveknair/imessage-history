export interface Message {
  id: number;
  guid: string;
  text: string | null;
  handle_id: number;
  service: string;
  date: number;
  is_from_me: boolean;
  isFromMe?: boolean;
  cache_roomnames: string | null;
  contact_id: string;
  contactName?: string;
  groupName?: string;
  attachments?: string[];
}

export interface Handle {
  id: number;
  guid: string;
  service: string;
  contact_id?: string;
  group_name?: string;
}

export interface Chat {
  guid: string;
  chat_identifier: string;
  display_name: string | null;
  service_name: string;
}

export interface MessageWithMetadata extends Message {
  formatted_date: string;
}

export interface MessageRow {
  id: number;
  guid: string;
  text: string | null;
  handle_id: number | null;
  service: string;
  date: number;
  formatted_date: string;
  is_from_me: number;
  cache_roomnames: string | null;
  contact_id?: string;
  group_name?: string;
  attachments?: string;
}
