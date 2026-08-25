import { createClient } from "@supabase/supabase-js";
import { publishPost } from "../_lib/wp.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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
async function generateArticle({ keyword, sector, location, siteUrl }) {
  let realData = "";
  if (process.env.VITE_SERPER_KEY) {
    const searchRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": process.env.VITE_SERPER_KEY },
      body: JSON.stringify({
        q: `${keyword} ${location} statistiques données chiffres`,
        gl: "fr",
        hl: "fr",
        num: 5,
      }),
    });
    const searchData = await searchRes.json();
    const snippets = searchData.organic?.slice(0, 4).map((r) => `- ${r.title}: ${r.snippet}`).join("\n") || "";
    if (snippets) realData = `\n\nDONNÉES RÉELLES TROUVÉES SUR GOOGLE (cite les sources):\n${snippets}\n`;
  }

  const prompt = `Tu es un expert SEO français et rédacteur web professionnel.
Site: ${siteUrl} | Secteur: ${sector} | Ville: ${location}
Mot-clé principal: "${keyword}"

Génère UNIQUEMENT ce JSON valide sans backticks ni markdown.

RÈGLES SEO STRICTES:
- Le mot-clé "${keyword}" DOIT apparaître dans: titre, meta_title, meta_description, premier paragraphe, au moins 2 H2, au moins 4 fois dans le contenu
- meta_title: STRICTEMENT 60 caractères max, contient "${keyword}"
- meta_description: STRICTEMENT 150 caractères max, contient "${keyword}", finit par un CTA
- contenu_html: minimum 900 mots, pas de markdown
- Inclure au moins 1 lien interne (ex: <a href="${siteUrl}/contact">Contactez-nous</a>)
- N'écrire JAMAIS d'année spécifique

JSON à retourner:
{"titre":"[H1 max 70 car]","slug":"[slug-optimise]","meta_title":"[max 60 car]","meta_description":"[max 150 car]","extrait":"[25 mots]","contenu_html":"[HTML complet avec H2, paragraphes, liens]"}${realData}`;

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.VITE_MISTRAL_KEY}` },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2500,
    }),
  });
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
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

  for (const schedule of dueSchedules || []) {
    const site = schedule.client_sites;
    if (!site) continue;

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
      });

      const published = await publishPost({
        wp_url: site.wp_url,
        wp_user: site.wp_user,
        wp_pass: site.wp_pass,
        title: article.titre,
        slug: article.slug,
        content: article.contenu_html,
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
        content: article.contenu_html,
        meta: { meta_title: article.meta_title, meta_description: article.meta_description },
        scheduled_for: new Date().toISOString().split("T")[0],
        wp_post_id: String(published.id),
      });

      await supabase
        .from("publication_schedules")
        .update({ last_run_at: now, next_run_at: computeNextRun(schedule.frequency) })
        .eq("id", schedule.id);

      results.push({ schedule_id: schedule.id, status: "success", keyword, wp_post_id: published.id });
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
    debug_due_count: dueSchedules?.length,
    debug_first_schedule: dueSchedules?.[0],
  });
