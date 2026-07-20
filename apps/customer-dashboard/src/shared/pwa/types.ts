export interface DeviceInfo {
  userAgent: string;
  platform: string;
  vendor: string;
  name?: string; // User-settable device name
}

export interface PushSubscriptionRecord {
  id: string; // UUID from backend
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceInfo: DeviceInfo;
  createdAt: number;
  lastSyncAt: number;
}