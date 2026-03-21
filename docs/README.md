# KMS - Knowledge Management System

## Complete Technical Documentation

---

## 1. Project Overview

| Property | Value |
|---|---|
| **Name** | KMS - Knowledge Management System |
| **URL** | https://kms.it-enterprise.cloud |
| **Domain** | kms.it-enterprise.cloud (Cloudflare DNS -> 157.180.86.49) |
| **Server** | OPS (Ops-Man), Hetzner Cloud |
| **Purpose** | Collaborative platform for human teams + AI agents |
| **Core Rule** | 50%+ consensus voting for document stage advancement |
| **Language** | Czech UI, multilingual content |
| **Status** | Production (MVP) |
| **GitHub** | https://github.com/odoobiznes/kms |
| **System #** | 14th system in IT-Enterprise ecosystem |

### What KMS Does

KMS enables collaborative knowledge creation where multiple participants (humans and AI agents) contribute to documents that follow a structured lifecycle. Each document passes through stages (Draft -> Review -> Approved -> Closed), and advancement requires consensus voting -- at least 50% of project members must approve before a document moves to the next stage.

Each participant can connect their preferred AI model (Claude, GPT-4, Gemini, Groq LLaMA, Mistral) via a unified LiteLLM gateway. AI agents can generate content, merge contributions, and create clean document versions automatically.

### Project Categories

| Category | Enum Value | Description | Example Use Case |
|---|---|---|---|
| Courses & Lessons | course | Educational materials with ordered lessons | 10 people collaboratively create an AI training course |
| New Projects | project | IT projects, startups, products | Collaborative MVP design document |
| Review & Audit | review | Reviews, examinations, audits | Peer review of a research paper |
| Ideas & Research | research | Brainstorming, R&D | Startup idea validation |
| General Documents | document | Internal documentation, policies | Wiki articles, process documentation |

---

## 2. Architecture

### System Diagram

```
                    Internet
                       |
                   Cloudflare DNS
                  kms.it-enterprise.cloud
                       |
                       v
            +---------------------+
            |   Nginx (443/80)    |
            |   Let's Encrypt SSL |
            +---------------------+
              |    |    |    |   |
     /        |    |    |    |   |  /ws
     v        |    |    |    |   v
+---------+   |    |    |    | +-----------+
| Next.js |   |    |    |    | |Hocuspocus |
| :3100   |   |    |    |    | | :1234     |
+---------+   |    |    |    | +-----------+
              |    |    |    |       |
     /mcp/    |    |    |    |       |
     v        |    |    |    |       |
+---------+   |    |    |    |       |
| FastAPI |   |    |    |    |       |
| MCP     |   |    |    |    |       |
| :8100   |   |    |    |    |       |
+---------+   |    |    |    |       |
              |    |    |    |       |
     /ai/     |    |    |    |       |
     v        |    |    |    |       |
+---------+   |    |    |    |       |
| LiteLLM |   |    |    |    |       |
| :4100   |   |    |    |    |       |
| (Docker)|   |    |    |    |       |
+---------+   |    |    |    |       |
              |    |    |    |       |
     /n8n/    |    |    |    |       |
     v        |    |    |    v       v
+---------+   |    | +------------------+
|  n8n    |   |    | |  PostgreSQL 17   |
| :5678   |   |    | |  :5432 (native)  |
| (Docker)|   |    | |  database: kms   |
+---------+   |    | +------------------+
              |    |
              |    v
           +--------+
           | Redis  |
           | :6379  |
           |(Docker)|
           +--------+
```

### Server Specifications

| Property | Value |
|---|---|
| **Server** | OPS (Ops-Man) |
| **IP** | 157.180.86.49 (public), 10.0.0.2 (private/Hetzner) |
| **Provider** | Hetzner Cloud |
| **CPU** | 8 vCPU |
| **RAM** | 15 GB |
| **Disk** | 301 GB |
| **OS** | Debian 12 |
| **SSH** | Port 22770 |

### Component Stack

| Component | Technology | Port | Runtime | Purpose |
|---|---|---|---|---|
| Frontend | Next.js 15.5.14 | 3100 | systemd kms-web.service | UI, SSR, API routes |
| Editor | Hocuspocus (Yjs WebSocket) | 1234 | systemd kms-hocuspocus.service | Real-time collaborative editing |
| MCP Server | FastAPI + Uvicorn | 8100 | systemd kms-mcp.service | Claude CLI / MCP protocol integration |
| AI Gateway | LiteLLM | 4100 | Docker (infra-litellm-1) | Unified proxy for 5+ AI models |
| Workflow | n8n | 5678 | Docker (infra-n8n-1) | Workflow automation, integrations |
| Cache | Redis 7 Alpine | 6379 | Docker (infra-redis-1) | Sessions, rate limiting, job queue |
| Database | PostgreSQL 17 | 5432 | Native (systemd) | Primary data store |
| Reverse Proxy | Nginx | 443/80 | Native (systemd) | SSL termination, routing |

