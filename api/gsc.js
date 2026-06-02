export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, code, access_token, site_url, property_id } = req.body || req.query;

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

  if (action === "keywords") {
    try {
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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

  if (action === "pages") {
    try {
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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

  // GA4 : liste des propriétés via Management API v3 (plus compatible)
  if (action === "ga_properties") {
    try {
      // Essai avec l'API Admin v1beta
      const response = await fetch(
        "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=50",
        { headers: { "Authorization": `Bearer ${access_token}` } }
      );
      const data = await response.json();
      
      // Log pour debug
      console.log("GA4 accountSummaries response:", JSON.stringify(data));
      
      if (data.error) {
        return res.status(200).json({ properties: [], error: data.error.message, raw: data });
      }
      
      const properties = [];
      (data.accountSummaries || []).forEach(account => {
        (account.propertySummaries || []).forEach(prop => {
          properties.push({
            id: prop.property.replace("properties/", ""),
            name: prop.displayName,
            account: account.displayName,
          });
        });
      });
      return res.status(200).json({ properties, total: properties.length });
    } catch (err) {
      return res.status(500).json({ error: "Erreur: " + err.message });
    }
  }

  if (action === "analytics") {
    try {
      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${property_id}:runReport`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
            metrics: [
              { name: "sessions" },
              { name: "totalUsers" },
              { name: "bounceRate" },
              { name: "averageSessionDuration" },
              { name: "conversions" },
              { name: "screenPageViews" },
            ],
          }),
        }
      );
      const data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      const row = data.rows?.[0]?.metricValues || [];
      return res.status(200).json({
        sessions: Math.round(parseFloat(row[0]?.value || 0)),
        users: Math.round(parseFloat(row[1]?.value || 0)),
        bounceRate: Math.round(parseFloat(row[2]?.value || 0) * 100),
        avgDuration: Math.round(parseFloat(row[3]?.value || 0)),
        conversions: Math.round(parseFloat(row[4]?.value || 0)),
        pageviews: Math.round(parseFloat(row[5]?.value || 0)),
      });
    } catch (err) {
      return res.status(500).json({ error: "Erreur Analytics: " + err.message });
    }
  }

  if (action === "analytics_pages") {
    try {
      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${property_id}:runReport`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
            dimensions: [{ name: "pagePath" }],
            metrics: [
              { name: "sessions" },
              { name: "bounceRate" },
              { name: "averageSessionDuration" },
            ],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 10,
          }),
        }
      );
      const data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      const pages = (data.rows || []).map(row => ({
        path: row.dimensionValues[0].value,
        sessions: Math.round(parseFloat(row.metricValues[0].value)),
        bounceRate: Math.round(parseFloat(row.metricValues[1].value) * 100),
        duration: Math.round(parseFloat(row.metricValues[2].value)),
      }));
      return res.status(200).json({ pages });
    } catch (err) {
      return res.status(500).json({ error: "Erreur pages Analytics: " + err.message });
    }
  }

  return res.status(400).json({ error: "Action invalide" });
}
