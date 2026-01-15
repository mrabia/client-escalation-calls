# Deployment & CI/CD Configuration

## Overview

This document outlines a comprehensive deployment strategy and CI/CD pipeline for the client-escalation-calls application. The goal is to achieve **automated, reliable, and secure deployments** with zero-downtime updates and rollback capabilities.

---

## Current State Analysis

### Existing Infrastructure
- ✅ Docker Compose configuration exists
- ✅ GitHub Actions CI/CD workflow configured
- ✅ Multi-stage Dockerfile (development, production)
- ✅ Health check endpoints
- ⚠️ **Deployment step not implemented** (placeholder only)
- ⚠️ **No environment-specific configurations**
- ⚠️ **No secrets management**
- ⚠️ **No rollback strategy**
- ⚠️ **No blue-green or canary deployments**
- ⚠️ **Missing production-grade configurations**

### Deployment Gaps
1. **Infrastructure as Code**: No Terraform/CloudFormation
2. **Container Orchestration**: No Kubernetes configuration
3. **Secrets Management**: Hardcoded secrets in docker-compose
4. **SSL/TLS**: No certificate management
5. **Database Migrations**: No automated migration strategy
6. **Backup/Restore**: No backup procedures
7. **Disaster Recovery**: No DR plan
8. **Scaling**: No auto-scaling configuration

---

## Deployment Architecture

### Target Environments

```
┌─────────────────────────────────────────────────────────┐
│                    ENVIRONMENTS                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Development → Staging → Production → DR                │
│      ↓            ↓          ↓          ↓              │
│   localhost   test env   live env   backup env         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 1. Development (Local)
- **Purpose**: Local development and testing
- **Infrastructure**: Docker Compose
- **Database**: Local PostgreSQL
- **Secrets**: `.env.local` file
- **URL**: `http://localhost:3000`

#### 2. Staging
- **Purpose**: Pre-production testing
- **Infrastructure**: Docker Compose or Kubernetes
- **Database**: Staging PostgreSQL (separate instance)
- **Secrets**: AWS Secrets Manager / HashiCorp Vault
- **URL**: `https://staging.example.com`
- **Data**: Anonymized production data

#### 3. Production
- **Purpose**: Live customer-facing environment
- **Infrastructure**: Kubernetes (recommended) or Docker Swarm
- **Database**: Production PostgreSQL (managed service)
- **Secrets**: AWS Secrets Manager / HashiCorp Vault
- **URL**: `https://api.example.com`
- **High Availability**: Multi-zone deployment

#### 4. Disaster Recovery
- **Purpose**: Backup environment for failover
- **Infrastructure**: Mirror of production (scaled down)
- **Database**: Replicated from production
- **Activation**: Manual or automatic failover
- **URL**: `https://dr.example.com`

---

## Deployment Options

### Option A: Docker Compose (Simple)

**Best For**: Small teams, MVP, low traffic  
**Pros**: Simple, fast setup, low cost  
**Cons**: Limited scaling, manual management  
**Estimated Cost**: $50-200/month

**Architecture**:
```
┌─────────────────────────────────────────┐
│         Single Server (VPS)             │
├─────────────────────────────────────────┤
│  Nginx (Reverse Proxy + SSL)           │
│  ├─ App Container (3 replicas)          │
│  ├─ PostgreSQL Container                │
│  ├─ Redis Container                     │
│  ├─ Qdrant Container                    │
│  ├─ Prometheus Container                │
│  └─ Grafana Container                   │
└─────────────────────────────────────────┘
```

---

### Option B: Kubernetes (Recommended)

**Best For**: Production, scalability, high availability  
**Pros**: Auto-scaling, self-healing, zero-downtime  
**Cons**: Complex setup, higher cost  
**Estimated Cost**: $200-1,000/month

**Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│              Kubernetes Cluster (EKS/GKE/AKS)           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Ingress Controller (NGINX/Traefik)            │   │
│  │  ├─ SSL Termination (cert-manager)              │   │
│  │  └─ Load Balancing                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Application Pods (3-10 replicas)               │   │
│  │  ├─ Auto-scaling (HPA)                          │   │
│  │  ├─ Health checks                               │   │
│  │  └─ Rolling updates                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Stateful Services                              │   │
│  │  ├─ PostgreSQL (StatefulSet or RDS)            │   │
│  │  ├─ Redis (StatefulSet or ElastiCache)         │   │
│  │  └─ Qdrant (StatefulSet)                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Monitoring Stack                               │   │
│  │  ├─ Prometheus (StatefulSet)                    │   │
│  │  ├─ Grafana (Deployment)                        │   │
│  │  └─ Jaeger (Deployment)                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Option C: Serverless (Future)

**Best For**: Variable traffic, cost optimization  
**Pros**: Pay-per-use, infinite scaling  
**Cons**: Cold starts, vendor lock-in  
**Estimated Cost**: $100-500/month (usage-based)

**Components**:
- AWS Lambda / Google Cloud Functions (API endpoints)
- AWS Fargate (long-running processes)
- Managed databases (RDS, ElastiCache, etc.)

---

## Recommended: Kubernetes Deployment

### Infrastructure Components

#### 1. Kubernetes Cluster

**Managed Kubernetes Options**:
- **AWS EKS** (Elastic Kubernetes Service)
- **Google GKE** (Google Kubernetes Engine)
- **Azure AKS** (Azure Kubernetes Service)
- **DigitalOcean Kubernetes**

**Cluster Specifications (Production)**:
- **Node Count**: 3-5 nodes (multi-zone)
- **Node Type**: 4 vCPU, 16 GB RAM (e.g., t3.xlarge)
- **Auto-scaling**: 3-10 nodes
- **Kubernetes Version**: 1.28+

---

#### 2. Application Deployment

**File**: `/k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client-escalation-calls
  namespace: production
  labels:
    app: client-escalation-calls
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: client-escalation-calls
  template:
    metadata:
      labels:
        app: client-escalation-calls
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: client-escalation-calls
      containers:
      - name: app
        image: your-registry/client-escalation-calls:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        - containerPort: 9090
          name: metrics
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: openai-api-key
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: anthropic-api-key
        - name: GOOGLE_AI_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: google-ai-api-key
        - name: TWILIO_ACCOUNT_SID
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: twilio-account-sid
        - name: TWILIO_AUTH_TOKEN
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: twilio-auth-token
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/v1/health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: logs
          mountPath: /app/logs
        - name: uploads
          mountPath: /app/uploads
      volumes:
      - name: logs
        persistentVolumeClaim:
          claimName: app-logs-pvc
      - name: uploads
        persistentVolumeClaim:
          claimName: app-uploads-pvc
      imagePullSecrets:
      - name: registry-credentials
```

---

#### 3. Service

**File**: `/k8s/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: client-escalation-calls
  namespace: production
  labels:
    app: client-escalation-calls
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  - port: 9090
    targetPort: 9090
    protocol: TCP
    name: metrics
  selector:
    app: client-escalation-calls
```

---

#### 4. Ingress

**File**: `/k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: client-escalation-calls
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-cert
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: client-escalation-calls
            port:
              number: 80
```

---

#### 5. Horizontal Pod Autoscaler

**File**: `/k8s/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: client-escalation-calls
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: client-escalation-calls
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
```

---

#### 6. ConfigMap

**File**: `/k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  LOG_LEVEL: "info"
  CORS_ORIGIN: "https://app.example.com"
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX_REQUESTS: "100"
  QDRANT_URL: "http://qdrant:6333"
  ELASTICSEARCH_URL: "http://elasticsearch:9200"
```

---

#### 7. Secrets (External Secrets Operator)

**File**: `/k8s/external-secret.yaml`

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
  - secretKey: database-url
    remoteRef:
      key: prod/client-escalation-calls/database-url
  - secretKey: redis-url
    remoteRef:
      key: prod/client-escalation-calls/redis-url
  - secretKey: jwt-secret
    remoteRef:
      key: prod/client-escalation-calls/jwt-secret
  - secretKey: openai-api-key
    remoteRef:
      key: prod/client-escalation-calls/openai-api-key
  - secretKey: anthropic-api-key
    remoteRef:
      key: prod/client-escalation-calls/anthropic-api-key
  - secretKey: google-ai-api-key
    remoteRef:
      key: prod/client-escalation-calls/google-ai-api-key
  - secretKey: twilio-account-sid
    remoteRef:
      key: prod/client-escalation-calls/twilio-account-sid
  - secretKey: twilio-auth-token
    remoteRef:
      key: prod/client-escalation-calls/twilio-auth-token