### AI Models (via LiteLLM)

| Model Name | Provider | Actual Model |
|---|---|---|
| claude-sonnet | Anthropic | claude-sonnet-4-20250514 |
| claude-haiku | Anthropic | claude-haiku-4-5-20251001 |
| gpt-4o | OpenAI | gpt-4o |
| gemini-flash | Google | gemini-2.0-flash |
| groq-llama | Groq | llama-3.3-70b-versatile |

---

## 3. Database Schema

**Database:** kms | **User:** kms_user | **Engine:** PostgreSQL 17 | **Extensions:** uuid-ossp, pgcrypto

### KMS Application Tables (owner: postgres)

#### profiles
User accounts with AI preferences.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| email | TEXT (UNIQUE) | Login email |
| display_name | TEXT | Display name |
| password_hash | TEXT | scrypt hash (salt:key) |
| avatar_url | TEXT | Profile image URL |
| ai_provider | TEXT | Default AI provider (default: 'claude') |
| ai_model | TEXT | Default AI model (default: 'claude-sonnet') |
| ai_api_key_encrypted | TEXT | Encrypted personal API key |
| role | TEXT | 'admin', 'member', 'viewer' |
| is_active | BOOLEAN | Account active flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### projects
Project containers with category and consensus settings.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| name | TEXT | Project name |
| description | TEXT | Project description |
| category | project_category ENUM | course, project, review, research, document |
| status | project_status ENUM | draft, active, paused, completed, archived |
| owner_id | UUID (FK -> profiles) | Project owner |
| consensus_threshold | NUMERIC(3,2) | Minimum approval ratio (default: 0.50 = 50%) |
| settings | JSONB | Additional settings |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### project_members
Project membership with roles and AI model override.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| project_id | UUID (FK -> projects, CASCADE) | Project reference |
| user_id | UUID (FK -> profiles, CASCADE) | User reference |
| role | member_role ENUM | owner, editor, reviewer, viewer |
| ai_model | TEXT | Per-project AI model override |
| joined_at | TIMESTAMPTZ | Join timestamp |
| **UNIQUE** | (project_id, user_id) | One membership per user per project |

#### documents
Documents with Yjs collaborative state.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| project_id | UUID (FK -> projects, CASCADE) | Parent project |
| title | TEXT | Document title |
| content | JSONB | Document content |
| yjs_state | BYTEA | Yjs CRDT state for real-time collab |
| current_version | INTEGER | Current version number (default: 1) |
| stage_order | INTEGER | Current stage position (default: 1) |
| status | doc_status ENUM | draft, in_review, approved, closed, reopened |
| created_by | UUID (FK -> profiles) | Author |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### doc_versions
Version history with AI generation tracking.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| document_id | UUID (FK -> documents, CASCADE) | Parent document |
| version_number | INTEGER | Sequential version number |
| content | JSONB | Version content snapshot |
| summary | TEXT | Version summary/changelog |
| created_by | UUID (FK -> profiles) | Version author |
| is_ai_generated | BOOLEAN | Whether AI generated this version |
| ai_model | TEXT | Which AI model was used |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### contributions
Individual contributions with AI model tracking.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| document_id | UUID (FK -> documents, CASCADE) | Target document |
| user_id | UUID (FK -> profiles) | Contributor |
| content | JSONB | Contribution content |
| content_type | TEXT | text, code, image, etc. |
| ai_model | TEXT | AI model used (if AI-generated) |
| is_ai_generated | BOOLEAN | AI generation flag |
| stage_order | INTEGER | Stage at time of contribution |
| status | TEXT | pending, accepted, rejected, merged |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### stages
Document lifecycle stages (Draft > Review > Approved > Closed).

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| document_id | UUID (FK -> documents, CASCADE) | Parent document |
| name | TEXT | Stage name (Koncept, Revize, Schvaleni, Uzavreno) |
| stage_order | INTEGER | Stage order position |
| status | stage_status ENUM | open, voting, approved, rejected, closed |
| description | TEXT | Stage description |
| approved_at | TIMESTAMPTZ | When stage was approved |
| closed_at | TIMESTAMPTZ | When stage was closed |
| opened_by | UUID (FK -> profiles) | Who opened this stage |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### votes
Consensus voting with auto-advance trigger.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| document_id | UUID (FK -> documents, CASCADE) | Voted document |
| stage_id | UUID (FK -> stages, CASCADE) | Voted stage |
| user_id | UUID (FK -> profiles) | Voter |
| approved | BOOLEAN | Approve (true) or reject (false) |
| comment | TEXT | Optional vote comment |
| created_at | TIMESTAMPTZ | Vote timestamp |
| **UNIQUE** | (stage_id, user_id) | One vote per user per stage |

