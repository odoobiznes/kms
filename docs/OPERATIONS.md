# KMS Operations Guide

## Service Management

### Systemd Services (Native)

| Service | Unit Name | Description |
|---|---|---|
| Next.js Frontend | kms-web.service | Port 3100, Next.js production server |
| MCP Server | kms-mcp.service | Port 8100, FastAPI via Uvicorn |
| Hocuspocus | kms-hocuspocus.service | Port 1234, Yjs WebSocket server |

#### Start/Stop/Restart

```bash
# Individual services
sudo systemctl start kms-web
sudo systemctl stop kms-web
sudo systemctl restart kms-web

# All KMS services at once
sudo systemctl restart kms-web kms-mcp kms-hocuspocus

# Check status of all
sudo systemctl status kms-web kms-mcp kms-hocuspocus

# Enable/disable on boot
sudo systemctl enable kms-web kms-mcp kms-hocuspocus
sudo systemctl disable kms-web kms-mcp kms-hocuspocus
```

### Docker Services

| Service | Container Name | Description |
|---|---|---|
| LiteLLM | infra-litellm-1 | AI Gateway, port 4100 |
| Redis | infra-redis-1 | Cache, port 6379 |
| n8n | infra-n8n-1 | Workflow engine, port 5678 |

#### Docker Management

```bash
cd /opt/kms/infra

# Start all
docker compose up -d

# Restart individual service
docker compose restart litellm
docker compose restart redis
docker compose restart n8n

# Stop all
docker compose down

# View status
docker compose ps

# Rebuild after config change
docker compose up -d --force-recreate litellm
```

### Full Stack Restart

```bash
# 1. Restart Docker services
cd /opt/kms/infra && docker compose restart

# 2. Restart systemd services
sudo systemctl restart kms-web kms-mcp kms-hocuspocus

# 3. Restart Nginx (if config changed)
sudo nginx -t && sudo systemctl reload nginx
```

---

## Log Management

### Systemd Service Logs

```bash
# Next.js frontend logs
journalctl -u kms-web -f              # Follow live
journalctl -u kms-web --since today   # Today's logs
journalctl -u kms-web -n 100          # Last 100 lines

# MCP Server logs
journalctl -u kms-mcp -f
journalctl -u kms-mcp --since "1 hour ago"

# Hocuspocus logs
journalctl -u kms-hocuspocus -f

# All KMS logs combined
journalctl -u kms-web -u kms-mcp -u kms-hocuspocus -f
```

### Docker Logs

```bash
cd /opt/kms/infra

# LiteLLM logs
docker compose logs litellm -f
docker compose logs litellm --tail 100

# Redis logs
docker compose logs redis -f

# n8n logs
docker compose logs n8n -f

# All Docker logs
docker compose logs -f
```

### Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log

# KMS-specific (filter by domain)
grep "kms.it-enterprise.cloud" /var/log/nginx/access.log | tail -50
```

### PostgreSQL Logs

```bash
sudo tail -f /var/log/postgresql/postgresql-17-main.log
```

---

## Health Checks

### Quick Health Check Script

```bash
# Check all services
echo "=== Systemd Services ==="
systemctl is-active kms-web kms-mcp kms-hocuspocus

echo "=== Docker Services ==="
cd /opt/kms/infra && docker compose ps --format "table {{.Service}}\t{{.Status}}"

echo "=== MCP Health ==="
curl -s http://127.0.0.1:8100/health | python3 -m json.tool

echo "=== Next.js ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/

echo "=== LiteLLM ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4100/health

echo "=== PostgreSQL ==="
pg_isready -p 5432

echo "=== Redis ==="
redis-cli -p 6379 ping

echo "=== Nginx ==="
sudo nginx -t 2>&1
```

### Port Check

```bash
ss -tlnp | grep -E '3100|1234|8100|4100|5678|6379|5432'
```

### SSL Certificate Check

```bash
echo | openssl s_client -connect kms.it-enterprise.cloud:443 -servername kms.it-enterprise.cloud 2>/dev/null | openssl x509 -noout -dates
```

---

## Troubleshooting

### Next.js (kms-web) Won't Start

1. Check logs: `journalctl -u kms-web -n 50`
2. Verify build exists: `ls /opt/kms/apps/web/.next/`
3. Rebuild if needed: `cd /opt/kms/apps/web && npm run build`
4. Check DATABASE_URL is correct in service file
5. Check PostgreSQL is running: `pg_isready`

### MCP Server (kms-mcp) Won't Start

1. Check logs: `journalctl -u kms-mcp -n 50`
2. Verify venv: `ls /opt/kms/apps/mcp-server/venv/bin/uvicorn`
3. Test manually: `cd /opt/kms/apps/mcp-server && ./venv/bin/uvicorn main:app --port 8100`
4. Check DB connection: `./venv/bin/python3 -c "import db; print(db.query_one('SELECT 1'))"`

### Hocuspocus Won't Start

1. Check logs: `journalctl -u kms-hocuspocus -n 50`
2. Verify node_modules: `ls /opt/kms/apps/hocuspocus/node_modules/@hocuspocus/`
3. Reinstall if needed: `cd /opt/kms/apps/hocuspocus && rm -rf node_modules && npm install`
4. Known issue: "must be owner of table documents" on yjs_state column creation - harmless, column already exists

### LiteLLM Not Responding

1. Check container: `cd /opt/kms/infra && docker compose ps litellm`
2. Check logs: `docker compose logs litellm --tail 50`
3. Verify API keys in .env: `cat /opt/kms/infra/.env | grep API_KEY`
4. Test model: `curl -s http://127.0.0.1:4100/v1/models -H "Authorization: Bearer YOUR_KEY"`
5. Restart: `docker compose restart litellm`

