# Security & Compliance Architecture

**Version**: 1.0  
**Last Updated**: January 9, 2026  
**Status**: Phase 7 Implementation

---

## 🎯 Overview

This document outlines the security and compliance architecture for the Client Escalation Calls application, ensuring protection of customer data, regulatory compliance (TCPA, GDPR, PCI-DSS), and secure access control.

---

## 🔐 Security Layers

### Layer 1: Authentication
**Purpose**: Verify user identity

**Components**:
- JWT (JSON Web Tokens) for stateless authentication
- Refresh tokens for long-lived sessions
- Password hashing with bcrypt (cost factor: 12)
- Session management with Redis
- Multi-factor authentication (MFA) support

**Flow**:
```
User → Login → Validate Credentials → Generate JWT + Refresh Token → Store Session → Return Tokens
```

---

### Layer 2: Authorization
**Purpose**: Control access to resources

**Model**: Role-Based Access Control (RBAC)

**Roles**:
1. **Admin** - Full system access
   - Manage users, campaigns, settings
   - View all data
   - Configure system
   
2. **Manager** - Campaign and team management
   - Create/edit campaigns
   - View team performance
   - Manage agents
   
3. **Agent** - Execute collection tasks
   - View assigned tasks
   - Execute actions (email, call, SMS)
   - Log outcomes
   
4. **Viewer** - Read-only access
   - View dashboards
   - View reports
   - No modifications

**Permissions Matrix**:
| Resource | Admin | Manager | Agent | Viewer |
|----------|-------|---------|-------|--------|
| Users | CRUD | R | R | R |
| Campaigns | CRUD | CRUD | R | R |
| Tasks | CRUD | CRUD | RU | R |
| Customers | CRUD | RU | RU | R |
| Settings | CRUD | R | - | - |
| Reports | R | R | R | R |

---

### Layer 3: Data Protection
**Purpose**: Protect sensitive data

**Encryption**:
- **At Rest**: AES-256 for PII and payment data
- **In Transit**: TLS 1.3 for all communications
- **Database**: Column-level encryption for sensitive fields

**Data Masking**:
- Logs: Mask PII, payment info, phone numbers
- UI: Partial masking for non-admin users
- API Responses: Filter sensitive fields based on role

**Sensitive Data**:
- Customer names, emails, phone numbers
- Payment information
- Social security numbers (if applicable)
- Authentication credentials

---

### Layer 4: TCPA Compliance
**Purpose**: Comply with Telephone Consumer Protection Act

**Requirements**:
1. **Prior Express Consent**: Must have consent before contact
2. **Opt-Out Management**: Honor do-not-call/email/SMS requests
3. **Time Restrictions**: No calls before 8 AM or after 9 PM local time
4. **Frequency Limits**: Respect contact frequency limits
5. **Identification**: Clearly identify caller/sender

**Implementation**:
- Consent tracking database
- DNC (Do Not Call) list management
- Opt-out webhook handlers
- Time zone aware scheduling
- Contact frequency counters

---

### Layer 5: Security Hardening
**Purpose**: Prevent attacks and abuse

**Measures**:
- **Rate Limiting**: Prevent brute force and DoS
- **Input Validation**: Prevent injection attacks
- **CORS**: Restrict cross-origin requests
- **CSRF Protection**: Prevent cross-site request forgery
- **Security Headers**: Helmet.js for HTTP headers
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Prevention**: Input sanitization and CSP

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Web Dashboard, Mobile App, External Integrations)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (Express)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Security Middleware Stack                            │  │
│  │  1. Rate Limiter                                      │  │
│  │  2. CORS Handler                                      │  │
│  │  3. Helmet (Security Headers)                         │  │
│  │  4. JWT Validator                                     │  │
│  │  5. RBAC Enforcer                                     │  │
│  │  6. Input Validator                                   │  │
│  │  7. Audit Logger                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth Service │  │ TCPA Service │  │ Encryption   │     │
│  │              │  │              │  │ Service      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Redis        │  │ Audit Log    │     │
│  │ (Encrypted)  │  │ (Sessions)   │  │ (Immutable)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Authentication Flow

