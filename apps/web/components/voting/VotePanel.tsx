"use client";

import { useState } from "react";

interface VotePanelProps {
  stageId: string;
  documentId: string;
  userId: string;
  approveCount: number;
  rejectCount: number;
  totalMembers: number;
  threshold: number;
}

export function VotePanel({
  stageId,
  documentId,
  userId,
  approveCount,
  rejectCount,
  totalMembers,
  threshold,
}: VotePanelProps) {
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(false);
  const [localApprove, setLocalApprove] = useState(approveCount);
  const [localReject, setLocalReject] = useState(rejectCount);
  const [comment, setComment] = useState("");

  const totalVotes = localApprove + localReject;
  const consensusPercent =
    totalVotes > 0 ? Math.round((localApprove / totalVotes) * 100) : 0;
  const thresholdPercent = Math.round(threshold * 100);
  const isAboveThreshold = consensusPercent >= thresholdPercent;

  async function handleVote(approved: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_id: stageId,
          document_id: documentId,
          user_id: userId,
          approved,
          comment: comment || null,
        }),
      });

      if (res.ok) {
        setVoted(true);
        if (approved) {
          setLocalApprove((v) => v + 1);
        } else {
          setLocalReject((v) => v + 1);
        }
      }
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "8px" }}>
      {/* Progress bar */}
      <div style={{ marginBottom: "8px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#9898b0",
            marginBottom: "4px",
          }}
        >
          <span>
            Konsenzus: {consensusPercent}%
          </span>
          <span>
            Prah: {thresholdPercent}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: "8px",
            background: "#1a1a2e",
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${consensusPercent}%`,
              height: "100%",
              background: isAboveThreshold
                ? "linear-gradient(90deg, #22c55e, #4ade80)"
                : "linear-gradient(90deg, #f59e0b, #fbbf24)",
              borderRadius: "4px",
              transition: "width 0.3s ease",
            }}
          />
          {/* Threshold indicator */}
          <div
            style={{
              position: "absolute",
              left: `${thresholdPercent}%`,
              top: "-2px",
              width: "2px",
              height: "12px",
              background: "#ef4444",
              borderRadius: "1px",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#9898b0",
            marginTop: "4px",
          }}
        >
          <span style={{ color: "#22c55e" }}>Schvaleno: {localApprove}</span>
          <span style={{ color: "#ef4444" }}>Zamitnuto: {localReject}</span>
          <span>Celkem: {totalVotes}/{totalMembers}</span>
        </div>
      </div>

      {/* Vote buttons */}
      {!voted && (
        <div>
          <div style={{ marginBottom: "8px" }}>
            <input
              type="text"
              placeholder="Komentar (nepovinny)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #2a2a40",
                background: "#12121a",
                color: "#e8e8f0",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleVote(true)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #22c55e40",
                background: "#22c55e15",
                color: "#22c55e",
                fontSize: "13px",
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              Schvalit
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ef444440",
                background: "#ef444415",
                color: "#ef4444",
                fontSize: "13px",
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              Zamitnout
            </button>
          </div>
        </div>
      )}

      {voted && (
        <div
          style={{
            textAlign: "center",
            padding: "8px",
            fontSize: "13px",
            color: "#22c55e",
          }}
        >
          Hlas zaznamenan
        </div>
      )}
    </div>
  );
}
