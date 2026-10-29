// Route : /api/block?id=...&sig=...
// GET = page de confirmation (évite qu'un scanner d'e-mails bloque l'article par erreur)
// POST = blocage réel (l'article repasse en brouillon dans WordPress)
import { createClient } from "@supabase/supabase-js";
import { verifySig, pageHtml, esc } from "./_lib/mail.js";
import { setPostStatus } from "./_lib/wp.js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  const id = String(req.query?.id || "");
  const sig = String(req.query?.sig || "");

  if (!id || !verifySig(id, sig)) {
    return res.status(403).send(pageHtml("Lien invalide", "<p>Ce lien n'est pas valide ou a été modifié.</p>"));
  }

  const { data: row } = await supabase.from("content_queue").select("*").eq("id", id).maybeSingle();
  if (!row) return res.status(404).send(pageHtml("Article introuvable", "<p>Cet article n'existe plus.</p>"));

  if (row.status === "blocked") {
    return res.status(200).send(pageHtml("Déjà bloqué", `<p>La publication de « ${esc(row.title)} » est déjà bloquée. L'article reste en brouillon dans WordPress.</p>`));
  }
  const publishAt = row.meta?.publish_at ? new Date(row.meta.publish_at) : null;
  if (row.status !== "scheduled" || !publishAt || publishAt <= new Date()) {
    return res.status(200).send(pageHtml("Trop tard", `<p>« ${esc(row.title)} » est déjà publié ou n'est plus programmé. Vous pouvez le repasser en brouillon directement dans WordPress.</p>`));
  }

  if (req.method !== "POST") {
    return res.status(200).send(pageHtml("Bloquer la publication ?", `
      <p>« <strong>${esc(row.title)}</strong> » devait être publié automatiquement. Confirmez pour l'en empêcher : il restera en brouillon dans WordPress.</p>
      <form method="POST" action="/api/block?id=${encodeURIComponent(id)}&sig=${encodeURIComponent(sig)}">
        <button type="submit" style="background:#d92d20;color:#fff;border:0;padding:12px 22px;border-radius:6px;font-weight:700;font-size:15px;cursor:pointer;">Oui, bloquer la publication</button>
      </form>`));
  }

  try {
    const { data: site } = await supabase.from("client_sites").select("*").eq("id", row.site_id).maybeSingle();
    if (!site?.noria_token) throw new Error("Site ou code Noria introuvable");
    await setPostStatus({ wp_url: site.wp_url, noria_token: site.noria_token, id: row.wp_post_id, status: "draft" });
    await supabase.from("content_queue").update({ status: "blocked", meta: { ...(row.meta || {}), blocked_at: new Date().toISOString() } }).eq("id", id);
    return res.status(200).send(pageHtml("Publication bloquée", `<p>« ${esc(row.title)} » ne sera pas publié. Il reste en brouillon dans WordPress, vous pouvez le modifier ou le publier plus tard.</p>`));
  } catch (e) {
    return res.status(500).send(pageHtml("Erreur", `<p>Le blocage a échoué : ${esc(e.message)}. Repassez l'article en brouillon directement dans WordPress.</p>`));
  }
}
