# Prompt pour Agent AI Windsurf - Intégration Backend MOJAVOX

**Objectif:** Ce prompt est conçu pour guider un Agent AI de développement (Windsurf) à implémenter l'intégration complète entre le backend Node.js/Express existant et le nouveau frontend React MOJAVOX.

---

## 🎯 PROMPT PRINCIPAL

Copier et coller ce prompt dans Windsurf:

---

Tu es un développeur backend senior expert en Node.js, Express, TypeScript, PostgreSQL et WebSocket. Ta mission est d'intégrer le frontend MOJAVOX (React) avec le backend existant "client-escalation-calls".

## CONTEXTE DU PROJET

Le projet est une plateforme de recouvrement de créances alimentée par l'IA avec:
- Backend: Node.js/Express/TypeScript avec PostgreSQL et Redis
- Frontend: React 19 + TypeScript + Tailwind CSS (dans le dossier /client)
- Le frontend utilise actuellement des données mockées dans /client/src/lib/mockData.ts
- L'objectif est de connecter le frontend aux vraies APIs backend

## ARCHITECTURE EXISTANTE

### Routes API Existantes (/src/routes/)
- auth.routes.ts: POST /login, /logout, /refresh, GET /me, /sessions
- customers.routes.ts: CRUD complet + /payments, /campaigns
- campaigns.routes.ts: CRUD complet
- tasks.routes.ts: CRUD complet
- agents.routes.ts: CRUD complet
- payments.routes.ts: CRUD complet
- twilio.routes.ts: Webhooks Twilio

### Services Existants (/src/services/)
- auth/: AuthService, AuthorizationService, MFAService
- llm/: LLMService, ConversationService, EmailGenerationService
- email/: EmailDeliveryService
- compliance/: TCPAService
- crm/: CRMService

### Base de Données Existante
Tables: customers, campaigns, tasks, agents, payment_records, contact_attempts, templates, audit_logs, opt_outs

## TÂCHES À ACCOMPLIR

### PHASE 1: Création des Nouvelles Tables SQL

Crée un fichier de migration /database/migrations/005_frontend_integration.sql avec les tables suivantes:

1. **Table users** (gestion utilisateurs système):
   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   - email VARCHAR(255) UNIQUE NOT NULL
   - password_hash VARCHAR(255) NOT NULL
   - name VARCHAR(100) NOT NULL
   - role VARCHAR(20) CHECK (role IN ('admin', 'supervisor', 'analyst', 'agent'))
   - status VARCHAR(20) DEFAULT 'active'
   - department VARCHAR(50)
   - avatar_url TEXT
   - last_active_at TIMESTAMP
   - created_at, updated_at TIMESTAMP

2. **Table notifications**:
   - id UUID PRIMARY KEY
   - user_id UUID REFERENCES users(id)
   - type VARCHAR(30) CHECK (type IN ('approval', 'alert', 'system', 'compliance', 'payment'))
   - title VARCHAR(255) NOT NULL
   - message TEXT NOT NULL
   - priority VARCHAR(10) DEFAULT 'medium'
   - action_required BOOLEAN DEFAULT FALSE
   - action_data JSONB
   - read BOOLEAN DEFAULT FALSE
   - read_at TIMESTAMP
   - created_at TIMESTAMP

3. **Table reports**:
   - id UUID PRIMARY KEY
   - name VARCHAR(255) NOT NULL
   - type VARCHAR(50) NOT NULL
   - status VARCHAR(20) DEFAULT 'pending'
   - format VARCHAR(10) CHECK (format IN ('pdf', 'xlsx', 'csv'))
   - parameters JSONB
   - file_path TEXT
   - file_size INTEGER
   - generated_by UUID REFERENCES users(id)
   - generated_at, created_at TIMESTAMP

4. **Table debtor_segments**:
   - id UUID PRIMARY KEY
   - name VARCHAR(100) NOT NULL
   - description TEXT
   - criteria JSONB NOT NULL
   - debtor_count INTEGER DEFAULT 0
   - total_debt DECIMAL(15, 2) DEFAULT 0
   - auto_update BOOLEAN DEFAULT TRUE
   - created_by UUID REFERENCES users(id)
   - created_at, updated_at TIMESTAMP

