# MOJAVOX Backend-Frontend Integration - Windsurf AI Agent Prompt

> **Version:** 2.0 - Production Ready  
> **Date:** January 28, 2026  
> **Author:** Manus AI

---

## 🎯 MISSION STATEMENT

Tu es un développeur full-stack senior expert en Node.js, Express, TypeScript, PostgreSQL, et WebSocket. Ta mission est d'intégrer le frontend MOJAVOX (React) avec le backend existant "client-escalation-calls".

**CRITIQUE:** Le backend possède déjà une infrastructure extensive. Ta tâche principale est de **CONNECTER** le frontend aux services existants, **ÉTENDRE** où nécessaire, et **CRÉER** uniquement ce qui manque. NE RECRÉE PAS les fonctionnalités existantes.

---

## 📁 STRUCTURE DU PROJET

```
client-escalation-calls/
├── client/                    # Frontend React (NOUVEAU - à intégrer)
│   ├── src/
│   │   ├── pages/            # 45+ composants de pages
│   │   ├── components/       # Composants UI réutilisables
│   │   ├── contexts/         # Contexts React
│   │   ├── hooks/            # Hooks personnalisés
│   │   └── lib/mockData.ts   # Données mockées à remplacer par API
│   └── package.json
├── src/                       # Backend Express (EXISTANT)
│   ├── agents/               # Agents IA (Phone, Email, SMS)
│   ├── routes/               # Routes API
│   ├── services/             # Services métier
│   ├── middleware/           # Auth, Rate Limiting
│   └── types/                # Types TypeScript
├── database/
│   └── migrations/           # Migrations SQL (001-008 existent)
└── docs/                     # Documentation
```

---

## 🔍 INVENTAIRE DU BACKEND EXISTANT

### ✅ Routes API Existantes (NE PAS RECRÉER)

| Fichier Route | Chemin Base | Endpoints |
|---------------|-------------|-----------|
| `auth.routes.ts` | `/api/v1/auth` | POST /login, /refresh, /logout; GET /me, /sessions |
| `customers.routes.ts` | `/api/v1/customers` | CRUD + GET /:id/payments, /:id/campaigns |
| `campaigns.routes.ts` | `/api/v1/campaigns` | CRUD + POST /:id/pause, /:id/resume; GET /:id/tasks |
| `agents.routes.ts` | `/api/v1/agents` | CRUD + GET /:id/tasks, /:id/performance |
| `payments.routes.ts` | `/api/v1/payments` | CRUD + GET /overdue; POST /:id/mark-paid |
| `tasks.routes.ts` | `/api/v1/tasks` | CRUD + POST /:id/assign; GET /:id/attempts |
| `twilio.routes.ts` | `/api/v1/twilio` | Webhooks TwiML, gestion DTMF |
| `index.ts` | `/api/v1` | GET /health, /stats |

### ✅ Services Existants (UTILISE CES SERVICES)

| Service | Fichier | Fonction |
|---------|---------|----------|
| **AuthService** | `services/auth/AuthService.ts` | Auth JWT, login, sessions |
| **MFAService** | `services/auth/MFAService.ts` | Authentification deux facteurs |
| **TCPAService** | `services/compliance/TCPAService.ts` | Conformité TCPA, DNC, opt-out |
| **LLMService** | `services/llm/LLMService.ts` | OpenAI, Anthropic, Google AI |
| **ConversationService** | `services/llm/ConversationService.ts` | Gestion conversations IA |
| **FileStorageService** | `services/storage/FileStorageService.ts` | Stockage S3 |
| **EmailDeliveryService** | `services/email/EmailDeliveryService.ts` | Envoi & tracking emails |
| **AuditService** | `services/audit/AuditService.ts` | Journalisation audit |
| **CRMService** | `services/crm/CRMService.ts` | Intégration CRM |
| **MetricsService** | `services/monitoring/MetricsService.ts` | Métriques performance |
| **ElasticsearchService** | `services/search/ElasticsearchService.ts` | Recherche full-text |
| **EncryptionService** | `services/security/EncryptionService.ts` | Chiffrement données |

### ✅ Agents IA Existants (UTILISE CES AGENTS)

| Agent | Fichier | Capacités |
|-------|---------|-----------|
| **PhoneAgent** | `agents/phone/PhoneAgent.ts` | Appels Twilio, TwiML, enregistrements |
| **PhoneAgentEnhanced** | `agents/phone/PhoneAgentEnhanced.ts` | Conversations IA |
| **EmailAgent** | `agents/email/EmailAgent.ts` | Campagnes email |
| **EmailAgentEnhanced** | `agents/email/EmailAgentEnhanced.ts` | Emails générés par IA |
| **SmsAgent** | `agents/sms/SmsAgent.ts` | Messagerie SMS |
| **SMSAgentEnhanced** | `agents/sms/SMSAgentEnhanced.ts` | SMS alimentés par IA |
| **AgentCoordinator** | `agents/coordinator/AgentCoordinator.ts` | Orchestration multi-agents |

### ✅ Tables Base de Données Existantes (8 Migrations)

**Tables Core:**
- `customers` - Info client/entreprise
- `customer_profiles` - Évaluation risque, préférences
- `payment_records` - Factures, paiements
- `agents` - Configuration agents IA

**Tables Workflow:**
- `campaigns` - Campagnes de recouvrement
- `tasks` - Tâches individuelles
- `contact_attempts` - Historique communications
- `templates` - Templates de messages

**Tables Auth:**
- `users` - Utilisateurs système (email, password_hash, role, mfa_enabled)
- `user_sessions` - Sessions JWT
- `api_keys` - Authentification API
- `role_permissions` - Permissions RBAC

**Tables Conformité:**
- `audit_logs` - Piste d'audit
- `opt_outs` - Opt-outs TCPA
- `compliance_rules` - Règles métier

**Tables Analytics:**
- `system_metrics` - Données performance
- `llm_usage_logs` - Tracking usage IA
- `email_deliveries` - Tracking emails
- `campaign_email_stats` - Analytics email

---

## 🔧 PHASE 1: Extensions Base de Données

### Nouvelle Migration: `009_frontend_integration.sql`

Crée UNIQUEMENT les tables qui n'existent pas:

