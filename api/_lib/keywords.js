// api/_lib/keywords.js — choisit le mot-clé du prochain article.
// Source : vraies recherches Google (suggestions + « autres questions posées »), plusieurs angles,
// sans jamais reprendre un mot-clé déjà utilisé pour ce site (ni un quasi-doublon).
// Ensuite l'IA choisit la recherche la plus utile pour un prospect qualifié.

export const norm = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const tokens = (s) => new Set(norm(s).split(" ").filter((w) => w.length > 2));

export function similarity(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / new Set([...A, ...B]).size;
}

// Pas d'article sur les prix : on écarte les recherches orientées tarifs
export const PRICE_INTENT = /\b(prix|tarifs?|cout|couts|combien|budget|gratuit|devis|cost|costs|pricing|price|cheap|how much)\b/;
export const isDuplicate = (cand, used) => used.some((u) => similarity(cand, u) >= 0.85);

const ANGLES = {
  fr: (b, sector) => [b, `${b} stratégie`, `comment choisir ${sector}`, `${b} avis conseils`, `${sector} pour pme ${b.split(" ").slice(-1)[0]}`],
  en: (b, sector) => [b, `${b} strategy`, `how to choose ${sector}`, `${b} tips`, `${sector} for small business`],
};
const MODIFIERS = {
  fr: ["agence ou freelance", "conseils", "avis", "comment choisir", "erreurs à éviter", "checklist", "exemple concret", "pour pme", "pour artisans", "résultats"],
  en: ["agency or freelancer", "tips", "reviews", "how to choose", "mistakes to avoid", "checklist", "example", "for small business", "for local business", "results"],
};

async function serper(q, lang, key) {
  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json", "X-API-KEY": key },
    body: JSON.stringify({ q, gl: lang === "en" ? "us" : "fr", hl: lang === "en" ? "en" : "fr" }),
  });
  if (!r.ok) throw new Error(`Serper HTTP ${r.status}`);
  return r.json();
}

export async function pickKeyword({ sector, geoZone, siteId, theme, lang = "fr", supabase, callAI, serperKey }) {
  sector = String(sector || "").replace(/\s+/g, " ").trim();
  geoZone = String(geoZone || "").replace(/\s+/g, " ").trim();
  const base = `${sector} ${geoZone}`.trim();
  const { data: usedRows } = await supabase.from("content_queue").select("keyword").eq("site_id", siteId);
  const used = (usedRows || []).map((u) => u.keyword).filter(Boolean);

  // 1. Candidats = vraies recherches, sur plusieurs angles
  let candidates = [];
  if (serperKey) {
    const seeds = ANGLES[lang === "en" ? "en" : "fr"](base, sector);
    const results = await Promise.allSettled(seeds.map((q) => serper(q, lang, serperKey)));
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      candidates.push(...(r.value.relatedSearches || []).map((x) => x.query));
      candidates.push(...(r.value.peopleAlsoAsk || []).map((x) => x.question));
    }
  }
  const baseTokens = [...tokens(sector)].filter((w) => w.length > 3);
  const seen = new Set();
  const fresh = [];
  for (const c of candidates.filter(Boolean)) {
    const n = norm(c);
    // mot-clé court (≤ 7 mots) : il sera répété dans l'article, une longue question serait artificielle
    if (n.length < 8 || n.split(" ").length > 7 || seen.has(n)) continue;
    seen.add(n);
    if (baseTokens.length && !baseTokens.some((w) => n.includes(w))) continue; // hors sujet
    if (PRICE_INTENT.test(n) || isDuplicate(c, used)) continue;
    fresh.push(c.replace(/\s+/g, " ").replace(/[?!.]+$/, "").trim());
  }

  // 2. Rien de frais : on fabrique des angles nouveaux (jamais le mot-clé de base seul)
  if (!fresh.length) {
    for (const m of MODIFIERS[lang === "en" ? "en" : "fr"]) {
      const c = `${base} ${m}`;
      if (!PRICE_INTENT.test(norm(c)) && !isDuplicate(c, used)) fresh.push(c);
    }
  }
  if (!fresh.length) return { keyword: `${base} ${new Date().getFullYear()} ${Date.now() % 1000}`, how: "fallback" };

  // 3. L'IA choisit la recherche la plus utile pour un prospect qualifié
  const shortlist = fresh.slice(0, 25);
  if (shortlist.length > 1 && callAI) {
    try {
      const prompt = `Tu es stratège SEO. Un site ${sector} à ${geoZone} veut attirer des clients qualifiés.${theme ? ` Thème éditorial demandé : ${theme}.` : ""}
Voici de vraies recherches faites par des internautes (numérotées) :
${shortlist.map((k, i) => `${i + 1}. ${k}`).join("\n")}
Déjà traités sur ce site : ${used.slice(-15).join(" | ") || "aucun"}.
Choisis la recherche qui (1) ne parle PAS de prix ni de tarifs, correspond à une vraie intention de trouver un prestataire ou de résoudre un problème concret, (2) n'est pas un quasi-doublon de ce qui est déjà traité, (3) permet un article utile et précis.
Réponds UNIQUEMENT par son numéro.`;
      const { text } = await callAI(prompt, { maxTokens: 20 });
      const n = parseInt(String(text).match(/\d+/)?.[0], 10);
      if (n >= 1 && n <= shortlist.length) return { keyword: shortlist[n - 1], how: "ia" };
    } catch (e) { /* on retombe sur le premier candidat */ }
  }
  return { keyword: shortlist[0], how: "premier" };
}

// URL de l'article = mot-clé principal (sans accents, tirets), pour Rank Math
export function slugFromKeyword(keyword) {
  return norm(keyword).split(" ").filter(Boolean).join("-").slice(0, 70).replace(/-+$/, "");
}
