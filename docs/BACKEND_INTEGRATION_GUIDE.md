# Guide d'Intégration Backend-Frontend MOJAVOX

**Version:** 1.0  
**Date:** 27 Janvier 2026  
**Auteur:** Manus AI  

---

## Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Architecture Actuelle](#2-architecture-actuelle)
3. [Mapping Frontend-Backend](#3-mapping-frontend-backend)
4. [Endpoints API Requis](#4-endpoints-api-requis)
5. [Modèles de Données](#5-modèles-de-données)
6. [Services à Implémenter](#6-services-à-implémenter)
7. [WebSocket Events](#7-websocket-events)
8. [Authentification](#8-authentification)
9. [Configuration CORS](#9-configuration-cors)
10. [Variables d'Environnement](#10-variables-denvironnement)
11. [Tests d'Intégration](#11-tests-dintégration)

---

## 1. Vue d'Ensemble

Ce guide détaille l'intégration entre le frontend MOJAVOX (React/TypeScript) et le backend Node.js/Express existant. Le frontend utilise actuellement des données mockées dans `/client/src/lib/mockData.ts` qui doivent être remplacées par des appels API réels.

### Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Vite |
| Backend | Node.js, Express, TypeScript |
| Base de données | PostgreSQL |
| Cache | Redis |
| File d'attente | RabbitMQ (optionnel) |
| Authentification | JWT |
| Communication temps réel | Socket.IO |

---

## 2. Architecture Actuelle

### Structure Backend Existante

```
src/
├── routes/
│   ├── index.ts          # Routes principales
│   ├── auth.routes.ts    # Authentification
│   ├── customers.routes.ts # Gestion clients/débiteurs
│   ├── campaigns.routes.ts # Campagnes
│   ├── tasks.routes.ts   # Tâches
│   ├── agents.routes.ts  # Agents IA
│   ├── payments.routes.ts # Paiements
│   └── twilio.routes.ts  # Intégration Twilio
├── services/
│   ├── auth/             # Services d'authentification
│   ├── llm/              # Services LLM/IA
│   ├── email/            # Services email
│   └── compliance/       # Services conformité
└── core/
    └── services/
        ├── database.ts   # Service PostgreSQL
        └── redis.ts      # Service Redis
```

### Structure Frontend

```
client/
├── src/
│   ├── pages/           # 45+ pages React
│   ├── components/      # Composants réutilisables
│   ├── lib/
│   │   └── mockData.ts  # Données mockées à remplacer
│   └── contexts/        # Contextes React (Auth, Theme)
```

---

## 3. Mapping Frontend-Backend

### Correspondance des Entités

| Frontend (mockData) | Backend (DB Table) | Route API Existante |
|---------------------|-------------------|---------------------|
| `mockDebtors` | `customers` | `/api/v1/customers` |
| `mockCampaigns` | `campaigns` | `/api/v1/campaigns` |
| `mockAgents` | `agents` | `/api/v1/agents` |
| `mockLiveCalls` | `contact_attempts` | À créer |
| `mockRecordings` | `contact_attempts` | À créer |
| `mockUsers` | `users` | `/api/v1/auth` |
| `mockNotifications` | À créer | À créer |
| `mockReports` | À créer | À créer |

---

## 4. Endpoints API Requis

### 4.1 Endpoints Existants (à vérifier/étendre)

#### Authentification (`/api/v1/auth`)
```typescript
POST /api/v1/auth/login          // ✅ Existe
POST /api/v1/auth/logout         // ✅ Existe
POST /api/v1/auth/refresh        // ✅ Existe
GET  /api/v1/auth/me             // ✅ Existe
```

#### Clients/Débiteurs (`/api/v1/customers`)
```typescript
GET    /api/v1/customers              // ✅ Existe - Liste paginée
GET    /api/v1/customers/:id          // ✅ Existe - Détail
POST   /api/v1/customers              // ✅ Existe - Création
PUT    /api/v1/customers/:id          // ✅ Existe - Mise à jour
DELETE /api/v1/customers/:id          // ✅ Existe - Suppression
GET    /api/v1/customers/:id/payments // ✅ Existe - Historique paiements
GET    /api/v1/customers/:id/campaigns // ✅ Existe - Campagnes associées
```

#### Campagnes (`/api/v1/campaigns`)
```typescript
GET    /api/v1/campaigns              // ✅ Existe
GET    /api/v1/campaigns/:id          // ✅ Existe
POST   /api/v1/campaigns              // ✅ Existe
PUT    /api/v1/campaigns/:id          // ✅ Existe
DELETE /api/v1/campaigns/:id          // ✅ Existe
```

#### Agents IA (`/api/v1/agents`)
```typescript
GET    /api/v1/agents                 // ✅ Existe
GET    /api/v1/agents/:id             // ✅ Existe
POST   /api/v1/agents                 // ✅ Existe
PUT    /api/v1/agents/:id             // ✅ Existe
DELETE /api/v1/agents/:id             // ✅ Existe
```

### 4.2 Nouveaux Endpoints à Créer

#### Dashboard (`/api/v1/dashboard`)
```typescript
GET /api/v1/dashboard/kpis
// Response:
{
  totalRecovered: number,
  totalRecoveredChange: number,
  activeAgents: number,
  totalAgents: number,
  callsToday: number,
  callsTodayChange: number,
  avgCallDuration: number,
  successRate: number,
  successRateChange: number,
  pendingApprovals: number,
  activeCampaigns: number
}

GET /api/v1/dashboard/recovery-performance?period=7d|30d|90d
// Response:
[
  { date: string, recovered: number, calls: number, successRate: number }
]

GET /api/v1/dashboard/fleet-status
// Response:
{ online: number, busy: number, offline: number, total: number }
```

#### Appels en Direct (`/api/v1/calls`)
```typescript
GET /api/v1/calls/live
// Response:
[
  {
    id: string,
    agentId: string,
    agentName: string,
    debtorId: string,
    debtorName: string,
    contactName: string,
    startTime: string,
    duration: number,
    sentiment: number,
    status: 'active' | 'on_hold' | 'transferring',
    amountDiscussed: number,
    currentTopic: string
  }
]

GET /api/v1/calls/:id/transcript
// Response:
[
  { speaker: 'agent' | 'debtor', text: string, timestamp: string }
]

POST /api/v1/calls/:id/takeover
// Action: Superviseur prend le contrôle de l'appel

POST /api/v1/calls/:id/end
// Action: Terminer l'appel

POST /api/v1/calls/:id/flag
// Body: { reason: string, severity: 'low' | 'medium' | 'high' }
```

#### Enregistrements (`/api/v1/recordings`)
```typescript
GET /api/v1/recordings
// Query: ?page=1&limit=20&agentId=&dateFrom=&dateTo=&outcome=
// Response: Liste paginée des enregistrements

GET /api/v1/recordings/:id
// Response: Détail de l'enregistrement avec transcript

GET /api/v1/recordings/:id/audio
// Response: Stream audio du fichier

POST /api/v1/recordings/:id/export
// Body: { format: 'mp3' | 'wav', includeTranscript: boolean }
```

#### Notifications (`/api/v1/notifications`)
```typescript
GET /api/v1/notifications
// Query: ?unreadOnly=true&type=approval|alert|system|compliance

PUT /api/v1/notifications/:id/read
// Marquer comme lu

PUT /api/v1/notifications/read-all
// Marquer toutes comme lues

POST /api/v1/notifications/:id/action
// Body: { action: 'approve' | 'reject' | 'dismiss', data?: any }
```

#### Rapports (`/api/v1/reports`)
```typescript
GET /api/v1/reports
// Liste des rapports générés

POST /api/v1/reports/generate
// Body: { type: string, dateRange: { from: string, to: string }, metrics: string[], format: 'pdf' | 'xlsx' | 'csv' }

GET /api/v1/reports/:id/download
// Télécharger le rapport
```

#### Analytics (`/api/v1/analytics`)
```typescript
GET /api/v1/analytics/call-heatmap
// Response: Matrice de fréquence des appels par heure/jour

GET /api/v1/analytics/objection-analysis
// Response: Analyse des objections et taux de résolution

GET /api/v1/analytics/agent-leaderboard
// Response: Classement des agents par performance

GET /api/v1/analytics/recovery-trend?period=6m
// Response: Tendance de recouvrement sur la période
```

#### Gestion Utilisateurs (`/api/v1/users`)
```typescript
GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
PUT    /api/v1/users/:id/role
PUT    /api/v1/users/:id/status
```

#### Templates (`/api/v1/templates`)
```typescript
GET    /api/v1/templates?type=email|sms|phone_script
POST   /api/v1/templates
PUT    /api/v1/templates/:id
DELETE /api/v1/templates/:id
```

#### Segments Débiteurs (`/api/v1/segments`)
```typescript
GET    /api/v1/segments
POST   /api/v1/segments
PUT    /api/v1/segments/:id
DELETE /api/v1/segments/:id
GET    /api/v1/segments/:id/debtors
```

---

## 5. Modèles de Données

### 5.1 Tables Existantes (à étendre si nécessaire)

```sql
-- customers (débiteurs)
-- campaigns
-- tasks
-- agents
-- payment_records
-- contact_attempts
-- templates
-- audit_logs
-- opt_outs
```

### 5.2 Nouvelles Tables à Créer

```sql
-- Table: users (gestion des utilisateurs du système)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor', 'analyst', 'agent')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    department VARCHAR(50),
    avatar_url TEXT,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('approval', 'alert', 'system', 'compliance', 'payment')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    action_required BOOLEAN DEFAULT FALSE,
    action_data JSONB,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
    format VARCHAR(10) NOT NULL CHECK (format IN ('pdf', 'xlsx', 'csv')),
    parameters JSONB,
    file_path TEXT,
    file_size INTEGER,
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: debtor_segments
CREATE TABLE IF NOT EXISTS debtor_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL,
    debtor_count INTEGER DEFAULT 0,
    total_debt DECIMAL(15, 2) DEFAULT 0,
    auto_update BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: call_recordings
CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_attempt_id UUID REFERENCES contact_attempts(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id),
    customer_id UUID REFERENCES customers(id),
    file_path TEXT NOT NULL,
    duration INTEGER NOT NULL,
    file_size INTEGER,
    transcript JSONB,
    sentiment_score DECIMAL(3, 2),
    outcome VARCHAR(50),
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: api_keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    permissions JSONB DEFAULT '[]',
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 6. Services à Implémenter

### 6.1 DashboardService

```typescript
// src/services/dashboard/DashboardService.ts
export class DashboardService {
  async getKPIs(): Promise<DashboardKPIs>;
  async getRecoveryPerformance(period: '7d' | '30d' | '90d'): Promise<RecoveryData[]>;
  async getFleetStatus(): Promise<FleetStatus>;
  async getLiveCalls(): Promise<LiveCall[]>;
}
```

### 6.2 NotificationService

```typescript
// src/services/notification/NotificationService.ts
export class NotificationService {
  async create(notification: CreateNotificationDTO): Promise<Notification>;
  async getUserNotifications(userId: string, filters?: NotificationFilters): Promise<Notification[]>;
  async markAsRead(id: string): Promise<void>;
  async markAllAsRead(userId: string): Promise<void>;
  async processAction(id: string, action: NotificationAction): Promise<void>;
  async sendPushNotification(userId: string, notification: Notification): Promise<void>;
}
```

### 6.3 ReportService

```typescript
// src/services/report/ReportService.ts
export class ReportService {
  async generateReport(params: ReportParams): Promise<Report>;
  async getReportStatus(id: string): Promise<ReportStatus>;
  async downloadReport(id: string): Promise<ReadableStream>;
  async scheduleReport(schedule: ReportSchedule): Promise<void>;
}
```

### 6.4 AnalyticsService

```typescript
// src/services/analytics/AnalyticsService.ts
export class AnalyticsService {
  async getCallHeatmap(dateRange: DateRange): Promise<HeatmapData>;
  async getObjectionAnalysis(dateRange: DateRange): Promise<ObjectionData[]>;
  async getAgentLeaderboard(dateRange: DateRange): Promise<AgentRanking[]>;
  async getRecoveryTrend(period: string): Promise<TrendData[]>;
}
```

### 6.5 RecordingService

```typescript
// src/services/recording/RecordingService.ts
export class RecordingService {
  async listRecordings(filters: RecordingFilters): Promise<PaginatedResult<Recording>>;
  async getRecording(id: string): Promise<Recording>;
  async getTranscript(id: string): Promise<TranscriptEntry[]>;
  async streamAudio(id: string): Promise<ReadableStream>;
  async flagRecording(id: string, reason: string): Promise<void>;
  async exportRecording(id: string, options: ExportOptions): Promise<string>;
}
```

---

## 7. WebSocket Events

### Configuration Socket.IO

```typescript
// src/websocket/index.ts
io.on('connection', (socket) => {
  // Authentification
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);
  
  // Rejoindre les rooms appropriées
  socket.join(`user:${user.id}`);
  socket.join(`org:${user.organizationId}`);
  
  // Events à émettre
});
```

### Events à Implémenter

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `call:started` | Server → Client | `LiveCall` | Nouvel appel démarré |
| `call:updated` | Server → Client | `LiveCall` | Mise à jour appel (sentiment, durée) |
| `call:ended` | Server → Client | `{ callId, outcome, duration }` | Appel terminé |
| `call:transcript` | Server → Client | `TranscriptEntry` | Nouvelle ligne de transcription |
| `agent:status` | Server → Client | `{ agentId, status }` | Changement statut agent |
| `notification:new` | Server → Client | `Notification` | Nouvelle notification |
| `payment:received` | Server → Client | `Payment` | Paiement reçu |
| `campaign:progress` | Server → Client | `CampaignProgress` | Progression campagne |

---

## 8. Authentification

### Configuration JWT

```typescript
// Middleware d'authentification existant à réutiliser
import { authenticate } from '../middleware/auth';

// Appliquer sur toutes les routes protégées
router.use('/dashboard', authenticate, dashboardRoutes);
router.use('/notifications', authenticate, notificationRoutes);
router.use('/reports', authenticate, reportRoutes);
```

### Rôles et Permissions

| Rôle | Permissions |
|------|-------------|
| `admin` | Toutes les permissions |
| `supervisor` | Gestion agents, campagnes, approbations |
| `analyst` | Lecture rapports, analytics |
| `agent` | Lecture seule, actions limitées |

---

## 9. Configuration CORS

```typescript
// src/index.ts
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 10. Variables d'Environnement

### Variables Additionnelles Requises

```env
# Frontend URL pour CORS
FRONTEND_URL=http://localhost:5173

# WebSocket
WEBSOCKET_PORT=3001

# File Storage (pour enregistrements)
STORAGE_TYPE=local|s3
S3_BUCKET=mojavox-recordings
S3_REGION=us-east-1
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Report Generation
REPORT_STORAGE_PATH=/var/reports
REPORT_RETENTION_DAYS=90

# Real-time Transcription
TRANSCRIPTION_SERVICE=whisper|google|aws
WHISPER_MODEL=medium

# Push Notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

---

## 11. Tests d'Intégration

### Structure des Tests

```
tests/
├── integration/
│   ├── auth.test.ts
│   ├── dashboard.test.ts
│   ├── customers.test.ts
│   ├── campaigns.test.ts
│   ├── agents.test.ts
│   ├── calls.test.ts
│   ├── notifications.test.ts
│   └── reports.test.ts
└── e2e/
    └── full-flow.test.ts
```

### Exemple de Test

```typescript
describe('Dashboard API', () => {
  it('should return KPIs for authenticated user', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard/kpis')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('totalRecovered');
    expect(response.body).toHaveProperty('activeAgents');
    expect(response.body).toHaveProperty('callsToday');
  });
});
```

---

## Checklist d'Intégration

- [ ] Créer les nouvelles tables SQL
- [ ] Implémenter les routes Dashboard
- [ ] Implémenter les routes Notifications
- [ ] Implémenter les routes Reports
- [ ] Implémenter les routes Analytics
- [ ] Implémenter les routes Recordings
- [ ] Implémenter les routes Users
- [ ] Implémenter les routes Segments
- [ ] Configurer WebSocket events
- [ ] Ajouter tests d'intégration
- [ ] Mettre à jour la documentation API
- [ ] Configurer CORS pour le frontend
- [ ] Tester l'authentification end-to-end

---

**Document généré par Manus AI - Pour toute question, consulter la documentation technique complète.**
