import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";

export default function DownloadPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e8f0" }}>
      <AppHeader />

      <main style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 16px", textAlign: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "10px" }}>
          Stahnout KMS
        </h1>
        <p style={{ color: "#9898b0", marginBottom: "40px", fontSize: "15px" }}>
          Kolaborativni platforma pro tymy + AI agenty
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", textAlign: "left" }}>
          {/* Android */}
          <div style={{
            background: "#12121a", border: "1px solid #2a2a40", borderRadius: "14px",
            padding: "28px 20px", textAlign: "center"
          }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>&#x1F916;</div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Android</h2>
            <p style={{ color: "#9898b0", fontSize: "13px", marginBottom: "20px", lineHeight: 1.6 }}>
              Nainstalujte primo z prohlizece.<br/>
              Zadna aplikace z obchodu neni potreba.
            </p>
            <div style={{
              background: "#1a1a2e", borderRadius: "10px", padding: "14px",
              textAlign: "left", fontSize: "13px", lineHeight: 1.8
            }}>
              <div style={{ fontWeight: 600, marginBottom: "6px", color: "#6366f1" }}>Postup:</div>
              <div>1. Otevrete Chrome na telefonu</div>
              <div>2. Jdete na <b>kms.it-enterprise.cloud</b></div>
              <div>3. Kliknete na <b>tri tecky</b> (menu)</div>
              <div>4. Zvolte <b>&quot;Pridat na plochu&quot;</b></div>
              <div>5. Potvrdte <b>&quot;Instalovat&quot;</b></div>
            </div>
            <div style={{
              marginTop: "14px", padding: "8px 14px", background: "#22c55e20",
              borderRadius: "8px", color: "#22c55e", fontSize: "12px"
            }}>
              Funguje offline - Push notifikace - Jako nativni app
            </div>
          </div>

          {/* iOS */}
          <div style={{
            background: "#12121a", border: "1px solid #2a2a40", borderRadius: "14px",
            padding: "28px 20px", textAlign: "center"
          }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>&#x1F34E;</div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>iPhone / iPad</h2>
            <p style={{ color: "#9898b0", fontSize: "13px", marginBottom: "20px", lineHeight: 1.6 }}>
              Nainstalujte primo ze Safari.<br/>
              Zadna aplikace z App Store neni potreba.
            </p>
            <div style={{
              background: "#1a1a2e", borderRadius: "10px", padding: "14px",
              textAlign: "left", fontSize: "13px", lineHeight: 1.8
            }}>
              <div style={{ fontWeight: 600, marginBottom: "6px", color: "#6366f1" }}>Postup:</div>
              <div>1. Otevrete <b>Safari</b> na iPhone</div>
              <div>2. Jdete na <b>kms.it-enterprise.cloud</b></div>
              <div>3. Kliknete na <b>sdileni</b> (sipka nahoru)</div>
              <div>4. Zvolte <b>&quot;Pridat na plochu&quot;</b></div>
              <div>5. Potvrdte <b>&quot;Pridat&quot;</b></div>
            </div>
            <div style={{
              marginTop: "14px", padding: "8px 14px", background: "#3b82f620",
              borderRadius: "8px", color: "#3b82f6", fontSize: "12px"
            }}>
              Push notifikace od iOS 16.4+ - Jako nativni app
            </div>
          </div>
        </div>

        {/* Desktop */}
        <div style={{
          background: "#12121a", border: "1px solid #2a2a40", borderRadius: "14px",
          padding: "20px", marginTop: "16px", textAlign: "center"
        }}>
          <div style={{ fontSize: "28px", marginBottom: "6px" }}>&#x1F4BB;</div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>Windows / Mac / Linux</h2>
          <p style={{ color: "#9898b0", fontSize: "13px" }}>
            Otevrete <b>kms.it-enterprise.cloud</b> v Chrome &rarr; kliknete na ikonu instalace v adresnim radku &rarr; &quot;Instalovat&quot;
          </p>
        </div>

        <Link href="/login" style={{
          display: "inline-block", marginTop: "28px", padding: "10px 28px",
          background: "linear-gradient(135deg, #6366f1, #818cf8)",
          color: "#fff", borderRadius: "8px", fontWeight: 600, fontSize: "14px",
          textDecoration: "none",
        }}>
          Prihlasit se do KMS
        </Link>
      </main>
    </div>
  );
}