```sql
-- Migration 009: Frontend Integration Tables
-- Date: 2026-01-28

-- 1. Table notifications (pour notifications temps réel)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'call', 'payment', 'campaign', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 2. Table reports (pour rapports générés)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('collection', 'performance', 'compliance', 'financial', 'custom')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    filters JSONB DEFAULT '{}',
    file_path VARCHAR(500),
    file_size INTEGER,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_status ON reports(status);

-- 3. Table segments de débiteurs
CREATE TABLE IF NOT EXISTS debtor_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL DEFAULT '{}',
    customer_count INTEGER DEFAULT 0,
    total_debt NUMERIC(15,2) DEFAULT 0,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debtor_segments_is_active ON debtor_segments(is_active);

-- 4. Table enregistrements d'appels
CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_sid VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    agent_id UUID REFERENCES agents(id),
    campaign_id UUID REFERENCES campaigns(id),
    task_id UUID REFERENCES tasks(id),
    duration INTEGER NOT NULL DEFAULT 0,
    recording_url VARCHAR(500),
    transcription TEXT,
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    outcome VARCHAR(50),
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_recordings_customer_id ON call_recordings(customer_id);
CREATE INDEX idx_call_recordings_campaign_id ON call_recordings(campaign_id);
CREATE INDEX idx_call_recordings_flagged ON call_recordings(flagged) WHERE flagged = TRUE;

-- 5. Table tâches utilisateur/planner
CREATE TABLE IF NOT EXISTS user_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date DATE,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_tasks_assigned_to ON user_tasks(assigned_to);
CREATE INDEX idx_user_tasks_status ON user_tasks(status);
CREATE INDEX idx_user_tasks_due_date ON user_tasks(due_date);

-- 6. Table templates email (étendre templates existants)
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 7. Table configuration webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    failure_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. Table paramètres système
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insérer paramètres par défaut
INSERT INTO system_settings (key, value, description) VALUES
    ('business_hours', '{"start": "09:00", "end": "21:00", "timezone": "America/New_York"}', 'Heures d''appel autorisées'),
    ('max_daily_contacts', '3', 'Maximum de contacts par client par jour'),
    ('default_currency', '"USD"', 'Devise par défaut'),
    ('tcpa_enabled', 'true', 'Application conformité TCPA'),
    ('recording_enabled', 'true', 'Enregistrement appels activé par défaut')
ON CONFLICT (key) DO NOTHING;

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_debtor_segments_updated_at 
    BEFORE UPDATE ON debtor_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tasks_updated_at 
    BEFORE UPDATE ON user_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔧 PHASE 2: Nouvelles Routes API

### 2.1 Fichier: `src/routes/notifications.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/notifications - Récupérer notifications utilisateur
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, unreadOnly = false } = req.query;
    
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ${unreadOnly === 'true' ? 'AND is_read = FALSE' : ''}
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    const result = await dbService.query(query, [userId, limit]);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/notifications/:id/read - Marquer comme lu
router.put('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    await dbService.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/notifications/read-all - Marquer toutes comme lues
router.put('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    await dbService.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/notifications/:id - Supprimer notification
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    await dbService.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 2.2 Fichier: `src/routes/dashboard.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/dashboard - Données complètes du dashboard
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    // Requêtes parallèles pour les données du dashboard
    const [
      totalRecovered,
      activeCalls,
      successRate,
      recoveryTrend,
      dailyCalls,
      fleetStatus,
      recentActivity
    ] = await Promise.all([
      // Montant total recouvré
      dbService.query(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payment_records 
        WHERE status = 'paid' AND paid_date BETWEEN $1 AND $2
      `, [start, end]),
      
      // Nombre d'appels actifs
      dbService.query(`
        SELECT COUNT(*) as count 
        FROM tasks 
        WHERE status = 'in_progress' AND type = 'phone'
      `),
      
      // Taux de succès
      dbService.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'completed') as successful,
          COUNT(*) as total
        FROM tasks 
        WHERE created_at BETWEEN $1 AND $2
      `, [start, end]),
      
      // Tendance de recouvrement (journalier)
      dbService.query(`
        SELECT 
          DATE(paid_date) as date,
          SUM(amount) as amount
        FROM payment_records 
        WHERE status = 'paid' AND paid_date BETWEEN $1 AND $2
        GROUP BY DATE(paid_date)
        ORDER BY date ASC
      `, [start, end]),
      
      // Appels quotidiens
      dbService.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as calls
        FROM contact_attempts 
        WHERE channel = 'phone' AND created_at BETWEEN $1 AND $2
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [start, end]),
      
      // Statut de la flotte
      dbService.query(`
        SELECT 
          type,
          status,
          COUNT(*) as count
        FROM agents
        GROUP BY type, status
      `),
      
      // Activité récente
      dbService.query(`
        SELECT 
          ca.id,
          ca.channel,
          ca.status,
          ca.created_at,
          c.company_name as customer_name
        FROM contact_attempts ca
        JOIN tasks t ON ca.task_id = t.id
        JOIN customers c ON t.customer_id = c.id
        ORDER BY ca.created_at DESC
        LIMIT 10
      `)
    ]);
    
    const total = Number(totalRecovered.rows[0]?.total || 0);
    const successful = Number(successRate.rows[0]?.successful || 0);
    const totalTasks = Number(successRate.rows[0]?.total || 1);
    
    res.json({
      success: true,
      data: {
        kpis: {
          totalRecovered: total,
          activeCalls: Number(activeCalls.rows[0]?.count || 0),
          successRate: ((successful / totalTasks) * 100).toFixed(1),
          pendingAmount: 0
        },
        recoveryTrend: recoveryTrend.rows,
        dailyCalls: dailyCalls.rows,
        fleetStatus: fleetStatus.rows,
        recentActivity: recentActivity.rows
      }
    });
  } catch (error: any) {
    logger.error('Dashboard data failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/v1/dashboard/live-calls - Appels en cours
router.get('/live-calls', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await dbService.query(`
      SELECT 
        t.id,
        t.status,
        t.started_at,
        c.company_name as customer_name,
        c.phone as customer_phone,
        a.type as agent_type,
        a.id as agent_id
      FROM tasks t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN agents a ON t.agent_id = a.id
      WHERE t.status = 'in_progress' AND t.type = 'phone'
      ORDER BY t.started_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 2.3 Fichier: `src/routes/analytics.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/analytics - Données analytics
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, tab = 'performance' } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    let data: any = {};
    
    if (tab === 'performance') {
      const [recoveryTrend, callStats, agentPerformance] = await Promise.all([
        // Tendance de recouvrement mensuelle
        dbService.query(`
          SELECT 
            DATE_TRUNC('month', paid_date) as month,
            SUM(amount) as recovered
          FROM payment_records 
          WHERE status = 'paid' AND paid_date BETWEEN $1 AND $2
          GROUP BY DATE_TRUNC('month', paid_date)
          ORDER BY month ASC
        `, [start, end]),
        
        // Statistiques d'appels
        dbService.query(`
          SELECT 
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE status = 'answered') as answered,
            AVG(duration) FILTER (WHERE duration > 0) as avg_duration
          FROM contact_attempts 
          WHERE channel = 'phone' AND created_at BETWEEN $1 AND $2
        `, [start, end]),
        
        // Performance des agents
        dbService.query(`
          SELECT 
            a.id,
            a.type,
            COUNT(t.id) as tasks_completed,
            COUNT(t.id) FILTER (WHERE t.status = 'completed') as successful
          FROM agents a
          LEFT JOIN tasks t ON t.agent_id = a.id AND t.created_at BETWEEN $1 AND $2
          GROUP BY a.id, a.type
        `, [start, end])
      ]);
      
      data = {
        recoveryTrend: recoveryTrend.rows,
        callStats: callStats.rows[0],
        agentPerformance: agentPerformance.rows
      };
    } else if (tab === 'heatmap') {
      // Heatmap des appels par heure/jour
      const heatmapData = await dbService.query(`
        SELECT 
          EXTRACT(DOW FROM created_at) as day_of_week,
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM contact_attempts
        WHERE channel = 'phone' AND created_at BETWEEN $1 AND $2
        GROUP BY EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at)
      `, [start, end]);
      
      data = { heatmap: heatmapData.rows };
    } else if (tab === 'objections') {
      // Analyse des objections (basé sur les transcriptions)
      const objectionData = await dbService.query(`
        SELECT 
          outcome,
          COUNT(*) as count
        FROM call_recordings
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY outcome
        ORDER BY count DESC
      `, [start, end]);
      
      data = { objections: objectionData.rows };
    } else if (tab === 'agents') {
      // Comparaison des agents
      const agentComparison = await dbService.query(`
        SELECT 
          a.id,
          a.type,
          a.status,
          COUNT(t.id) as total_tasks,
          COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
          COALESCE(SUM(pr.amount) FILTER (WHERE pr.status = 'paid'), 0) as recovered_amount
        FROM agents a
        LEFT JOIN tasks t ON t.agent_id = a.id
        LEFT JOIN payment_records pr ON pr.customer_id = t.customer_id AND pr.paid_date BETWEEN $1 AND $2
        WHERE t.created_at BETWEEN $1 AND $2 OR t.created_at IS NULL
        GROUP BY a.id, a.type, a.status
        ORDER BY recovered_amount DESC
      `, [start, end]);
      
      data = { agents: agentComparison.rows };
    }
    
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Analytics data failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics data' });
  }
});

export default router;
```

