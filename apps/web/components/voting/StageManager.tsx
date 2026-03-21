"use client";

import { useState } from "react";
import { VotePanel } from "./VotePanel";

interface Stage {
  id: string;
  name: string;
  stage_order: number;
  status: string;
  vote_count: number;
  approve_count: number;
  reject_count: number;
}

interface StageManagerProps {
  documentId: string;
  stages: Stage[];
  currentStageOrder: number;
  userId: string;
  memberCount: number;
  docStatus: string;
}

const stageColors: Record<string, { main: string; bg: string }> = {
  open: { main: "#6366f1", bg: "#6366f115" },
  voting: { main: "#f59e0b", bg: "#f59e0b15" },
  approved: { main: "#22c55e", bg: "#22c55e15" },
  closed: { main: "#3b82f6", bg: "#3b82f615" },
};

const stageIcons: Record<string, string> = {
  open: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
  voting: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  approved: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  closed: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
};

export function StageManager({
  documentId,
  stages,
  currentStageOrder,
  userId,
  memberCount,
  docStatus,
}: StageManagerProps) {
  const [loading, setLoading] = useState(false);
  const [localStages, setLocalStages] = useState(stages);
  const [activeStage, setActiveStage] = useState<string | null>(
    stages.find((s) => s.stage_order === currentStageOrder)?.id || null
  );

  const currentStage = localStages.find((s) => s.id === activeStage);
  const consensusThreshold = 0.66;

  async function handleStartVoting() {
    if (!activeStage) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stages/start-voting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: activeStage, document_id: documentId }),
      });
      if (res.ok) {
        setLocalStages((prev) =>
          prev.map((s) => (s.id === activeStage ? { ...s, status: "voting" } : s))
        );
      }
    } catch (err) {
      console.error("Start voting error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseStage() {
    if (!activeStage) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stages/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: activeStage, document_id: documentId }),
      });
      if (res.ok) {
        setLocalStages((prev) =>
          prev.map((s) => (s.id === activeStage ? { ...s, status: "approved" } : s))
        );
      }
    } catch (err) {
      console.error("Close stage error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate overall progress
  const approvedCount = localStages.filter((s) => s.status === "approved").length;
  const totalStages = localStages.length;
  const progressPercent = totalStages > 0 ? Math.round((approvedCount / totalStages) * 100) : 0;

  return (
    <div>
      {/* Stage pipeline header */}
      <div
        style={{
          background: "#12121a",
          borderRadius: "12px",
          border: "1px solid #2a2a40",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Etapy dokumentu
          </h3>
          <span style={{ fontSize: "12px", color: "#9898b0" }}>
            {approvedCount}/{totalStages} dokonceno
          </span>
        </div>

        {/* Overall progress bar */}
        <div
          style={{
            width: "100%",
            height: "4px",
            background: "#1a1a2e",
            borderRadius: "2px",
            overflow: "hidden",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "linear-gradient(90deg, #6366f1, #22c55e)",
              borderRadius: "2px",
              transition: "width 0.5s ease",
            }}
          />
        </div>

        {/* Stage pipeline */}
        <div style={{ display: "flex", gap: "4px" }}>
          {localStages.map((stage, idx) => {
            const sc = stageColors[stage.status] || stageColors.open;
            const isActive = stage.id === activeStage;
            const isCurrent = stage.stage_order === currentStageOrder;

            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: "8px",
                  border: isActive ? `2px solid ${sc.main}` : "1px solid #2a2a40",
                  background: isActive ? sc.bg : "transparent",
                  color: isActive ? sc.main : "#9898b0",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.2s",
                  position: "relative",
                }}
              >
                {/* Stage indicator dot */}
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: stage.status === "approved" ? "#22c55e" :
                                stage.status === "voting" ? "#f59e0b" :
                                stage.status === "closed" ? "#3b82f6" :
                                isCurrent ? "#6366f130" : "#1a1a2e",
                    border: `2px solid ${
                      stage.status === "approved" ? "#22c55e" :
                      stage.status === "voting" ? "#f59e0b" :
                      isCurrent ? "#6366f1" : "#2a2a40"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "2px",
                  }}
                >
                  {stage.status === "approved" && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                  {stage.status === "voting" && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><circle cx="12" cy="12" r="5"/></svg>
                  )}
                </div>
                <span style={{ textAlign: "center", lineHeight: 1.2 }}>{stage.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active stage details */}
      {currentStage && (
        <div
          style={{
            background: "#12121a",
            borderRadius: "12px",
            border: "1px solid #2a2a40",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#e8e8f0" }}>
              {currentStage.name}
            </h4>
            <span
              style={{
                fontSize: "11px",
                padding: "3px 10px",
                borderRadius: "100px",
                border: `1px solid ${(stageColors[currentStage.status] || stageColors.open).main}30`,
                color: (stageColors[currentStage.status] || stageColors.open).main,
                background: (stageColors[currentStage.status] || stageColors.open).bg,
                fontWeight: 500,
              }}
            >
              {currentStage.status === "open" ? "Otevren" :
               currentStage.status === "voting" ? "Hlasovani" :
               currentStage.status === "approved" ? "Schvalen" : "Uzavren"}
            </span>
          </div>

          {/* Voting panel */}
          {currentStage.status === "voting" && (
            <VotePanel
              stageId={currentStage.id}
              documentId={documentId}
              userId={userId}
              approveCount={currentStage.approve_count}
              rejectCount={currentStage.reject_count}
              totalMembers={memberCount}
              threshold={consensusThreshold}
            />
          )}

          {/* Action buttons */}
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            {currentStage.status === "open" && (
              <button
                onClick={handleStartVoting}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #6366f140",
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  transition: "all 0.2s",
                }}
              >
                Zahajit hlasovani
              </button>
            )}

            {currentStage.status === "voting" && (
              <button
                onClick={handleCloseStage}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #22c55e40",
                  background: "#22c55e15",
                  color: "#22c55e",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  transition: "all 0.2s",
                }}
              >
                Uzavrit etapu
              </button>
            )}

            {currentStage.status === "approved" && (
              <div
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "#22c55e10",
                  color: "#22c55e",
                  fontSize: "13px",
                  fontWeight: 500,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Etapa schvalena
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