**Trigger:** trg_vote_consensus - After each vote INSERT, automatically checks if consensus threshold is reached. If yes, sets stage status to 'approved'.

#### user_ai_config
Per-user AI model settings (multiple configs per user).

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK -> profiles, CASCADE) | User reference |
| provider | TEXT | AI provider name |
| model | TEXT | AI model name |
| api_key_encrypted | TEXT | Encrypted API key |
| is_default | BOOLEAN | Whether this is the default config |
| settings | JSONB | Additional settings |
| created_at | TIMESTAMPTZ | Creation timestamp |
| **UNIQUE** | (user_id, provider, model) | One config per user per provider+model |

#### notifications
In-app notification system.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK -> profiles, CASCADE) | Recipient |
| type | TEXT | Notification type (project_invitation, stage_advanced, vote_requested, document_closed) |
| title | TEXT | Notification title |
| body | TEXT | Notification body |
| data | JSONB | Additional data (project_id, document_id, etc.) |
| read | BOOLEAN | Read status |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### integration_events
Webhook and integration event log.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| event_type | TEXT | Event type (wikisys.export, project.created, etc.) |
| source_system | TEXT | Source system identifier |
| status | TEXT | success, error |
| details | TEXT | Human-readable event details |
| data | JSONB | Event payload data |
| created_at | TIMESTAMPTZ | Event timestamp |

### Database Functions

| Function | Returns | Description |
|---|---|---|
| get_consensus_percentage(stage_id UUID) | NUMERIC | Calculates approval percentage: (approve_votes / total_project_members) * 100 |
| check_consensus(stage_id UUID) | BOOLEAN | Checks if consensus percentage >= project threshold |
| on_vote_inserted() | TRIGGER | Auto-advances stage to 'approved' when consensus is reached |

### Key Indexes

- idx_project_members_project - project_members(project_id)
- idx_project_members_user - project_members(user_id)
- idx_documents_project - documents(project_id)
- idx_documents_status - documents(status)
- idx_contributions_document - contributions(document_id)
- idx_contributions_user - contributions(user_id)
- idx_votes_document - votes(document_id)
- idx_votes_stage - votes(stage_id)
- idx_votes_user - votes(user_id)
- idx_notifications_user - notifications(user_id)
- idx_notifications_unread - notifications(user_id) WHERE read = false (partial)
- idx_integration_events_created - integration_events(created_at DESC)
- idx_integration_events_source - integration_events(source_system)

### n8n Tables (owner: kms_user)

n8n uses the same database with its own tables (prefixed or standard n8n schema): workflow_entity, execution_entity, credentials_entity, webhook_entity, variables, settings, folder, tag_entity, chat_hub_*, etc. These are managed by n8n automatically and should not be modified directly.

---

## 4. API Endpoints

### Authentication Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register new user (display_name, email, password). Creates profile, sets session cookie. |
| POST | /api/auth/login | Public | Login with email + password. Verifies scrypt hash, sets httpOnly session cookie (7 days). |
| POST | /api/auth/logout | Public | Clear session cookie. |
| GET | /api/auth/me | Session | Get current authenticated user info (id, email, display_name, role). |

### Project Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/projects | Session | Create a new project (name, description, category). Auto-assigns current user as owner. |

*Note: Projects listing is handled via server-side rendering in /projekty/page.tsx.*

### Document Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/documents | Session | List all documents. Optional ?project_id= filter. Returns documents with author_name and project_name. |
| POST | /api/documents | Session | Create a new document (title, project_id). Automatically creates 4 default stages: Koncept, Revize, Schvaleni, Uzavreno. |

### Stage Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/stages/start-voting | Session | Start voting on a stage (stage_id, document_id). Sets stage status to 'voting'. |
| POST | /api/stages/close | Session | Close/approve a stage (stage_id, document_id). Advances document to next stage, or marks document as 'approved' if last stage. |

### Vote Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/votes | Session | Cast a vote (stage_id, document_id, approved: boolean, comment?). Upserts on (stage_id, user_id). Triggers auto-consensus check. |

