export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt requis" });

  try {
    // Pour les articles longs, on fait 2 appels et on assemble
    const isArticle = prompt.includes("2000 et 3000 mots");
    
    if (isArticle) {
      // Premier appel : intro + 3 premières sections
      const prompt1 = prompt + "\n\nGénère UNIQUEMENT : le H1, les métas, l'introduction et les 3 premières sections H2 avec leur contenu. Arrête-toi après la 3ème section.";
      
      // Deuxième appel : suite de l'article
      const prompt2 = prompt + "\n\nGénère UNIQUEMENT : la 4ème et 5ème section H2, la FAQ complète avec 5 questions-réponses, la conclusion, le maillage interne, le maillage externe, les synonymes et les suggestions d'images Pexels.";

      const [res1, res2] = await Promise.all([
        fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.VITE_MISTRAL_KEY}`,
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages: [{ role: "user", content: prompt1 }],
            max_tokens: 3000,
          }),
        }),
        fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.VITE_MISTRAL_KEY}`,
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages: [{ role: "user", content: prompt2 }],
            max_tokens: 3000,
          }),
        })
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();
      const text1 = data1.choices?.[0]?.message?.content || "";
      const text2 = data2.choices?.[0]?.message?.content || "";
      
      return res.status(200).json({ text: text1 + "\n\n" + text2 });
    }

    // Pour les autres générations (méta, mots-clés, audit)
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VITE_MISTRAL_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    res.status(200).json({ text });

  } catch (error) {
    res.status(500).json({ error: "Erreur API Mistral" });
  }
}
