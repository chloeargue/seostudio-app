export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, wp_url, wp_user, wp_pass, page_id, data } = req.body || {};

  if (!wp_url || !wp_user || !wp_pass) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const base = wp_url.replace(/\/$/, '');
  const creds = Buffer.from(`${wp_user}:${wp_pass}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${creds}`,
    'Content-Type': 'application/json',
  };

  try {
    if (action === 'read') {
      const r = await fetch(`${base}/wp-json/seostudio/v1/divi/read/${page_id}`, { headers });
      const d = await r.json();
      return res.status(200).json(d);
    }

    if (action === 'update') {
      const r = await fetch(`${base}/wp-json/seostudio/v1/divi/update/${page_id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      const d = await r.json();
      return res.status(200).json(d);
    }

    return res.status(400).json({ error: "Action invalide" });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