### AI Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/ai/generate | Session | Generate AI content. Accepts prompt, context, model. Streams response via SSE from LiteLLM. Uses user's preferred model or fallback to claude-sonnet. |
| POST | /api/ai/merge | Session | AI-merge contributions for a document. Fetches all contributions, sends to LiteLLM for merging, creates new doc_version, updates document current_version. |
| GET | /api/ai/models | Session | List available AI models from LiteLLM gateway (/v1/models). |
| GET | /api/ai/settings | Session | Get current user's AI settings (default provider, model, all configs from user_ai_config). |
| POST | /api/ai/settings | Session | Update AI settings (provider, model, api_key). Updates profiles table and upserts user_ai_config. |
| GET | /api/ai/stats?project_id= | Session | Get AI contribution stats for a project (total, AI vs human, percentage, models used). |

### Notification Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/notifications | Session | List user's notifications (latest 50) + unread count. |
| POST | /api/notifications | Session | Mark notifications as read. Accepts notification_ids: string[] or mark_all: true. |

### Integration Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/integrations/wikisys | Webhook Secret | Export approved/closed document to WikiSys (wiki.it-enterprise.cloud). Logs integration event, creates notification. |
| GET | /api/events | Session | List last 50 integration events (event_type, source, status, details, data). |

### Webhook Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/webhooks | X-Webhook-Secret header | Receive webhooks from external systems. Supported event types: project.created, document.approved, document.closed, stage.advanced, vote.cast. Creates notifications and logs events. |

### MCP Server Routes (port 8100, proxied via /mcp/)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | / | Public | Service info + list of available tools |
| GET | /health | Public | Health check with DB connectivity test |
| POST | /mcp/create_project | Bearer token | Create project with participants |
| POST | /mcp/add_contribution | Bearer token | Add contribution to a document |
| POST | /mcp/vote | Bearer token | Vote on a stage with auto-consensus check |
| GET | /mcp/consensus_status/{document_id} | Bearer token | Get consensus status for all stages |
| POST | /mcp/generate_clean_version/{document_id} | Bearer token | AI-generate clean version from contributions |
| POST | /mcp/close_stage | Bearer token | Close a stage and advance document |
| POST | /mcp/deliver_lesson | Bearer token | Deliver a lesson to a course project |
| GET | /mcp/project_status/{project_id} | Bearer token | Comprehensive project status with members, documents, stages, votes |
| GET | /mcp/pending_votes?user_id= | Bearer token | List stages awaiting user's vote |

---

## 5. MCP Tools (9 Tools)

The MCP server exposes 9 tools for Claude CLI and other MCP-compatible clients.

### 1. create_project
Create a new KMS project with optional participants.

**Parameters:**
- name (string, required) - Project name
- category (string, default: "document") - One of: course, project, review, research, document
- description (string, optional) - Project description
- owner_id (string, optional) - Owner user ID (falls back to admin)
- status (string, default: "draft") - One of: draft, active, paused, completed, archived
- participants (list of strings, optional) - List of user IDs to add as editors
- consensus_threshold (float, default: 0.50) - Minimum approval ratio

**Example:**
```json
{
  "name": "AI Training Course Q2",
  "category": "course",
  "description": "Complete AI training for the team",
  "consensus_threshold": 0.60,
  "participants": ["uuid-user-1", "uuid-user-2"]
}
```

### 2. add_contribution
Add a contribution (text, code, image, etc.) to a document.

**Parameters:**
- document_id (string, required) - Target document UUID
- user_id (string, optional) - Contributor ID (falls back to admin)
- content (string, required) - Contribution content
- content_type (string, default: "text") - Content type
- ai_model (string, optional) - AI model used
- is_ai_generated (bool, default: false) - Whether AI generated the content

**Example:**
```json
{
  "document_id": "uuid-doc-1",
  "content": "Chapter 1: Introduction to Machine Learning...",
  "content_type": "text",
  "ai_model": "claude-sonnet",
  "is_ai_generated": true
}
```

### 3. vote
Vote on a document stage (approve/reject). Auto-advances on consensus.

**Parameters:**
- document_id (string, required) - Document UUID
- stage_id (string, required) - Stage UUID
- user_id (string, optional) - Voter ID
- approved (bool, required) - true = approve, false = reject
- comment (string, optional) - Vote comment

**Example:**
```json
{
  "document_id": "uuid-doc-1",
  "stage_id": "uuid-stage-1",
  "approved": true,
  "comment": "Looks good, well structured content."
}
```

**Response includes:** consensus_percentage, consensus_threshold, consensus_reached, stage_status (may have auto-advanced).

### 4. consensus_status
Get current consensus status for all stages of a document.

**Parameters:** document_id (path parameter)

