# Monitoring & Observability Guide

## Overview

This guide covers monitoring, alerting, and observability for the Client Escalation Calls API.

## Endpoints

### Health Check

```
GET /api/v1/health
```

Returns system health status:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Metrics (Prometheus)

```
GET /api/v1/metrics
```

Returns Prometheus-compatible metrics.

### Dashboard Stats

```
GET /api/v1/stats
```

Returns dashboard summary statistics.

## Key Metrics

### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | Request latency |
| `http_requests_in_flight` | Gauge | Current active requests |
| `api_errors_total` | Counter | API errors by type |

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `campaigns_active` | Gauge | Active campaigns |
| `tasks_pending` | Gauge | Pending tasks |
| `tasks_completed_total` | Counter | Completed tasks |
| `contacts_attempted_total` | Counter | Contact attempts |
| `payments_collected_total` | Counter | Successful collections |

### Infrastructure Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `db_connections_active` | Gauge | Active DB connections |
| `db_query_duration_seconds` | Histogram | Query latency |
| `redis_connections_active` | Gauge | Redis connections |
| `memory_usage_bytes` | Gauge | Memory usage |

## Railway Observability

### Built-in Monitoring

Railway provides:

- **Metrics Dashboard**: CPU, Memory, Network
- **Log Aggregation**: Searchable logs
- **Deploy Tracking**: Deployment history

Access via: Railway Dashboard → Your Service → Metrics/Logs

### Log Levels

| Level | Usage |
|-------|-------|
| `error` | Application errors, exceptions |
| `warn` | Warnings, deprecations |
| `info` | Important events, requests |
| `debug` | Debug info (staging only) |

### Structured Logging

Logs are JSON-formatted for parsing:

```json
{
  "level": "info",
  "message": "Request completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "abc-123",
  "method": "POST",
  "path": "/api/v1/customers",
  "statusCode": 201,
  "duration": 45
}
```

## Alerting

### Recommended Alerts

#### Critical (Page Immediately)

- Health check failing for > 2 minutes
- Error rate > 10% for 5 minutes
- Database connection failures
- Memory > 90% for 10 minutes

#### Warning (Notify)

- Response time p95 > 2 seconds
- Error rate > 5% for 10 minutes
- Disk usage > 80%
- Rate limit exceeded frequently

### Railway Integrations

Connect alerts to:

- **Slack**: Railway → Settings → Integrations
- **Email**: Deployment notifications
- **Webhooks**: Custom integrations

## External Monitoring (Optional)

### Uptime Monitoring

Services like UptimeRobot, Pingdom:

```
Monitor URL: https://your-app.up.railway.app/api/v1/health
Expected: HTTP 200
Interval: 1 minute
```

### APM Integration

For deeper insights, consider:

- **Datadog**: `DD_API_KEY` environment variable
- **New Relic**: `NEW_RELIC_LICENSE_KEY`
- **Sentry**: Error tracking

## Dashboards

### Grafana Setup (Optional)

If using external Grafana:

1. Add Prometheus data source pointing to `/api/v1/metrics`
2. Import dashboard JSON from `config/grafana/`

### Key Dashboard Panels

1. **Request Rate**: `rate(http_requests_total[5m])`
2. **Error Rate**: `rate(api_errors_total[5m]) / rate(http_requests_total[5m])`
3. **Latency P95**: `histogram_quantile(0.95, http_request_duration_seconds_bucket)`
4. **Active Campaigns**: `campaigns_active`

## Troubleshooting

### High Error Rate

1. Check logs for error patterns
2. Verify database connectivity
3. Check external service status (Twilio, SMTP)
4. Review recent deployments

### High Latency

1. Check database query performance
2. Review Redis cache hit rate
3. Check for N+1 queries
4. Verify connection pool settings

### Memory Issues

1. Check for memory leaks in logs
2. Review heap snapshots
3. Increase service memory in Railway
4. Check for large payload handling

## Log Queries

### Railway Log Search

```bash
# Via CLI
railway logs --filter "level=error"
railway logs --filter "statusCode=500"

# Via Dashboard
# Use search bar with filters
```

### Common Queries

- Errors: `level:error`
- Slow requests: `duration:>1000`
- Auth failures: `message:"authentication failed"`
- Specific endpoint: `path:"/api/v1/customers"`

## Runbook Links

- [Incident Response](./INCIDENT_RESPONSE.md)
- [Database Operations](./DATABASE_OPS.md)
- [Deployment Rollback](./ROLLBACK.md)
