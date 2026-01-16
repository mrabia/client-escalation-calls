# Security Audit Checklist

## Overview

This document provides a comprehensive security audit checklist for the Client Escalation Calls API. Use this checklist before each production deployment.

## Pre-Deployment Checklist

### 1. Secrets Management

- [ ] All secrets stored in Railway environment variables (not in code)
- [ ] `JWT_SECRET` is at least 32 random characters
- [ ] `JWT_REFRESH_SECRET` is different from `JWT_SECRET`
- [ ] `ENCRYPTION_KEY` is a 64-character hex string (32 bytes)
- [ ] Database passwords are strong (16+ characters, mixed case, numbers, symbols)
- [ ] API keys are not committed to version control
- [ ] `.env` files are in `.gitignore`

### 2. Authentication & Authorization

- [ ] JWT tokens have appropriate expiry times (15m access, 7d refresh)
- [ ] Refresh token rotation is enabled
- [ ] Session invalidation works on logout
- [ ] Password hashing uses bcrypt with 12+ rounds
- [ ] Rate limiting on login endpoint (max 10/15min)
- [ ] Account lockout after failed attempts
- [ ] Role-based access control (RBAC) enforced on all endpoints

### 3. Transport Security

- [ ] HTTPS enforced in production (Railway handles this)
- [ ] HSTS header enabled with 1-year max-age
- [ ] TLS 1.2 minimum version
- [ ] Secure cookies (HttpOnly, Secure, SameSite=Strict)
- [ ] No sensitive data in URLs/query strings

### 4. Input Validation

- [ ] All inputs validated with Joi schemas
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Request size limits enforced
- [ ] File upload validation (type, size, content)
- [ ] JSON depth limits configured

### 5. Headers & CORS

- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] CORS configured with specific origins (not `*`)
- [ ] `X-Powered-By` header removed

### 6. Database Security

- [ ] Database user has minimal required permissions
- [ ] Connection uses SSL in production
- [ ] Sensitive data encrypted at rest
- [ ] PII fields encrypted (SSN, credit cards, etc.)
- [ ] Audit logging enabled for sensitive operations
- [ ] Regular backups configured

### 7. Logging & Monitoring

- [ ] Sensitive data masked in logs (passwords, tokens, PII)
- [ ] Security events logged (login attempts, permission denials)
- [ ] Log rotation configured
- [ ] Alerting for suspicious activity
- [ ] No stack traces in production error responses

### 8. Dependencies

- [ ] No known vulnerabilities (`npm audit`)
- [ ] Dependencies up to date
- [ ] Lock file committed (`package-lock.json`)
- [ ] Only necessary dependencies included

---

## Security Tests

### Run Security Scan

```bash
# Check for vulnerabilities in dependencies
npm audit

# Run security-focused tests
npm test -- --grep "security"

# Check for secrets in code
npx secretlint .
```

### Manual Tests

1. **Authentication bypass**: Try accessing protected endpoints without token
2. **Token tampering**: Modify JWT payload and verify rejection
3. **SQL injection**: Test inputs with SQL metacharacters
4. **XSS**: Test inputs with script tags
5. **Rate limiting**: Verify limits are enforced
6. **CORS**: Verify cross-origin requests are blocked

---

## Vulnerability Response

### Severity Levels

| Level | Response Time | Examples |
|-------|--------------|----------|
| Critical | Immediate | RCE, SQL injection, auth bypass |
| High | 24 hours | XSS, CSRF, data exposure |
| Medium | 7 days | Information disclosure, weak crypto |
| Low | 30 days | Best practice violations |

### Response Process

1. **Identify**: Confirm and document the vulnerability
2. **Contain**: Apply temporary mitigation if needed
3. **Fix**: Develop and test the patch
4. **Deploy**: Push fix to production
5. **Verify**: Confirm fix is effective
6. **Document**: Update security documentation

---

## Compliance Requirements

### PCI DSS (if handling payment cards)

- [ ] Cardholder data encrypted in transit and at rest
- [ ] Access to cardholder data restricted
- [ ] Unique IDs for each person with access
- [ ] Audit trails for all access to cardholder data
- [ ] Regular security testing

### TCPA (for phone/SMS communications)

- [ ] Consent tracking implemented
- [ ] Do-not-call list checking enabled
- [ ] Time-of-day restrictions enforced
- [ ] Opt-out mechanism functional

### GDPR/CCPA (if applicable)

- [ ] Data subject access request handling
- [ ] Right to deletion implemented
- [ ] Data portability supported
- [ ] Privacy policy updated
- [ ] Consent management in place

---

## Security Contacts

- **Security Team**: security@example.com
- **Incident Response**: incidents@example.com
- **Bug Bounty**: bugbounty@example.com (if applicable)

---

## Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| YYYY-MM-DD | Name | Initial audit | Complete |

---

## Tools & Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
