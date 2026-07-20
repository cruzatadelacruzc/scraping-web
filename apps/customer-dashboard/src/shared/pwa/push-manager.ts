export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushManager {
  private vapidPublicKey: string | null = null;

  async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKey) return this.vapidPublicKey;
    const response = await fetch('/api/push/vapid-public-key');
    this.vapidPublicKey = await response.text();
    return this.vapidPublicKey;
  }

  async subscribe(): Promise<PushSubscriptionData | null> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') return null;

    const vapidKey = await this.getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(vapidKey),
    });

    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.bufferToBase64(subscription.getKey('p256dh')),
        auth: this.bufferToBase64(subscription.getKey('auth')),
      },
    };

    await this.sendSubscriptionToServer(subscriptionData);
    return subscriptionData;
  }

  async unsubscribe(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    // Backend will receive the unsubscribe via pushsubscriptionremoved event
  }

  async getSubscription(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }

  async renewSubscriptionIfNeeded(): Promise<boolean> {
    const subscription = await this.getSubscription();
    if (!subscription) return false;

    const expiry = subscription.expirationTime;
    if (expiry && Date.now() > new Date(expiry).getTime() - 24 * 60 * 60 * 1000) {
      await this.unsubscribe();
      await this.subscribe();
      return true;
    }
    return false;
  }

  private async requestPermission(): Promise<NotificationPermission> {
    const current = Notification.permission;
    if (current !== 'default') return current as NotificationPermission;

    return Notification.requestPermission();
  }

  private async sendSubscriptionToServer(data: PushSubscriptionData): Promise<void> {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  private bufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const arr = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      arr[i] = rawData.charCodeAt(i);
    }
    return arr;
  }
}