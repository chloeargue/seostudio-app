// Fichier utilitaire — PAS une route API (il vit dans api/_lib/, ignoré par le routeur Vercel).
// Réutilisé par api/cron/daily-publish.js pour publier un article sur WordPress.

export async function publishPost({ wp_url, wp_user, wp_pass, noria_token, title, slug, content, excerpt, meta, keyword, status = "draft", publish_date, image_url, image_alt }) {
  const base = wp_url.replace(/\/$/, "");

  // Voie préférée : plugin Noria Connector (champs SEO, image, code secret, pas d'en-tête Authorization)
  if (noria_token) {
    const r = await fetch(`${base}/wp-json/noria/v1/publish`, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: { "Content-Type": "application/json", "X-Noria-Token": noria_token },
      body: JSON.stringify({
        token: noria_token,
        title,
        slug,
        content,
        excerpt,
        status,
        publish_date,
        keyword,
        meta_title: meta?.meta_title,
        meta_description: meta?.meta_description,
        image_url,
        image_alt,
      }),
    });
    const rawN = await r.text();
    let dN = {};
    try { dN = JSON.parse(rawN); } catch (e) {}
    if (!r.ok) throw new Error(`Noria ${r.status} ${dN.code || ""} ${dN.message || rawN.slice(0, 200)}`.trim());
    return { url: dN.link, id: dN.id, via: "noria", image: dN.image };
  }

  const creds = Buffer.from(`${wp_user}:${wp_pass}`).toString("base64");

  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: "POST",
    signal: AbortSignal.timeout(40000),
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
        const me = await fetch(`${base}/wp-json/wp/v2/users/me?context=edit`, { signal: AbortSignal.timeout(15000), headers: { Authorization: `Basic ${creds}` } });
        const meData = await me.json().catch(() => ({}));
        who = ` | users/me: HTTP ${me.status}` + (me.ok ? ` user=${meData.slug} roles=${(meData.roles || []).join(",")}` : ` ${meData.code || ""}`);
        who += ` | user_saisi="${wp_user}" mdp_longueur=${String(wp_pass || "").length}`;
      } catch (e) { who = " | users/me: injoignable"; }
    }
    throw new Error(`WP ${res.status} ${data.code || ""} ${data.message || raw.slice(0, 200)}${who}`.trim());
  }
  return { url: data.link, id: data.id };
}

// Change le statut d'un article créé par Noria (draft, pending, publish)
export async function setPostStatus({ wp_url, noria_token, id, status }) {
  const base = wp_url.replace(/\/$/, "");
  const r = await fetch(`${base}/wp-json/noria/v1/status`, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/json", "X-Noria-Token": noria_token },
    body: JSON.stringify({ token: noria_token, id: Number(id), status }),
  });
  const raw = await r.text();
  let d = {};
  try { d = JSON.parse(raw); } catch (e) {}
  if (!r.ok) throw new Error(`Noria ${r.status} ${d.code || ""} ${d.message || raw.slice(0, 200)}`.trim());
  return d;
}
