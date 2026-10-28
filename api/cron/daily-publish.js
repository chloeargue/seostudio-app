import { createClient } from "@supabase/supabase-js";
import { publishPost } from "../_lib/wp.js";
import { callAI } from "../_lib/ai.js";
import { findImage } from "../_lib/images.js";
import { buildArticleInSteps, assembleHtml, scoreGeo } from "../_lib/geo.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Parse tolérant d'un JSON produit par un LLM :
// - retire les ```json
// - échappe les retours ligne / tabulations bruts à l'intérieur des chaînes
function safeParseJson(raw) {
  const t = String(raw || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(t); } catch (e) {}
  let out = "", inStr = false, esc = false;
  for (const ch of t) {
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
    } else {
      if (ch === '"') inStr = true;
      out += ch;
    }
  }
  return JSON.parse(out);
}

function computeNextRun(frequency, from = new Date()) {
  const d = new Date(from);
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else if (frequency === "quarterly") d.setMonth(d.getMonth() + 3);
  return d.toISOString();
}

// Cherche un mot-clé secteur/géo via Serper, en évitant ceux déjà utilisés pour ce site
async function findKeyword(sector, geoZone, siteId) {
  const searchRes = await fetch("https://google.serper.dev/search", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.VITE_SERPER_KEY,
    },
    body: JSON.stringify({ q: `${sector} ${geoZone}`, gl: "fr", hl: "fr" }),
  });
  const data = await searchRes.json();

  const candidates = [
    ...(data.relatedSearches || []).map((r) => r.query),
    ...(data.peopleAlsoAsk || []).map((p) => p.question),
  ].filter(Boolean);

  const { data: used } = await supabase
    .from("content_queue")
    .select("keyword")
    .eq("site_id", siteId);
  const usedSet = new Set((used || []).map((u) => (u.keyword || "").toLowerCase()));

  const fresh = candidates.find((k) => !usedSet.has(k.toLowerCase()));
  return fresh || `${sector} ${geoZone}`;
}

// Génère l'article complet via Mistral (même logique que api/generate.js)
async function generateArticle({ keyword, sector, location, siteUrl, lang = "fr", author }) {
  let realData = "";
  if (process.env.VITE_SERPER_KEY) {
    const searchRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
    signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", "X-API-KEY": process.env.VITE_SERPER_KEY },
      body: JSON.stringify({
        q: `${keyword} ${location} ${lang === "en" ? "statistics data figures" : "statistiques données chiffres"}`,
        gl: lang === "en" ? "us" : "fr",
        hl: lang === "en" ? "en" : "fr",
        num: 5,
      }),
    });
    const searchData = await searchRes.json();
    const snippets = searchData.organic?.slice(0, 4).map((r) => `- ${r.title}: ${r.snippet} (${r.link})`).join("\n") || "";
    if (snippets) realData = `\n\n${lang === "en" ? "REAL DATA FROM GOOGLE (cite the sources)" : "DONNÉES RÉELLES TROUVÉES SUR GOOGLE (cite les sources)"}:\n${snippets}\n`;
  }

  return buildArticleInSteps({ callAI, keyword, sector, location, siteUrl, lang, author, realData });
}

export default async function handler(req, res) {
  // Vercel ajoute automatiquement ce header quand il déclenche le CRON.
  // On vérifie qu'on n'autorise que Vercel (ou un test manuel avec le bon secret) à lancer ceci.
  const auth = req.headers["authorization"];
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const now = new Date().toISOString();

  const { data: dueSchedules, error } = await supabase
    .from("publication_schedules")
    .select("*, client_sites(*)")
    .eq("is_active", true)
    .lte("next_run_at", now)
    .limit(3); // on traite 3 plannings max par jour, pour rester dans le temps imparti

  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  const t0 = Date.now();

  for (const schedule of dueSchedules || []) {
    const site = schedule.client_sites;
    if (!site) continue;
    if (Date.now() - t0 > 60000) break; // évite de dépasser la limite de 300 s de Vercel

    try {
      const keyword = await findKeyword(
        schedule.sector || site.sector,
        schedule.geo_zone || site.location,
        site.id
      );

      const article = await generateArticle({
        keyword,
        sector: schedule.sector || site.sector,
        location: schedule.geo_zone || site.location,
        siteUrl: site.wp_url,
        lang: schedule.lang || site.lang || "fr",
        author: site.author_name ? { name: site.author_name, expertise: site.author_expertise } : null,
      });
      const lang = schedule.lang || site.lang || "fr";
      const html = assembleHtml(article, lang);
      const geo = scoreGeo(article, keyword, site.wp_url);

      const image = await findImage({ keyword, sector: schedule.sector || site.sector, lang });
      const published = await publishPost({
        wp_url: site.wp_url,
        wp_user: site.wp_user,
        wp_pass: site.wp_pass,
        noria_token: site.noria_token,
        image_url: image?.url,
        image_alt: image?.alt,
        title: article.titre,
        slug: article.slug,
        content: html,
        excerpt: article.extrait,
        meta: { meta_title: article.meta_title, meta_description: article.meta_description },
        keyword,
      });

      await supabase.from("content_queue").insert({
        schedule_id: schedule.id,
        site_id: site.id,
        keyword,
        status: "published",
        title: article.titre,
        content: html,
        meta: { meta_title: article.meta_title, meta_description: article.meta_description, geo_score: geo.score, geo_checks: geo.checks, words: geo.words, lang, image: image ? { alt: image.alt, credit: image.credit, source: image.source } : null },
        scheduled_for: new Date().toISOString().split("T")[0],
        wp_post_id: String(published.id),
      });

      await supabase
        .from("publication_schedules")
        .update({ last_run_at: now, next_run_at: computeNextRun(schedule.frequency) })
        .eq("id", schedule.id);

      results.push({ schedule_id: schedule.id, status: "success", keyword, geo_score: geo.score, wp_post_id: published.id });
    } catch (err) {
      await supabase.from("content_queue").insert({
        schedule_id: schedule.id,
        site_id: site.id,
        status: "failed",
        error: err.message,
        scheduled_for: new Date().toISOString().split("T")[0],
      });
      results.push({ schedule_id: schedule.id, status: "failed", error: err.message });
    }
  }

  return res.status(200).json({
    processed: results.length,
    results,
  });
}
