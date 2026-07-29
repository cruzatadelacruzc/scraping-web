import type { PushSubscriptionRecord } from './types';

export interface OutboxItem {
  id: string;
  tag: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  idempotencyKey: string;
}

// IndexedDB operations will be implemented in Phase 1
// For now, export placeholder functions to satisfy TypeScript

export async function enqueueMutation(_tag: string, _payload: unknown): Promise<void> {
  // Placeholder - will use idb in Phase 1
}

export async function getOutbox(): Promise<OutboxItem[]> {
  return [];
}

export async function removeOutboxItem(_id: string): Promise<void> {
  // Placeholder
}

export async function savePushSubscription(_record: PushSubscriptionRecord): Promise<void> {
  // Placeholder
}

export async function getPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  return [];
}

export async function removePushSubscription(_id: string): Promise<void> {
  // Placeholder
}