### WebSocket (Collaborative Editing) Not Working

1. Check Hocuspocus is running: `systemctl status kms-hocuspocus`
2. Check Nginx /ws proxy: `grep -A5 "location /ws" /etc/nginx/sites-enabled/kms-app`
3. Test WebSocket: `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://127.0.0.1:1234/`
4. Check browser console for WebSocket errors

### Database Connection Issues

```bash
# Test connection
PGPASSWORD=<password> psql -h 127.0.0.1 -U kms_user -d kms -c "SELECT 1"

# Check PostgreSQL is running
systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'kms'"

# Check for lock issues
sudo -u postgres psql -d kms -c "SELECT * FROM pg_locks WHERE NOT granted"
```

### 502 Bad Gateway

1. Check which backend is down (based on URL path)
2. Verify the backend port is listening: `ss -tlnp | grep PORT`
3. Check Nginx config: `sudo nginx -t`
4. Restart the failing backend service

### SSL Certificate Renewal Issues

```bash
# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Check certificate
sudo certbot certificates
```

---

## Backup & Restore

### Database Backup

```bash
# Full database dump
pg_dump -h 127.0.0.1 -U kms_user -d kms -F c -f /tmp/kms-backup-$(date +%Y%m%d).dump

# Schema only
pg_dump -h 127.0.0.1 -U kms_user -d kms --schema-only -f /tmp/kms-schema.sql

# Data only
pg_dump -h 127.0.0.1 -U kms_user -d kms --data-only -F c -f /tmp/kms-data.dump

# Specific tables only (KMS app tables, not n8n)
pg_dump -h 127.0.0.1 -U kms_user -d kms -F c \
  -t profiles -t projects -t project_members -t documents \
  -t doc_versions -t contributions -t stages -t votes \
  -t user_ai_config -t notifications -t integration_events \
  -f /tmp/kms-app-backup-$(date +%Y%m%d).dump
```

### Database Restore

```bash
# Restore from custom format dump
pg_restore -h 127.0.0.1 -U kms_user -d kms --clean --if-exists /tmp/kms-backup.dump

# Restore from SQL
psql -h 127.0.0.1 -U kms_user -d kms -f /tmp/kms-schema.sql
```

### Application Backup

```bash
# Backup application code (excluding node_modules, venv, .next)
tar czf /tmp/kms-app-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='venv' \
  --exclude='.git' \
  -C /opt kms

# Backup Docker volumes
docker run --rm -v kms-redis-data:/data -v /tmp:/backup alpine tar czf /backup/kms-redis-$(date +%Y%m%d).tar.gz /data
docker run --rm -v kms-n8n-data:/data -v /tmp:/backup alpine tar czf /backup/kms-n8n-$(date +%Y%m%d).tar.gz /data
```

### Backup to Storage Box

```bash
# Upload to Hetzner Storage Box
scp -P 23 /tmp/kms-backup-*.dump u458763-sub3@u458763.your-storagebox.de:backups/kms/
```

---

## Deployment Updates

### Update Application Code

```bash
cd /opt/kms
git pull origin main

# Rebuild Next.js if frontend changed
cd apps/web
npm install
npm run build
sudo systemctl restart kms-web

# Restart MCP if backend changed
sudo systemctl restart kms-mcp

# Restart Hocuspocus if changed
cd /opt/kms/apps/hocuspocus && npm install
sudo systemctl restart kms-hocuspocus
```

### Update Docker Services

```bash
cd /opt/kms/infra
docker compose pull
docker compose up -d
```

### Database Migration

```bash
# Apply new migration
PGPASSWORD=<password> psql -h 127.0.0.1 -U kms_user -d kms -f packages/db/migrations/002_new_migration.sql

# Or via sudo
sudo -u postgres psql -d kms -f packages/db/migrations/002_new_migration.sql
```

### Rollback

```bash
# Rollback code
cd /opt/kms
git log --oneline -5  # Find commit to rollback to
git checkout <commit-hash>

# Rebuild and restart
cd apps/web && npm run build
sudo systemctl restart kms-web kms-mcp kms-hocuspocus

# Rollback database (restore from backup)
pg_restore -h 127.0.0.1 -U kms_user -d kms --clean --if-exists /tmp/kms-backup-YYYYMMDD.dump
```

---

## Monitoring

### Resource Usage

```bash
# Memory usage per service
systemctl status kms-web kms-mcp kms-hocuspocus | grep Memory

# Docker resource usage
docker stats --no-stream infra-litellm-1 infra-redis-1 infra-n8n-1

# PostgreSQL database size
sudo -u postgres psql -d kms -c "SELECT pg_size_pretty(pg_database_size('kms'))"

# Table sizes
sudo -u postgres psql -d kms -c "
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::text))
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC
LIMIT 20"
```

### Active Connections

```bash
# PostgreSQL connections
sudo -u postgres psql -c "SELECT usename, application_name, state, count(*) FROM pg_stat_activity WHERE datname = 'kms' GROUP BY usename, application_name, state"

# Redis connections
redis-cli -p 6379 info clients
```

---

## Security Checklist

- [ ] All services bind to 127.0.0.1 (not 0.0.0.0)
- [ ] Nginx handles all external traffic with SSL
- [ ] API keys stored in .env (not committed to git)
- [ ] Database password is strong and unique
- [ ] HOCUSPOCUS_TOKEN is set (not default)
- [ ] WEBHOOK_SECRET is set (not default)
- [ ] SESSION_SECRET is set (not default)
- [ ] fail2ban is running
- [ ] SSH on non-standard port (22770)
- [ ] Certbot auto-renewal is configured
- [ ] PostgreSQL listens only on localhost

---

*Last updated: 2026-03-21*
