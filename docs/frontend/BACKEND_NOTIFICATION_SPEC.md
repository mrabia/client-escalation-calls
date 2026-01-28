# MOJAVOX Real-Time Notification System - Backend Specification

## Overview

This document provides the backend implementation specification for the MOJAVOX real-time notification system. The frontend UI components are already implemented and ready to connect to the backend WebSocket server.

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   Frontend      │◄──────────────────►│   Backend       │
│   (React)       │                    │   (Node.js)     │
│                 │                    │                 │
│ NotificationCenter.tsx               │   WebSocket     │
│ useNotifications hook                │   Server        │
│ NotificationProvider                 │                 │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │   Event Sources │
                                       │                 │
                                       │ - Call Service  │
                                       │ - Payment Svc   │
                                       │ - Agent Monitor │
                                       │ - Campaign Svc  │
                                       └─────────────────┘
```

## WebSocket Server Implementation

### 1. Server Setup (Node.js with ws library)

```typescript
// server/websocket/notification-server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../auth/jwt';

interface Client {
  ws: WebSocket;
  userId: string;
  subscriptions: Set<string>;
}

const clients = new Map<string, Client>();

export function createNotificationServer(server: http.Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/notifications'
  });

  wss.on('connection', async (ws, req) => {
    // Extract token from query string or headers
    const token = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('token');
    
    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    try {
      const user = await verifyToken(token);
      const clientId = `${user.id}-${Date.now()}`;
      
      clients.set(clientId, {
        ws,
        userId: user.id,
        subscriptions: new Set(['all']),
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
      }));

      ws.on('message', (data) => handleMessage(clientId, data));
      ws.on('close', () => clients.delete(clientId));
      ws.on('error', (error) => console.error('WebSocket error:', error));

    } catch (error) {
      ws.close(4002, 'Invalid token');
    }
  });

  return wss;
}
```

### 2. Message Protocol

#### Client → Server Messages

```typescript
// Subscribe to specific notification types
{
  "type": "subscribe",
  "channels": ["payment_received", "call_escalation", "agent_alert"]
}

// Unsubscribe from notification types
{
  "type": "unsubscribe",
  "channels": ["agent_alert"]
}

// Mark notification as read
{
  "type": "mark_read",
  "notificationId": "notif-123456"
}

// Request notification history
{
  "type": "get_history",
  "limit": 50,
  "offset": 0
}

// Ping for keepalive
{
  "type": "ping"
}
```

#### Server → Client Messages

```typescript
// New notification
{
  "type": "notification",
  "payload": {
    "id": "notif-123456-abc",
    "type": "payment_received",
    "title": "Payment Received",
    "message": "John Smith paid $2,450.00 on account #AC-2024-1234",
    "timestamp": "2026-01-27T20:30:00.000Z",
    "priority": "high",
    "data": {
      "amount": 2450,
      "accountId": "AC-2024-1234",
      "debtorName": "John Smith"
    },
    "actionUrl": "/payment-history"
  }
}

// Notification history response
{
  "type": "history",
  "notifications": [...],
  "total": 150,
  "hasMore": true
}

// Connection status
{
  "type": "connected",
  "clientId": "user123-1706388600000",
  "timestamp": "2026-01-27T20:30:00.000Z"
}

// Pong response
{
  "type": "pong",
  "timestamp": "2026-01-27T20:30:00.000Z"
}
```

### 3. Notification Types

| Type | Description | Priority | Trigger Source |
|------|-------------|----------|----------------|
| `payment_received` | Debtor made a payment | high | Payment Service |
| `call_completed` | AI agent completed a call | low | Call Service |
| `call_escalation` | AI agent requests supervisor | critical | Call Service |
| `agent_alert` | Agent performance issue | high | Agent Monitor |
| `campaign_milestone` | Campaign reached target % | medium | Campaign Service |
| `system_alert` | System warning/error | varies | System Monitor |
| `high_value_call` | High-value debtor on call | high | Call Service |

### 4. Database Schema

```sql
-- PostgreSQL schema for notifications

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  data JSONB,
  action_url VARCHAR(255),
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_created_at (created_at DESC),
  INDEX idx_notifications_unread (user_id, read) WHERE read = FALSE
);

CREATE TABLE notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  channel VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, channel)
);
```

### 5. Event Emitter Integration

```typescript
// server/services/notification-emitter.ts
import { EventEmitter } from 'events';

class NotificationEmitter extends EventEmitter {
  private static instance: NotificationEmitter;

  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationEmitter();
    }
    return this.instance;
  }

  emitPaymentReceived(data: {
    userId: string;
    amount: number;
    accountId: string;
    debtorName: string;
  }) {
    this.emit('notification', {
      userId: data.userId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `${data.debtorName} paid $${data.amount.toLocaleString()} on account #${data.accountId}`,
      priority: 'high',
      data,
      actionUrl: '/payment-history',
    });
  }

  emitCallEscalation(data: {
    supervisorId: string;
    agentId: string;
    debtorName: string;
    callId: string;
  }) {
    this.emit('notification', {
      userId: data.supervisorId,
      type: 'call_escalation',
      title: 'Call Escalation Required',
      message: `${data.agentId} requests supervisor intervention on call with ${data.debtorName}`,
      priority: 'critical',
      data,
      actionUrl: `/live-monitor?call=${data.callId}`,
    });
  }

  // Add more event emitters for other notification types...
}

