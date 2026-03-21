# KMS - Knowledge Management System

> **Domain:** kms.hasidav.org | **Status:** Planning | **14th system in IT-Enterprise ecosystem**

## What is KMS?

Collaborative platform for **human teams + AI agents** where documents, courses, projects and ideas are created through **group intelligence** with consensus-based workflow.

**Core Rule:** 50%+ of group members must approve each stage before a document advances.

## Key Features

- **Multi-AI Agent Support** — Each participant connects their preferred AI (Claude, GPT-4, Gemini, Groq, Mistral, LLaMA...) via LiteLLM gateway
- **Collaborative Editing** — Real-time document editing with Tiptap + Yjs CRDT
- **Consensus Voting** — 50%+ threshold for advancing document stages
- **Stage Management** — Draft → Review → Approved → Closed lifecycle
- **MCP Server** — Claude CLI integration for automation
- **System Integration** — Connected to all 13 IT-Enterprise systems via n8n

## Project Categories

| Category | Description | Example |
|---|---|---|
| Courses & Lessons | Educational materials | 10 people create an AI lesson |
| New Projects | IT, startups, products | Collaborative MVP design |
| Review & Audit | Reviews, exams | Peer-review of scientific paper |
| Ideas & Research | Brainstorming, R&D | Startup ideas |
| General Documents | Internal documentation | Wiki, policies, processes |

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15, Shadcn/ui, Tailwind | UI Framework |
| Editor | Tiptap + Hocuspocus (Yjs) | Real-time collaborative editing |
| Backend | Supabase (self-hosted) | PostgreSQL + Auth + Realtime + Storage |
| AI Gateway | LiteLLM (self-hosted) | Unified proxy for 100+ AI models |
| MCP Server | FastAPI | Claude CLI integration |
| Automation | n8n | Workflow automation for 13 systems |
| Cache | Redis | Sessions, rate limiting, job queue |

## Project Structure

```
hasidav/kms/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/               # App Router pages
│   │   ├── components/        # UI components
│   │   └── lib/              # Utilities
│   └── mcp-server/            # FastAPI MCP Server
│       ├── main.py
│       ├── tools/             # MCP tools
│       └── ai/               # LiteLLM integration
├── packages/
│   ├── voting-engine/         # Consensus logic (shared)
│   ├── stage-manager/         # Document lifecycle
│   └── db/                    # Supabase schema + migrations
├── infra/
│   ├── docker-compose.yml     # Full stack
│   ├── nginx/                 # Reverse proxy
│   └── scripts/              # Deploy scripts
├── n8n-flows/                 # Exported n8n workflows
└── docs/                      # Technical documentation
```

## Deployment

Docker Compose on OPS server (157.180.86.49), with optional DB separation to webs server (185.185.83.149).

## Links

- Production: https://kms.hasidav.org (after deployment)
- GitHub: https://github.com/odoobiznes/kms
- Notion: KMS Planning Pages

---

> Part of the IT-Enterprise 14-system ecosystem
