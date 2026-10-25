// Fichier utilitaire — PAS une route API (il vit dans api/_lib/, ignoré par le routeur Vercel).
// Réutilisé par api/cron/daily-publish.js pour publier un article sur WordPress.

export async function publishPost({ wp_url, wp_user, wp_pass, title, slug, content, excerpt, meta, keyword }) {
  const base = wp_url.replace(/\/$/, "");
  const creds = Buffer.from(`${wp_user}:${wp_pass}`).toString("base64");

  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      slug,
      content,
      excerpt,
      status: "draft",
      meta: {
        _yoast_wpseo_title: meta?.meta_title,
        _yoast_wpseo_metadesc: meta?.meta_description,
        _yoast_wpseo_focuskw: keyword,
        rank_math_title: meta?.meta_title,
        rank_math_description: meta?.meta_description,
        rank_math_focus_keyword: keyword,
      },
    }),
  });

  const raw = await res.text();
  let data = {};
  try { data = JSON.parse(raw); } catch (e) {}
  if (!res.ok) {
    let who = "";
    if (res.status === 401 || res.status === 403) {
      try {
        const me = await fetch(`${base}/wp-json/wp/v2/users/me?context=edit`, { headers: { Authorization: `Basic ${creds}` } });
        const meData = await me.json().catch(() => ({}));
        who = ` | users/me: HTTP ${me.status}` + (me.ok ? ` user=${meData.slug} roles=${(meData.roles || []).join(",")}` : ` ${meData.code || ""}`);
        who += ` | user_saisi="${wp_user}" mdp_longueur=${String(wp_pass || "").length}`;
      } catch (e) { who = " | users/me: injoignable"; }
    }
    throw new Error(`WP ${res.status} ${data.code || ""} ${data.message || raw.slice(0, 200)}${who}`.trim());
  }
  return { url: data.link, id: data.id };
}