export const notificationEmitter = NotificationEmitter.getInstance();
```

### 6. Push Notification Integration

```typescript
// server/services/push-notification.ts
import webpush from 'web-push';

// Configure VAPID keys (generate once and store securely)
webpush.setVapidDetails(
  'mailto:admin@mojavox.ai',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPushNotification(
  subscription: PushSubscription,
  notification: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, unknown>;
  }
) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(notification)
    );
  } catch (error) {
    if ((error as any).statusCode === 410) {
      // Subscription expired, remove from database
      await removePushSubscription(subscription.endpoint);
    }
    throw error;
  }
}
```

### 7. API Endpoints

```typescript
// server/routes/notifications.ts

// GET /api/notifications
// Returns paginated notification history
router.get('/notifications', authenticate, async (req, res) => {
  const { limit = 50, offset = 0, unreadOnly = false } = req.query;
  const notifications = await getNotifications(req.user.id, { limit, offset, unreadOnly });
  res.json(notifications);
});

// POST /api/notifications/:id/read
// Mark single notification as read
router.post('/notifications/:id/read', authenticate, async (req, res) => {
  await markAsRead(req.params.id, req.user.id);
  res.json({ success: true });
});

// POST /api/notifications/read-all
// Mark all notifications as read
router.post('/notifications/read-all', authenticate, async (req, res) => {
  await markAllAsRead(req.user.id);
  res.json({ success: true });
});

// DELETE /api/notifications/:id
// Delete a notification
router.delete('/notifications/:id', authenticate, async (req, res) => {
  await deleteNotification(req.params.id, req.user.id);
  res.json({ success: true });
});

// GET /api/notifications/settings
// Get user notification preferences
router.get('/notifications/settings', authenticate, async (req, res) => {
  const settings = await getNotificationSettings(req.user.id);
  res.json(settings);
});

// PUT /api/notifications/settings
// Update user notification preferences
router.put('/notifications/settings', authenticate, async (req, res) => {
  const settings = await updateNotificationSettings(req.user.id, req.body);
  res.json(settings);
});

// POST /api/notifications/push-subscription
// Register push notification subscription
router.post('/notifications/push-subscription', authenticate, async (req, res) => {
  await savePushSubscription(req.user.id, req.body);
  res.json({ success: true });
});
```

## Frontend Integration Points

### 1. WebSocket Connection

The frontend `NotificationProvider` component expects to connect to:

```
wss://your-domain.com/ws/notifications?token=JWT_TOKEN
```

### 2. Expected Message Format

The frontend expects notifications in this format:

```typescript
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, unknown>;
  actionUrl?: string;
}
```

### 3. Frontend Files to Update

When implementing the backend, update these frontend files:

1. **`NotificationCenter.tsx`**: Replace mock WebSocket connection with real connection
2. **`NotificationProvider`**: Update `connect()` and `disconnect()` methods
3. **Environment variables**: Add `VITE_WS_URL` for WebSocket server URL

## Security Considerations

1. **Authentication**: All WebSocket connections must be authenticated via JWT
2. **Authorization**: Users should only receive notifications meant for them
3. **Rate Limiting**: Implement rate limiting on notification creation
4. **Input Validation**: Validate all notification data before storing/sending
5. **XSS Prevention**: Sanitize notification content before displaying

## Testing

### Unit Tests

```typescript
describe('NotificationService', () => {
  it('should create notification', async () => {
    const notification = await createNotification({
      userId: 'user-123',
      type: 'payment_received',
      title: 'Payment Received',
      message: 'Test payment',
      priority: 'high',
    });
    expect(notification.id).toBeDefined();
  });

  it('should broadcast to connected clients', async () => {
    // Test WebSocket broadcasting
  });
});
```

### Integration Tests

```typescript
describe('WebSocket Notifications', () => {
  it('should connect with valid token', async () => {
    const ws = new WebSocket(`ws://localhost:3000/ws/notifications?token=${validToken}`);
    await waitForConnection(ws);
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it('should receive notifications', async () => {
    // Test notification delivery
  });
});
```

## Deployment Checklist

- [ ] Set up WebSocket server with proper load balancing (sticky sessions)
- [ ] Configure Redis for pub/sub across multiple server instances
- [ ] Generate and configure VAPID keys for push notifications
- [ ] Set up database tables and indexes
- [ ] Configure environment variables
- [ ] Implement monitoring and logging
- [ ] Set up notification cleanup job (delete old notifications)
- [ ] Test with frontend components

## Environment Variables

```env
# WebSocket
WS_PORT=3001
WS_PATH=/ws/notifications

# Push Notifications
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:admin@mojavox.ai

# Redis (for multi-instance pub/sub)
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mojavox
```

## Contact

For questions about the frontend implementation, refer to:
- `client/src/components/NotificationCenter.tsx`
- `client/src/components/layout/DashboardLayout.tsx`

---

*Document Version: 1.0*
*Last Updated: January 27, 2026*
*Frontend Status: ✅ Complete*
*Backend Status: ⏳ Pending Implementation*
