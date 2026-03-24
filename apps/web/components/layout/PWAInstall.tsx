"use client";
import { useEffect, useState } from "react";

export function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Register SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    
    // Detect Android
    setIsAndroid(/android/i.test(navigator.userAgent));
    
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Catch install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  if (isInstalled) return null;

  return (
    <div style={{
      position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
      background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff",
      padding: "12px 24px", borderRadius: "12px", zIndex: 9999,
      boxShadow: "0 8px 32px rgba(99,102,241,0.4)", display: "flex",
      alignItems: "center", gap: "12px", fontSize: "14px", fontWeight: 500
    }}>
      <span style={{fontSize:"20px"}}>📱</span>
      {installPrompt ? (
        <>
          <span>Nainstalovat KMS na telefon</span>
          <button onClick={handleInstall} style={{
            background: "#fff", color: "#6366f1", border: "none", borderRadius: "8px",
            padding: "6px 16px", fontWeight: 600, cursor: "pointer", fontSize: "13px"
          }}>Instalovat</button>
        </>
      ) : isAndroid ? (
        <span>V menu prohlizece zvolte &quot;Pridat na plochu&quot;</span>
      ) : null}
      <button onClick={() => {
        const el = document.querySelector("[data-pwa-banner]") as HTMLElement;
        if (el) el.style.display = "none";
      }} data-pwa-banner style={{
        background: "none", border: "none", color: "rgba(255,255,255,0.7)",
        cursor: "pointer", fontSize: "18px", marginLeft: "8px"
      }}>×</button>
    </div>
  );
}
