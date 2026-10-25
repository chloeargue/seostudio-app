// api/_lib/ai.js — appel IA unique, fournisseur choisi par variables Vercel.
// Choix : AI_PROVIDER = "gemini" | "mistral" | "claude". Sinon automatique :
// clé ANTHROPIC_API_KEY -> claude ; sinon GEMINI_API_KEY -> gemini ; sinon mistral.
// AI_MODEL (optionnel) force le nom du modèle.

const DEFAULT_MODELS = {
  gemini: "gemini-2.5-flash",
  mistral: "ministral-8b-2512",
  claude: "claude-haiku-5-5",
};

export function pickProvider() {
  const p = (process.env.AI_PROVIDER || "").toLowerCase();
  if (["gemini", "mistral", "claude"].includes(p)) return p;
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "mistral";
}

export async function callAI(prompt, { json = false, maxTokens = 6000 } = {}) {
  const provider = pickProvider();
  const model = process.env.AI_MODEL || DEFAULT_MODELS[provider];
  let res, data, text = "";

  if (provider === "gemini") {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, ...(json ? { responseMimeType: "application/json" } : {}) },
      }),
    });
    data = await res.json();
    text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  } else if (provider === "claude") {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    });
    data = await res.json();
    text = data.content?.[0]?.text || "";
  } else {
    res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.VITE_MISTRAL_KEY}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    data = await res.json();
    text = data.choices?.[0]?.message?.content || "";
  }

  if (!text) {
    const err = new Error(`IA (${provider}/${model}): ` + JSON.stringify(data).slice(0, 300));
    err.provider = provider;
    throw err;
  }
  return { text, provider, model };
}
