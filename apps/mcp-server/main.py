"""
KMS MCP Server - FastAPI
Exposes KMS operations for Claude CLI via MCP protocol.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os

app = FastAPI(title="KMS MCP Server", version="0.1.0")

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kms_user:changeme@localhost:5432/kms")
LITELLM_URL = os.environ.get("LITELLM_URL", "http://localhost:4000")


# === Models ===

class CreateProjectRequest(BaseModel):
    name: str
    category: str = "document"
    description: Optional[str] = None
    participants: Optional[list[str]] = None

class AddContributionRequest(BaseModel):
    document_id: str
    content: str
    content_type: str = "text"
    ai_model: Optional[str] = None

class VoteRequest(BaseModel):
    document_id: str
    stage_id: str
    approved: bool
    comment: Optional[str] = None

class DeliverLessonRequest(BaseModel):
    course_id: str
    lesson_content: str
    title: Optional[str] = None


# === MCP Tool Endpoints ===

@app.post("/mcp/create_project")
async def kms_create_project(req: CreateProjectRequest):
    """Create a new KMS project with participants."""
    # TODO: Implement with Supabase client
    return {"status": "ok", "message": f"Project '{req.name}' created"}

@app.post("/mcp/add_contribution")
async def kms_add_contribution(req: AddContributionRequest):
    """Add a contribution to a document (text, code, image, etc.)."""
    return {"status": "ok", "message": "Contribution added"}

@app.post("/mcp/vote")
async def kms_vote(req: VoteRequest):
    """Vote on a document stage (approve/reject)."""
    return {"status": "ok", "message": f"Vote recorded: {'approved' if req.approved else 'rejected'}"}

@app.get("/mcp/consensus_status/{document_id}")
async def kms_get_consensus_status(document_id: str):
    """Get current consensus percentage for a document."""
    return {"document_id": document_id, "percentage": 0, "threshold": 50, "reached": False}

@app.post("/mcp/generate_clean_version/{document_id}")
async def kms_generate_clean_version(document_id: str):
    """AI generates a clean version from approved contributions."""
    return {"status": "ok", "message": "Clean version generated"}

@app.post("/mcp/close_stage")
async def kms_close_stage(document_id: str, stage_id: str):
    """Close a document stage."""
    return {"status": "ok", "message": "Stage closed"}

@app.post("/mcp/deliver_lesson")
async def kms_deliver_lesson(req: DeliverLessonRequest):
    """Automatically deliver a completed lesson to a course."""
    return {"status": "ok", "message": f"Lesson delivered to course {req.course_id}"}

@app.get("/mcp/project_status/{project_id}")
async def kms_get_project_status(project_id: str):
    """Get project status including all documents and stages."""
    return {"project_id": project_id, "status": "active", "documents": []}

@app.get("/mcp/pending_votes")
async def kms_list_pending_votes():
    """List all pending votes for the current user."""
    return {"pending": []}


# === Health ===

@app.get("/health")
async def health():
    return {"status": "ok", "service": "kms-mcp-server"}

@app.get("/")
async def root():
    return {
        "service": "KMS MCP Server",
        "version": "0.1.0",
        "tools": [
            "create_project", "add_contribution", "vote",
            "consensus_status", "generate_clean_version",
            "close_stage", "deliver_lesson", "project_status",
            "pending_votes"
        ]
    }
