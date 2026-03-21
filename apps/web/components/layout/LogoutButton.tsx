"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "8px 16px",
        borderRadius: "6px",
        border: "1px solid #2a2a40",
        background: "transparent",
        color: "#9898b0",
        fontSize: "13px",
        cursor: "pointer",
      }}
    >
      Odhlasit
    </button>
  );
}