**Example:**
```
GET /mcp/consensus_status/uuid-doc-1
```

**Returns:** Document info + all stages with consensus_percentage, vote counts, threshold comparison.

### 5. generate_clean_version
AI generates a clean, merged version from accepted contributions using LiteLLM.

**Parameters:**
- document_id (path parameter, required) - Document UUID
- user_id (body, optional) - Who created this version

**Example:**
```
POST /mcp/generate_clean_version/uuid-doc-1
```

**Behavior:** Fetches accepted contributions, sends to claude-sonnet via LiteLLM for merging, creates new doc_version, updates document current_version. Falls back to simple concatenation if AI call fails.

### 6. close_stage
Close a document stage and advance document to the next stage.

**Parameters:**
- document_id (string, required) - Document UUID
- stage_id (string, required) - Stage UUID to close

**Example:**
```json
{
  "document_id": "uuid-doc-1",
  "stage_id": "uuid-stage-1"
}
```

### 7. deliver_lesson
Deliver a completed lesson to a course-type project.

**Parameters:**
- course_id (string, required) - Course project UUID
- lesson_content (string, required) - Full lesson content
- title (string, optional) - Lesson title (auto-generated if not provided)
- user_id (string, optional) - Author ID

**Example:**
```json
{
  "course_id": "uuid-course-1",
  "lesson_content": "# Lesson 3: Neural Networks\n\n...",
  "title": "Lesson 3: Neural Networks"
}
```

**Behavior:** Creates a new document in the course project with status 'approved', auto-determines lesson order.

### 8. project_status
Get comprehensive project status including members, documents, stages, and vote counts.

**Parameters:** project_id (path parameter)

**Example:**
```
GET /mcp/project_status/uuid-project-1
```

**Returns:** Full project details, member list with names/emails, all documents with stage details and vote/contribution counts.

### 9. pending_votes
List all stages in 'voting' status that the user hasn't voted on yet.

**Parameters:** user_id (query parameter, optional)

**Example:**
```
GET /mcp/pending_votes?user_id=uuid-user-1
```

**Returns:** List of pending votes with stage info, current consensus percentage, threshold, and participation stats.

---

## 6. Frontend Pages

| URL Path | Component | Description |
|---|---|---|
| / | app/page.tsx | Dashboard/landing page |
| /login | app/login/page.tsx | Login form |
| /registrace | app/registrace/page.tsx | Registration form |
| /projekty | app/projekty/page.tsx | Project list |
| /projekty/novy | app/projekty/novy/page.tsx | Create new project |
| /projekty/[id] | app/projekty/[id]/page.tsx | Project detail with members, documents, stages |
| /dokumenty | app/dokumenty/page.tsx | Document list with filters |
| /dokumenty/novy | app/dokumenty/novy/page.tsx | Create new document (NewDocumentForm) |
| /dokumenty/[id] | app/dokumenty/[id]/page.tsx | Document editor with collaborative editing |
| /ai-agenti | app/ai-agenti/page.tsx | AI agent management / model settings |
| /workflows | app/workflows/page.tsx | n8n workflow management |

### Key Components

| Component | Path | Description |
|---|---|---|
| CollabEditor | components/editor/CollabEditor.tsx | Tiptap editor with Hocuspocus/Yjs integration |
| AIAssistant | components/editor/AIAssistant.tsx | AI sidebar for content generation |
| StageManager | components/voting/StageManager.tsx | Stage lifecycle management UI |
| VotePanel | components/voting/VotePanel.tsx | Voting interface with consensus visualization |
| HeaderNav | components/layout/HeaderNav.tsx | Navigation header |
| NotificationBell | components/layout/NotificationBell.tsx | Notification dropdown |
| LogoutButton | components/layout/LogoutButton.tsx | Logout button |
| AIStats | components/ui/AIStats.tsx | AI contribution statistics display |
| DocumentFilters | app/dokumenty/DocumentFilters.tsx | Document filtering controls |

---

## 7. Configuration Files

### /opt/kms/infra/docker-compose.yml
Defines Docker services for LiteLLM, Redis, and n8n. All services use network_mode: host for simplicity. Volumes persist data in named Docker volumes (kms-redis-data, kms-n8n-data).

### /opt/kms/infra/.env
Environment variables (DO NOT commit actual values):

| Variable | Description |
|---|---|
| DB_PASSWORD | PostgreSQL password for kms_user |
| LITELLM_MASTER_KEY | Master API key for LiteLLM authentication |
| ANTHROPIC_API_KEY | Anthropic API key for Claude models |
| OPENAI_API_KEY | OpenAI API key for GPT models |
| GOOGLE_API_KEY | Google API key for Gemini models |
| GROQ_API_KEY | Groq API key for LLaMA models |
| MISTRAL_API_KEY | Mistral API key (currently unused in config) |
| N8N_USER | n8n basic auth username |
| N8N_PASSWORD | n8n basic auth password |