### 2.4 Fichier: `src/routes/reports.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate, requireManager } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import { FileStorageService } from '../services/storage/FileStorageService';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/reports - Lister les rapports
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, status, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM reports WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(type);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);
    
    const result = await dbService.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/reports - Créer nouveau rapport
router.post('/', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { name, type, filters } = req.body;
    const userId = req.user?.id;
    
    const result = await dbService.query(
      `INSERT INTO reports (name, type, filters, created_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, type, JSON.stringify(filters), userId]
    );
    
    // TODO: Déclencher job de génération asynchrone
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/reports/:id/download - Télécharger rapport
router.get('/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await dbService.query('SELECT * FROM reports WHERE id = $1', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    
    const report = result.rows[0];
    if (report.status !== 'completed' || !report.file_path) {
      return res.status(400).json({ success: false, error: 'Report not ready for download' });
    }
    
    const storage = FileStorageService.getInstance();
    const url = await storage.getPresignedUrl(report.file_path);
    
    res.json({ success: true, downloadUrl: url });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/reports/:id - Supprimer rapport
router.delete('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await dbService.query('DELETE FROM reports WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 2.5 Fichier: `src/routes/segments.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate, requireManager } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/segments - Lister segments
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await dbService.query(
      'SELECT * FROM debtor_segments WHERE is_active = TRUE ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/segments/:id - Détails segment
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await dbService.query('SELECT * FROM debtor_segments WHERE id = $1', [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/segments/:id/customers - Clients du segment
router.get('/:id/customers', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const segmentResult = await dbService.query('SELECT filters FROM debtor_segments WHERE id = $1', [id]);
    if (!segmentResult.rows[0]) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }
    
    const filters = segmentResult.rows[0].filters;
    let query = `
      SELECT c.*, cp.risk_level, cp.risk_score,
             COALESCE(SUM(pr.amount) FILTER (WHERE pr.status = 'overdue'), 0) as total_debt
      FROM customers c
      LEFT JOIN customer_profiles cp ON c.id = cp.customer_id
      LEFT JOIN payment_records pr ON c.id = pr.customer_id
      WHERE c.deleted_at IS NULL
    `;
    
    if (filters.riskLevel) {
      query += ` AND cp.risk_level = '${filters.riskLevel}'`;
    }
    
    query += ` GROUP BY c.id, cp.risk_level, cp.risk_score ORDER BY total_debt DESC LIMIT $1 OFFSET $2`;
    
    const result = await dbService.query(query, [limit, offset]);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/segments - Créer segment
router.post('/', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { name, description, filters, color } = req.body;
    const userId = req.user?.id;
    
    const result = await dbService.query(
      `INSERT INTO debtor_segments (name, description, filters, color, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, JSON.stringify(filters), color, userId]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/segments/:id - Modifier segment
router.put('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, filters, color } = req.body;
    
    const result = await dbService.query(
      `UPDATE debtor_segments SET name = $1, description = $2, filters = $3, color = $4 
       WHERE id = $5 RETURNING *`,
      [name, description, JSON.stringify(filters), color, id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/segments/:id - Supprimer segment
router.delete('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await dbService.query('UPDATE debtor_segments SET is_active = FALSE WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 2.6 Fichier: `src/routes/recordings.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import { FileStorageService } from '../services/storage/FileStorageService';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/recordings - Lister enregistrements
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { customerId, campaignId, flagged, limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT cr.*, c.company_name as customer_name, a.type as agent_type
      FROM call_recordings cr
      LEFT JOIN customers c ON cr.customer_id = c.id
      LEFT JOIN agents a ON cr.agent_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (customerId) {
      query += ` AND cr.customer_id = $${paramIndex++}`;
      params.push(customerId);
    }
    if (campaignId) {
      query += ` AND cr.campaign_id = $${paramIndex++}`;
      params.push(campaignId);
    }
    if (flagged === 'true') {
      query += ` AND cr.flagged = TRUE`;
    }
    
    query += ` ORDER BY cr.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
    const result = await dbService.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/recordings/:id - Détails enregistrement
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await dbService.query(`
      SELECT cr.*, c.company_name as customer_name, c.email as customer_email
      FROM call_recordings cr
      LEFT JOIN customers c ON cr.customer_id = c.id
      WHERE cr.id = $1
    `, [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/recordings/:id/flag - Signaler enregistrement
router.put('/:id/flag', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { flagged, reason } = req.body;
    
    await dbService.query(
      'UPDATE call_recordings SET flagged = $1, flag_reason = $2 WHERE id = $3',
      [flagged, reason, id]
    );
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/recordings/:id/stream - Stream audio
router.get('/:id/stream', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await dbService.query('SELECT recording_url FROM call_recordings WHERE id = $1', [id]);
    if (!result.rows[0]?.recording_url) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }
    
    const storage = FileStorageService.getInstance();
    const url = await storage.getPresignedUrl(result.rows[0].recording_url, { expiresIn: 3600 });
    
    res.json({ success: true, streamUrl: url });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/recordings/:id/transcript - Transcription
router.get('/:id/transcript', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await dbService.query('SELECT transcription FROM call_recordings WHERE id = $1', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }
    
    res.json({ success: true, data: { transcript: result.rows[0].transcription } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 2.7 Fichier: `src/routes/user-tasks.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/user-tasks - Lister tâches utilisateur
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, priority, assignedToMe } = req.query;
    
    let query = `
      SELECT ut.*, u.first_name || ' ' || u.last_name as assignee_name
      FROM user_tasks ut
      LEFT JOIN users u ON ut.assigned_to = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (assignedToMe === 'true') {
      query += ` AND ut.assigned_to = $${paramIndex++}`;
      params.push(userId);
    }
    if (status) {
      query += ` AND ut.status = $${paramIndex++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND ut.priority = $${paramIndex++}`;
      params.push(priority);
    }
    
    query += ` ORDER BY 
      CASE ut.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END,
      ut.due_date ASC NULLS LAST`;
    
    const result = await dbService.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/user-tasks - Créer tâche
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, description, priority, due_date, assigned_to } = req.body;
    const userId = req.user?.id;
    
    const result = await dbService.query(
      `INSERT INTO user_tasks (title, description, priority, due_date, assigned_to, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, priority, due_date, assigned_to, userId]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/user-tasks/:id - Modifier tâche
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, due_date, assigned_to } = req.body;
    
    let completedAt = null;
    if (status === 'completed') {
      completedAt = new Date();
    }
    
    const result = await dbService.query(
      `UPDATE user_tasks 
       SET title = $1, description = $2, priority = $3, status = $4, due_date = $5, 
           assigned_to = $6, completed_at = $7
       WHERE id = $8 RETURNING *`,
      [title, description, priority, status, due_date, assigned_to, completedAt, id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/user-tasks/:id - Supprimer tâche
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await dbService.query('DELETE FROM user_tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 2.8 Fichier: `src/routes/users.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin, requireManager } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import bcrypt from 'bcrypt';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/users - Lister utilisateurs
router.get('/', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { role, status, limit = 50 } = req.query;
    
    let query = `
      SELECT id, email, first_name, last_name, role, is_active, 
             mfa_enabled, last_login_at, created_at
      FROM users WHERE deleted_at IS NULL
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (role) {
      query += ` AND role = $${paramIndex++}`;
      params.push(role);
    }
    if (status === 'active') {
      query += ` AND is_active = TRUE`;
    } else if (status === 'inactive') {
      query += ` AND is_active = FALSE`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);
    
    const result = await dbService.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/users - Créer utilisateur
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;
    
    const existing = await dbService.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, 12);
    
    const result = await dbService.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, first_name, last_name, role, is_active, created_at`,
      [email, passwordHash, first_name, last_name, role]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/users/:id - Modifier utilisateur
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, role, is_active } = req.body;
    
    const result = await dbService.query(
      `UPDATE users SET first_name = $1, last_name = $2, role = $3, is_active = $4 
       WHERE id = $5 
       RETURNING id, email, first_name, last_name, role, is_active`,
      [first_name, last_name, role, is_active, id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/users/:id - Supprimer utilisateur (soft delete)
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await dbService.query('UPDATE users SET deleted_at = NOW(), is_active = FALSE WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/users/:id/role - Changer rôle utilisateur
router.put('/:id/role', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const validRoles = ['admin', 'manager', 'agent', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    
    await dbService.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 2.9 Fichier: `src/routes/email-templates.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate, requireManager } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/email-templates - Lister templates
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM email_templates WHERE is_active = TRUE';
    const params: any[] = [];
    
    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await dbService.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/email-templates/:id - Détails template
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await dbService.query('SELECT * FROM email_templates WHERE id = $1', [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/email-templates - Créer template
router.post('/', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { name, subject, body, category, variables } = req.body;
    const userId = req.user?.id;
    
    const result = await dbService.query(
      `INSERT INTO email_templates (name, subject, body, category, variables, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, subject, body, category, variables, userId]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/email-templates/:id - Modifier template
router.put('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, subject, body, category, variables } = req.body;
    
    const result = await dbService.query(
      `UPDATE email_templates SET name = $1, subject = $2, body = $3, category = $4, variables = $5 
       WHERE id = $6 RETURNING *`,
      [name, subject, body, category, variables, id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/email-templates/:id - Supprimer template
router.delete('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await dbService.query('UPDATE email_templates SET is_active = FALSE WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 2.10 Fichier: `src/routes/settings.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/settings - Récupérer tous les paramètres
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await dbService.query('SELECT key, value, description FROM system_settings');
    
    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/settings/:key - Récupérer paramètre spécifique
router.get('/:key', authenticate, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const result = await dbService.query('SELECT * FROM system_settings WHERE key = $1', [key]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/settings/:key - Modifier paramètre
router.put('/:key', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const userId = req.user?.id;
    
    const result = await dbService.query(
      `INSERT INTO system_settings (key, value, updated_by) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value), userId]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 2.11 Fichier: `src/routes/webhooks.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import crypto from 'crypto';

const router = Router();
const dbService = new DatabaseService();

// GET /api/v1/webhooks - Lister webhooks
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await dbService.query(
      'SELECT id, name, url, events, is_active, last_triggered_at, failure_count, created_at FROM webhooks ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/webhooks - Créer webhook
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, url, events } = req.body;
    const userId = req.user?.id;
    const secret = crypto.randomBytes(32).toString('hex');
    
    const result = await dbService.query(
      `INSERT INTO webhooks (name, url, events, secret, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, url, events, is_active, created_at`,
      [name, url, events, secret, userId]
    );
    
    res.status(201).json({ 
      success: true, 
      data: { ...result.rows[0], secret } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/webhooks/:id - Modifier webhook
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, url, events, is_active } = req.body;
    
    const result = await dbService.query(
      `UPDATE webhooks SET name = $1, url = $2, events = $3, is_active = $4 
       WHERE id = $5 RETURNING id, name, url, events, is_active`,
      [name, url, events, is_active, id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/webhooks/:id - Supprimer webhook
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await dbService.query('DELETE FROM webhooks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/webhooks/:id/test - Tester webhook
router.post('/:id/test', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await dbService.query('SELECT * FROM webhooks WHERE id = $1', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }
    
    const webhook = result.rows[0];
    
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook' }
    };
    
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(testPayload))
      .digest('hex');
    
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: JSON.stringify(testPayload)
    });
    
    res.json({ 
      success: true, 
      status: response.status,
      message: response.ok ? 'Webhook test successful' : 'Webhook test failed'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## 🔧 PHASE 3: Mise à Jour du Router Principal

### Modifier `src/routes/index.ts`

Ajoute les nouvelles routes au fichier existant:

```typescript
// Ajouter ces imports en haut du fichier
import notificationsRoutes from './notifications.routes';
import dashboardRoutes from './dashboard.routes';
import analyticsRoutes from './analytics.routes';
import reportsRoutes from './reports.routes';
import segmentsRoutes from './segments.routes';
import recordingsRoutes from './recordings.routes';
import userTasksRoutes from './user-tasks.routes';
import usersRoutes from './users.routes';
import emailTemplatesRoutes from './email-templates.routes';
import settingsRoutes from './settings.routes';
import webhooksRoutes from './webhooks.routes';

// Ajouter ces montages de routes après les routes existantes
router.use('/notifications', notificationsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportsRoutes);
router.use('/segments', segmentsRoutes);
router.use('/recordings', recordingsRoutes);
router.use('/user-tasks', userTasksRoutes);
router.use('/users', usersRoutes);
router.use('/email-templates', emailTemplatesRoutes);
router.use('/settings', settingsRoutes);
router.use('/webhooks', webhooksRoutes);
```

---

## 🔧 PHASE 4: Intégration WebSocket

### Fichier: `src/websocket/index.ts`

```typescript
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../services/auth/AuthService';
import { logger } from '../utils/logger';

let io: Server;

export function initializeWebSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  // Middleware d'authentification
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      const decoded = await verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });
  
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.id;
    logger.info('WebSocket connected', { userId, socketId: socket.id });
    
    // Rejoindre la room spécifique à l'utilisateur
    if (userId) {
      socket.join(`user:${userId}`);
    }
    
    // Rejoindre les rooms basées sur le rôle
    const role = socket.data.user?.role;
    if (role) {
      socket.join(`role:${role}`);
    }
    
    // Gérer les abonnements aux canaux spécifiques
    socket.on('subscribe', (channel: string) => {
      socket.join(channel);
      logger.debug('Socket subscribed to channel', { socketId: socket.id, channel });
    });
    
    socket.on('unsubscribe', (channel: string) => {
      socket.leave(channel);
    });
    
    socket.on('disconnect', () => {
      logger.info('WebSocket disconnected', { userId, socketId: socket.id });
    });
  });
  
  return io;
}

// Fonctions helper pour émettre des événements
export function emitToUser(userId: string, event: string, data: any) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToRole(role: string, event: string, data: any) {
  io?.to(`role:${role}`).emit(event, data);
}

export function emitToAll(event: string, data: any) {
  io?.emit(event, data);
}

export function emitToChannel(channel: string, event: string, data: any) {
  io?.to(channel).emit(event, data);
}

// Types d'événements pour le frontend
export const WS_EVENTS = {
  // Notifications
  NOTIFICATION_NEW: 'notification:new',
  
  // Appels
  CALL_STARTED: 'call:started',
  CALL_ENDED: 'call:ended',
  CALL_STATUS_CHANGED: 'call:status_changed',
  CALL_TRANSCRIPT_UPDATE: 'call:transcript_update',
  
  // Paiements
  PAYMENT_RECEIVED: 'payment:received',
  PAYMENT_OVERDUE: 'payment:overdue',
  
  // Campagnes
  CAMPAIGN_STATUS_CHANGED: 'campaign:status_changed',
  CAMPAIGN_COMPLETED: 'campaign:completed',
  
  // Agents
  AGENT_STATUS_CHANGED: 'agent:status_changed',
  
  // Tâches
  TASK_ASSIGNED: 'task:assigned',
  TASK_COMPLETED: 'task:completed',
  
  // Système
  SYSTEM_ALERT: 'system:alert'
};
```

### Modifier `src/index.ts` pour inclure WebSocket

```typescript
import { createServer } from 'http';
import { initializeWebSocket } from './websocket';

// Après la création de l'app Express
const httpServer = createServer(app);
const io = initializeWebSocket(httpServer);

// Changer app.listen en httpServer.listen
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

---

## 🔧 PHASE 5: Service API Frontend

### Fichier: `client/src/lib/api.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private token: string | null = null;
  
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }
  
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }
  
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }
  
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      if (response.status === 401) {
        this.clearToken();
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  // Auth
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }
    return response;
  }
  
  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
  }
  
  async getMe() {
    return this.request<any>('/auth/me');
  }
  
  // Dashboard
  async getDashboard(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.request<any>(`/dashboard?${params}`);
  }
  
  // Customers (Debtors)
  async getCustomers(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/customers?${query}`);
  }
  
  async getCustomer(id: string) {
    return this.request<any>(`/customers/${id}`);
  }
  
  async createCustomer(data: any) {
    return this.request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async updateCustomer(id: string, data: any) {
    return this.request<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  // Campaigns
  async getCampaigns(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/campaigns?${query}`);
  }
  
  async createCampaign(data: any) {
    return this.request<any>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async pauseCampaign(id: string) {
    return this.request<void>(`/campaigns/${id}/pause`, { method: 'POST' });
  }
  
  async resumeCampaign(id: string) {
    return this.request<void>(`/campaigns/${id}/resume`, { method: 'POST' });
  }
  
  // Agents (Fleet)
  async getAgents() {
    return this.request<any[]>('/agents');
  }
  
  async createAgent(data: any) {
    return this.request<any>('/agents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async updateAgent(id: string, data: any) {
    return this.request<any>(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  // Payments
  async getPayments(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/payments?${query}`);
  }
  
  async markPaymentPaid(id: string) {
    return this.request<void>(`/payments/${id}/mark-paid`, { method: 'POST' });
  }
  
  // Notifications
  async getNotifications(unreadOnly = false) {
    return this.request<any[]>(`/notifications?unreadOnly=${unreadOnly}`);
  }
  
  async markNotificationRead(id: string) {
    return this.request<void>(`/notifications/${id}/read`, { method: 'PUT' });
  }
  
  async markAllNotificationsRead() {
    return this.request<void>('/notifications/read-all', { method: 'PUT' });
  }
  
  // Reports
  async getReports() {
    return this.request<any[]>('/reports');
  }
  
  async createReport(data: any) {
    return this.request<any>('/reports', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async downloadReport(id: string) {
    return this.request<{ downloadUrl: string }>(`/reports/${id}/download`);
  }
  
  // Segments
  async getSegments() {
    return this.request<any[]>('/segments');
  }
  
  async getSegmentCustomers(id: string, page = 1) {
    return this.request<any[]>(`/segments/${id}/customers?page=${page}`);
  }
  
  async createSegment(data: any) {
    return this.request<any>('/segments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  // Recordings
  async getRecordings(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/recordings?${query}`);
  }
  
  async flagRecording(id: string, flagged: boolean, reason?: string) {
    return this.request<void>(`/recordings/${id}/flag`, {
      method: 'PUT',
      body: JSON.stringify({ flagged, reason })
    });
  }
  
  async getRecordingTranscript(id: string) {
    return this.request<{ transcript: string }>(`/recordings/${id}/transcript`);
  }
  
  // Users
  async getUsers() {
    return this.request<any[]>('/users');
  }
  
  async createUser(data: any) {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async updateUser(id: string, data: any) {
    return this.request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async changeUserRole(id: string, role: string) {
    return this.request<void>(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  }
  
  // User Tasks
  async getUserTasks(assignedToMe = true) {
    return this.request<any[]>(`/user-tasks?assignedToMe=${assignedToMe}`);
  }
  
  async createUserTask(data: any) {
    return this.request<any>('/user-tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async updateUserTask(id: string, data: any) {
    return this.request<any>(`/user-tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  // Email Templates
  async getEmailTemplates() {
    return this.request<any[]>('/email-templates');
  }
  
  async createEmailTemplate(data: any) {
    return this.request<any>('/email-templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  // Settings
  async getSettings() {
    return this.request<Record<string, any>>('/settings');
  }
  
  async updateSetting(key: string, value: any) {
    return this.request<any>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  }
  
  // Analytics
  async getAnalytics(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/analytics?${query}`);
  }
}

export const api = new ApiService();
export default api;
```

---

## 🔧 PHASE 6: Service WebSocket Frontend

### Fichier: `client/src/lib/websocket.ts`

```typescript
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  
  connect(token: string) {
    if (this.socket?.connected) return;
    
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    
    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    
    // Ré-émettre tous les événements aux listeners enregistrés
    this.socket.onAny((event, data) => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach(callback => callback(data));
      }
    });
  }
  
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
  
  subscribe(channel: string) {
    this.socket?.emit('subscribe', channel);
  }
  
  unsubscribe(channel: string) {
    this.socket?.emit('unsubscribe', channel);
  }
  
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    // Retourner fonction de désinscription
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  
  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }
}

export const ws = new WebSocketService();
export default ws;

// Constantes d'événements (correspondant au backend)
export const WS_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
  CALL_STARTED: 'call:started',
  CALL_ENDED: 'call:ended',
  CALL_STATUS_CHANGED: 'call:status_changed',
  CALL_TRANSCRIPT_UPDATE: 'call:transcript_update',
  PAYMENT_RECEIVED: 'payment:received',
  PAYMENT_OVERDUE: 'payment:overdue',
  CAMPAIGN_STATUS_CHANGED: 'campaign:status_changed',
  CAMPAIGN_COMPLETED: 'campaign:completed',
  AGENT_STATUS_CHANGED: 'agent:status_changed',
  TASK_ASSIGNED: 'task:assigned',
  TASK_COMPLETED: 'task:completed',
  SYSTEM_ALERT: 'system:alert'
};
```

---

## 🔧 PHASE 7: Configuration Environnement

### Backend `.env` - Ajouts

```env
# URL Frontend pour CORS
FRONTEND_URL=http://localhost:3000

# WebSocket
WS_ENABLED=true
```

### Frontend `.env`

```env
VITE_API_URL=/api/v1
VITE_WS_URL=
```

### Configuration Vite Proxy (`client/vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

---

## 🔧 PHASE 8: Remplacement des Données Mockées

### Instructions pour chaque page

Pour chaque page du frontend, remplace les imports de mockData par des appels API:

```typescript
// AVANT
import { mockDebtors } from '@/lib/mockData';
const debtors = mockDebtors;

// APRÈS
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

const [debtors, setDebtors] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    const response = await api.getCustomers();
    if (response.success) {
      setDebtors(response.data);
    }
    setLoading(false);
  }
  fetchData();
}, []);
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### Base de Données
- [ ] Exécuter migration 009_frontend_integration.sql
- [ ] Vérifier que toutes les nouvelles tables sont créées
- [ ] Insérer les paramètres système par défaut

### Routes Backend
- [ ] Créer notifications.routes.ts
- [ ] Créer dashboard.routes.ts
- [ ] Créer analytics.routes.ts
- [ ] Créer reports.routes.ts
- [ ] Créer segments.routes.ts
- [ ] Créer recordings.routes.ts
- [ ] Créer user-tasks.routes.ts
- [ ] Créer users.routes.ts
- [ ] Créer email-templates.routes.ts
- [ ] Créer settings.routes.ts
- [ ] Créer webhooks.routes.ts
- [ ] Mettre à jour routes/index.ts avec les nouvelles routes

### WebSocket
- [ ] Créer src/websocket/index.ts
- [ ] Mettre à jour src/index.ts pour utiliser le serveur HTTP
- [ ] Installer package socket.io

### Frontend
- [ ] Créer client/src/lib/api.ts
- [ ] Créer client/src/lib/websocket.ts
- [ ] Installer package socket.io-client
- [ ] Mettre à jour les pages pour utiliser l'API au lieu des données mockées
- [ ] Connecter WebSocket à la connexion
- [ ] Gérer les notifications temps réel

### Tests
- [ ] Tester tous les nouveaux endpoints API
- [ ] Tester la connexion WebSocket
- [ ] Tester le flux d'authentification
- [ ] Tester les opérations CRUD pour chaque entité
- [ ] Tester l'agrégation des données du dashboard
- [ ] Tester les requêtes analytics

### Intégration
- [ ] Configurer CORS pour le frontend
- [ ] Configurer le proxy dans Vite
- [ ] Tester le flux complet: Login → Dashboard → Opérations

---

## 🚨 RÈGLES CRITIQUES

1. **NE PAS** recréer les services existants - UTILISE-LES
2. **NE PAS** modifier les tables existantes sauf pour ajouter des colonnes
3. **NE PAS** changer les signatures des endpoints API existants
4. **TOUJOURS** utiliser le middleware d'authentification existant
5. **TOUJOURS** utiliser les types TypeScript existants de `src/types/index.ts`
6. **TOUJOURS** suivre les patterns et conventions de code existants
7. **TOUJOURS** ajouter une gestion d'erreurs appropriée
8. **TOUJOURS** ajouter des logs avec le logger existant
9. **TESTER** chaque endpoint avant de passer au suivant

---

## 📞 SUPPORT

En cas de problème:
1. Vérifier les implémentations de services existants pour les patterns
2. Revoir les routes existantes pour les patterns d'authentification/autorisation
3. Utiliser les types TypeScript existants
4. Suivre les patterns de gestion d'erreurs existants
5. Vérifier les migrations de base de données pour les structures de tables

**Bonne chance ! Le backend est solide - ton travail est de connecter et étendre, pas de reconstruire.**

---

**Document créé par Manus AI - Version 2.0 - 28 Janvier 2026**


---

## 📄 ANNEXE A: MAPPING COMPLET PAGES FRONTEND → API

Cette section détaille **EXACTEMENT** quelles données chaque page frontend nécessite et quels endpoints API utiliser.

### Pages Principales (Dashboard & Analytics)

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **Dashboard** | `Dashboard.tsx` | KPIs, graphiques, activité récente | `GET /dashboard`, `GET /dashboard/live-calls` |
| **Analytics** | `Analytics.tsx` | Tendances, heatmap, comparaison agents | `GET /analytics?tab=performance\|heatmap\|objections\|agents` |
| **Live Monitor** | `LiveMonitor.tsx` | Appels en cours temps réel | `GET /dashboard/live-calls` + WebSocket `call:*` events |

### Pages Débiteurs

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **Debtors** | `Debtors.tsx` | Liste clients, filtres | `GET /customers?status=&riskLevel=&search=` |
| **DebtorDetail** | `DebtorDetail.tsx` | Détails client, paiements, historique | `GET /customers/:id`, `GET /customers/:id/payments`, `GET /customers/:id/campaigns` |
| **DebtorSegments** | `DebtorSegments.tsx` | Segments, compteurs | `GET /segments`, `GET /segments/:id/customers` |

### Pages Campagnes

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **Campaigns** | `Campaigns.tsx` | Liste campagnes, statuts | `GET /campaigns?status=` |
| **CampaignWizard** | `CampaignWizard.tsx` | Création campagne | `POST /campaigns`, `GET /customers`, `GET /agents` |
| **CampaignCalendar** | `CampaignCalendar.tsx` | Calendrier campagnes | `GET /campaigns?startDate=&endDate=` |
| **CampaignReport** | `CampaignReport.tsx` | Rapport campagne | `GET /campaigns/:id`, `GET /campaigns/:id/tasks` |

### Pages Agents (Fleet)

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **Fleet** | `Fleet.tsx` | Liste agents, statuts | `GET /agents` |
| **AgentWizard** | `AgentWizard.tsx` | Création agent | `POST /agents` |
| **ScriptEditor** | `ScriptEditor.tsx` | Scripts agents | `GET /agents/:id`, `PUT /agents/:id` |
| **ScriptAnalyzer** | `ScriptAnalyzer.tsx` | Analyse scripts | `GET /agents/:id/performance` |

### Pages Paiements

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **PaymentDashboard** | `PaymentDashboard.tsx` | Résumé paiements | `GET /payments/stats`, `GET /payments/overdue` |
| **PaymentHistory** | `PaymentHistory.tsx` | Historique paiements | `GET /payments?customerId=&status=` |
| **PaymentPortal** | `PaymentPortal.tsx` | Portail client | `GET /payments/:customerId`, `POST /payments` |
| **RecurringPayments** | `RecurringPayments.tsx` | Paiements récurrents | `GET /payments?recurring=true` |
| **SavedPaymentMethods** | `SavedPaymentMethods.tsx` | Méthodes sauvegardées | `GET /customers/:id/payment-methods` |

### Pages Rapports & Export

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **Reports** | `Reports.tsx` | Liste rapports | `GET /reports`, `POST /reports`, `GET /reports/:id/download` |
| **FinancialReport** | `FinancialReport.tsx` | Rapport financier | `GET /reports?type=financial` |
| **DataExport** | `DataExport.tsx` | Export données | `POST /reports` avec type=export |

### Pages Enregistrements

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **CallPlayback** | `CallPlayback.tsx` | Lecture enregistrement | `GET /recordings/:id`, `GET /recordings/:id/stream`, `GET /recordings/:id/transcript` |

### Pages Utilisateurs & Paramètres

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **UserManagement** | `UserManagement.tsx` | Gestion utilisateurs | `GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` |
| **Settings** | `Settings.tsx` | Paramètres système | `GET /settings`, `PUT /settings/:key` |
| **BrandingSettings** | `BrandingSettings.tsx` | Personnalisation | `GET /settings/branding`, `PUT /settings/branding` |
| **Notifications** | `Notifications.tsx` | Notifications | `GET /notifications`, `PUT /notifications/:id/read` |
| **TaskPlanner** | `TaskPlanner.tsx` | Tâches utilisateur | `GET /user-tasks`, `POST /user-tasks`, `PUT /user-tasks/:id` |

### Pages Templates

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **EmailTemplates** | `EmailTemplates.tsx` | Templates email | `GET /email-templates`, `POST /email-templates`, `PUT /email-templates/:id` |
| **EmailNotifications** | `EmailNotifications.tsx` | Config notifications | `GET /settings/email-notifications` |

### Pages API & Intégration

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **APIIntegration** | `APIIntegration.tsx` | Clés API, webhooks | `GET /api-keys` (existant), `GET /webhooks`, `POST /webhooks` |

### Pages Auth & Onboarding

| Page | Fichier | Données Requises | Endpoints API |
|------|---------|------------------|---------------|
| **Login** | `Login.tsx` | Authentification | `POST /auth/login` |
| **TwoFactorAuth** | `TwoFactorAuth.tsx` | MFA | `POST /auth/mfa/verify` |
| **Onboarding** | `Onboarding.tsx` | Configuration initiale | `POST /auth/setup`, `PUT /settings` |

### Pages Statiques (Pas d'API nécessaire)

- `Landing.tsx` - Page d'accueil publique
- `Home.tsx` - Redirection
- `Help.tsx` - Documentation
- `Docs.tsx` - Documentation API
- `Support.tsx` - Support client
- `PrivacyPolicy.tsx` - Politique de confidentialité
- `TermsOfService.tsx` - Conditions d'utilisation
- `NotFound.tsx` - Page 404
- `PaymentFeedback.tsx` - Confirmation paiement
- `ABTesting.tsx` - Tests A/B (données mockées acceptables pour MVP)

---

## 📄 ANNEXE B: GESTION DES ERREURS FRONTEND

### Pattern Standard pour Chaque Page

```typescript
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ExamplePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getExampleData();
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load data');
        toast.error('Erreur lors du chargement des données');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchData}>Réessayer</Button>
      </div>
    );
  }

  return (
    // ... contenu de la page
  );
}
```

---

## 📄 ANNEXE C: ÉMISSION D'ÉVÉNEMENTS WEBSOCKET DEPUIS LE BACKEND

### Où Émettre les Événements

Ajoute ces appels dans les services/routes existants:

```typescript
// Dans src/routes/payments.routes.ts - après création paiement
import { emitToUser, emitToRole, WS_EVENTS } from '../websocket';

router.post('/:id/mark-paid', authenticate, async (req, res) => {
  // ... logique existante ...
  
  // Émettre notification
  emitToRole('manager', WS_EVENTS.PAYMENT_RECEIVED, {
    paymentId: payment.id,
    amount: payment.amount,
    customerName: customer.company_name
  });
});

// Dans src/agents/phone/PhoneAgent.ts - lors d'un appel
emitToAll(WS_EVENTS.CALL_STARTED, {
  callSid: call.sid,
  customerId: customer.id,
  agentId: agent.id
});

// Dans src/routes/campaigns.routes.ts - changement statut
emitToRole('agent', WS_EVENTS.CAMPAIGN_STATUS_CHANGED, {
  campaignId: campaign.id,
  status: newStatus
});
```

### Service de Notifications

Crée un service pour centraliser la création de notifications:

```typescript
// src/services/NotificationService.ts
import { DatabaseService } from '../core/services/database';
import { emitToUser, WS_EVENTS } from '../websocket';

export class NotificationService {
  private db: DatabaseService;
  
  constructor() {
    this.db = new DatabaseService();
  }
  
  async create(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    link?: string;
  }) {
    const result = await this.db.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, notification.type, notification.title, notification.message, notification.link]
    );
    
    // Émettre en temps réel
    emitToUser(userId, WS_EVENTS.NOTIFICATION_NEW, result.rows[0]);
    
    return result.rows[0];
  }
  
  async notifyPaymentReceived(userId: string, payment: any) {
    return this.create(userId, {
      type: 'payment',
      title: 'Paiement reçu',
      message: `Paiement de ${payment.amount}$ reçu de ${payment.customerName}`,
      link: `/payments/${payment.id}`
    });
  }
  
  async notifyCallCompleted(userId: string, call: any) {
    return this.create(userId, {
      type: 'call',
      title: 'Appel terminé',
      message: `Appel avec ${call.customerName} - ${call.outcome}`,
      link: `/recordings/${call.recordingId}`
    });
  }
  
  async notifyCampaignCompleted(userId: string, campaign: any) {
    return this.create(userId, {
      type: 'campaign',
      title: 'Campagne terminée',
      message: `La campagne "${campaign.name}" est terminée`,
      link: `/campaigns/${campaign.id}/report`
    });
  }
}

