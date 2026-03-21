-- KMS Database Schema
-- Initial migration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTH
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    ai_provider TEXT DEFAULT 'claude',
    ai_model TEXT DEFAULT 'claude-sonnet',
    ai_api_key_encrypted TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TYPE project_category AS ENUM (
    'course',       -- Courses & Lessons
    'project',      -- New Projects (IT, startups)
    'review',       -- Review & Audit
    'research',     -- Ideas & Research
    'document'      -- General Documents
);

CREATE TYPE project_status AS ENUM (
    'draft', 'active', 'paused', 'completed', 'archived'
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category project_category NOT NULL DEFAULT 'document',
    status project_status NOT NULL DEFAULT 'draft',
    owner_id UUID REFERENCES profiles(id),
    consensus_threshold NUMERIC(3,2) DEFAULT 0.50,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECT MEMBERS
-- ============================================

CREATE TYPE member_role AS ENUM ('owner', 'editor', 'reviewer', 'viewer');

CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'editor',
    ai_model TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, user_id)
);

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE TYPE doc_status AS ENUM (
    'draft', 'in_review', 'approved', 'closed', 'reopened'
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB,
    current_version INTEGER DEFAULT 1,
    stage_order INTEGER DEFAULT 1,
    status doc_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENT VERSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS doc_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL,
    summary TEXT,
    created_by UUID REFERENCES profiles(id),
    is_ai_generated BOOLEAN DEFAULT false,
    ai_model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTRIBUTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    content JSONB NOT NULL,
    content_type TEXT DEFAULT 'text',
    ai_model TEXT,
    is_ai_generated BOOLEAN DEFAULT false,
    stage_order INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'merged')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STAGES (Document Lifecycle)
-- ============================================

CREATE TYPE stage_status AS ENUM (
    'open', 'voting', 'approved', 'rejected', 'closed'
);

CREATE TABLE IF NOT EXISTS stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stage_order INTEGER NOT NULL,
    status stage_status NOT NULL DEFAULT 'open',
    description TEXT,
    approved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    opened_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VOTES
-- ============================================

CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    approved BOOLEAN NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (stage_id, user_id)
);

-- ============================================
-- AI AGENT CONFIGURATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS user_ai_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    api_key_encrypted TEXT,
    is_default BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, provider, model)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_contributions_document ON contributions(document_id);
CREATE INDEX idx_contributions_user ON contributions(user_id);
CREATE INDEX idx_votes_document ON votes(document_id);
CREATE INDEX idx_votes_stage ON votes(stage_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate consensus percentage for a stage
CREATE OR REPLACE FUNCTION get_consensus_percentage(p_stage_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_members INTEGER;
    total_votes INTEGER;
    approve_votes INTEGER;
    project_id UUID;
BEGIN
    SELECT d.project_id INTO project_id
    FROM stages s JOIN documents d ON s.document_id = d.id
    WHERE s.id = p_stage_id;

    SELECT COUNT(*) INTO total_members
    FROM project_members WHERE project_id = project_id;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE approved = true)
    INTO total_votes, approve_votes
    FROM votes WHERE stage_id = p_stage_id;

    IF total_members = 0 THEN RETURN 0; END IF;
    RETURN (approve_votes::NUMERIC / total_members::NUMERIC) * 100;
END;
$$ LANGUAGE plpgsql;

-- Check if stage has reached consensus
CREATE OR REPLACE FUNCTION check_consensus(p_stage_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    threshold NUMERIC;
    percentage NUMERIC;
    proj_id UUID;
BEGIN
    SELECT d.project_id INTO proj_id
    FROM stages s JOIN documents d ON s.document_id = d.id
    WHERE s.id = p_stage_id;

    SELECT consensus_threshold INTO threshold
    FROM projects WHERE id = proj_id;

    percentage := get_consensus_percentage(p_stage_id) / 100;
    RETURN percentage >= threshold;
END;
$$ LANGUAGE plpgsql;

-- Auto-advance stage on vote
CREATE OR REPLACE FUNCTION on_vote_inserted()
RETURNS TRIGGER AS $$
BEGIN
    IF check_consensus(NEW.stage_id) THEN
        UPDATE stages SET status = 'approved', approved_at = NOW()
        WHERE id = NEW.stage_id AND status = 'voting';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vote_consensus
AFTER INSERT ON votes
FOR EACH ROW EXECUTE FUNCTION on_vote_inserted();
