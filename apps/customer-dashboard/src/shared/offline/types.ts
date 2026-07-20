export interface DeviceInfo {
  userAgent: string;
  platform: string;
  vendor: string;
  name?: string;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceInfo: DeviceInfo;
  createdAt: number;
  lastSyncAt: number;
}