```

---

#### 8. PostgreSQL (StatefulSet)

**File**: `/k8s/postgres-statefulset.yaml`

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          value: client_escalation_calls
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secrets
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secrets
              key: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 8Gi
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

**Note**: For production, consider using managed databases (AWS RDS, Google Cloud SQL, Azure Database) instead of self-hosted PostgreSQL.

---

## CI/CD Pipeline

### GitHub Actions Workflow (Enhanced)

**File**: `.github/workflows/deploy.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop, staging ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Job 1: Test
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: client_escalation_calls_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
      
      qdrant:
        image: qdrant/qdrant:latest
        ports:
          - 6333:6333

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run type check
      run: npm run typecheck

    - name: Run tests
      run: npm run test:coverage
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/client_escalation_calls_test
        REDIS_URL: redis://localhost:6379
        QDRANT_URL: http://localhost:6333
        JWT_SECRET: test-secret-key

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
        files: ./coverage/lcov.info
        fail_ci_if_error: true

  # Job 2: Security Scan
  security:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run npm audit
      run: npm audit --audit-level high
      continue-on-error: true

    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      continue-on-error: true

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy results to GitHub Security
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  # Job 3: Build Docker Image
  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    permissions:
      contents: read
      packages: write
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha,prefix={{branch}}-

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        target: production

    - name: Scan Docker image
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        format: 'sarif'
        output: 'trivy-image-results.sarif'

  # Job 4: Deploy to Staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.example.com
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}

    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/client-escalation-calls \
          app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
          -n staging
        kubectl rollout status deployment/client-escalation-calls -n staging

    - name: Run smoke tests
      run: |
        npm run test:e2e:staging
      env:
        API_URL: https://staging.example.com

  # Job 5: Deploy to Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://api.example.com
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG_PRODUCTION }}

    - name: Run database migrations
      run: |
        kubectl run migration-${{ github.sha }} \
          --image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
          --restart=Never \
          --command -- npm run migrate:up
        kubectl wait --for=condition=complete --timeout=300s job/migration-${{ github.sha }}

    - name: Deploy to Kubernetes (Blue-Green)
      run: |
        # Deploy new version (green)
        kubectl apply -f k8s/deployment-green.yaml
        kubectl set image deployment/client-escalation-calls-green \
          app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
          -n production
        
        # Wait for rollout
        kubectl rollout status deployment/client-escalation-calls-green -n production
        
        # Run smoke tests
        npm run test:smoke:production
        
        # Switch traffic to green
        kubectl patch service client-escalation-calls \
          -p '{"spec":{"selector":{"version":"green"}}}' \
          -n production
        
        # Wait and verify
        sleep 30
        
        # Scale down blue (old version)
        kubectl scale deployment/client-escalation-calls-blue --replicas=0 -n production

    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: 'Deployment to production completed'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      if: always()

  # Job 6: Rollback (Manual)
  rollback:
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    environment:
      name: production
    
    steps:
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG_PRODUCTION }}

    - name: Rollback deployment
      run: |
        kubectl rollout undo deployment/client-escalation-calls -n production
        kubectl rollout status deployment/client-escalation-calls -n production

    - name: Notify rollback
      uses: 8398a7/action-slack@v3
      with:
        status: 'warning'
        text: 'Production deployment rolled back'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Database Migration Strategy

### Migration Tools

**Recommended**: **node-pg-migrate** (already in use)

### Migration Workflow

```bash
# Create new migration
npm run migrate:create <migration_name>

# Run migrations (up)
npm run migrate:up

# Rollback migrations (down)
npm run migrate:down

# Check migration status
npm run migrate:status
```

### Automated Migrations in CI/CD

```yaml
# In deployment job
- name: Run database migrations
  run: |
    kubectl run migration-${{ github.sha }} \
      --image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
      --restart=Never \
      --env="DATABASE_URL=${{ secrets.DATABASE_URL }}" \
      --command -- npm run migrate:up
```

### Migration Best Practices

