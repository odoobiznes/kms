import { Pool, QueryResult } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// ---- Profiles ----

export async function getProfileByEmail(email: string) {
  const res = await query("SELECT * FROM profiles WHERE email = $1 AND is_active = true", [email]);
  return res.rows[0] || null;
}

export async function getProfile(id: string) {
  const res = await query("SELECT * FROM profiles WHERE id = $1", [id]);
  return res.rows[0] || null;
}

// ---- Projects ----

export async function getProjects() {
  const res = await query(`
    SELECT p.*,
           COUNT(DISTINCT pm.id) AS member_count,
           pr.display_name AS owner_name
    FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id
    LEFT JOIN profiles pr ON pr.id = p.owner_id
    GROUP BY p.id, pr.display_name
    ORDER BY p.updated_at DESC
  `);
  return res.rows;
}

export async function getProject(id: string) {
  const res = await query(`
    SELECT p.*,
           pr.display_name AS owner_name
    FROM projects p
    LEFT JOIN profiles pr ON pr.id = p.owner_id
    WHERE p.id = $1
  `, [id]);
  return res.rows[0] || null;
}

export async function createProject(data: {
  name: string;
  description?: string;
  category: string;
  owner_id: string;
}) {
  const res = await query(
    `INSERT INTO projects (name, description, category, owner_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.name, data.description || null, data.category, data.owner_id]
  );
  return res.rows[0];
}

// ---- Project Members ----

export async function getProjectMembers(projectId: string) {
  const res = await query(`
    SELECT pm.*, pr.display_name, pr.email, pr.avatar_url, pr.ai_model, pr.ai_provider
    FROM project_members pm
    JOIN profiles pr ON pr.id = pm.user_id
    WHERE pm.project_id = $1
    ORDER BY pm.joined_at
  `, [projectId]);
  return res.rows;
}

// ---- Documents ----

export async function getDocuments(projectId: string) {
  const res = await query(`
    SELECT d.*, pr.display_name AS author_name
    FROM documents d
    LEFT JOIN profiles pr ON pr.id = d.created_by
    WHERE d.project_id = $1
    ORDER BY d.stage_order, d.created_at
  `, [projectId]);
  return res.rows;
}

export async function getDocument(id: string) {
  const res = await query("SELECT * FROM documents WHERE id = $1", [id]);
  return res.rows[0] || null;
}

export async function createDocument(data: {
  project_id: string | null;
  title: string;
  created_by: string;
}) {
  const res = await query(
    `INSERT INTO documents (project_id, title, created_by)
     VALUES ($1, $2, $3) RETURNING *`,
    [data.project_id, data.title, data.created_by]
  );
  return res.rows[0];
}

// ---- Stages ----

export async function getStages(documentId: string) {
  const res = await query(`
    SELECT s.*,
           COUNT(v.id) AS vote_count,
           COUNT(v.id) FILTER (WHERE v.approved = true) AS approve_count,
           COUNT(v.id) FILTER (WHERE v.approved = false) AS reject_count
    FROM stages s
    LEFT JOIN votes v ON v.stage_id = s.id
    WHERE s.document_id = $1
    GROUP BY s.id
    ORDER BY s.stage_order
  `, [documentId]);
  return res.rows;
}

// ---- Votes ----

export async function getVotes(stageId: string) {
  const res = await query(`
    SELECT v.*, pr.display_name, pr.email
    FROM votes v
    JOIN profiles pr ON pr.id = v.user_id
    WHERE v.stage_id = $1
    ORDER BY v.created_at
  `, [stageId]);
  return res.rows;
}

export async function castVote(data: {
  document_id: string;
  stage_id: string;
  user_id: string;
  approved: boolean;
  comment?: string;
}) {
  const res = await query(
    `INSERT INTO votes (document_id, stage_id, user_id, approved, comment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (stage_id, user_id) DO UPDATE SET approved = $4, comment = $5
     RETURNING *`,
    [data.document_id, data.stage_id, data.user_id, data.approved, data.comment || null]
  );
  return res.rows[0];
}

export default pool;
