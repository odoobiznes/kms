# KMS - Claude CLI Project Instructions

## Project Identity
- **Name:** KMS - Knowledge Management System
- **Location:** /opt/kms on OPS server (157.180.86.49)
- **URL:** https://kms.it-enterprise.cloud
- **Role:** Level 2 Project Claude (part of OPS controller)

## Architecture Quick Reference
- Frontend: Next.js 15 on port 3100 (systemd kms-web.service)
- MCP Server: FastAPI on port 8100 (systemd kms-mcp.service)
- Hocuspocus: Yjs WebSocket on port 1234 (systemd kms-hocuspocus.service)
- AI Gateway: LiteLLM Docker on port 4100
- Workflow: n8n Docker on port 5678
- Cache: Redis Docker on port 6379
- Database: PostgreSQL 17 native on port 5432 (database: kms, user: kms_user)
- Reverse Proxy: Nginx with Let's Encrypt SSL

## Key Directories
- /opt/kms/apps/web/ - Next.js frontend (App Router)
- /opt/kms/apps/web/app/api/ - All API routes
- /opt/kms/apps/web/components/ - React components
- /opt/kms/apps/web/lib/ - Shared utilities (auth.ts, db.ts)
- /opt/kms/apps/mcp-server/ - FastAPI MCP server (main.py, db.py)
- /opt/kms/apps/hocuspocus/ - Yjs WebSocket server (server.js)
- /opt/kms/packages/db/migrations/ - SQL migration files
- /opt/kms/infra/ - Docker, env, LiteLLM config

## Development Rules

### Language
- UI text and user-facing messages: Czech (e.g., "Nazev je povinny", "Interni chyba serveru")
- Code, comments, variable names: English
- URL paths for user pages: Czech (e.g., /projekty, /dokumenty, /registrace)
- URL paths for API: English (e.g., /api/auth/login, /api/documents)

### Database
- All tables use UUID primary keys (uuid_generate_v4)
- All tables have created_at TIMESTAMPTZ DEFAULT NOW()
- Use JSONB for flexible content storage
- Connection: postgresql://kms_user@127.0.0.1:5432/kms
- Always use parameterized queries (never string interpolation)
- Web app uses pg Pool from lib/db.ts
- MCP server uses psycopg2 pool from db.py

### Authentication
- Web app: Session cookies via lib/auth.ts (scrypt + HMAC-SHA256)
- MCP server: Bearer token (LITELLM_MASTER_KEY or MCP_API_KEY)
- Hocuspocus: HOCUSPOCUS_TOKEN
- Webhooks: X-Webhook-Secret header
- Always call getSession() at the start of protected API routes

### AI Integration
- All AI calls go through LiteLLM on port 4100
- Never call AI providers directly
- Default model: claude-sonnet
- Users can choose their preferred model in settings
- Track is_ai_generated and ai_model on contributions and versions

### Consensus Voting
- Core rule: 50%+ of project members must approve to advance a stage
- Threshold is configurable per project (consensus_threshold)
- Votes auto-trigger consensus check via database trigger (trg_vote_consensus)
- Stage lifecycle: open -> voting -> approved/rejected -> closed

### Document Lifecycle
- Default stages created on document creation: Koncept, Revize, Schvaleni, Uzavreno
- Each stage must be explicitly moved to 'voting' status
- stage_order tracks current position in the lifecycle
- Yjs state stored as BYTEA in documents.yjs_state column

## Service Management
```bash
# Restart services after code changes
sudo systemctl restart kms-web           # After frontend changes
sudo systemctl restart kms-mcp           # After MCP server changes
sudo systemctl restart kms-hocuspocus    # After hocuspocus changes

# Rebuild frontend after changes
cd /opt/kms/apps/web && npm run build && sudo systemctl restart kms-web

# Docker services
cd /opt/kms/infra && docker compose restart litellm  # After LiteLLM config changes

# Logs
journalctl -u kms-web -f
journalctl -u kms-mcp -f
journalctl -u kms-hocuspocus -f
```

## Integration Context
- Part of 14-system IT-Enterprise ecosystem
- WikiSys integration: approved docs export to wiki.it-enterprise.cloud
- Webhook system for cross-system events
- n8n for workflow automation
- Collab-worker for cross-server task routing

## Task Routing
- KMS-specific tasks: execute directly
- Tasks for other OPS projects (chat, tasks, collab): route via collab send_task.py
- Tasks for other servers (mngmt, vpn): route via collab send_task.py
- Report results back to Level 1 OPS controller

## Important Notes
- Never commit .env files or API keys
- The database is shared with n8n (same kms database) - do not modify n8n tables
- Hocuspocus yjs_state column was added dynamically (not in initial migration)
- profiles table has password_hash column (added for custom auth, not in original schema)
- All services run as devops user (not root)
- Git remote: https://github.com/odoobiznes/kms
