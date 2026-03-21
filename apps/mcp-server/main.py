"""
KMS MCP Server - FastAPI
Exposes KMS operations for Claude CLI via MCP protocol.
Full database implementation with auth middleware.
"""
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import json
import httpx
import logging

import db

logger = logging.getLogger("kms-mcp")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="KMS MCP Server", version="1.0.0")

LITELLM_URL = os.environ.get("LITELLM_URL", "http://127.0.0.1:4100")
LITELLM_MASTER_KEY = os.environ.get("LITELLM_MASTER_KEY", "")
MCP_API_KEY = os.environ.get("MCP_API_KEY", "")

# ─── Auth Middleware ────────────────────────────────────────────────

# Paths that don't require authentication
PUBLIC_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Check Bearer token for non-public endpoints."""
    path = request.url.path.rstrip("/") or "/"

    # Allow public paths without auth
    if path in PUBLIC_PATHS:
        return await call_next(request)

    # Check Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        valid_keys = [k for k in [LITELLM_MASTER_KEY, MCP_API_KEY] if k]
        if valid_keys and token in valid_keys:
            return await call_next(request)
        elif not valid_keys:
            # No keys configured = auth disabled (dev mode)
            return await call_next(request)
    elif not LITELLM_MASTER_KEY and not MCP_API_KEY:
        # No keys configured = auth disabled (dev mode)
        return await call_next(request)

    return JSONResponse(
        status_code=401,
        content={"detail": "Unauthorized. Provide a valid Bearer token."},
    )


# ─── Helpers ────────────────────────────────────────────────────────

def _serialize(obj):
    """Convert DB row dicts for JSON serialization (UUID, datetime, Decimal)."""
    import decimal
    import datetime
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_serialize(v) for v in obj]
    elif isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    elif isinstance(obj, decimal.Decimal):
        return float(obj)
    elif hasattr(obj, 'hex'):  # UUID
        return str(obj)
    return obj


def _get_user_id(user_id: Optional[str]) -> Optional[str]:
    """Resolve user_id: if None, try to find default admin user."""
    if user_id:
        return user_id
    # Fallback: find the admin user
    row = db.query_one("SELECT id FROM profiles WHERE role = 'admin' LIMIT 1")
    return str(row["id"]) if row else None


# ─── Models ─────────────────────────────────────────────────────────

class CreateProjectRequest(BaseModel):
    name: str
    category: str = "document"
    description: Optional[str] = None
    owner_id: Optional[str] = None
    status: Optional[str] = "draft"
    participants: Optional[list[str]] = None
    consensus_threshold: Optional[float] = 0.50

class AddContributionRequest(BaseModel):
    document_id: str
    user_id: Optional[str] = None
    content: str
    content_type: str = "text"
    ai_model: Optional[str] = None
    is_ai_generated: bool = False

class VoteRequest(BaseModel):
    document_id: str
    stage_id: str
    user_id: Optional[str] = None
    approved: bool
    comment: Optional[str] = None

class CloseStageRequest(BaseModel):
    document_id: str
    stage_id: str

class DeliverLessonRequest(BaseModel):
    course_id: str
    lesson_content: str
    title: Optional[str] = None
    user_id: Optional[str] = None

class GenerateCleanVersionRequest(BaseModel):
    user_id: Optional[str] = None


# ─── MCP Tool Endpoints ────────────────────────────────────────────

@app.post("/mcp/create_project")
async def kms_create_project(req: CreateProjectRequest):
    """Create a new KMS project with optional participants."""
    try:
        owner_id = _get_user_id(req.owner_id)

        # Validate category against enum
        valid_categories = ["course", "project", "review", "research", "document"]
        if req.category not in valid_categories:
            raise HTTPException(400, f"Invalid category. Must be one of: {valid_categories}")

        valid_statuses = ["draft", "active", "paused", "completed", "archived"]
        if req.status not in valid_statuses:
            raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")

        row = db.execute_returning(
            """INSERT INTO projects (name, category, description, owner_id, status, consensus_threshold)
               VALUES (%s, %s, %s, %s, %s, %s)
               RETURNING id, name, category, status, created_at""",
            (req.name, req.category, req.description, owner_id, req.status, req.consensus_threshold)
        )

        project_id = str(row["id"])

        # Add owner as member with 'owner' role
        if owner_id:
            db.execute(
                """INSERT INTO project_members (project_id, user_id, role)
                   VALUES (%s, %s, 'owner')
                   ON CONFLICT (project_id, user_id) DO NOTHING""",
                (project_id, owner_id)
            )

        # Add participants as editors
        members_added = 0
        if req.participants:
            for participant_id in req.participants:
                try:
                    db.execute(
                        """INSERT INTO project_members (project_id, user_id, role)
                           VALUES (%s, %s, 'editor')
                           ON CONFLICT (project_id, user_id) DO NOTHING""",
                        (project_id, participant_id)
                    )
                    members_added += 1
                except Exception as e:
                    logger.warning(f"Failed to add participant {participant_id}: {e}")

        return {
            "status": "ok",
            "project_id": project_id,
            "name": req.name,
            "category": req.category,
            "members_added": members_added,
            "created_at": _serialize(row["created_at"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create_project error: {e}")
        raise HTTPException(500, f"Failed to create project: {e}")


@app.post("/mcp/add_contribution")
async def kms_add_contribution(req: AddContributionRequest):
    """Add a contribution to a document (text, code, image, etc.)."""
    try:
        user_id = _get_user_id(req.user_id)

        # Verify document exists
        doc = db.query_one("SELECT id, project_id, stage_order FROM documents WHERE id = %s", (req.document_id,))
        if not doc:
            raise HTTPException(404, f"Document {req.document_id} not found")

        # Wrap content in jsonb
        content_json = json.dumps({"text": req.content}) if req.content_type == "text" else json.dumps({"data": req.content})

        row = db.execute_returning(
            """INSERT INTO contributions (document_id, user_id, content, content_type, ai_model, is_ai_generated, stage_order)
               VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s)
               RETURNING id, created_at""",
            (req.document_id, user_id, content_json, req.content_type, req.ai_model, req.is_ai_generated, doc["stage_order"])
        )

        return {
            "status": "ok",
            "contribution_id": str(row["id"]),
            "document_id": req.document_id,
            "content_type": req.content_type,
            "is_ai_generated": req.is_ai_generated,
            "created_at": _serialize(row["created_at"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"add_contribution error: {e}")
        raise HTTPException(500, f"Failed to add contribution: {e}")


@app.post("/mcp/vote")
async def kms_vote(req: VoteRequest):
    """Vote on a document stage (approve/reject). Auto-advances on consensus."""
    try:
        user_id = _get_user_id(req.user_id)
        if not user_id:
            raise HTTPException(400, "user_id required (no default admin found)")

        # Verify stage exists and is in 'voting' status
        stage = db.query_one("SELECT id, status, document_id FROM stages WHERE id = %s", (req.stage_id,))
        if not stage:
            raise HTTPException(404, f"Stage {req.stage_id} not found")
        if stage["status"] not in ("voting", "open"):
            raise HTTPException(400, f"Stage is '{stage['status']}', cannot vote (must be 'voting' or 'open')")

        # Upsert vote (ON CONFLICT by stage_id + user_id)
        row = db.execute_returning(
            """INSERT INTO votes (document_id, stage_id, user_id, approved, comment)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT (stage_id, user_id) DO UPDATE
               SET approved = EXCLUDED.approved, comment = EXCLUDED.comment, created_at = NOW()
               RETURNING id, created_at""",
            (req.document_id, req.stage_id, user_id, req.approved, req.comment)
        )

        # Get current consensus percentage (trigger may have already auto-approved)
        consensus = db.query_one(
            "SELECT get_consensus_percentage(%s) AS percentage",
            (req.stage_id,)
        )
        pct = float(consensus["percentage"]) if consensus else 0.0

        # Re-check stage status (trigger may have changed it)
        stage_after = db.query_one("SELECT status FROM stages WHERE id = %s", (req.stage_id,))
        stage_status = stage_after["status"] if stage_after else "unknown"

        # Get threshold from project
        threshold_row = db.query_one(
            """SELECT p.consensus_threshold
               FROM projects p
               JOIN documents d ON d.project_id = p.id
               WHERE d.id = %s""",
            (req.document_id,)
        )
        threshold = float(threshold_row["consensus_threshold"]) * 100 if threshold_row else 50.0

        return {
            "status": "ok",
            "vote_id": str(row["id"]),
            "approved": req.approved,
            "consensus_percentage": pct,
            "consensus_threshold": threshold,
            "consensus_reached": pct >= threshold,
            "stage_status": stage_status,
            "created_at": _serialize(row["created_at"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"vote error: {e}")
        raise HTTPException(500, f"Failed to record vote: {e}")


@app.get("/mcp/consensus_status/{document_id}")
async def kms_get_consensus_status(document_id: str):
    """Get current consensus status for all stages of a document."""
    try:
        doc = db.query_one("SELECT id, title, stage_order, status FROM documents WHERE id = %s", (document_id,))
        if not doc:
            raise HTTPException(404, f"Document {document_id} not found")

        # Get threshold from project
        threshold_row = db.query_one(
            """SELECT p.consensus_threshold
               FROM projects p JOIN documents d ON d.project_id = p.id
               WHERE d.id = %s""",
            (document_id,)
        )
        threshold = float(threshold_row["consensus_threshold"]) * 100 if threshold_row else 50.0

        # Get all stages with consensus percentages
        stages = db.query(
            """SELECT s.id, s.name, s.stage_order, s.status,
                      get_consensus_percentage(s.id) AS percentage,
                      (SELECT COUNT(*) FROM votes v WHERE v.stage_id = s.id) AS total_votes,
                      (SELECT COUNT(*) FROM votes v WHERE v.stage_id = s.id AND v.approved = true) AS approve_votes
               FROM stages s
               WHERE s.document_id = %s
               ORDER BY s.stage_order""",
            (document_id,)
        )

        stages_data = []
        for s in stages:
            pct = float(s["percentage"]) if s["percentage"] else 0.0
            stages_data.append({
                "stage_id": str(s["id"]),
                "name": s["name"],
                "stage_order": s["stage_order"],
                "status": s["status"],
                "consensus_percentage": pct,
                "consensus_threshold": threshold,
                "consensus_reached": pct >= threshold,
                "total_votes": s["total_votes"],
                "approve_votes": s["approve_votes"],
            })

        return {
            "document_id": document_id,
            "document_title": doc["title"],
            "document_status": doc["status"],
            "current_stage_order": doc["stage_order"],
            "threshold": threshold,
            "stages": stages_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"consensus_status error: {e}")
        raise HTTPException(500, f"Failed to get consensus status: {e}")


@app.post("/mcp/generate_clean_version/{document_id}")
async def kms_generate_clean_version(document_id: str, req: GenerateCleanVersionRequest = None):
    """AI generates a clean version from accepted contributions using LiteLLM."""
    try:
        doc = db.query_one(
            "SELECT id, title, current_version, project_id FROM documents WHERE id = %s",
            (document_id,)
        )
        if not doc:
            raise HTTPException(404, f"Document {document_id} not found")

        # Get accepted contributions
        contributions = db.query(
            """SELECT c.content, c.content_type, c.ai_model, c.is_ai_generated,
                      p.display_name AS author
               FROM contributions c
               LEFT JOIN profiles p ON c.user_id = p.id
               WHERE c.document_id = %s AND c.status = 'accepted'
               ORDER BY c.stage_order, c.created_at""",
            (document_id,)
        )

        if not contributions:
            # Fallback: get all contributions if none are accepted yet
            contributions = db.query(
                """SELECT c.content, c.content_type, c.ai_model, c.is_ai_generated,
                          p.display_name AS author
                   FROM contributions c
                   LEFT JOIN profiles p ON c.user_id = p.id
                   WHERE c.document_id = %s AND c.status != 'rejected'
                   ORDER BY c.stage_order, c.created_at""",
                (document_id,)
            )

        if not contributions:
            raise HTTPException(400, "No contributions found for this document")

        # Build prompt for LiteLLM
        contrib_texts = []
        for c in contributions:
            content = c["content"]
            if isinstance(content, dict):
                text = content.get("text", content.get("data", json.dumps(content)))
            else:
                text = str(content)
            author = c["author"] or "Anonymous"
            contrib_texts.append(f"[{author}] ({c['content_type']}): {text}")

        prompt = (
            f"You are a knowledge management assistant. The document '{doc['title']}' "
            f"has the following contributions from team members. Please merge them into "
            f"a single clean, coherent version. Preserve all important information, "
            f"remove duplicates, and improve structure.\n\n"
            f"Contributions:\n" + "\n---\n".join(contrib_texts) +
            f"\n\nGenerate a clean merged version:"
        )

        # Call LiteLLM
        ai_model = "claude-sonnet"
        clean_content = None
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                headers = {}
                if LITELLM_MASTER_KEY:
                    headers["Authorization"] = f"Bearer {LITELLM_MASTER_KEY}"
                resp = await client.post(
                    f"{LITELLM_URL}/chat/completions",
                    headers=headers,
                    json={
                        "model": ai_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 4096,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    clean_content = data["choices"][0]["message"]["content"]
                else:
                    logger.warning(f"LiteLLM returned {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"LiteLLM call failed: {e}")

        # Fallback if AI call failed: simple concatenation
        if not clean_content:
            clean_content = "\n\n---\n\n".join(
                c["content"].get("text", str(c["content"])) if isinstance(c["content"], dict) else str(c["content"])
                for c in contributions
            )
            ai_model = None

        # Determine next version number
        new_version = (doc["current_version"] or 1) + 1

        user_id = _get_user_id(req.user_id if req else None)

        # Insert new version
        version_row = db.execute_returning(
            """INSERT INTO doc_versions (document_id, version_number, content, summary, created_by, is_ai_generated, ai_model)
               VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s)
               RETURNING id, version_number, created_at""",
            (
                document_id,
                new_version,
                json.dumps({"text": clean_content}),
                f"AI-merged version from {len(contributions)} contributions",
                user_id,
                ai_model is not None,
                ai_model,
            )
        )

        # Update document current_version
        db.execute(
            "UPDATE documents SET current_version = %s, updated_at = NOW() WHERE id = %s",
            (new_version, document_id)
        )

        return {
            "status": "ok",
            "version_id": str(version_row["id"]),
            "version_number": version_row["version_number"],
            "document_id": document_id,
            "ai_generated": ai_model is not None,
            "ai_model": ai_model,
            "contributions_merged": len(contributions),
            "created_at": _serialize(version_row["created_at"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"generate_clean_version error: {e}")
        raise HTTPException(500, f"Failed to generate clean version: {e}")


@app.post("/mcp/close_stage")
async def kms_close_stage(req: CloseStageRequest):
    """Close a document stage and advance document to next stage."""
    try:
        stage = db.query_one(
            "SELECT id, status, document_id, stage_order FROM stages WHERE id = %s",
            (req.stage_id,)
        )
        if not stage:
            raise HTTPException(404, f"Stage {req.stage_id} not found")

        if str(stage["document_id"]) != req.document_id:
            raise HTTPException(400, "Stage does not belong to the specified document")

        if stage["status"] == "closed":
            raise HTTPException(400, "Stage is already closed")

        # Close the stage
        db.execute(
            "UPDATE stages SET status = 'closed', closed_at = NOW() WHERE id = %s",
            (req.stage_id,)
        )

        # Advance document stage_order
        db.execute(
            "UPDATE documents SET stage_order = stage_order + 1, updated_at = NOW() WHERE id = %s",
            (req.document_id,)
        )

        # Get updated document
        doc = db.query_one(
            "SELECT stage_order, status FROM documents WHERE id = %s",
            (req.document_id,)
        )

        return {
            "status": "ok",
            "stage_id": req.stage_id,
            "stage_closed": True,
            "document_id": req.document_id,
            "new_stage_order": doc["stage_order"] if doc else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"close_stage error: {e}")
        raise HTTPException(500, f"Failed to close stage: {e}")


@app.post("/mcp/deliver_lesson")
async def kms_deliver_lesson(req: DeliverLessonRequest):
    """Deliver a completed lesson to a course project."""
    try:
        # Verify course exists and is of category 'course'
        course = db.query_one(
            "SELECT id, name, category FROM projects WHERE id = %s",
            (req.course_id,)
        )
        if not course:
            raise HTTPException(404, f"Course/project {req.course_id} not found")
        if course["category"] != "course":
            raise HTTPException(400, f"Project '{course['name']}' is not a course (category: {course['category']})")

        user_id = _get_user_id(req.user_id)

        # Determine lesson title
        title = req.title or f"Lesson - {course['name']}"

        # Count existing documents in course to determine order
        count_row = db.query_one(
            "SELECT COUNT(*) AS cnt FROM documents WHERE project_id = %s",
            (req.course_id,)
        )
        lesson_order = (count_row["cnt"] or 0) + 1

        # Create a new document in the course with approved status
        doc_row = db.execute_returning(
            """INSERT INTO documents (project_id, title, content, status, created_by, stage_order)
               VALUES (%s, %s, %s::jsonb, 'approved', %s, %s)
               RETURNING id, title, status, created_at""",
            (
                req.course_id,
                title,
                json.dumps({"text": req.lesson_content}),
                user_id,
                lesson_order,
            )
        )

        return {
            "status": "ok",
            "document_id": str(doc_row["id"]),
            "title": doc_row["title"],
            "course_id": req.course_id,
            "course_name": course["name"],
            "lesson_order": lesson_order,
            "doc_status": "approved",
            "created_at": _serialize(doc_row["created_at"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"deliver_lesson error: {e}")
        raise HTTPException(500, f"Failed to deliver lesson: {e}")


@app.get("/mcp/project_status/{project_id}")
async def kms_get_project_status(project_id: str):
    """Get comprehensive project status with documents, stages, members, votes."""
    try:
        project = db.query_one(
            """SELECT id, name, description, category, status, owner_id,
                      consensus_threshold, settings, created_at, updated_at
               FROM projects WHERE id = %s""",
            (project_id,)
        )
        if not project:
            raise HTTPException(404, f"Project {project_id} not found")

        # Get members
        members = db.query(
            """SELECT pm.user_id, pm.role, pm.ai_model, pm.joined_at,
                      p.display_name, p.email
               FROM project_members pm
               JOIN profiles p ON pm.user_id = p.id
               WHERE pm.project_id = %s
               ORDER BY pm.joined_at""",
            (project_id,)
        )

        # Get documents with stages and vote counts
        documents = db.query(
            """SELECT d.id, d.title, d.current_version, d.stage_order, d.status,
                      d.created_at, d.updated_at,
                      (SELECT COUNT(*) FROM contributions c WHERE c.document_id = d.id) AS contribution_count,
                      (SELECT COUNT(*) FROM votes v WHERE v.document_id = d.id) AS vote_count
               FROM documents d
               WHERE d.project_id = %s
               ORDER BY d.created_at""",
            (project_id,)
        )

        docs_data = []
        for doc in documents:
            # Get stages for this document
            stages = db.query(
                """SELECT s.id, s.name, s.stage_order, s.status, s.approved_at, s.closed_at,
                          (SELECT COUNT(*) FROM votes v WHERE v.stage_id = s.id) AS vote_count,
                          (SELECT COUNT(*) FROM votes v WHERE v.stage_id = s.id AND v.approved) AS approve_count
                   FROM stages s
                   WHERE s.document_id = %s
                   ORDER BY s.stage_order""",
                (str(doc["id"]),)
            )

            docs_data.append({
                "id": str(doc["id"]),
                "title": doc["title"],
                "current_version": doc["current_version"],
                "stage_order": doc["stage_order"],
                "status": doc["status"],
                "contribution_count": doc["contribution_count"],
                "vote_count": doc["vote_count"],
                "created_at": _serialize(doc["created_at"]),
                "updated_at": _serialize(doc["updated_at"]),
                "stages": [_serialize(dict(s)) for s in stages],
            })

        return {
            "project": _serialize(dict(project)),
            "member_count": len(members),
            "members": [_serialize(dict(m)) for m in members],
            "document_count": len(documents),
            "documents": docs_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"project_status error: {e}")
        raise HTTPException(500, f"Failed to get project status: {e}")


@app.get("/mcp/pending_votes")
async def kms_list_pending_votes(user_id: Optional[str] = None):
    """List all stages in 'voting' status that the user hasn't voted on yet."""
    try:
        uid = _get_user_id(user_id)
        if not uid:
            raise HTTPException(400, "user_id required (no default user found)")

        # Find stages in voting status for projects the user is a member of,
        # where the user has NOT yet voted
        pending = db.query(
            """SELECT s.id AS stage_id, s.name AS stage_name, s.stage_order,
                      d.id AS document_id, d.title AS document_title,
                      p.id AS project_id, p.name AS project_name,
                      get_consensus_percentage(s.id) AS current_percentage,
                      p.consensus_threshold,
                      (SELECT COUNT(*) FROM votes v WHERE v.stage_id = s.id) AS total_votes,
                      (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) AS total_members
               FROM stages s
               JOIN documents d ON s.document_id = d.id
               JOIN projects p ON d.project_id = p.id
               JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = %s
               WHERE s.status = 'voting'
                 AND NOT EXISTS (
                     SELECT 1 FROM votes v WHERE v.stage_id = s.id AND v.user_id = %s
                 )
               ORDER BY s.created_at DESC""",
            (uid, uid)
        )

        return {
            "user_id": uid,
            "pending_count": len(pending),
            "pending": [
                {
                    "stage_id": str(row["stage_id"]),
                    "stage_name": row["stage_name"],
                    "stage_order": row["stage_order"],
                    "document_id": str(row["document_id"]),
                    "document_title": row["document_title"],
                    "project_id": str(row["project_id"]),
                    "project_name": row["project_name"],
                    "current_consensus": float(row["current_percentage"]) if row["current_percentage"] else 0.0,
                    "threshold": float(row["consensus_threshold"]) * 100,
                    "total_votes": row["total_votes"],
                    "total_members": row["total_members"],
                }
                for row in pending
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"pending_votes error: {e}")
        raise HTTPException(500, f"Failed to list pending votes: {e}")


# ─── Health & Root ──────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check - also verifies DB connectivity."""
    try:
        row = db.query_one("SELECT 1 AS ok")
        db_ok = row is not None
    except Exception as e:
        db_ok = False
        logger.error(f"Health check DB error: {e}")

    return {
        "status": "ok" if db_ok else "degraded",
        "service": "kms-mcp-server",
        "version": "1.0.0",
        "database": "connected" if db_ok else "disconnected",
    }


@app.get("/")
async def root():
    return {
        "service": "KMS MCP Server",
        "version": "1.0.0",
        "auth": "enabled" if (LITELLM_MASTER_KEY or MCP_API_KEY) else "disabled (dev mode)",
        "tools": [
            "create_project",
            "add_contribution",
            "vote",
            "consensus_status",
            "generate_clean_version",
            "close_stage",
            "deliver_lesson",
            "project_status",
            "pending_votes",
        ],
    }


@app.on_event("shutdown")
async def shutdown():
    db.close_pool()
