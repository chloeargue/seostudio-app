export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, keyword, sector, location } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt requis" });

  try {
    // Si c'est un article, on cherche d'abord des données réelles sur Google
    let realData = "";
    if (keyword && process.env.VITE_SERPER_KEY) {
      const searchRes = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.VITE_SERPER_KEY,
        },
        body: JSON.stringify({
          q: `${keyword} ${location} statistiques données chiffres`,
          gl: "fr",
          hl: "fr",
          num: 5,
        }),
      });
      const searchData = await searchRes.json();
      
      // Extraire les snippets pertinents
      const snippets = searchData.organic?.slice(0, 4).map(r => 
        `- ${r.title}: ${r.snippet}`
      ).join("\n") || "";
      
      if (snippets) {
        realData = `\n\nDONNÉES RÉELLES TROUVÉES SUR GOOGLE (utilise ces informations vérifiées dans l'article, cite les sources):\n${snippets}\n`;
      }
    }

    // Enrichir le prompt avec les données réelles
    const enrichedPrompt = prompt + realData;

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VITE_MISTRAL_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: enrichedPrompt }],
        max_tokens: 2500,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    res.status(200).json({ text });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur API" });
  }
}
