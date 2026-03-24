"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import CodeBlock from "@tiptap/extension-code-block";
import Image from "@tiptap/extension-image";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useMemo, useState, useCallback } from "react";
import * as Y from "yjs";

interface CollabEditorProps {
  documentId: string;
  userName: string;
  userColor?: string;
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}

const COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#3b82f6",
  "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#06b6d4",
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

interface ToolbarProps {
  editor: ReturnType<typeof useEditor>;
}

function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  const btnStyle = (active: boolean) => ({
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid " + (active ? "#6366f1" : "#2a2a40"),
    background: active ? "#6366f130" : "transparent",
    color: active ? "#a5b4fc" : "#9898b0",
    cursor: "pointer" as const,
    fontSize: "13px",
    fontWeight: 500 as const,
    transition: "all 0.15s",
    display: "inline-flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minWidth: "32px",
    height: "32px",
  });

  const sep = {
    width: "1px",
    height: "20px",
    background: "#2a2a40",
    margin: "0 4px",
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        padding: "8px 12px",
        borderBottom: "1px solid #2a2a40",
        background: "#0d0d16",
        borderRadius: "12px 12px 0 0",
        alignItems: "center",
      }}
    >
      <button
        style={btnStyle(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Tucne"
      >
        <strong>B</strong>
      </button>
      <button
        style={btnStyle(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Kurziva"
      >
        <em>I</em>
      </button>
      <button
        style={btnStyle(editor.isActive("strike"))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Preskrtnuto"
      >
        <s>S</s>
      </button>
      <button
        style={btnStyle(editor.isActive("highlight"))}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Zvyrazneni"
      >
        <span style={{ background: "#fbbf24", color: "#000", padding: "0 3px", borderRadius: "2px", fontSize: "11px" }}>H</span>
      </button>

      <div style={sep} />

      <button
        style={btnStyle(editor.isActive("heading", { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Nadpis 1"
      >
        H1
      </button>
      <button
        style={btnStyle(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Nadpis 2"
      >
        H2
      </button>
      <button
        style={btnStyle(editor.isActive("heading", { level: 3 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Nadpis 3"
      >
        H3
      </button>

      <div style={sep} />

      <button
        style={btnStyle(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Odrazky"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>
      </button>
      <button
        style={btnStyle(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Cislovany seznam"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" fill="currentColor" fontSize="8" fontWeight="bold" stroke="none">1</text><text x="2" y="14" fill="currentColor" fontSize="8" fontWeight="bold" stroke="none">2</text><text x="2" y="20" fill="currentColor" fontSize="8" fontWeight="bold" stroke="none">3</text></svg>
      </button>
      <button
        style={btnStyle(editor.isActive("taskList"))}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Ukoly"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="6" height="6" rx="1"/><polyline points="5 8 6 9 8 6.5"/><line x1="12" y1="8" x2="21" y2="8"/><rect x="3" y="14" width="6" height="6" rx="1"/><line x1="12" y1="17" x2="21" y2="17"/></svg>
      </button>

      <div style={sep} />

      <button
        style={btnStyle(editor.isActive("codeBlock"))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Blok kodu"
      >
        {"</>"}
      </button>
      <button
        style={btnStyle(false)}
        onClick={() => {
          const url = window.prompt("URL odkazu:");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        title="Odkaz"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <button
        style={btnStyle(false)}
        onClick={() => {
          const url = window.prompt("URL obrazku:");
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        title="Obrazek"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </button>

      <div style={sep} />

      <button
        style={btnStyle(false)}
        onClick={() => editor.chain().focus().undo().run()}
        title="Zpet"
        disabled={!editor.can().undo()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      </button>
      <button
        style={btnStyle(false)}
        onClick={() => editor.chain().focus().redo().run()}
        title="Znovu"
        disabled={!editor.can().redo()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
      </button>
    </div>
  );
}

export function CollabEditor({ documentId, userName, userColor, onEditorReady }: CollabEditorProps) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [connectedUsers, setConnectedUsers] = useState<Array<{ name: string; color: string }>>([]);
  const [saved, setSaved] = useState(true);

  const color = useMemo(() => userColor || randomColor(), [userColor]);

  const ydoc = useMemo(() => new Y.Doc(), []);

  const provider = useMemo(() => {
    const p = new HocuspocusProvider({
      url: `wss://${typeof window !== "undefined" ? window.location.host : "localhost"}/ws`,
      name: `doc-${documentId}`,
      document: ydoc,
      token: "kms-collab-token-2026",
      onStatus({ status: s }) {
        setStatus(s as "connecting" | "connected" | "disconnected");
      },
      onAwarenessUpdate({ states }) {
        const users: Array<{ name: string; color: string }> = [];
        states.forEach((state: Record<string, unknown>) => {
          if (state.user) {
            const u = state.user as { name: string; color: string };
            users.push({ name: u.name, color: u.color });
          }
        });
        setConnectedUsers(users);
      },
    });
    return p;
  }, [documentId, ydoc]);

  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
        codeBlock: false,
      }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      CodeBlock,
      Image,
      Placeholder.configure({
        placeholder: "Zacnete psat...",
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: { name: userName, color },
      }),
    ],
    editorProps: {
      attributes: {
        class: "collab-editor-content",
      },
    },
    onUpdate() {
      setSaved(false);
      setTimeout(() => setSaved(true), 1500);
    },
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  const statusConfig = {
    connecting: { label: "Pripojovani...", color: "#f59e0b", bg: "#f59e0b15" },
    connected: { label: "Pripojeno", color: "#22c55e", bg: "#22c55e15" },
    disconnected: { label: "Odpojeno", color: "#ef4444", bg: "#ef444415" },
  };

  const st = statusConfig[status];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Status bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          fontSize: "12px",
          color: "#9898b0",
          borderBottom: "1px solid #2a2a40",
          background: "#0a0a12",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "100px",
              border: `1px solid ${st.color}30`,
              background: st.bg,
              color: st.color,
              fontSize: "11px",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: st.color,
                display: "inline-block",
              }}
            />
            {st.label}
          </div>

          {/* Connected users */}
          {connectedUsers.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {connectedUsers.map((u, i) => (
                <div
                  key={i}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: u.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#fff",
                    border: "2px solid #0a0a0f",
                    marginLeft: i > 0 ? "-6px" : "0",
                    position: "relative",
                    zIndex: connectedUsers.length - i,
                  }}
                  title={u.name}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
              ))}
              <span style={{ marginLeft: "6px", fontSize: "11px" }}>
                {connectedUsers.length} online
              </span>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: saved ? "#22c55e" : "#f59e0b",
          }}
        >
          {saved ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Ulozeno
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Ukladani...
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar editor={editor} />

      {/* Editor */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px",
          background: "#12121a",
          borderRadius: "0 0 12px 12px",
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .collab-editor-content {
          outline: none;
          min-height: 400px;
          font-size: 15px;
          line-height: 1.7;
          color: #e8e8f0;
        }
        .collab-editor-content h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 24px 0 12px;
          color: #fff;
        }
        .collab-editor-content h2 {
          font-size: 22px;
          font-weight: 600;
          margin: 20px 0 10px;
          color: #fff;
        }
        .collab-editor-content h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 16px 0 8px;
          color: #fff;
        }
        .collab-editor-content p {
          margin: 8px 0;
        }
        .collab-editor-content ul,
        .collab-editor-content ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        .collab-editor-content li {
          margin: 4px 0;
        }
        .collab-editor-content ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .collab-editor-content ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .collab-editor-content ul[data-type="taskList"] li label {
          margin-top: 3px;
        }
        .collab-editor-content ul[data-type="taskList"] li input[type="checkbox"] {
          accent-color: #6366f1;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        .collab-editor-content pre {
          background: #0a0a14;
          border: 1px solid #2a2a40;
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          margin: 12px 0;
          font-family: "JetBrains Mono", "Fira Code", monospace;
          font-size: 13px;
          line-height: 1.5;
          color: #a5b4fc;
        }
        .collab-editor-content code {
          background: #1e1e35;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: "JetBrains Mono", "Fira Code", monospace;
          font-size: 13px;
          color: #a5b4fc;
        }
        .collab-editor-content pre code {
          background: none;
          padding: 0;
        }
        .collab-editor-content blockquote {
          border-left: 3px solid #6366f1;
          padding-left: 16px;
          color: #9898b0;
          margin: 12px 0;
          font-style: italic;
        }
        .collab-editor-content a {
          color: #818cf8;
          text-decoration: underline;
          cursor: pointer;
        }
        .collab-editor-content img {
          max-width: 100%;
          border-radius: 8px;
          margin: 12px 0;
        }
        .collab-editor-content mark {
          background: #fbbf2440;
          color: #fbbf24;
          padding: 1px 4px;
          border-radius: 3px;
        }
        .collab-editor-content hr {
          border: none;
          border-top: 1px solid #2a2a40;
          margin: 20px 0;
        }
        .collab-editor-content .is-empty::before {
          content: attr(data-placeholder);
          color: #4a4a60;
          pointer-events: none;
          float: left;
          height: 0;
        }
        /* Collaboration cursor styles */
        .collaboration-cursor__caret {
          position: relative;
          border-left: 2px solid;
          border-right: none;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          word-break: normal;
        }
        .collaboration-cursor__label {
          position: absolute;
          top: -1.5em;
          left: -1px;
          font-size: 11px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px 4px 4px 0;
          color: #fff;
          white-space: nowrap;
          user-select: none;
          pointer-events: none;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