5. **Table call_recordings**:
   - id UUID PRIMARY KEY
   - contact_attempt_id UUID REFERENCES contact_attempts(id)
   - agent_id UUID REFERENCES agents(id)
   - customer_id UUID REFERENCES customers(id)
   - file_path TEXT NOT NULL
   - duration INTEGER NOT NULL
   - file_size INTEGER
   - transcript JSONB
   - sentiment_score DECIMAL(3, 2)
   - outcome VARCHAR(50)
   - flagged BOOLEAN DEFAULT FALSE
   - flag_reason TEXT
   - created_at TIMESTAMP

6. **Table api_keys**:
   - id UUID PRIMARY KEY
   - user_id UUID REFERENCES users(id)
   - name VARCHAR(100) NOT NULL
   - key_hash VARCHAR(255) NOT NULL
   - key_prefix VARCHAR(10) NOT NULL
   - permissions JSONB DEFAULT '[]'
   - last_used_at, expires_at, created_at TIMESTAMP

Ajoute tous les index nécessaires et les triggers updated_at.

### PHASE 2: Création des Nouveaux Services

Crée les services suivants dans /src/services/:

1. **DashboardService** (/src/services/dashboard/DashboardService.ts):
   - getKPIs(): Retourne totalRecovered, activeAgents, callsToday, successRate, etc.
   - getRecoveryPerformance(period): Données de performance par période
   - getFleetStatus(): Statut des agents (online, busy, offline)

2. **NotificationService** (/src/services/notification/NotificationService.ts):
   - create(data): Créer une notification
   - getUserNotifications(userId, filters): Liste des notifications
   - markAsRead(id): Marquer comme lu
   - markAllAsRead(userId): Marquer toutes comme lues
   - processAction(id, action): Traiter une action

3. **AnalyticsService** (/src/services/analytics/AnalyticsService.ts):
   - getCallHeatmap(dateRange): Matrice de fréquence des appels
   - getObjectionAnalysis(dateRange): Analyse des objections
   - getAgentLeaderboard(dateRange): Classement des agents
   - getRecoveryTrend(period): Tendance de recouvrement

4. **RecordingService** (/src/services/recording/RecordingService.ts):
   - listRecordings(filters): Liste paginée des enregistrements
   - getRecording(id): Détail d'un enregistrement
   - getTranscript(id): Transcription d'un appel
   - streamAudio(id): Stream audio
   - flagRecording(id, reason): Signaler un enregistrement

5. **ReportService** (/src/services/report/ReportService.ts):
   - generateReport(params): Générer un rapport
   - getReportStatus(id): Statut d'un rapport
   - downloadReport(id): Télécharger un rapport

6. **UserService** (/src/services/user/UserService.ts):
   - listUsers(filters): Liste des utilisateurs
   - getUser(id): Détail utilisateur
   - createUser(data): Créer utilisateur
   - updateUser(id, data): Modifier utilisateur
   - deleteUser(id): Supprimer utilisateur
   - changeRole(id, role): Changer le rôle
   - changeStatus(id, status): Changer le statut

7. **SegmentService** (/src/services/segment/SegmentService.ts):
   - listSegments(): Liste des segments
   - getSegment(id): Détail segment
   - createSegment(data): Créer segment
   - updateSegment(id, data): Modifier segment
   - deleteSegment(id): Supprimer segment
   - getSegmentDebtors(id): Débiteurs d'un segment

### PHASE 3: Création des Nouvelles Routes

Crée les fichiers de routes suivants dans /src/routes/:

1. **dashboard.routes.ts**:
   - GET /api/v1/dashboard/kpis
   - GET /api/v1/dashboard/recovery-performance?period=7d|30d|90d
   - GET /api/v1/dashboard/fleet-status
   - GET /api/v1/dashboard/live-calls

2. **notifications.routes.ts**:
   - GET /api/v1/notifications?unreadOnly=true&type=approval|alert|system
   - PUT /api/v1/notifications/:id/read
   - PUT /api/v1/notifications/read-all
   - POST /api/v1/notifications/:id/action

3. **analytics.routes.ts**:
   - GET /api/v1/analytics/call-heatmap?from=&to=
   - GET /api/v1/analytics/objection-analysis?from=&to=
   - GET /api/v1/analytics/agent-leaderboard?from=&to=
   - GET /api/v1/analytics/recovery-trend?period=6m