### Login Flow
```
1. User submits credentials (email + password)
2. System validates credentials
3. System checks if account is active and not locked
4. System generates JWT access token (15 min expiry)
5. System generates refresh token (7 days expiry)
6. System stores session in Redis
7. System returns tokens to client
8. Client stores tokens (access token in memory, refresh token in httpOnly cookie)
```

### Token Refresh Flow
```
1. Client detects expired access token
2. Client sends refresh token to /auth/refresh endpoint
3. System validates refresh token
4. System checks if session still valid in Redis
5. System generates new access token
6. System returns new access token
7. Client updates access token in memory
```

### Logout Flow
```
1. Client sends logout request with access token
2. System invalidates session in Redis
3. System adds access token to blacklist (until expiry)
4. System returns success
5. Client clears tokens
```

---

## 🛡️ Authorization Flow

### Request Authorization
```
1. Client sends request with JWT in Authorization header
2. Middleware validates JWT signature and expiry
3. Middleware extracts user ID and role from JWT
4. Middleware checks if user has permission for requested resource
5. If authorized, request proceeds to handler
6. If unauthorized, return 403 Forbidden
```

### Permission Check
```typescript
function checkPermission(user: User, resource: string, action: string): boolean {
  const userRole = user.role;
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions[resource]?.includes(action) || false;
}
```

---

## 🔒 Data Protection Implementation

### Encryption Service

**At Rest Encryption**:
```typescript
class EncryptionService {
  // Encrypt sensitive fields before storing
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted: encrypted.toString('hex'),
      authTag: authTag.toString('hex'),
    });
  }
  
  // Decrypt when retrieving
  decrypt(ciphertext: string): string {
    const { iv, encrypted, authTag } = JSON.parse(ciphertext);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  }
}
```

**Data Masking**:
```typescript
class DataMaskingService {
  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local[0]}***@${domain}`;
  }
  
  maskPhone(phone: string): string {
    return `***-***-${phone.slice(-4)}`;
  }
  
  maskSSN(ssn: string): string {
    return `***-**-${ssn.slice(-4)}`;
  }
}
```

---

## 📞 TCPA Compliance Implementation

### Consent Management

**Consent Record**:
```typescript
interface ConsentRecord {
  customerId: string;
  consentType: 'call' | 'email' | 'sms';
  granted: boolean;
  grantedAt: Date;
  expiresAt: Date | null;
  source: string; // 'web_form', 'phone_call', 'email_reply'
  ipAddress?: string;
  userAgent?: string;
}
```

**Consent Validation**:
```typescript
class TCPAService {
  async validateConsent(customerId: string, contactType: string): Promise<boolean> {
    const consent = await this.getConsent(customerId, contactType);
    
    if (!consent || !consent.granted) {
      return false;
    }
    
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      return false;
    }
    
    return true;
  }
}
```

### Opt-Out Management

**DNC List**:
```typescript
class DNCService {
  async addToDNC(customerId: string, type: 'call' | 'email' | 'sms'): Promise<void> {
    await db.query(
      'INSERT INTO dnc_list (customer_id, type, added_at) VALUES ($1, $2, NOW())',
      [customerId, type]
    );
    
    // Immediately cancel any pending tasks
    await this.cancelPendingTasks(customerId, type);
  }
  
  async isOnDNC(customerId: string, type: string): Promise<boolean> {
    const result = await db.query(
      'SELECT 1 FROM dnc_list WHERE customer_id = $1 AND type = $2',
      [customerId, type]
    );
    
    return result.rowCount > 0;
  }
}
```

### Contact Frequency Limits

**Frequency Rules**:
```typescript
interface FrequencyRule {
  type: 'call' | 'email' | 'sms';
  maxPerDay: number;
  maxPerWeek: number;
  minHoursBetween: number;
}

