export interface Message {
  id: number;
  guid: string;
  text: string | null;
  handle_id: number | null;
  service: string;
  date: number;
  formatted_date: string;
  is_from_me: number;
  cache_roomnames: string | null;
  contact_identifier?: string;
  attachments?: string[];
  groupName?: string;
}

export interface Handle {
  id: number;
  contact_id: string;
  service: string;
  group_name?: string;
}

export interface Chat {
  guid: string;
  chat_identifier: string;
  display_name: string | null;
  service_name: string;
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
  contact_identifier?: string;
  group_name?: string;
  attachments?: string;
}
