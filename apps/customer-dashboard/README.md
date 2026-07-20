# BazaarSentinel Customer Dashboard

Multi-tenant SaaS customer portal for marketplace listing monitoring.

## Development

From workspace root:

```bash
npm run dev -w apps/customer-dashboard
```

## Features

- **Authentication:** JWT + HttpOnly refresh cookie
- **Alarms:** Configure price drop/rise alerts
- **Bots:** Telegram/WhatsApp notifications
- **Notifications:** Web Push + in-app center
- **Subscription:** Plan management + billing

## PWA

- Installable via browser
- Offline caching (StaleWhileRevalidate)
- Push notifications
- Background sync for mutations