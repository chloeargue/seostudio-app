import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    
    if (code) {
      // Échanger le code contre un token via notre backend
      fetch("/api/gsc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exchange", code }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.access_token) {
            localStorage.setItem("seos_gsc_token", data.access_token);
          }
          // Rediriger vers le dashboard
          window.location.href = "/";
        })
        .catch(() => {
          window.location.href = "/";
        });
    } else {
      window.location.href = "/";
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #bbf7d0", borderTop: "3px solid #16a34a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#6b7280", fontSize: 14 }}>Connexion Google en cours...</p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