1. **Always test migrations** in staging first
2. **Make migrations reversible** (implement `down` function)
3. **Avoid data loss** (use `ALTER TABLE ADD COLUMN` instead of `DROP/CREATE`)
4. **Run migrations before deployment**
5. **Keep migrations small and focused**
6. **Version control all migrations**
7. **Backup database before migrations**

---

## Secrets Management

### Option A: AWS Secrets Manager (Recommended)

**Setup**:
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Create SecretStore
kubectl apply -f k8s/secret-store.yaml
```

**File**: `/k8s/secret-store.yaml`

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

**Store secrets in AWS**:
```bash
aws secretsmanager create-secret \
  --name prod/client-escalation-calls/database-url \
  --secret-string "postgresql://user:pass@host:5432/db"
```

---

### Option B: HashiCorp Vault

**Setup**:
```bash
# Install Vault
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault -n vault --create-namespace
```

**Store secrets**:
```bash
vault kv put secret/prod/client-escalation-calls \
  database-url="postgresql://..." \
  jwt-secret="..." \
  openai-api-key="..."
```

---

## SSL/TLS Certificate Management

### cert-manager (Automated)

**Install cert-manager**:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

**Create ClusterIssuer**:

**File**: `/k8s/cluster-issuer.yaml`

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

**Certificates are automatically provisioned** when Ingress is created with `cert-manager.io/cluster-issuer` annotation.

---

## Backup & Restore Strategy

### Database Backups

#### Automated Backups (CronJob)

**File**: `/k8s/backup-cronjob.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql.gz"
              pg_dump $DATABASE_URL | gzip > /backups/$BACKUP_FILE
              # Upload to S3
              aws s3 cp /backups/$BACKUP_FILE s3://your-backup-bucket/postgres/$BACKUP_FILE
              # Cleanup old local backups
              find /backups -name "backup-*.sql.gz" -mtime +7 -delete
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
            volumeMounts:
            - name: backups
              mountPath: /backups
          volumes:
          - name: backups
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

#### Manual Backup

```bash
# Backup
kubectl exec -it postgres-0 -n production -- \
  pg_dump -U postgres client_escalation_calls | gzip > backup.sql.gz

# Upload to S3
aws s3 cp backup.sql.gz s3://your-backup-bucket/manual/backup-$(date +%Y%m%d).sql.gz
```

#### Restore

```bash
# Download from S3
aws s3 cp s3://your-backup-bucket/postgres/backup-20260109.sql.gz ./

# Restore
gunzip -c backup-20260109.sql.gz | \
  kubectl exec -i postgres-0 -n production -- \
  psql -U postgres -d client_escalation_calls
```

---

## Disaster Recovery Plan

### RTO & RPO Targets

- **RTO** (Recovery Time Objective): < 1 hour
- **RPO** (Recovery Point Objective): < 15 minutes

### DR Strategy

#### 1. Database Replication
- **Primary**: Production database (us-east-1)
- **Replica**: DR database (us-west-2)
- **Replication**: Continuous (streaming replication)

#### 2. Application Deployment
- **DR Cluster**: Kubernetes cluster in us-west-2
- **Deployment**: Same configuration as production
- **Scaling**: Scaled down (1 replica) until failover

#### 3. Failover Procedure

**Automatic Failover** (Route53 Health Checks):
```yaml
# Route53 health check monitors production
# Automatically switches DNS to DR on failure
```

**Manual Failover**:
```bash
# 1. Promote DR database to primary
aws rds promote-read-replica --db-instance-identifier dr-database

# 2. Scale up DR application
kubectl scale deployment/client-escalation-calls --replicas=3 -n production

# 3. Update DNS
aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch file://failover-dns.json

# 4. Verify
curl https://api.example.com/health
```

#### 4. Failback Procedure

```bash
# 1. Set up replication from DR to original primary
# 2. Verify data consistency
# 3. Switch DNS back to original primary
# 4. Scale down DR cluster
```

---

## Monitoring Deployment Health

### Deployment Metrics

```typescript
// Track deployment events
deployment_started_total
deployment_completed_total
deployment_failed_total
deployment_duration_seconds
deployment_rollback_total
```

### Health Checks