4. **recordings.routes.ts**:
   - GET /api/v1/recordings?page=1&limit=20&agentId=&dateFrom=&dateTo=
   - GET /api/v1/recordings/:id
   - GET /api/v1/recordings/:id/audio
   - GET /api/v1/recordings/:id/transcript
   - POST /api/v1/recordings/:id/flag
   - POST /api/v1/recordings/:id/export

5. **reports.routes.ts**:
   - GET /api/v1/reports
   - POST /api/v1/reports/generate
   - GET /api/v1/reports/:id
   - GET /api/v1/reports/:id/download
   - DELETE /api/v1/reports/:id

6. **users.routes.ts**:
   - GET /api/v1/users
   - GET /api/v1/users/:id
   - POST /api/v1/users
   - PUT /api/v1/users/:id
   - DELETE /api/v1/users/:id
   - PUT /api/v1/users/:id/role
   - PUT /api/v1/users/:id/status

7. **segments.routes.ts**:
   - GET /api/v1/segments
   - GET /api/v1/segments/:id
   - POST /api/v1/segments
   - PUT /api/v1/segments/:id
   - DELETE /api/v1/segments/:id
   - GET /api/v1/segments/:id/debtors

8. **calls.routes.ts**:
   - GET /api/v1/calls/live
   - GET /api/v1/calls/:id
   - GET /api/v1/calls/:id/transcript
   - POST /api/v1/calls/:id/takeover
   - POST /api/v1/calls/:id/end
   - POST /api/v1/calls/:id/flag

### PHASE 4: Configuration WebSocket

Modifie /src/index.ts pour ajouter Socket.IO avec les événements:
- call:started, call:updated, call:ended, call:transcript
- agent:status
- notification:new
- payment:received
- campaign:progress

### PHASE 5: Mise à Jour du Router Principal

Modifie /src/routes/index.ts pour inclure toutes les nouvelles routes avec le middleware authenticate.

### PHASE 6: Configuration CORS

Configure CORS pour permettre les requêtes depuis http://localhost:5173 et FRONTEND_URL.

### PHASE 7: Types TypeScript

Crée /src/types/frontend.ts avec tous les types correspondant aux données mockées du frontend.

### PHASE 8: Tests d'Intégration

Crée des tests dans /tests/integration/ pour chaque nouvelle route.

## CONTRAINTES IMPORTANTES

1. NE PAS modifier les routes/services existants qui fonctionnent déjà
2. NE PAS supprimer de code existant sans raison valable
3. TOUJOURS utiliser les services existants (DatabaseService, RedisService)
4. TOUJOURS appliquer le middleware authenticate sur les routes protégées
5. TOUJOURS valider les entrées avec Joi
6. TOUJOURS logger les erreurs avec le logger existant
7. TOUJOURS retourner les réponses au format: { success: true, data: ... }
8. TOUJOURS gérer les erreurs avec try/catch

## ORDRE D'EXÉCUTION

1. Migration SQL
2. Types TypeScript
3. Services (un par un)
4. Routes (utilisant les services)
5. WebSocket
6. Router principal
7. Tests
8. Test intégration complète

## VALIDATION FINALE

Vérifie que:
- Toutes les nouvelles tables sont créées
- Tous les services sont fonctionnels
- Toutes les routes retournent les bonnes données
- WebSocket émet les événements correctement
- CORS permet les requêtes du frontend
- Les tests passent
- Aucune régression sur les fonctionnalités existantes

## DONNÉES DE TEST

Utilise les données mockées du frontend (/client/src/lib/mockData.ts) comme référence pour le format attendu.

---

## 📋 CHECKLIST DE VÉRIFICATION

| Élément | Vérifié |
|---------|---------|
| Migration SQL créée et exécutée | ☐ |
| Tous les services créés | ☐ |
| Toutes les routes créées | ☐ |
| WebSocket configuré | ☐ |
| CORS configuré | ☐ |
| Tests créés | ☐ |
| Aucune régression | ☐ |
| Frontend peut se connecter | ☐ |

---

**Document créé par Manus AI - Version 1.0 - 27 Janvier 2026**