const DEFAULT_RULES: FrequencyRule[] = [
  { type: 'call', maxPerDay: 3, maxPerWeek: 10, minHoursBetween: 4 },
  { type: 'email', maxPerDay: 2, maxPerWeek: 7, minHoursBetween: 12 },
  { type: 'sms', maxPerDay: 1, maxPerWeek: 3, minHoursBetween: 24 },
];
```

**Frequency Validation**:
```typescript
class FrequencyService {
  async canContact(customerId: string, type: string): Promise<boolean> {
    const rule = this.getRule(type);
    const history = await this.getContactHistory(customerId, type);
    
    // Check daily limit
    const today = history.filter(h => isToday(h.timestamp));
    if (today.length >= rule.maxPerDay) {
      return false;
    }
    
    // Check weekly limit
    const thisWeek = history.filter(h => isThisWeek(h.timestamp));
    if (thisWeek.length >= rule.maxPerWeek) {
      return false;
    }
    
    // Check minimum time between contacts
    const lastContact = history[0];
    if (lastContact) {
      const hoursSince = (Date.now() - lastContact.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursSince < rule.minHoursBetween) {
        return false;
      }
    }
    
    return true;
  }
}
```

### Time Restrictions

**Time Validation**:
```typescript
class TimeRestrictionService {
  canContactNow(customerTimezone: string): boolean {
    const customerTime = moment().tz(customerTimezone);
    const hour = customerTime.hour();
    
    // TCPA: No calls before 8 AM or after 9 PM local time
    return hour >= 8 && hour < 21;
  }
}
```

---

## 🛡️ Security Hardening

### Rate Limiting

**Configuration**:
```typescript
const rateLimitConfig = {
  // General API
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 login attempts per window
  },
  
  // Sensitive operations
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
  },
};
```

### Input Validation

**Validation Middleware**:
```typescript
import Joi from 'joi';

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  }),
  
  createCustomer: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  }),
};

function validate(schema: Joi.Schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
}
```

### Security Headers

**Helmet Configuration**:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## 📝 Audit Trail

### Audit Log Structure

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  action: string; // 'create', 'read', 'update', 'delete'
  resource: string; // 'customer', 'campaign', 'task'
  resourceId: string;
  changes?: {
    before: any;
    after: any;
  };
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}
```

### Audit Logging

**Middleware**:
```typescript
function auditLog(action: string, resource: string) {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Capture original response
    const originalSend = res.send;
    res.send = function(data) {
      res.send = originalSend;
      
      // Log after response
      logAudit({
        timestamp: new Date(),
        userId: req.user?.id,
        userRole: req.user?.role,
        action,
        resource,
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: res.statusCode < 400,
        duration: Date.now() - startTime,
      });
      
      return res.send(data);
    };
    
    next();
  };
}
```

---

## 🔍 Compliance Reporting

### Reports

1. **Consent Report**: All consent records by customer
2. **DNC Report**: All customers on do-not-contact lists
3. **Contact Frequency Report**: Contact attempts vs limits
4. **Time Violation Report**: Contacts outside allowed hours
5. **Opt-Out Report**: All opt-out requests and handling

### Audit Report

**Query Example**:
```sql
-- All actions by user in date range
SELECT * FROM audit_log
WHERE user_id = $1
  AND timestamp BETWEEN $2 AND $3
ORDER BY timestamp DESC;

-- All failed authentication attempts
SELECT * FROM audit_log
WHERE action = 'login'
  AND success = false
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- All data access by resource
SELECT * FROM audit_log
WHERE resource = 'customer'
  AND action = 'read'
  AND timestamp BETWEEN $1 AND $2
GROUP BY user_id, user_role;
```

---

## 🚀 Deployment Security

### Environment Variables

**Required Secrets**:
```env
# Authentication
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
SESSION_SECRET=<strong-random-secret>

# Encryption
ENCRYPTION_KEY=<32-byte-hex-key>

# Database
DATABASE_URL=<encrypted-connection-string>

# External Services
OPENAI_API_KEY=<api-key>
TWILIO_AUTH_TOKEN=<auth-token>
```

### Security Checklist

- [ ] All secrets stored in secrets manager (not in code)
- [ ] TLS/HTTPS enabled on all endpoints
- [ ] Database connections encrypted
- [ ] Regular security audits scheduled
- [ ] Dependency vulnerability scanning enabled
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Audit logging enabled
- [ ] Backup encryption enabled
- [ ] Incident response plan documented

---

**Document Version**: 1.0  
**Last Review**: January 9, 2026  
**Next Review**: March 9, 2026  
**Owner**: Security Team