```typescript
// Kubernetes probes
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/v1/health/ready', async (req, res) => {
  const dbHealthy = await checkDatabase();
  const redisHealthy = await checkRedis();
  const qdrantHealthy = await checkQdrant();
  
  if (dbHealthy && redisHealthy && qdrantHealthy) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});
```

---

## Cost Optimization

### Infrastructure Costs (Estimated)

#### Option A: Docker Compose (Single Server)
- **VPS**: $50-100/month (4 vCPU, 16 GB RAM)
- **Managed PostgreSQL**: $50-100/month
- **Managed Redis**: $20-50/month
- **Backups**: $10-20/month
- **Total**: **$130-270/month**

#### Option B: Kubernetes (Production)
- **Kubernetes Cluster**: $150-300/month (3 nodes)
- **Managed PostgreSQL**: $100-200/month
- **Managed Redis**: $50-100/month
- **Load Balancer**: $20-40/month
- **Storage**: $30-60/month
- **Backups**: $20-40/month
- **Total**: **$370-740/month**

### Cost Optimization Strategies

1. **Use spot instances** for non-critical workloads (50-70% savings)
2. **Auto-scaling**: Scale down during off-peak hours
3. **Reserved instances**: Commit to 1-3 years for 30-50% discount
4. **Right-sizing**: Monitor and adjust resource allocations
5. **Storage optimization**: Use lifecycle policies for backups
6. **CDN**: Offload static assets (CloudFront, Cloudflare)

---

## Implementation Timeline

### Week 1: Infrastructure Setup
- **Day 1-2**: Set up Kubernetes cluster
- **Day 3-4**: Configure managed databases (PostgreSQL, Redis)
- **Day 5**: Set up secrets management (AWS Secrets Manager)

### Week 2: Kubernetes Configuration
- **Day 1-2**: Create Kubernetes manifests (Deployment, Service, Ingress)
- **Day 3**: Configure HPA and resource limits
- **Day 4**: Set up cert-manager for SSL
- **Day 5**: Test deployments in staging

### Week 3: CI/CD Pipeline
- **Day 1-2**: Enhance GitHub Actions workflow
- **Day 3**: Implement blue-green deployment
- **Day 4**: Add automated testing and security scans
- **Day 5**: Test full CI/CD pipeline

### Week 4: Backup & DR
- **Day 1-2**: Implement automated backups
- **Day 3**: Set up DR environment
- **Day 4**: Test failover procedures
- **Day 5**: Document runbooks

### Week 5: Production Deployment
- **Day 1-2**: Deploy to production
- **Day 3**: Monitor and optimize
- **Day 4**: Load testing
- **Day 5**: Final documentation and handoff

---

## Success Metrics

### Deployment Goals
- ✅ **Zero-downtime deployments**
- ✅ **< 5 minute deployment time**
- ✅ **< 1 minute rollback time**
- ✅ **99.9% uptime SLA**
- ✅ **Automated deployments** (no manual steps)

### Reliability Goals
- ✅ **< 1 hour RTO** (Recovery Time Objective)
- ✅ **< 15 minute RPO** (Recovery Point Objective)
- ✅ **Daily automated backups**
- ✅ **Tested disaster recovery plan**

---

## Best Practices

### Deployment
1. **Always deploy to staging first**
2. **Run smoke tests after deployment**
3. **Monitor metrics during rollout**
4. **Keep rollback plan ready**
5. **Communicate deployments to team**

### Security
1. **Never commit secrets to Git**
2. **Use secrets management tools**
3. **Rotate secrets regularly**
4. **Scan images for vulnerabilities**
5. **Use least privilege access**

### Reliability
1. **Implement health checks**
2. **Use rolling updates**
3. **Set resource limits**
4. **Enable auto-scaling**
5. **Test disaster recovery regularly**

---

## Next Steps

1. **Week 1**: Set up Kubernetes cluster and managed services
2. **Week 2**: Create Kubernetes manifests and test deployments
3. **Week 3**: Implement CI/CD pipeline
4. **Week 4**: Set up backup and disaster recovery
5. **Week 5**: Deploy to production

---

**Status**: 📋 Planning Complete  
**Next Action**: Begin infrastructure setup  
**Estimated Completion**: 5 weeks from start