export const notificationService = new NotificationService();
```

---

## 📄 ANNEXE D: DONNÉES DE SEED POUR TESTS

### Script de Seed: `database/seeds/001_test_data.sql`

```sql
-- Seed data for testing frontend integration
-- Run after migration 009

-- Test Users (password: Test123!)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@mojavox.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qQOXmNJKJKJKJK', 'Admin', 'User', 'admin', true),
  ('22222222-2222-2222-2222-222222222222', 'manager@mojavox.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qQOXmNJKJKJKJK', 'Manager', 'User', 'manager', true),
  ('33333333-3333-3333-3333-333333333333', 'agent@mojavox.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qQOXmNJKJKJKJK', 'Agent', 'User', 'agent', true)
ON CONFLICT (email) DO NOTHING;

-- Test Notifications
INSERT INTO notifications (user_id, type, title, message, link) VALUES
  ('11111111-1111-1111-1111-111111111111', 'payment', 'Nouveau paiement', 'Paiement de 5,000$ reçu de Acme Corp', '/payments/1'),
  ('11111111-1111-1111-1111-111111111111', 'call', 'Appel terminé', 'Appel avec TechStart Inc - Promesse de paiement', '/recordings/1'),
  ('11111111-1111-1111-1111-111111111111', 'campaign', 'Campagne terminée', 'La campagne Q1 Recovery est terminée', '/campaigns/1/report'),
  ('22222222-2222-2222-2222-222222222222', 'system', 'Mise à jour système', 'Nouvelle version disponible', '/settings')
