export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, code, access_token, site_url } = req.body || req.query;

  // Échanger le code contre un access token
  if (action === "exchange") {
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.VITE_GOOGLE_CLIENT_ID,
          client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET,
          redirect_uri: "https://seostudio-app.vercel.app/auth/callback",
          grant_type: "authorization_code",
        }),
      });
      const data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error_description });
      return res.status(200).json({ access_token: data.access_token, refresh_token: data.refresh_token });
    } catch (err) {
      return res.status(500).json({ error: "Erreur échange token" });
    }
  }

  // Récupérer la liste des sites GSC
  if (action === "sites") {
    try {
      const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { "Authorization": `Bearer ${access_token}` },
      });
      const data = await response.json();
      return res.status(200).json({ sites: data.siteEntry || [] });
    } catch (err) {
      return res.status(500).json({ error: "Erreur récupération sites" });
    }
  }

  // Récupérer les mots-clés et positions
  if (action === "keywords") {
    try {
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
            dimensions: ["query"],
            rowLimit: 20,
            orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
          }),
        }
      );
      const data = await response.json();
      return res.status(200).json({ keywords: data.rows || [] });
    } catch (err) {
      return res.status(500).json({ error: "Erreur récupération mots-clés" });
    }
  }

  // Récupérer les pages les plus performantes
  if (action === "pages") {
    try {
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
            dimensions: ["page"],
            rowLimit: 10,
            orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
          }),
        }
      );
      const data = await response.json();
      return res.status(200).json({ pages: data.rows || [] });
    } catch (err) {
      return res.status(500).json({ error: "Erreur récupération pages" });
    }
  }

  return res.status(400).json({ error: "Action invalide" });
}
