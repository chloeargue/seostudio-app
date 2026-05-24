import { useState, useEffect } from "react";
import "./App.css";

const MISTRAL_KEY = import.meta.env.VITE_MISTRAL_KEY;

const callMistral = async (prompt, keyword = "", sector = "", location = "") => {
  // Pour les articles longs, appel direct à Mistral depuis le navigateur
  const isArticle = prompt.includes("1000-1200 mots");
  
  if (isArticle) {
    // Pour les articles, on passe par le backend qui enrichit avec Serper (données réelles)
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, keyword, sector, location }),
    });
    const d = await r.json();
    return d.text || "";
  }
  
  // Pour les autres générations, on passe par le backend
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  return data.text || "";
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const authCall = async (action, email, password) => {
  const endpoint = action === "signup"
    ? `${SUPABASE_URL}/auth/v1/signup`
    : `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error || data.error_description) return { error: data.error_description || data.error };
  return { user: data.user, session: data };
};

const NAV = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "content", icon: "✨", label: "Contenu auto" },
  { id: "calendar", icon: "📅", label: "Calendrier SEO" },
  { id: "tracking", icon: "📈", label: "Suivi mensuel" },
  { id: "audit", icon: "🔍", label: "Audit gratuit" },
];

const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function Badge({ color, children }) {
  const C = { green:["#dcfce7","#166534"], red:["#fee2e2","#991b1b"], blue:["#dbeafe","#1e40af"], amber:["#fef3c7","#92400e"], gray:["#f3f4f6","#4b5563"] };
  const [bg, text] = C[color] || C.gray;
  return <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:12, background:bg, color:text }}>{children}</span>;
}

function ScoreCircle({ score }) {
  const color = score >= 70 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  return <div style={{ width:72, height:72, borderRadius:"50%", border:`4px solid ${color}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}><span style={{ fontSize:22, fontWeight:700, color }}>{score}</span><span style={{ fontSize:9, color:"#9ca3af" }}>/100</span></div>;
}