### /opt/kms/infra/litellm-config.yaml
LiteLLM model configuration. Defines 5 model aliases (claude-sonnet, claude-haiku, gpt-4o, gemini-flash, groq-llama) mapping to actual provider models. Settings: drop_params: true, set_verbose: false.

### /etc/nginx/sites-enabled/kms-app
Nginx reverse proxy configuration:

| Location | Backend | Purpose |
|---|---|---|
| / | 127.0.0.1:3100 | Next.js frontend (with WebSocket upgrade support) |
| /ws | 127.0.0.1:1234 | Hocuspocus WebSocket for collaborative editing |
| /mcp/ | 127.0.0.1:8100 | MCP Server (FastAPI) |
| /n8n/ | 127.0.0.1:5678 | n8n workflow UI |
| /ai/ | 127.0.0.1:4100 | LiteLLM API |

SSL: Let's Encrypt certificate managed by Certbot (auto-renewal via systemd timer).

### /etc/systemd/system/kms-web.service
Next.js production server. Runs as devops user, NODE_ENV=production, port 3100. Depends on postgresql.service. Environment includes DATABASE_URL, LITELLM_MASTER_KEY, LITELLM_URL.

### /etc/systemd/system/kms-mcp.service
FastAPI MCP server via Uvicorn. Runs as devops user, binds to 127.0.0.1:8100. Environment includes DATABASE_URL, LITELLM_URL, LITELLM_MASTER_KEY, MCP_API_KEY.

### /etc/systemd/system/kms-hocuspocus.service
Hocuspocus Yjs WebSocket server. Runs as devops user, port 1234. Environment includes DATABASE_URL, HOCUSPOCUS_TOKEN, PORT. RestartSec=5.

---

## 8. Project Structure

```
/opt/kms/
├── apps/
│   ├── web/                          # Next.js 15 frontend
│   │   ├── app/                     # App Router
│   │   │   ├── api/                # API routes
│   │   │   │   ├── auth/          # login, logout, me, register
│   │   │   │   ├── ai/           # generate, merge, models, settings, stats
│   │   │   │   ├── documents/    # CRUD
│   │   │   │   ├── events/       # integration events
│   │   │   │   ├── integrations/ # wikisys export
│   │   │   │   ├── notifications/# read/mark
│   │   │   │   ├── projects/     # create
│   │   │   │   ├── stages/       # start-voting, close
│   │   │   │   ├── votes/        # cast vote
│   │   │   │   └── webhooks/     # inbound webhooks
│   │   │   ├── dokumenty/        # Document pages
│   │   │   ├── projekty/         # Project pages
│   │   │   ├── ai-agenti/        # AI settings page
│   │   │   ├── login/            # Login page
│   │   │   ├── registrace/       # Registration page
│   │   │   ├── workflows/        # n8n workflows page
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── page.tsx          # Dashboard
│   │   ├── components/
│   │   │   ├── editor/           # CollabEditor, AIAssistant
│   │   │   ├── layout/           # HeaderNav, NotificationBell, LogoutButton
│   │   │   ├── ui/               # AIStats
│   │   │   └── voting/           # StageManager, VotePanel
│   │   ├── lib/
│   │   │   ├── auth.ts           # Session management (scrypt, HMAC tokens)
│   │   │   └── db.ts             # PostgreSQL pool + query helpers
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── tsconfig.json
│   ├── mcp-server/                   # FastAPI MCP server
│   │   ├── main.py               # All MCP endpoints + auth middleware
│   │   ├── db.py                 # PostgreSQL connection pool (psycopg2)
│   │   └── venv/                 # Python virtual environment
│   └── hocuspocus/                   # Yjs WebSocket server
│       ├── server.js             # Hocuspocus with PostgreSQL persistence
│       └── package.json
├── packages/
│   └── db/
│       └── migrations/
│           └── 001_initial_schema.sql  # Full DB schema + functions + triggers
├── infra/
│   ├── docker-compose.yml        # LiteLLM + Redis + n8n
│   ├── .env                      # Environment variables (not committed)
│   ├── .env.example              # Template for .env
│   └── litellm-config.yaml       # LiteLLM model configuration
├── docs/
│   ├── README.md                 # This file
│   └── OPERATIONS.md             # Operations guide
├── CLAUDE.md                     # Claude CLI project instructions
├── README.md                     # Project overview
└── .gitignore
```