ON CONFLICT DO NOTHING;

-- Test Segments
INSERT INTO debtor_segments (name, description, filters, color, customer_count, total_debt, created_by) VALUES
  ('High Risk', 'Clients à haut risque de défaut', '{"riskLevel": "high"}', '#EF4444', 45, 125000.00, '11111111-1111-1111-1111-111111111111'),
  ('Medium Risk', 'Clients à risque modéré', '{"riskLevel": "medium"}', '#F59E0B', 120, 340000.00, '11111111-1111-1111-1111-111111111111'),
  ('Low Risk', 'Clients à faible risque', '{"riskLevel": "low"}', '#10B981', 200, 180000.00, '11111111-1111-1111-1111-111111111111'),
  ('New Accounts', 'Nouveaux comptes < 30 jours', '{"accountAge": "new"}', '#3B82F6', 35, 75000.00, '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Test User Tasks
INSERT INTO user_tasks (title, description, priority, status, due_date, assigned_to, created_by) VALUES
  ('Réviser scripts Q1', 'Mettre à jour les scripts pour le nouveau trimestre', 'high', 'pending', CURRENT_DATE + INTERVAL '3 days', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('Former nouveaux agents', 'Session de formation pour les 3 nouveaux agents', 'medium', 'in_progress', CURRENT_DATE + INTERVAL '7 days', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('Rapport mensuel', 'Préparer le rapport de performance mensuel', 'urgent', 'pending', CURRENT_DATE + INTERVAL '1 day', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Test Email Templates
INSERT INTO email_templates (name, subject, body, category, variables, created_by) VALUES
  ('Premier rappel', 'Rappel de paiement - Facture {{invoice_number}}', 'Bonjour {{customer_name}},\n\nNous vous rappelons que votre facture {{invoice_number}} d''un montant de {{amount}} est en attente de paiement.\n\nCordialement,\nL''équipe MOJAVOX', 'reminder', ARRAY['customer_name', 'invoice_number', 'amount'], '11111111-1111-1111-1111-111111111111'),
  ('Deuxième rappel', 'URGENT: Facture {{invoice_number}} en retard', 'Bonjour {{customer_name}},\n\nMalgré notre précédent rappel, votre facture {{invoice_number}} reste impayée.\n\nMerci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\nL''équipe MOJAVOX', 'reminder', ARRAY['customer_name', 'invoice_number', 'amount'], '11111111-1111-1111-1111-111111111111'),
  ('Confirmation de paiement', 'Confirmation de paiement - Merci!', 'Bonjour {{customer_name}},\n\nNous confirmons la réception de votre paiement de {{amount}} pour la facture {{invoice_number}}.\n\nMerci de votre confiance.\n\nCordialement,\nL''équipe MOJAVOX', 'confirmation', ARRAY['customer_name', 'invoice_number', 'amount'], '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Test Reports
INSERT INTO reports (name, type, status, filters, created_by) VALUES
  ('Rapport Q4 2025', 'collection', 'completed', '{"quarter": "Q4", "year": 2025}', '11111111-1111-1111-1111-111111111111'),
  ('Performance Agents Janvier', 'performance', 'completed', '{"month": "2026-01"}', '11111111-1111-1111-1111-111111111111'),
  ('Conformité TCPA', 'compliance', 'pending', '{"period": "2026-01"}', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;
```

---

## 📄 ANNEXE E: TESTS D'INTÉGRATION

### Script de Test: `tests/integration/frontend-api.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
let authToken: string;

describe('Frontend API Integration Tests', () => {
  beforeAll(async () => {
    // Login
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mojavox.ai', password: 'Test123!' })
    });
    const data = await response.json();
    authToken = data.data.token;
  });

  describe('Dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await fetch(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('kpis');
      expect(data.data).toHaveProperty('recoveryTrend');
      expect(data.data).toHaveProperty('dailyCalls');
    });
  });

  describe('Notifications', () => {
    it('should return user notifications', async () => {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Segments', () => {
    it('should return debtor segments', async () => {
      const response = await fetch(`${API_URL}/segments`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Users', () => {
    it('should return users list', async () => {
      const response = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Reports', () => {
    it('should return reports list', async () => {
      const response = await fetch(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Settings', () => {
    it('should return system settings', async () => {
      const response = await fetch(`${API_URL}/settings`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(typeof data.data).toBe('object');
    });
  });
});
```

---

## 📄 ANNEXE F: ORDRE D'EXÉCUTION RECOMMANDÉ

### Jour 1: Base de Données & Routes Core
1. ✅ Exécuter migration 009_frontend_integration.sql
2. ✅ Exécuter seed 001_test_data.sql
3. ✅ Créer notifications.routes.ts
4. ✅ Créer dashboard.routes.ts
5. ✅ Créer analytics.routes.ts
6. ✅ Tester ces 3 routes

### Jour 2: Routes CRUD
7. ✅ Créer users.routes.ts
8. ✅ Créer segments.routes.ts
9. ✅ Créer reports.routes.ts
10. ✅ Créer user-tasks.routes.ts
11. ✅ Créer email-templates.routes.ts
12. ✅ Tester toutes les routes CRUD

### Jour 3: Routes Avancées & WebSocket
13. ✅ Créer recordings.routes.ts
14. ✅ Créer settings.routes.ts
15. ✅ Créer webhooks.routes.ts
16. ✅ Configurer WebSocket
17. ✅ Mettre à jour routes/index.ts
18. ✅ Tester WebSocket

### Jour 4: Frontend Integration
19. ✅ Créer client/src/lib/api.ts
20. ✅ Créer client/src/lib/websocket.ts
21. ✅ Configurer Vite proxy
22. ✅ Mettre à jour Login.tsx pour utiliser API
23. ✅ Mettre à jour Dashboard.tsx pour utiliser API
24. ✅ Tester flux Login → Dashboard

### Jour 5: Intégration Complète
25. ✅ Mettre à jour toutes les pages restantes
26. ✅ Supprimer mockData.ts
27. ✅ Tests d'intégration complets
28. ✅ Corrections bugs
29. ✅ Documentation finale

---

## 🎯 CRITÈRES DE SUCCÈS

L'intégration est **COMPLÈTE** quand:

1. ✅ Toutes les nouvelles tables sont créées et peuplées
2. ✅ Tous les nouveaux endpoints répondent correctement
3. ✅ Le WebSocket se connecte et reçoit les événements
4. ✅ Le flux Login → Dashboard → Navigation fonctionne
5. ✅ Les données s'affichent correctement dans toutes les pages
6. ✅ Les opérations CRUD fonctionnent (créer, lire, modifier, supprimer)
7. ✅ Les notifications temps réel s'affichent
8. ✅ Aucune donnée mockée n'est utilisée (sauf pages statiques)
9. ✅ Les tests d'intégration passent
10. ✅ Aucune régression dans les fonctionnalités existantes

---

**FIN DU DOCUMENT - VERSION 2.1 COMPLÈTE**

**Document créé par Manus AI - 28 Janvier 2026**
