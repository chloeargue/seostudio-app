// api/_lib/ai.js — appel IA unique, fournisseur choisi par variables Vercel.
// Choix : AI_PROVIDER = "gemini" | "mistral" | "claude". Sinon automatique :
// clé ANTHROPIC_API_KEY -> claude ; sinon GEMINI_API_KEY -> gemini ; sinon mistral.
// AI_MODEL (optionnel) force le nom du modèle.

const DEFAULT_MODELS = {
  gemini: "gemini-3.8-flash",
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

async function callAIOnce(prompt, { json = false, maxTokens = 6000 } = {}, provider = pickProvider(), modelOverride) {
  const model = modelOverride || (provider === pickProvider() ? process.env.AI_MODEL : "") || DEFAULT_MODELS[provider];
  let res, data, text = "";

  if (provider === "gemini") {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      signal: AbortSignal.timeout(70000),
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
      signal: AbortSignal.timeout(70000),
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
      signal: AbortSignal.timeout(70000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${(process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_KEY)}` },
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

const isOverload = (e) => /"code":\s*(429|500|503)|UNAVAILABLE|overloaded|rate|quota/i.test(String(e.message));

// Fournisseurs de secours : ceux dont une clé est présente (Mistral, Claude, Gemini)
function providerChain() {
  const main = pickProvider();
  const all = [];
  if (process.env.GEMINI_API_KEY) all.push("gemini");
  if (process.env.ANTHROPIC_API_KEY) all.push("claude");
  if (process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_KEY) all.push("mistral");
  return [main, ...all.filter((p) => p !== main)];
}

// 1) relances sur le fournisseur principal si surchargé (429 / 500 / 503), avec pauses croissantes
// 2) si toujours en échec : bascule automatique sur un autre fournisseur configuré
export async function callAI(prompt, opts = {}) {
  let lastErr;
  for (const provider of providerChain()) {
    const attempts = provider === pickProvider() ? 4 : 2;
    for (let i = 0; i < attempts; i++) {
      try {
        const out = await callAIOnce(prompt, opts, provider);
        if (provider !== pickProvider()) out.fallback = true;
        return out;
      } catch (e) {
        lastErr = e;
        if (e.name === "TimeoutError" || e.name === "AbortError") {
          lastErr = new Error("IA trop lente : pas de réponse après 70 secondes (" + provider + ")");
          break; // fournisseur trop lent : on passe au suivant
        }
        if (!isOverload(e)) break; // erreur non liée à la charge : on passe au suivant
        await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
      }
    }
  }
  throw lastErr;
}