---

## 9. Deployment Guide

### Prerequisites
- Debian 12 / Ubuntu 24.04 server
- PostgreSQL 17+
- Node.js 20+ (LTS)
- Python 3.12+
- Docker + Docker Compose
- Nginx
- Certbot (Let's Encrypt)

### Step-by-Step Deployment

#### 1. Clone Repository
```bash
cd /opt
git clone https://github.com/odoobiznes/kms.git
cd kms
```

#### 2. PostgreSQL Setup
```bash
sudo -u postgres createuser kms_user
sudo -u postgres createdb kms -O postgres
sudo -u postgres psql -d kms -c "ALTER USER kms_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -d kms -f packages/db/migrations/001_initial_schema.sql
sudo -u postgres psql -d kms -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kms_user;"
sudo -u postgres psql -d kms -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kms_user;"
```

#### 3. Environment Configuration
```bash
cd /opt/kms/infra
cp .env.example .env
# Edit .env with actual values: DB_PASSWORD, API keys, etc.
```

#### 4. Start Docker Services
```bash
cd /opt/kms/infra
docker compose up -d
# Verify: docker compose ps
```

#### 5. Build Next.js Frontend
```bash
cd /opt/kms/apps/web
npm install
npm run build
```

#### 6. Setup MCP Server
```bash
cd /opt/kms/apps/mcp-server
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn psycopg2-binary httpx pydantic
```

#### 7. Setup Hocuspocus
```bash
cd /opt/kms/apps/hocuspocus
npm install
```

#### 8. Install Systemd Services
```bash
sudo cp /path/to/kms-web.service /etc/systemd/system/
sudo cp /path/to/kms-mcp.service /etc/systemd/system/
sudo cp /path/to/kms-hocuspocus.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kms-web kms-mcp kms-hocuspocus
```

#### 9. Nginx Configuration
Create /etc/nginx/sites-available/kms-app with the proxy configuration (see Section 7), then:
```bash
sudo ln -sf /etc/nginx/sites-available/kms-app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### 10. SSL Certificate
```bash
sudo certbot --nginx -d kms.it-enterprise.cloud
```

#### 11. DNS Setup
Create an A record in Cloudflare: kms.it-enterprise.cloud -> 157.180.86.49

---

## 10. Development Guide

### Local Development

#### 1. Start PostgreSQL + Docker services
```bash
cd /opt/kms/infra
docker compose up -d  # Starts LiteLLM, Redis, n8n
```

#### 2. Start Next.js in dev mode
```bash
cd /opt/kms/apps/web
export DATABASE_URL="postgresql://kms_user:password@127.0.0.1:5432/kms"
export LITELLM_URL="http://127.0.0.1:4100"
export LITELLM_MASTER_KEY="your-key"
npm run dev
# Runs on http://localhost:3000
```

#### 3. Start MCP Server in dev mode
```bash
cd /opt/kms/apps/mcp-server
source venv/bin/activate
export DATABASE_URL="postgresql://kms_user:password@127.0.0.1:5432/kms"
uvicorn main:app --host 127.0.0.1 --port 8100 --reload
```

#### 4. Start Hocuspocus in dev mode
```bash
cd /opt/kms/apps/hocuspocus
export DATABASE_URL="postgresql://kms_user:password@127.0.0.1:5432/kms"
node --watch server.js
```

### Adding New Features

#### Adding a new API route
1. Create apps/web/app/api/your-route/route.ts
2. Import getSession from @/lib/auth for authentication
3. Import query from @/lib/db for database access
4. Export GET, POST, PUT, or DELETE async functions

#### Adding a new MCP tool
1. Add Pydantic request model in apps/mcp-server/main.py
2. Add endpoint function with @app.post("/mcp/tool_name") or @app.get("/mcp/tool_name/{param}")
3. Update the tools list in the root endpoint
4. Use db.query(), db.execute(), db.execute_returning() for database operations

#### Adding a new AI model
1. Edit infra/litellm-config.yaml
2. Add the model entry with model_name and litellm_params
3. Add the API key variable to .env and docker-compose.yml
4. Restart LiteLLM: cd /opt/kms/infra && docker compose restart litellm

#### Adding a new frontend page
1. Create apps/web/app/route-name/page.tsx
2. Use Czech names for user-facing routes (e.g., /projekty, /dokumenty)
3. Add navigation link in components/layout/HeaderNav.tsx

#### Database Migrations
1. Create a new SQL file in packages/db/migrations/ (e.g., 002_new_feature.sql)
2. Apply: psql -h 127.0.0.1 -U kms_user -d kms -f packages/db/migrations/002_new_feature.sql

---

## 11. Authentication & Security

### Session Management
- **Hashing:** scrypt with 16-byte random salt, 64-byte key
- **Tokens:** HMAC-SHA256 signed JSON payload (base64url encoded)
- **Cookie:** kms_session, httpOnly, secure (production), sameSite=lax, 7-day expiry
- **Session format:** base64url({"userId":"uuid","exp":timestamp}).hmac

### MCP Server Auth
- Bearer token authentication via Authorization: Bearer key header
- Accepts either LITELLM_MASTER_KEY or MCP_API_KEY
- Public paths: /, /health, /docs, /openapi.json, /redoc
- If no keys configured, auth is disabled (dev mode)

### Webhook Auth
- X-Webhook-Secret header validation
- Shared secret configured via WEBHOOK_SECRET environment variable

### Hocuspocus Auth
- Token-based authentication via HOCUSPOCUS_TOKEN
- Document name must match format doc-uuid
- Validates document exists in database

---

## 12. Integration with IT-Enterprise Ecosystem

KMS is the 14th system in the IT-Enterprise ecosystem. It integrates with other systems primarily through:

### Direct Integrations

| System | Type | Description |
|---|---|---|
| **WikiSys** (wiki.it-enterprise.cloud) | REST API | Approved documents auto-export to WikiSys via /api/integrations/wikisys |
| **Dashboard** (mngmt.it-enterprise.pro) | Collab API | Task routing via collab-worker |
| **n8n** (localhost:5678) | Workflow Engine | Automates cross-system workflows, webhook processing |

### Integration Points via n8n Workflows

| System | Integration |
|---|---|
| **PC Dashboard** | PC status changes trigger KMS notifications |
| **Trezor** | Credential vault access for API keys |
| **Chat** | Notification forwarding to team chat |
| **Projects** | Project sync between KMS and project management |
| **Tasks** | Task creation from approved documents |
| **Collab** | Cross-server task routing |
| **Analytics** | Usage metrics and AI stats collection |
| **Git** (git.it-enterprise.cloud) | Code documentation sync |
| **VPN Portal** | Access control integration |
| **Salt** | Configuration management notifications |
| **Backups** | Document backup triggers |
| **SSO** | Future: unified authentication |

### Integration Architecture

```
KMS <---> n8n <---> [13 IT-Enterprise Systems]
KMS <---> WikiSys (direct REST API)
KMS <---> Dashboard (collab-worker tasks)
KMS <---> LiteLLM <---> [5 AI Providers]
```

### Webhook Events Flow

External systems can send events to KMS via POST /api/webhooks:
1. System sends event with X-Webhook-Secret header
2. KMS validates the secret
3. KMS processes the event (creates notifications, logs)
4. KMS can trigger follow-up actions (e.g., WikiSys export)

Supported inbound events: project.created, document.approved, document.closed, stage.advanced, vote.cast.

---

## 13. Technology Dependencies

### Frontend (apps/web/package.json)

| Package | Version | Purpose |
|---|---|---|
| next | ^15.0.0 | React framework with SSR |
| react / react-dom | ^19.0.0 | UI library |
| @tiptap/react | ^2.10.0 | Rich text editor (React bindings) |
| @tiptap/starter-kit | ^2.10.0 | Basic editor extensions |
| @tiptap/extension-collaboration | ^2.10.0 | Yjs collaboration extension |
| @tiptap/extension-collaboration-cursor | ^2.10.0 | Live cursor sharing |
| @hocuspocus/provider | ^2.14.0 | Hocuspocus WebSocket client |
| yjs | ^13.6.0 | CRDT framework for real-time sync |
| y-prosemirror | ^1.2.0 | Yjs + ProseMirror binding |
| pg | ^8.20.0 | PostgreSQL client |
| tailwindcss | ^4.0.0 | CSS utility framework |
| lucide-react | ^0.460.0 | Icon library |

### MCP Server (apps/mcp-server)

| Package | Purpose |
|---|---|
| fastapi | Web framework |
| uvicorn | ASGI server |
| psycopg2-binary | PostgreSQL driver |
| httpx | Async HTTP client (LiteLLM calls) |
| pydantic | Data validation |

### Hocuspocus (apps/hocuspocus/package.json)

| Package | Version | Purpose |
|---|---|---|
| @hocuspocus/server | ^2.14.0 | Yjs WebSocket server |
| pg | ^8.20.0 | PostgreSQL client |
| yjs | ^13.6.0 | CRDT framework |

---

*Document version: 1.0 | Created: 2026-03-21 | Author: DevOps Team*
