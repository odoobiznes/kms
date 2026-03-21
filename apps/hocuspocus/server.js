import { Server } from "@hocuspocus/server";
import pg from "pg";
import { Buffer } from "node:buffer";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://kms_user:81e0c04b483de04b954737190c47e3a7@127.0.0.1:5432/kms";
const AUTH_TOKEN = process.env.HOCUSPOCUS_TOKEN || "kms-collab-token-2026";
const PORT = parseInt(process.env.PORT || "1234", 10);

const pool = new Pool({ connectionString: DATABASE_URL });

// Parse document name -> document UUID
function parseDocName(name) {
  // format: "doc-<uuid>"
  const match = name.match(/^doc-(.+)$/);
  return match ? match[1] : null;
}

const server = Server.configure({
  port: PORT,
  address: "127.0.0.1",

  async onAuthenticate({ token, documentName }) {
    if (token !== AUTH_TOKEN) {
      throw new Error("Neplatny autorizacni token");
    }
    const docId = parseDocName(documentName);
    if (!docId) {
      throw new Error("Neplatny nazev dokumentu");
    }
    // Verify document exists
    const res = await pool.query("SELECT id FROM documents WHERE id = $1", [docId]);
    if (res.rows.length === 0) {
      throw new Error("Dokument nenalezen");
    }
    return { docId };
  },

  async onLoadDocument({ documentName, document }) {
    const docId = parseDocName(documentName);
    if (!docId) return document;

    try {
      const res = await pool.query(
        "SELECT yjs_state FROM documents WHERE id = $1",
        [docId]
      );
      if (res.rows[0]?.yjs_state) {
        const state = res.rows[0].yjs_state;
        const uint8 = Buffer.isBuffer(state) ? new Uint8Array(state) : new Uint8Array(Buffer.from(state, "base64"));
        const Y = await import("yjs");
        Y.applyUpdate(document, uint8);
      }
    } catch (err) {
      console.error(`[Hocuspocus] Chyba pri nacitani doc ${docId}:`, err.message);
    }

    return document;
  },

  async onStoreDocument({ documentName, document }) {
    const docId = parseDocName(documentName);
    if (!docId) return;

    try {
      const Y = await import("yjs");
      const state = Buffer.from(Y.encodeStateAsUpdate(document));
      await pool.query(
        "UPDATE documents SET yjs_state = $1, updated_at = NOW() WHERE id = $2",
        [state, docId]
      );
    } catch (err) {
      console.error(`[Hocuspocus] Chyba pri ukladani doc ${docId}:`, err.message);
    }
  },

  async onDisconnect({ documentName }) {
    console.log(`[Hocuspocus] Odpojeno: ${documentName}`);
  },
});

// Add yjs_state column if not exists
async function ensureColumn() {
  try {
    await pool.query(`
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS yjs_state BYTEA
    `);
    console.log("[Hocuspocus] Sloupec yjs_state pripraven");
  } catch (err) {
    console.error("[Hocuspocus] Chyba pri kontrole sloupce:", err.message);
  }
}

ensureColumn().then(() => {
  server.listen();
  console.log(`[Hocuspocus] Server bezi na portu ${PORT}`);
});
