export interface LocalOutboxQueueItem {
  id: string;
  operation_id: string;
  command_type: string;
  entity_id: string;
  payload: string; // JSON string for SQLite storage
  client_sequence: number;
  status: 'PENDING' | 'PUSHED' | 'FAILED';
  retry_count: number;
  created_at: string;
}

export interface SyncFeedCursor {
  last_server_sequence: number;
  pulled_at: string;
}