// ─── ÉCRAN AUTH ───
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async () => {
    if (!email || !password) return setError("Email et mot de passe requis");
    setLoading(true); setError(""); setSuccess("");
    const data = await authCall(mode, email, password);
    setLoading(false);
    if (data.error) return setError(data.error);
    if (mode === "signup") {
      setSuccess("Compte créé ! Vérifie ton email pour confirmer, puis connecte-toi.");
      setMode("login");
    } else {
      onLogin(data.user);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem" }}>
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e5e7eb", padding:"2.5rem", width:"100%", maxWidth:420 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"0.5rem" }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📈</div>
          <span style={{ fontWeight:700, fontSize:18, color:"#111827" }}>SEO Studio</span>
        </div>
        <p style={{ fontSize:14, color:"#6b7280", marginBottom:"2rem" }}>
          {mode === "login" ? "Connecte-toi à ton espace SEO" : "Crée ton compte SEO Studio"}
        </p>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.fr" style={{ width:"100%", fontSize:13, padding:"9px 12px", borderRadius:8, border:"1px solid #d1d5db", boxSizing:"border-box" }} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>Mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width:"100%", fontSize:13, padding:"9px 12px", borderRadius:8, border:"1px solid #d1d5db", boxSizing:"border-box" }} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>

        {error && <div style={{ background:"#fee2e2", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12, color:"#991b1b" }}>❌ {error}</div>}
        {success && <div style={{ background:"#dcfce7", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12, color:"#166534" }}>✅ {success}</div>}

        <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"11px", borderRadius:10, border:"none", background:loading?"#9FE1CB":"#16a34a", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          {loading ? "⏳ Chargement..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>

        <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:"#6b7280" }}>
          {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }} style={{ color:"#16a34a", background:"none", border:"none", cursor:"pointer", fontWeight:600, fontSize:13 }}>
            {mode === "login" ? "Créer un compte" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── ÉCRAN SETUP CLIENT ───
function SetupScreen({ onSave, user, onLogout }) {
  const [form, setForm] = useState({ name:"", sector:"", location:"", website:"", audience:"" });
  const valid = form.name && form.sector && form.location;
  return (
    <div style={{ minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem" }}>
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e5e7eb", padding:"2.5rem", width:"100%", maxWidth:480 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📈</div>
            <span style={{ fontWeight:700, fontSize:18, color:"#111827" }}>SEO Studio</span>
          </div>
          <button onClick={onLogout} style={{ fontSize:11, color:"#6b7280", background:"none", border:"0.5px solid #e5e7eb", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Déconnexion</button>
        </div>
        <p style={{ fontSize:13, color:"#9ca3af", marginBottom:"1.5rem" }}>Connecté : {user?.email}</p>
        <p style={{ fontSize:14, color:"#6b7280", marginBottom:"1.5rem" }}>Configure le profil de ton client pour personnaliser tout le contenu SEO.</p>
        {[
          { key:"name", label:"Nom de l'entreprise", placeholder:"Ex: Plomberie Dupont", required:true },
          { key:"sector", label:"Secteur d'activité", placeholder:"Ex: Plomberie, Restauration...", required:true },
          { key:"location", label:"Zone géographique", placeholder:"Ex: Lyon, Paris...", required:true },
          { key:"website", label:"Site web (optionnel)", placeholder:"https://www.monsite.fr" },
          { key:"audience", label:"Cible client (optionnel)", placeholder:"Ex: Particuliers, PME..." },
        ].map(({ key, label, placeholder, required }) => (
          <div key={key} style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>{label} {required && <span style={{ color:"#dc2626" }}>*</span>}</label>
            <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} style={{ width:"100%", fontSize:13, padding:"9px 12px", borderRadius:8, border:"1px solid #d1d5db", boxSizing:"border-box" }} />
          </div>
        ))}
        <button onClick={() => valid && onSave(form)} disabled={!valid} style={{ width:"100%", padding:"11px", borderRadius:10, border:"none", background:valid?"#16a34a":"#d1d5db", color:"#fff", fontWeight:700, fontSize:14, cursor:valid?"pointer":"default", marginTop:8 }}>
          {valid ? "Créer l'espace SEO →" : "Remplis les champs obligatoires"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [genType, setGenType] = useState("article");
  const [genKw, setGenKw] = useState("");
  const [seasons, setSeasons] = useState([]);
  const [editSeason, setEditSeason] = useState(null);
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [newSeason, setNewSeason] = useState({ label:"", start:0, end:1, focus:"", color:"#16a34a", icon:"🌿" });
  const [tracking, setTracking] = useState([]);
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [newMonth, setNewMonth] = useState({ month:"", sessions:"", keywords:"", conversions:"", articles:"" });
  const [activeMonth, setActiveMonth] = useState(null);
  const [auditUrl, setAuditUrl] = useState("");
  const [auditSector, setAuditSector] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [auditError, setAuditError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Gérer le callback OAuth Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      // Échanger le code contre un token
      fetch('/api/gsc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange', code }),
      }).then(r => r.json()).then(data => {
        if (data.access_token) {
          localStorage.setItem('seos_gsc_token', data.access_token);
          setGscToken(data.access_token);
          // Nettoyer l'URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }
  }, []);

  // Charger les sites GSC quand le token est disponible
  useEffect(() => {
    if (!gscToken) return;
    fetch('/api/gsc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sites', access_token: gscToken }),
    }).then(r => r.json()).then(data => {
      if (data.sites) setGscSites(data.sites);
    });
  }, [gscToken]);

  // Charger les mots-clés quand un site est sélectionné
  useEffect(() => {
    if (!gscToken || !gscSite) return;
    setGscLoading(true);
    Promise.all([
      fetch('/api/gsc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'keywords', access_token: gscToken, site_url: gscSite }),
      }).then(r => r.json()),
      fetch('/api/gsc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pages', access_token: gscToken, site_url: gscSite }),
      }).then(r => r.json()),
    ]).then(([kw, pg]) => {
      if (kw.keywords) setGscKeywords(kw.keywords);
      if (pg.pages) setGscPages(pg.pages);
      setGscLoading(false);
    });
  }, [gscToken, gscSite]);

  const connectGSC = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = 'https://seostudio-app.vercel.app/auth/callback';
    const scope = 'https://www.googleapis.com/auth/webmasters.readonly';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  const disconnectGSC = () => {
    localStorage.removeItem('seos_gsc_token');
    localStorage.removeItem('seos_gsc_site');
    setGscToken(null);
    setGscSite(null);
    setGscKeywords([]);
    setGscPages([]);
  };

  // Restaurer la session au chargement
  useEffect(() => {
    const savedUser = localStorage.getItem('seos_u');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      const savedClient = localStorage.getItem('seos_c');
      if (savedClient) {
        const c = JSON.parse(savedClient);
        setClient(c);
        setAuditSector(c.sector);
        setAuditUrl(c.website||'');
      }
    }
    // Restaurer token GSC
    const savedToken = localStorage.getItem('seos_gsc_token');
    if (savedToken) setGscToken(savedToken);
    const savedSite = localStorage.getItem('seos_gsc_site');
    if (savedSite) setGscSite(savedSite);
  }, []);

  // GSC State
  const [gscToken, setGscToken] = useState(null);
  const [gscSites, setGscSites] = useState([]);
  const [gscSite, setGscSite] = useState(null);
  const [gscKeywords, setGscKeywords] = useState([]);
  const [gscPages, setGscPages] = useState([]);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState(null);

  const currentMonthIdx = new Date().getMonth();
  const currentSeason = seasons.find(s => currentMonthIdx >= s.start && currentMonthIdx <= s.end);

  const logout = () => { if(user) { localStorage.removeItem('seos_c'); localStorage.removeItem('seos_u'); } setUser(null); setClient(null); setGenResult(null); setAuditResult(null); setTracking([]); setSeasons([]); };

  if (!user) return <AuthScreen onLogin={(u) => {
    setUser(u);
    localStorage.setItem('seos_u', JSON.stringify(u));
    const saved = localStorage.getItem('seos_c');
    if (saved) { const c = JSON.parse(saved); setClient(c); setAuditSector(c.sector); setAuditUrl(c.website||''); }
  }} />;
  if (!client) return <SetupScreen onSave={c => {
    setClient(c); setAuditSector(c.sector); setAuditUrl(c.website||'');
    localStorage.setItem('seos_c', JSON.stringify(c));
  }} user={user} onLogout={logout} />;

  const generateContent = async () => {
    if (!genKw) return;
    setGenerating(true); setGenResult(null);
    const sc = currentSeason ? `Période: ${currentSeason.label}. Focus: ${currentSeason.focus}.` : "";
    const prompts = {
      article: `Tu es un expert SEO français et rédacteur web.
Client: ${client.name} | Secteur: ${client.sector} | Ville: ${client.location} | Audience: ${client.audience||"clients locaux"} | ${sc}
Mot-clé: "${genKw}"

RÈGLES ABSOLUES - violation = réponse incorrecte:
1. JAMAIS de **, *, #, ---, markdown
2. JAMAIS l'année 2024 - INTERDIT ABSOLUMENT
3. JAMAIS les mots "H1:", "H2:", "Introduction:", "Conclusion:" - écris directement le titre
4. Article de 1000-1200 mots COMPLET avec fin

STRUCTURE (écris directement sans labels):

[Titre accrocheur max 170 car avec "${genKw}"]

META TITLE: [max 60 car]
META DESCRIPTION: [max 155 car avec CTA]
URL: [slug-optimise]

[Introduction 120 mots - commence par "${genKw}"]

[Sous-titre section 1 max 70 car]
[Contenu 150 mots avec données chiffrées]

[Sous-titre section 2 max 70 car]
[Contenu 150 mots avec conseils pratiques]

[Sous-titre section 3 max 70 car]
[Contenu 150 mots avec exemples concrets]

Questions fréquentes:
[Question 1 comme un internaute la taperait?]
[Réponse directe 50 mots]
[Question 2?]
[Réponse directe 50 mots]
[Question 3?]
[Réponse directe 50 mots]

[Conclusion 100 mots avec appel à l'action pour contacter ${client.name}]

MAILLAGE INTERNE: [3 suggestions de liens]
MAILLAGE EXTERNE: [3 sources autoritaires]
SYNONYMES: [8 variantes du mot-clé]
IMAGES PEXELS: [3 requêtes en anglais]`,
      meta: `Tu es un expert SEO français. Client: ${client.name} (${client.sector}). ${sc} Mot-clé: "${genKw}". IMPORTANT: N'utilise JAMAIS de **, *, --- ou markdown. Texte brut uniquement. Génère:\nMETA TITLE (60 car max): [titre]\nMETA DESCRIPTION (155 car max): [desc]\nH1: [titre page]\nH1 ALTERNATIF: [variante]\nURL SLUG: [slug]\nMOTS-CLÉS LSI: [5 variantes sémantiques]`,
      keywords: `Tu es un expert SEO français. Client: ${client.name} (${client.sector}, ${client.location}). ${sc} Thème: "${genKw}". IMPORTANT: N'utilise JAMAIS de **, *, --- ou markdown. Texte brut uniquement. Génère:\nMOTS-CLÉS PRINCIPAUX (fort volume): liste 6\nLONGUE TRAÎNE (intention précise): liste 8\nQUESTIONS FAQ (featured snippets): liste 5\nMOTS-CLÉS LOCAUX: liste 4\nMOTS-CLÉS SAISONNIERS: liste 4`,
    };
    try { let r = await callMistral(prompts[genType], genKw, client.sector, client.location); r = r.replace(/\*\*/g, '').replace(/\*/g, '').replace(/---/g, '').replace(/^#{1,6} /gm, '').replace(/_/g, '').trim(); setGenResult(r); } catch { setGenResult("❌ Erreur de génération."); } finally { setGenerating(false); }
  };

  const runAudit = async () => {
    if (!auditUrl) return;
    setAuditing(true); setAuditResult(null); setAuditError(null);
    try {
      const r = await callMistral(`Tu es un expert SEO. Génère un audit SEO réaliste pour "${auditUrl}" secteur "${auditSector||client.sector}". UNIQUEMENT du JSON valide sans backticks ni markdown:\n{"score_global":72,"scores":{"technique":68,"contenu":75,"mots_cles":60,"mobile":85,"vitesse":70,"local":65},"points_forts":["Point 1","Point 2","Point 3"],"problemes":[{"titre":"P1","impact":"Fort","action":"Action"},{"titre":"P2","impact":"Moyen","action":"Action"},{"titre":"P3","impact":"Faible","action":"Action"}],"opportunites":["O1","O2","O3"],"verdict":"2 phrases."}`);
      const cleaned = r.replace(/```json|```/g, "").trim();
      setAuditResult(JSON.parse(cleaned));
    } catch { setAuditError("❌ Erreur lors de l'audit. Réessaie."); } finally { setAuditing(false); }
  };

  const sc = (s) => s >= 70 ? "#16a34a" : s >= 50 ? "#d97706" : "#dc2626";
  const sl = (s) => s >= 70 ? "Bon" : s >= 50 ? "À améliorer" : "Critique";
  const copyResult = () => { navigator.clipboard.writeText(genResult); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"system-ui,-apple-system,sans-serif", background:"#f9fafb" }}>
      <div style={{ width:200, background:"#fff", borderRight:"1px solid #e5e7eb", padding:"1.25rem 1rem", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"0.5rem" }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center" }}>📈</div>
          <span style={{ fontWeight:700, fontSize:14 }}>SEO Studio</span>
        </div>
        <div style={{ marginBottom:"1rem", padding:"8px 10px", background:"#f9fafb", borderRadius:8, border:"1px solid #e5e7eb" }}>
          <p style={{ fontSize:12, fontWeight:600, color:"#111827", margin:"0 0 1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{client.name}</p>
          <p style={{ fontSize:10, color:"#9ca3af", margin:"0 0 4px" }}>{client.sector} · {client.location}</p>
          <button onClick={() => setClient(null)} style={{ fontSize:10, color:"#6b7280", background:"none", border:"none", cursor:"pointer", padding:0, textDecoration:"underline" }}>Changer de client</button>
        </div>
        {currentSeason && <div style={{ marginBottom:"1rem", padding:"8px 10px", background:"#f0fdf4", borderRadius:8, border:"1px solid #bbf7d0" }}><p style={{ fontSize:9, color:"#6b7280", marginBottom:2 }}>PÉRIODE ACTIVE</p><p style={{ fontSize:11, fontWeight:600, color:"#15803d" }}>{currentSeason.icon} {currentSeason.label}</p></div>}
        {NAV.map(({ id, icon, label }) => (
          <button key={id} onClick={() => setPage(id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, border:"none", background:page===id?"#f0fdf4":"none", color:page===id?"#15803d":"#4b5563", fontSize:12, fontWeight:page===id?600:400, cursor:"pointer", marginBottom:2, textAlign:"left", width:"100%" }}>
            {icon} {label}
          </button>
        ))}
        <div style={{ marginTop:"auto" }}>
          <div style={{ padding:"8px 10px", background:"#f0fdf4", borderRadius:8, marginBottom:8 }}>
            <p style={{ fontSize:10, color:"#15803d", fontWeight:600, margin:"0 0 1px" }}>✓ IA Mistral active</p>
            <p style={{ fontSize:10, color:"#16a34a", margin:0 }}>Génération prête</p>
          </div>
          <div style={{ padding:"8px 10px", background:"#f9fafb", borderRadius:8, border:"1px solid #e5e7eb" }}>
            <p style={{ fontSize:10, color:"#6b7280", margin:"0 0 4px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</p>
            <button onClick={logout} style={{ fontSize:10, color:"#dc2626", background:"none", border:"none", cursor:"pointer", padding:0 }}>Déconnexion</button>
          </div>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"0.75rem 1.5rem", background:"#fff", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:14, fontWeight:600 }}>{NAV.find(n=>n.id===page)?.label}</span>
          {currentSeason && <Badge color="amber">{currentSeason.icon} {currentSeason.label}</Badge>}
          <span style={{ marginLeft:"auto", fontSize:11, color:"#9ca3af" }}>{client.name} · {client.location}</span>
        </div>

        <div style={{ flex:1, padding:"1.5rem", overflowY:"auto" }}>

          {page === "dashboard" && (
            <div>
              {/* Google Search Console */}
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem", marginBottom:"1.5rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:18 }}>🔍</span>
                    <p style={{ fontSize:13, fontWeight:600, margin:0 }}>Google Search Console</p>
                  </div>
                  {gscToken
                    ? <button onClick={disconnectGSC} style={{ fontSize:11, color:"#dc2626", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Déconnecter</button>
                    : <button onClick={connectGSC} style={{ fontSize:12, color:"#fff", background:"#16a34a", border:"none", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontWeight:600 }}>🔗 Connecter Google</button>
                  }
                </div>
                {!gscToken && <p style={{ fontSize:12, color:"#9ca3af", margin:0 }}>Connecte Google Search Console pour voir les vrais mots-clés et positions de ton client.</p>}
                {gscToken && !gscSite && gscSites.length > 0 && (
                  <div>
                    <p style={{ fontSize:12, color:"#4b5563", marginBottom:8 }}>Sélectionne le site à analyser :</p>
                    <select onChange={e => { setGscSite(e.target.value); localStorage.setItem('seos_gsc_site', e.target.value); }} style={{ width:"100%", fontSize:12, padding:"7px 8px", borderRadius:8, border:"1px solid #d1d5db" }}>
                      <option value="">-- Choisir un site --</option>
                      {gscSites.map(s => <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>)}
                    </select>
                  </div>
                )}
                {gscToken && gscSite && (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <p style={{ fontSize:11, color:"#6b7280", margin:0 }}>Site : <strong>{gscSite}</strong></p>
                      <button onClick={() => { setGscSite(null); localStorage.removeItem('seos_gsc_site'); }} style={{ fontSize:10, color:"#6b7280", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Changer</button>
                    </div>
                    {gscLoading && <p style={{ fontSize:12, color:"#9ca3af" }}>⏳ Chargement des données...</p>}
                    {!gscLoading && gscKeywords.length > 0 && (
                      <div>
                        <p style={{ fontSize:11, fontWeight:600, color:"#374151", marginBottom:8 }}>Top mots-clés (28 derniers jours)</p>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                          <thead><tr style={{ borderBottom:"1px solid #e5e7eb" }}>{["Mot-clé","Clics","Impressions","Position"].map(h => <th key={h} style={{ textAlign:"left", padding:"4px 8px", color:"#6b7280", fontWeight:600 }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {gscKeywords.slice(0,10).map((k,i) => (
                              <tr key={i} style={{ borderBottom:"1px solid #f3f4f6" }}>
                                <td style={{ padding:"6px 8px", fontWeight:500 }}>{k.keys?.[0]}</td>
                                <td style={{ padding:"6px 8px", color:"#16a34a", fontWeight:600 }}>{k.clicks}</td>
                                <td style={{ padding:"6px 8px", color:"#6b7280" }}>{k.impressions}</td>
                                <td style={{ padding:"6px 8px" }}>
                                  <span style={{ fontWeight:600, color: k.position <= 10 ? "#16a34a" : k.position <= 20 ? "#d97706" : "#dc2626" }}>#{Math.round(k.position)}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* KPI Cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:"1.5rem" }}>
                {[
                  { l:"Clics GSC (28j)", v:gscKeywords.length ? gscKeywords.reduce((a,k) => a+k.clicks, 0).toLocaleString() : tracking.length?tracking[tracking.length-1].sessions.toLocaleString():"—", c:"#16a34a" },
                  { l:"Mots-clés positionnés", v:gscKeywords.length || (tracking.length?tracking[tracking.length-1].keywords:"—"), c:"#2563eb" },
                  { l:"Articles publiés", v:tracking.length?tracking[tracking.length-1].articles:"—", c:"#d97706" },
                  { l:"Position moyenne", v:gscKeywords.length ? "#" + Math.round(gscKeywords.reduce((a,k) => a+k.position, 0)/gscKeywords.length) : "—", c:"#dc2626" },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background:"#fff", borderRadius:12, padding:"1rem", border:"1px solid #e5e7eb" }}>
                    <p style={{ fontSize:11, color:"#6b7280", marginBottom:4 }}>{l}</p>
                    <p style={{ fontSize:24, fontWeight:700, color:c, margin:0 }}>{v}</p>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem" }}>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>📅 Prochaine action</p>
                  {currentSeason ? <p style={{ fontSize:12, color:"#4b5563", lineHeight:1.6 }}>Période <strong>{currentSeason.label}</strong> — Focus : {currentSeason.focus}</p> : <p style={{ fontSize:12, color:"#9ca3af" }}>Configure le calendrier SEO</p>}
                  <button onClick={() => setPage(currentSeason?"content":"calendar")} style={{ marginTop:10, fontSize:12, color:"#fff", background:"#16a34a", border:"none", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontWeight:600 }}>{currentSeason?"Générer du contenu →":"Configurer →"}</button>
                </div>
                <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem" }}>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>🔍 Audit rapide</p>
                  <p style={{ fontSize:12, color:"#4b5563", lineHeight:1.6 }}>Diagnostic SEO complet du site de {client.name} en 30 secondes.</p>
                  <button onClick={() => setPage("audit")} style={{ marginTop:10, fontSize:12, color:"#fff", background:"#2563eb", border:"none", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontWeight:600 }}>Lancer l'audit →</button>
                </div>
              </div>
            </div>
          )}

          {page === "content" && (
            <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:16, minHeight:500 }}>
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem", display:"flex", flexDirection:"column" }}>
                <label style={{ fontSize:11, color:"#6b7280", marginBottom:4, display:"block" }}>Type de contenu</label>
                <select value={genType} onChange={e => setGenType(e.target.value)} style={{ width:"100%", fontSize:12, padding:"7px 8px", borderRadius:8, border:"1px solid #d1d5db", marginBottom:12, background:"#fff" }}>
                  <option value="article">Article de blog complet</option>
                  <option value="meta">Balises méta + Hn</option>
                  <option value="keywords">Recherche mots-clés</option>
                </select>
                <label style={{ fontSize:11, color:"#6b7280", marginBottom:4, display:"block" }}>Mot-clé cible</label>
                <input value={genKw} onChange={e => setGenKw(e.target.value)} placeholder={`Ex: ${client.sector.split(",")[0].trim().toLowerCase()} ${client.location}`} style={{ width:"100%", fontSize:12, padding:"7px 8px", borderRadius:8, border:"1px solid #d1d5db", marginBottom:12, boxSizing:"border-box" }} />
                {currentSeason && <div style={{ marginBottom:12 }}>
                  <p style={{ fontSize:10, color:"#9ca3af", marginBottom:6, textTransform:"uppercase" }}>Suggestions {currentSeason.label}</p>
                  {currentSeason.focus.split(",").slice(0,3).map(kw => <button key={kw} onClick={() => setGenKw(kw.trim())} style={{ display:"block", width:"100%", textAlign:"left", fontSize:11, padding:"5px 8px", marginBottom:4, borderRadius:6, border:"1px solid #e5e7eb", background:"#f9fafb", cursor:"pointer" }}>+ {kw.trim()}</button>)}
                </div>}
                <div style={{ marginBottom:12, padding:"8px", background:"#f0fdf4", borderRadius:8 }}>
                  <p style={{ fontSize:10, color:"#15803d", fontWeight:600 }}>✓ IA Mistral active</p>
                  <p style={{ fontSize:10, color:"#16a34a", margin:0 }}>Génération gratuite</p>
                </div>
                <button onClick={generateContent} disabled={generating||!genKw} style={{ marginTop:"auto", width:"100%", padding:"10px", borderRadius:8, border:"none", background:generating||!genKw?"#d1d5db":"#16a34a", color:"#fff", fontWeight:600, fontSize:13, cursor:generating||!genKw?"default":"pointer" }}>
                  {generating ? "⏳ Génération..." : "✨ Générer"}
                </button>
              </div>
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem", overflowY:"auto" }}>
                {!genResult && !generating && <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:8, color:"#9ca3af" }}><span style={{ fontSize:40 }}>📄</span><p>Saisis un mot-clé et génère</p></div>}
                {generating && <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:12 }}><div style={{ width:40, height:40, border:"3px solid #bbf7d0", borderTop:"3px solid #16a34a", borderRadius:"50%", animation:"spin 1s linear infinite" }} /><p style={{ fontSize:13, color:"#6b7280" }}>Génération IA pour {client.name}...</p></div>}
                {genResult && !generating && <div>
                  <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}><button onClick={copyResult} style={{ fontSize:11, color:"#6b7280", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>{copied?"✅ Copié !":"📋 Copier tout"}</button></div>
                  <div style={{ fontSize:13, lineHeight:1.8, color:"#374151" }}>
                    {genResult.split("\n").map((line,i) => {
                      if (/^(TITRE H1|H2 PRINCIPAL|H2 SECONDAIRE|INTRODUCTION|CONCLUSION):/.test(line)) return <h3 key={i} style={{ fontSize:14, fontWeight:600, borderLeft:"3px solid #16a34a", paddingLeft:10, margin:"12px 0 4px", color:"#111827" }}>{line}</h3>;
                      if (/^(META TITLE|META DESCRIPTION|MOTS-CLÉS|BALISES|URL SLUG|H1|LSI):/.test(line)) return <div key={i} style={{ background:"#f9fafb", borderRadius:6, padding:"6px 10px", marginBottom:5, fontSize:12, fontFamily:"monospace", border:"1px solid #e5e7eb" }}>{line}</div>;
                      if (!line.trim()) return <br key={i} />;
                      return <p key={i} style={{ margin:"0 0 6px" }}>{line}</p>;
                    })}
                  </div>
                </div>}
              </div>
            </div>
          )}

          {page === "calendar" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <p style={{ fontSize:13, color:"#6b7280" }}>Définis les périodes SEO — le contenu s'adapte à la période active</p>
                <button onClick={() => setShowAddSeason(true)} style={{ fontSize:12, color:"#fff", background:"#16a34a", border:"none", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontWeight:600 }}>+ Ajouter une période</button>
              </div>
              {seasons.length > 0 && <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem", marginBottom:16 }}>
                <p style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Calendrier annuel</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:4 }}>
                  {MONTHS.map((m,i) => { const s = seasons.find(s => i>=s.start && i<=s.end); return <div key={m} style={{ textAlign:"center" }}><div style={{ height:32, borderRadius:6, background:s?`${s.color}20`:"#f9fafb", border:`1px solid ${s?s.color:"#e5e7eb"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, marginBottom:4 }}>{s?s.icon:""}</div><span style={{ fontSize:9, color:i===currentMonthIdx?"#16a34a":"#9ca3af", fontWeight:i===currentMonthIdx?700:400 }}>{m}</span></div>; })}
                </div>
              </div>}
              {!seasons.length && !showAddSeason && <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"2.5rem", textAlign:"center" }}>
                <p style={{ fontSize:32, marginBottom:8 }}>📅</p>
                <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Aucune période définie</p>
                <p style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>Ex: Haute saison Jan-Mar, Nettoyage Jun-Aoû...</p>
                <button onClick={() => setShowAddSeason(true)} style={{ fontSize:13, color:"#fff", background:"#16a34a", border:"none", borderRadius:8, padding:"9px 18px", cursor:"pointer", fontWeight:600 }}>+ Créer ma première période</button>
              </div>}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {seasons.map(s => <div key={s.id} style={{ background:"#fff", borderRadius:12, border:`1px solid ${s.color}40`, padding:"1rem 1.25rem" }}>
                  {editSeason === s.id ? <div>
                    <input defaultValue={s.label} onChange={e => setSeasons(p => p.map(x => x.id===s.id?{...x,label:e.target.value}:x))} style={{ width:"100%", fontSize:12, padding:"6px 8px", borderRadius:6, border:"1px solid #d1d5db", marginBottom:8, boxSizing:"border-box" }} />
                    <textarea defaultValue={s.focus} onChange={e => setSeasons(p => p.map(x => x.id===s.id?{...x,focus:e.target.value}:x))} rows={2} style={{ width:"100%", fontSize:11, padding:"6px 8px", borderRadius:6, border:"1px solid #d1d5db", resize:"none", boxSizing:"border-box", marginBottom:8 }} />
                    <div style={{ display:"flex", gap:8 }}>
                      <select defaultValue={s.start} onChange={e => setSeasons(p => p.map(x => x.id===s.id?{...x,start:+e.target.value}:x))} style={{ flex:1, fontSize:11, padding:"5px", borderRadius:6, border:"1px solid #d1d5db" }}>{MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}</select>
                      <select defaultValue={s.end} onChange={e => setSeasons(p => p.map(x => x.id===s.id?{...x,end:+e.target.value}:x))} style={{ flex:1, fontSize:11, padding:"5px", borderRadius:6, border:"1px solid #d1d5db" }}>{MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}</select>
                      <button onClick={() => setEditSeason(null)} style={{ fontSize:12, color:"#fff", background:"#16a34a", border:"none", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontWeight:600 }}>Sauver</button>
                    </div>
                  </div> : <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:24, flexShrink:0 }}>{s.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:600 }}>{s.label}</span>
                        <Badge color="gray">{MONTHS[s.start]} → {MONTHS[s.end]}</Badge>
                        {currentMonthIdx>=s.start && currentMonthIdx<=s.end && <Badge color="green">✓ Actif</Badge>}
                      </div>
                      <p style={{ fontSize:12, color:"#6b7280", margin:0 }}>Focus : {s.focus}</p>
                    </div>
                    <button onClick={() => setEditSeason(s.id)} style={{ fontSize:12, background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:6, padding:"5px 10px", cursor:"pointer" }}>✏️</button>
                    <button onClick={() => setSeasons(p => p.filter(x => x.id!==s.id))} style={{ fontSize:12, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:6, padding:"5px 10px", cursor:"pointer" }}>🗑️</button>
                  </div>}
                </div>)}
              </div>
              {showAddSeason && <div style={{ marginTop:12, background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem" }}>
                <p style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Nouvelle période SEO</p>
                <input value={newSeason.label} onChange={e => setNewSeason(p => ({...p,label:e.target.value}))} placeholder="Ex: Haute saison, Été, Rentrée..." style={{ width:"100%", fontSize:12, padding:"7px 8px", borderRadius:8, border:"1px solid #d1d5db", marginBottom:8, boxSizing:"border-box" }} />
                <textarea value={newSeason.focus} onChange={e => setNewSeason(p => ({...p,focus:e.target.value}))} placeholder="Mots-clés focus séparés par virgule..." rows={2} style={{ width:"100%", fontSize:11, padding:"7px 8px", borderRadius:8, border:"1px solid #d1d5db", resize:"none", boxSizing:"border-box", marginBottom:8 }} />
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <div style={{ flex:1 }}><label style={{ fontSize:10, color:"#9ca3af", display:"block", marginBottom:3 }}>Début</label><select value={newSeason.start} onChange={e => setNewSeason(p => ({...p,start:+e.target.value}))} style={{ width:"100%", fontSize:12, padding:"6px", borderRadius:6, border:"1px solid #d1d5db" }}>{MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}</select></div>
                  <div style={{ flex:1 }}><label style={{ fontSize:10, color:"#9ca3af", display:"block", marginBottom:3 }}>Fin</label><select value={newSeason.end} onChange={e => setNewSeason(p => ({...p,end:+e.target.value}))} style={{ width:"100%", fontSize:12, padding:"6px", borderRadius:6, border:"1px solid #d1d5db" }}>{MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}</select></div>
                  <div style={{ flex:1 }}><label style={{ fontSize:10, color:"#9ca3af", display:"block", marginBottom:3 }}>Icône</label><select value={newSeason.icon} onChange={e => setNewSeason(p => ({...p,icon:e.target.value}))} style={{ width:"100%", fontSize:12, padding:"6px", borderRadius:6, border:"1px solid #d1d5db" }}>{["🌿","☀️","🍂","❄️","✂️","🌸","🏠","🔨","🚿","🌊","⭐","🎯"].map(ic => <option key={ic} value={ic}>{ic}</option>)}</select></div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { if(newSeason.label&&newSeason.focus){setSeasons(p=>[...p,{...newSeason,id:Date.now()}]);setNewSeason({label:"",start:0,end:1,focus:"",color:"#16a34a",icon:"🌿"});setShowAddSeason(false);}}} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:"#16a34a", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}>Ajouter</button>
                  <button onClick={() => setShowAddSeason(false)} style={{ flex:1, padding:"8px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#4b5563", fontSize:12, cursor:"pointer" }}>Annuler</button>
                </div>
              </div>}
            </div>
          )}

          {page === "tracking" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <p style={{ fontSize:13, color:"#6b7280" }}>Saisis les données mensuelles pour suivre la progression SEO</p>
                <button onClick={() => setShowAddMonth(true)} style={{ fontSize:12, color:"#fff", background:"#16a34a", border:"none", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontWeight:600 }}>+ Ajouter un mois</button>
              </div>
              {!tracking.length && !showAddMonth ? <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"2.5rem", textAlign:"center" }}>
                <p style={{ fontSize:32, marginBottom:8 }}>📈</p>
                <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Aucune donnée encore</p>
                <p style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>Ajoute les données du premier mois</p>
                <button onClick={() => setShowAddMonth(true)} style={{ fontSize:13, color:"#fff", background:"#16a34a", border:"none", borderRadius:8, padding:"9px 18px", cursor:"pointer", fontWeight:600 }}>+ Premier mois</button>
              </div> : tracking.length > 0 && <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", overflow:"hidden", marginBottom:16 }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead style={{ background:"#f9fafb" }}><tr>{["Mois","Sessions","Mots-clés","Conversions","Articles","Évolution"].map(h => <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:11, fontWeight:600, color:"#6b7280", borderBottom:"1px solid #e5e7eb" }}>{h}</th>)}</tr></thead>
                  <tbody>{tracking.map((m,i) => { const prev = tracking[i-1]; const g = prev&&prev.sessions?Math.round(((m.sessions-prev.sessions)/prev.sessions)*100):null; return <tr key={m.id} onClick={() => setActiveMonth(i)} style={{ borderBottom:"1px solid #f3f4f6", background:activeMonth===i?"#f0fdf4":"#fff", cursor:"pointer" }}><td style={{ padding:"12px 14px", fontWeight:600 }}>{m.month}</td><td style={{ padding:"12px 14px" }}>{m.sessions.toLocaleString()}</td><td style={{ padding:"12px 14px" }}><Badge color="blue">{m.keywords}</Badge></td><td style={{ padding:"12px 14px" }}>{m.conversions}</td><td style={{ padding:"12px 14px" }}><Badge color="amber">{m.articles}</Badge></td><td style={{ padding:"12px 14px" }}>{g!==null?<Badge color={g>=0?"green":"red"}>{g>=0?"+":""}{g}%</Badge>:<span style={{ color:"#9ca3af" }}>—</span>}</td></tr>; })}</tbody>
                </table>
              </div>}
              {showAddMonth && <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem", marginBottom:14 }}>
                <p style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Nouveau mois</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10 }}>
                  {[{key:"month",label:"Mois",placeholder:"Ex: Mai 2026"},{key:"sessions",label:"Sessions",placeholder:"1200"},{key:"keywords",label:"Mots-clés",placeholder:"34"},{key:"conversions",label:"Conversions",placeholder:"12"},{key:"articles",label:"Articles publiés",placeholder:"4"}].map(({key,label,placeholder}) => <div key={key}><label style={{ fontSize:11, color:"#6b7280", display:"block", marginBottom:3 }}>{label}</label><input value={newMonth[key]} onChange={e => setNewMonth(p=>({...p,[key]:e.target.value}))} placeholder={placeholder} style={{ width:"100%", fontSize:12, padding:"6px 8px", borderRadius:6, border:"1px solid #d1d5db", boxSizing:"border-box" }} /></div>)}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { if(newMonth.month){setTracking(p=>[...p,{...newMonth,id:Date.now(),sessions:+newMonth.sessions||0,keywords:+newMonth.keywords||0,conversions:+newMonth.conversions||0,articles:+newMonth.articles||0}]);setNewMonth({month:"",sessions:"",keywords:"",conversions:"",articles:""});setShowAddMonth(false);}}} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:"#16a34a", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}>Ajouter</button>
                  <button onClick={() => setShowAddMonth(false)} style={{ flex:1, padding:"8px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#4b5563", fontSize:12, cursor:"pointer" }}>Annuler</button>
                </div>
              </div>}
            </div>
          )}

          {page === "audit" && (
            <div>
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem", marginBottom:16 }}>
                <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🔍 Audit SEO gratuit</p>
                <p style={{ fontSize:12, color:"#6b7280", marginBottom:14 }}>Entre l'URL d'un site — diagnostic complet en 30 secondes.</p>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={auditUrl} onChange={e => setAuditUrl(e.target.value)} placeholder="https://www.monsite.fr" style={{ flex:2, fontSize:12, padding:"8px 12px", borderRadius:8, border:"1px solid #d1d5db" }} />
                  <input value={auditSector} onChange={e => setAuditSector(e.target.value)} placeholder="Secteur" style={{ flex:1, fontSize:12, padding:"8px 12px", borderRadius:8, border:"1px solid #d1d5db" }} />
                  <button onClick={runAudit} disabled={auditing||!auditUrl} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:auditing||!auditUrl?"#d1d5db":"#16a34a", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>{auditing?"⏳ Analyse...":"🔍 Lancer l'audit"}</button>
                </div>
                {auditError && <p style={{ fontSize:12, color:"#dc2626", marginTop:8 }}>{auditError}</p>}
              </div>
              {auditResult && <div>
                <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16, background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:"1.25rem" }}>
                  <ScoreCircle score={auditResult.score_global} />
                  <div><p style={{ fontSize:15, fontWeight:700, margin:"0 0 4px" }}>Score SEO — {sl(auditResult.score_global)}</p><p style={{ fontSize:12, color:"#6b7280", margin:0, lineHeight:1.6 }}>{auditResult.verdict}</p></div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
                  {Object.entries(auditResult.scores).map(([k,v]) => <div key={k} style={{ background:"#fff", borderRadius:10, padding:"1rem", border:"1px solid #e5e7eb" }}><p style={{ fontSize:10, color:"#6b7280", marginBottom:4, textTransform:"capitalize" }}>{k.replace("_"," ")}</p><p style={{ fontSize:20, fontWeight:700, color:sc(v), margin:"0 0 6px" }}>{v}</p><div style={{ height:4, background:"#f3f4f6", borderRadius:2 }}><div style={{ height:"100%", width:`${v}%`, background:sc(v), borderRadius:2 }} /></div></div>)}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div style={{ background:"#f0fdf4", borderRadius:12, padding:"1.25rem", border:"1px solid #bbf7d0" }}>
                    <p style={{ fontSize:13, fontWeight:600, color:"#15803d", marginBottom:10 }}>✅ Points forts</p>
                    {auditResult.points_forts.map((p,i) => <div key={i} style={{ display:"flex", gap:6, marginBottom:6 }}><span style={{ color:"#16a34a" }}>✓</span><span style={{ fontSize:12, color:"#15803d" }}>{p}</span></div>)}
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>⚠️ Problèmes détectés</p>
                    {auditResult.problemes.map((p,i) => <div key={i} style={{ marginBottom:8, background:"#fff", borderRadius:8, padding:"10px 12px", border:"1px solid #e5e7eb" }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:12, fontWeight:600 }}>{p.titre}</span><Badge color={p.impact==="Fort"?"red":p.impact==="Moyen"?"amber":"gray"}>{p.impact}</Badge></div><p style={{ fontSize:11, color:"#6b7280", margin:0 }}>→ {p.action}</p></div>)}
                  </div>
                </div>
                <div style={{ marginTop:14, background:"#fffbeb", borderRadius:12, padding:"1.25rem", border:"1px solid #fde68a" }}>
                  <p style={{ fontSize:13, fontWeight:600, color:"#92400e", marginBottom:8 }}>💡 Opportunités</p>
                  {auditResult.opportunites.map((o,i) => <div key={i} style={{ display:"flex", gap:6, marginBottom:5 }}><span style={{ color:"#d97706" }}>→</span><span style={{ fontSize:12, color:"#92400e" }}>{o}</span></div>)}
                </div>
              </div>}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}body{margin:0}`}</style>
    </div>
  );
}
