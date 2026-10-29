// api/_lib/geo.js — règles GEO (Generative Engine Optimization) centralisées.
// Dossier _lib : pas une route API. Utilisé par le cron (et réutilisable par generate.js).

const RULES = {
  fr: `RÈGLES GEO (optimisation pour ChatGPT, Perplexity, Gemini, Claude, AI Overviews) — OBLIGATOIRES :
1. RÉPONSE D'ABORD : la réponse directe à la question du mot-clé apparaît dans les 100 premiers mots.
2. ENCART DE SYNTHÈSE (champ "tldr") : 2 à 4 phrases autonomes (définition, critères, chiffres clés), lisibles sans le reste de la page.
3. TITRES = QUESTIONS : le H1 et au moins la moitié des H2 sont formulés comme de vraies questions que se posent les gens.
4. PARAGRAPHES AUTONOMES : chaque paragraphe se comprend sans lire le précédent (pas de "comme vu plus haut", "cela"). 100 à 200 mots maximum par paragraphe.
5. SECTIONS (H2) de 300 à 500 mots, structurées ainsi : phrase de réponse directe, développement, preuve (donnée/exemple/source), conclusion actionnable.
6. FORMATS EXTRACTIBLES : au moins 1 liste numérotée ou à puces ET 1 tableau HTML comparatif (<table>) quand le sujet s'y prête.
7. DENSITÉ FACTUELLE : remplace toute affirmation vague ("très efficace", "le meilleur") par un fait attribuable (chiffre + source + date). N'INVENTE JAMAIS un chiffre, une étude, un témoignage ou une source : n'utilise que les DONNÉES RÉELLES fournies ci-dessous ; sinon reste qualitatif et honnête.
8. SOURCES : cite les sources fournies avec leur nom dans le texte (ex. "selon <nom de la source>").
9. FRAÎCHEUR : mentionne la date de mise à jour fournie ("Mis à jour en <mois année>"). N'écris aucune autre année de mémoire.
10. AUTORITÉ (E-E-A-T) : si un auteur est fourni, ajoute une ligne "Par <auteur>, <expertise>" en début d'article. Sinon, n'invente aucun auteur, aucune expérience, aucune année d'expérience.
11. TERRITOIRE SÉMANTIQUE (query fan-out) : couvre au moins 4 sous-questions voisines du sujet (comparaison, critères de choix, erreurs courantes, cas local, etc.), une par H2.
12. FAQ : 3 à 5 questions/réponses courtes (réponse en 1 à 3 phrases) dans le champ "faq".
13. MAILLAGE : au moins 1 lien interne vers le site, avec une ancre descriptive.
14. TON : factuel, précis, utile ; pas de remplissage ni de formules creuses. Pas de markdown, HTML propre uniquement.
15. AUCUN PRIX : n'indique jamais de prix, tarif, budget, fourchette de prix ni montant en euros, et n'écris aucun titre portant sur les prix. Si le sujet touche au coût, explique les facteurs qui le font varier et invite le lecteur à demander un devis.`,
  en: `GEO RULES (optimisation for ChatGPT, Perplexity, Gemini, Claude, AI Overviews) — MANDATORY:
1. ANSWER FIRST: the direct answer to the keyword's question appears within the first 100 words.
2. SUMMARY BOX (field "tldr"): 2 to 4 self-contained sentences (definition, criteria, key figures), readable without the rest of the page.
3. QUESTION HEADINGS: the H1 and at least half of the H2s are phrased as real questions people ask.
4. SELF-CONTAINED PARAGRAPHS: every paragraph is understandable without the previous one (no "as seen above", "this"). 100 to 200 words max per paragraph.
5. SECTIONS (H2) of 300 to 500 words: direct answer sentence, development, proof (data/example/source), actionable conclusion.
6. EXTRACTABLE FORMATS: at least 1 numbered or bulleted list AND 1 comparison HTML table (<table>) when the topic fits.
7. FACTUAL DENSITY: replace vague claims ("very effective", "the best") with attributable facts (figure + source + date). NEVER invent a figure, study, testimonial or source: only use the REAL DATA provided below; otherwise stay qualitative and honest.
8. SOURCES: name the provided sources in the text (e.g. "according to <source name>").
9. FRESHNESS: mention the provided update date ("Updated <month year>"). Write no other year from memory.
10. AUTHORITY (E-E-A-T): if an author is provided, add a "By <author>, <expertise>" line at the top. Otherwise invent no author, experience or years of experience.
11. SEMANTIC TERRITORY (query fan-out): cover at least 4 neighbouring sub-questions (comparison, selection criteria, common mistakes, local case, etc.), one per H2.
12. FAQ: 3 to 5 short Q&As (1 to 3 sentence answers) in the "faq" field.
13. INTERNAL LINKING: at least 1 internal link to the site with a descriptive anchor.
14. TONE: factual, precise, useful; no filler. No markdown, clean HTML only.
15. NO PRICES: never state a price, rate, budget, price range or amount in euros/dollars, and never use a heading about prices. If the topic touches cost, explain the factors that influence it and invite the reader to request a quote.`,
};

const monthYear = (lang, d = new Date()) =>
  d.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" });

export function geoArticlePrompt({ keyword, sector, location, siteUrl, lang = "fr", author, realData = "" }) {
  const en = lang === "en";
  const today = monthYear(lang);
  const authorLine = author?.name
    ? `${en ? "Author" : "Auteur"}: ${author.name}${author.expertise ? ", " + author.expertise : ""}`
    : en ? "Author: none provided (do not invent one)" : "Auteur: aucun fourni (n'en invente pas)";
  const lengthRule = en
    ? "contenu_html: 1500 to 2500 words, internal anchors descriptive"
    : "contenu_html : 1500 à 2500 mots, ancres internes descriptives";

  return `${en ? "You are an expert SEO/GEO copywriter. Write in English." : "Tu es un expert SEO/GEO et rédacteur web professionnel. Rédige en français."}
Site: ${siteUrl} | ${en ? "Sector" : "Secteur"}: ${sector} | ${en ? "Location" : "Ville"}: ${location}
${en ? "Main keyword" : "Mot-clé principal"}: "${keyword}"
${authorLine}
${en ? "Update date to display" : "Date de mise à jour à afficher"}: ${today}


${en ? "SEO RULES" : "RÈGLES SEO"}:
- "${keyword}" ${en ? "must appear in: title, meta_title, meta_description, first paragraph, at least 2 H2, at least 4 times in the content" : "doit apparaître dans : titre, meta_title, meta_description, premier paragraphe, au moins 2 H2, au moins 4 fois dans le contenu"}
- meta_title: ${en ? "STRICTLY 60 characters max" : "STRICTEMENT 60 caractères max"}
- meta_description: ${en ? "STRICTLY 150 characters max, ends with a CTA" : "STRICTEMENT 150 caractères max, finit par un CTA"}
- ${lengthRule}
- ${en ? "At least 1 internal link, e.g." : "Au moins 1 lien interne, ex :"} <a href="${siteUrl}/contact">${en ? "Contact us" : "Contactez-nous"}</a>

${RULES[lang] || RULES.fr}

${en ? "OUTPUT FORMAT (NOT JSON). Write exactly these tags, each alone on its own line, followed by its content. No markdown, no backticks." : "FORMAT DE SORTIE (PAS DE JSON). Écris exactement ces balises, chacune seule sur sa ligne, suivies de leur contenu. Pas de markdown, pas de backticks."}
[TITRE]
[SLUG]
[META_TITLE]
[META_DESCRIPTION]
[EXTRAIT]
[TLDR]
[CONTENU_HTML]
[FAQ]
Q: ${en ? "question" : "question"}
A: ${en ? "answer" : "réponse"}
[FIN]
${realData}`;
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Mise en forme intégrée (styles en ligne) : indépendante du thème WordPress
export function styleHtml(html) {
  const add = (tag, style) => (h) =>
    h.replace(new RegExp(`<${tag}(\\s[^>]*)?>`, "gi"), (m, attrs = "") =>
      /style=/i.test(attrs) ? m : `<${tag}${attrs} style="${style}">`);
  const rules = [
    ["table", "width:100%;border-collapse:collapse;margin:1.5em 0;font-size:0.95em;"],
    ["th", "border:1px solid #d0d5dd;padding:10px 12px;background:#f2f4f7;text-align:left;font-weight:700;"],
    ["td", "border:1px solid #d0d5dd;padding:10px 12px;vertical-align:top;"],
    ["ul", "margin:1em 0 1.2em 1.4em;padding-left:1em;list-style:disc;"],
    ["ol", "margin:1em 0 1.2em 1.4em;padding-left:1em;list-style:decimal;"],
    ["li", "margin:0.4em 0;line-height:1.6;"],
    ["h2", "margin:2em 0 0.6em;line-height:1.3;"],
    ["h3", "margin:1.5em 0 0.5em;line-height:1.35;"],
    ["p", "margin:0 0 1.1em;line-height:1.7;"],
    ["blockquote", "margin:1.5em 0;padding:0.8em 1.2em;border-left:4px solid #98a2b3;background:#f9fafb;"],
  ];
  let out = String(html || "");
  for (const [tag, style] of rules) out = add(tag, style)(out);
  // Tableaux : conteneur défilant sur mobile
  out = out.replace(/<table\b/gi, '<div style="overflow-x:auto;"><table').replace(/<\/table>/gi, "</table></div>");
  return out;
}

// Assemble le HTML final : synthèse en tête + contenu + FAQ
export function assembleHtml(article, lang = "fr", { styled = false } = {}) {
  const en = lang === "en";
  const tldr = article.tldr
    ? `<div class="geo-tldr" style="background:#eef4ff;border-left:4px solid #2e5bff;padding:1em 1.2em;margin:0 0 1.8em;border-radius:6px;"><p style="margin:0;line-height:1.6;"><strong>${en ? "In short" : "En bref"} :</strong> ${esc(stripPriceSentences(article.tldr))}</p></div>\n`
    : "";
  const faq = Array.isArray(article.faq) && article.faq.length
    ? `\n<h2>${en ? "Frequently asked questions" : "Questions fréquentes"}</h2>\n` +
      article.faq.map((f) => ({ q: f.q, a: stripPriceSentences(f.a) })).filter((f) => f.a && !/\b(prix|tarifs?|cout|coût|budget|price|pricing|cost)\b/i.test(f.q)).map((f) => `<h3>${esc(f.q)}</h3>\n<p>${esc(f.a)}</p>`).join("\n")
    : "";
  const html = tldr + (article.contenu_html || "") + faq;
  return styled ? styleHtml(html) : html;
}

// Score GEO heuristique (0-100) + détail des critères
export function scoreGeo(article, keyword = "", siteUrl = "") {
  const html = assembleHtml(article);
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter(Boolean);
  const kw = keyword.toLowerCase();
  const first100 = words.slice(0, 100).join(" ").toLowerCase();
  const h2 = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gis)].map((m) => m[1].replace(/<[^>]+>/g, ""));
  const paras = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gis)].map((m) => m[1].replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length);
  const checks = {
    reponse_100_premiers_mots: !!kw && (first100.includes(kw) || kw.split(/\s+/).filter((w) => w.length > 3).every((w) => first100.includes(w))),
    encart_synthese: !!article.tldr,
    h2_en_questions: h2.length > 0 && h2.filter((t) => t.includes("?")).length >= Math.ceil(h2.length / 2),
    au_moins_4_h2: h2.length >= 4,
    liste: /<(ul|ol)\b/i.test(html),
    tableau: /<table\b/i.test(html),
    paragraphes_max_200_mots: paras.length > 0 && Math.max(...paras) <= 200,
    faq_3_a_5: Array.isArray(article.faq) && article.faq.length >= 3 && article.faq.length <= 5,
    donnees_chiffrees: (text.match(/\d+[\d\s.,]*\s?(%|€|euros?|ans|mois|jours)/gi) || []).length >= 2,
    lien_interne: /<a\s[^>]*href=/i.test(html),
    lien_externe: (() => {
      let host = "";
      try { host = new URL(siteUrl).hostname.replace(/^www\./, ""); } catch (e) {}
      return [...html.matchAll(/<a\s[^>]*href=["'](https?:\/\/[^"']+)["']/gi)].some((m) => {
        try { return !host || new URL(m[1]).hostname.replace(/^www\./, "") !== host; } catch (e) { return false; }
      });
    })(),
    densite_mot_cle: (() => {
      if (!kw || !words.length) return false;
      const n = text.toLowerCase().split(kw).length - 1;
      const d = (n / words.length) * 100;
      return d >= 0.9 && d <= 2.5;
    })(),
    longueur_1500_3000: words.length >= 1500 && words.length <= 3000,
  };
  const ok = Object.values(checks).filter(Boolean).length;
  return { score: Math.round((ok / Object.keys(checks).length) * 100), words: words.length, checks };
}

// Lit la sortie à balises ([TITRE] ... [FIN]) sans passer par du JSON.
export function parseGeoOutput(raw) {
  const text = String(raw || "").replace(/```[a-z]*/gi, "").replace(/\r/g, "");
  if (!/\[FIN\]/.test(text)) throw new Error("Réponse IA tronquée (balise [FIN] absente) : article trop long pour le modèle");
  const tags = ["TITRE", "SLUG", "META_TITLE", "META_DESCRIPTION", "EXTRAIT", "TLDR", "CONTENU_HTML", "FAQ"];
  const parts = {};
  const re = /^\s*\[(TITRE|SLUG|META_TITLE|META_DESCRIPTION|EXTRAIT|TLDR|CONTENU_HTML|FAQ|FIN)\]\s*$/gm;
  let m, last = null, lastEnd = 0;
  while ((m = re.exec(text))) {
    if (last) parts[last] = text.slice(lastEnd, m.index).trim();
    last = m[1]; lastEnd = re.lastIndex;
  }
  for (const t of ["TITRE", "SLUG", "CONTENU_HTML"]) {
    if (!parts[t]) throw new Error(`Réponse IA incomplète : balise [${t}] vide ou absente`);
  }
  const faq = [];
  const fre = /Q:\s*(.+?)\s*\n\s*A:\s*([\s\S]*?)(?=\n\s*Q:|$)/g;
  let f;
  while ((f = fre.exec(parts.FAQ || ""))) faq.push({ q: f[1].trim(), a: f[2].trim() });
  const one = (s) => (s || "").replace(/\s+/g, " ").trim();
  return {
    titre: one(parts.TITRE),
    slug: one(parts.SLUG).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""),
    meta_title: one(parts.META_TITLE),
    meta_description: one(parts.META_DESCRIPTION),
    extrait: one(parts.EXTRAIT),
    tldr: one(parts.TLDR),
    contenu_html: parts.CONTENU_HTML,
    faq,
  };
}

// ================= Génération en plusieurs petites demandes =================
// Au lieu d'un article de 2000 mots en un bloc (trop lent sur les offres gratuites),
// on demande : 1) un plan court, 2) chaque section séparément.

export function geoOutlinePrompt({ keyword, sector, location, siteUrl, lang = "fr", author, realData = "" }) {
  const en = lang === "en";
  const authorLine = author?.name
    ? `${en ? "Author" : "Auteur"}: ${author.name}${author.expertise ? ", " + author.expertise : ""}`
    : en ? "Author: none provided (do not invent one)" : "Auteur: aucun fourni (n'en invente pas)";
  return `${en ? "You are an expert SEO/GEO copywriter. Write in English." : "Tu es un expert SEO/GEO et rédacteur web professionnel. Rédige en français."}
Site: ${siteUrl} | ${en ? "Sector" : "Secteur"}: ${sector} | ${en ? "Location" : "Ville"}: ${location}
${en ? "Main keyword" : "Mot-clé principal"}: "${keyword}"
${authorLine}

${en ? "Plan an article (do NOT write the article itself). Rules" : "Prépare le PLAN d'un article (n'écris PAS l'article). Règles"}:
- "${keyword}" ${en ? "appears in the title, meta_title and meta_description" : "apparaît dans le titre, le meta_title et la meta_description"}
- meta_title: ${en ? "60 characters max" : "60 caractères max"} ; meta_description: ${en ? "150 characters max, ends with a CTA" : "150 caractères max, finit par un CTA"}
- ${en ? `tldr: 2 to 4 self-contained sentences answering the keyword's question directly; the FIRST sentence must contain the exact phrase "${keyword}"` : `tldr : 2 à 4 phrases autonomes qui répondent directement à la question du mot-clé ; la PREMIÈRE phrase doit contenir exactement l'expression « ${keyword} »`}
- ${en ? "No H2 about prices, rates or budgets." : "Aucun H2 sur les prix, tarifs ou budgets."}
- ${en ? "PLAN: exactly 5 H2 headings, each a real question people ask, covering different sub-questions (comparison, selection criteria, common mistakes, local case...)" : "PLAN : exactement 5 titres H2, chacun formulé comme une vraie question que se posent les gens, couvrant des sous-questions différentes (comparaison, critères de choix, erreurs courantes, cas local...)"}
- ${en ? "FAQ: 3 to 5 short Q&As (answer in 1 to 3 sentences). Never invent figures." : "FAQ : 3 à 5 questions/réponses courtes (réponse en 1 à 3 phrases). N'invente jamais de chiffre."}

${en ? "OUTPUT FORMAT (NOT JSON). Exactly these tags, each alone on its line:" : "FORMAT DE SORTIE (PAS DE JSON). Exactement ces balises, chacune seule sur sa ligne :"}
[TITRE]
[SLUG]
[META_TITLE]
[META_DESCRIPTION]
[EXTRAIT]
[TLDR]
[PLAN]
H2: ${en ? "question 1" : "question 1"}
H2: ${en ? "question 2" : "question 2"}
H2: ${en ? "question 3" : "question 3"}
H2: ${en ? "question 4" : "question 4"}
H2: ${en ? "question 5" : "question 5"}
[FAQ]
Q: ${en ? "question" : "question"}
A: ${en ? "answer" : "réponse"}
[FIN]${realData}`;
}

export function parseOutline(raw) {
  const text = String(raw || "").replace(/```[a-z]*/gi, "").replace(/\r/g, "");
  if (!/\[FIN\]/.test(text)) throw new Error("Plan IA tronqué (balise [FIN] absente)");
  const parts = {};
  const re = /^\s*\[(TITRE|SLUG|META_TITLE|META_DESCRIPTION|EXTRAIT|TLDR|PLAN|FAQ|FIN)\]\s*$/gm;
  let m, last = null, lastEnd = 0;
  while ((m = re.exec(text))) {
    if (last) parts[last] = text.slice(lastEnd, m.index).trim();
    last = m[1]; lastEnd = re.lastIndex;
  }
  const plan = (parts.PLAN || "").split("\n").map((l) => l.replace(/^\s*(H2:|[-*\d.)]+)\s*/i, "").trim()).filter(Boolean);
  if (!parts.TITRE || plan.length < 3) throw new Error("Plan IA incomplet (titre ou sections manquants)");
  const faq = [];
  const fre = /Q:\s*(.+?)\s*\n\s*A:\s*([\s\S]*?)(?=\n\s*Q:|$)/g;
  let f;
  while ((f = fre.exec(parts.FAQ || ""))) faq.push({ q: f[1].trim(), a: f[2].trim() });
  const one = (s) => (s || "").replace(/\s+/g, " ").trim();
  return {
    titre: one(parts.TITRE),
    slug: one(parts.SLUG).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""),
    meta_title: one(parts.META_TITLE),
    meta_description: one(parts.META_DESCRIPTION),
    extrait: one(parts.EXTRAIT),
    tldr: one(parts.TLDR),
    plan: plan.slice(0, 6),
    faq,
  };
}

export function geoSectionPrompt({ keyword, h2, index, total, siteUrl, lang = "fr", author, titre, realData = "" }) {
  const en = lang === "en";
  const first = index === 0;
  const last = index === total - 1;
  const today = monthYear(lang);
  return `${en ? "You are an expert SEO/GEO copywriter. Write in English." : "Tu es un expert SEO/GEO et rédacteur web professionnel. Rédige en français."}
${en ? "Article title" : "Titre de l'article"}: ${titre} | ${en ? "Main keyword" : "Mot-clé principal"}: "${keyword}"
${en ? "Write ONLY section" : "Rédige UNIQUEMENT la section"} ${index + 1}/${total} : <h2>${h2}</h2>

${en ? "RULES" : "RÈGLES"}:
- ${en ? "HTML only (no markdown, no backticks, no <html>/<body>). Start with <h2>" : "HTML uniquement (pas de markdown, pas de backticks, pas de <html>/<body>). Commence par <h2>"}${h2}</h2>
- ${en ? `300 to 450 words. First sentence = direct answer to the H2 question${first ? ` and contains the exact phrase "${keyword}"` : ""}. Each paragraph self-contained, 100 to 150 words max (no \"as seen above\").` : `300 à 450 mots. Première phrase = réponse directe à la question du H2${first ? ` et contenant exactement l'expression « ${keyword} »` : ""}. Chaque paragraphe est autonome, 100 à 150 mots maximum (pas de « comme vu plus haut »).`}
- ${en ? "Include a bulleted/numbered list or an HTML <table> if the topic fits." : "Inclus une liste à puces/numérotée ou un tableau HTML <table> si le sujet s'y prête."}
- ${en ? `Use the exact phrase "${keyword}" ${first ? 5 : 4} times in this section (naturally spread, not stuffed; at least once in every ~100 words of text is NOT required, but 4 mentions are), plus close variants.` : `Utilise l'expression exacte « ${keyword} » ${first ? 5 : 4} fois dans cette section (répartie naturellement, sans bourrage ; compte-les avant de répondre), plus des variantes proches.`}
${(index === 1 || index === 3) && /https?:\/\//.test(realData) ? `- ${en ? 'Include ONE external link to a source from the REAL DATA below, written as <a href="URL" target="_blank" rel="noopener">source name</a> (never nofollow). Use ONLY URLs listed below; never invent a URL.' : 'Insère UN lien externe vers une source des DONNÉES RÉELLES ci-dessous, écrit <a href="URL" target="_blank" rel="noopener">nom de la source</a> (jamais nofollow). Utilise UNIQUEMENT les URL listées ci-dessous ; n\'invente jamais d\'URL.'}\n` : ""}
- ${en ? "NEVER state any price, rate, budget or price range (no amounts in euros/dollars): if cost comes up, explain what makes it vary and suggest requesting a quote." : "N'indique JAMAIS de prix, tarif, budget ni fourchette de prix (aucun montant en euros) : si le coût est évoqué, explique ce qui le fait varier et invite à demander un devis."}
- ${en ? "Use the keyword naturally. NEVER invent a figure, study, testimonial or source: use only the REAL DATA below, otherwise stay qualitative." : "Utilise le mot-clé naturellement. N'INVENTE JAMAIS un chiffre, une étude, un témoignage ou une source : utilise uniquement les DONNÉES RÉELLES ci-dessous, sinon reste qualitatif."}
${first ? `- ${en ? `Before the <h2>, add <p><em>Updated ${today}${author?.name ? ` — By ${author.name}${author.expertise ? ", " + author.expertise : ""}` : ""}</em></p>` : `Avant le <h2>, ajoute <p><em>Mis à jour en ${today}${author?.name ? ` — Par ${author.name}${author.expertise ? ", " + author.expertise : ""}` : ""}</em></p>`}\n` : ""}${last ? `- ${en ? "End with a short actionable conclusion and one internal link" : "Termine par une courte conclusion actionnable et un lien interne"}: <a href="${siteUrl}/contact">${en ? "descriptive anchor" : "ancre descriptive"}</a>\n` : ""}- ${en ? "Output ONLY the HTML of this section." : "Ne renvoie QUE le HTML de cette section."}${realData}`;
}

// Filet de sécurité : retire toute phrase qui annonce un prix (€, euros, « à partir de 500 »…)
const PRICE = /(\d[\d\s.,]*\s?(€|euros?|eur\b|\$|k€)|(€|\$)\s?\d|(à partir de|starting at|from)\s+\d|tarifs?\s+(de|à|:)\s*\d)/i;
export function stripPriceSentences(text) {
  return String(text || "").split(/(?<=[.!?])\s+/).filter((x) => !PRICE.test(x)).join(" ").trim();
}
export function stripPrices(html) {
  return String(html || "")
    .replace(/<tr[\s\S]*?<\/tr>/gi, (row) => (!/<th/i.test(row) && PRICE.test(row) ? "" : row)).replace(/<(p|li)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (m, tag, attrs = "", inner) => {
    if (!PRICE.test(inner)) return m;
    const kept = inner.split(/(?<=[.!?])\s+/).filter((sent) => !PRICE.test(sent)).join(" ").trim();
    return kept ? `<${tag}${attrs || ""}>${kept}</${tag}>` : "";
  });
}

export function cleanSectionHtml(raw) {
  return stripPrices(String(raw || "")
    .replace(/```[a-z]*/gi, "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .trim());
}

// Orchestration (callAI est passé en paramètre pour rester testable)
export async function buildArticleInSteps({ callAI, keyword, sector, location, siteUrl, lang = "fr", author, realData = "", concurrency = 3 }) {
  const { text } = await callAI(geoOutlinePrompt({ keyword, sector, location, siteUrl, lang, author, realData }), { maxTokens: 2000 });
  const outline = parseOutline(text);
  const sections = new Array(outline.plan.length);
  let next = 0;
  const worker = async () => {
    while (next < outline.plan.length) {
      const i = next++;
      const r = await callAI(
        geoSectionPrompt({ keyword, h2: outline.plan[i], index: i, total: outline.plan.length, siteUrl, lang, author, titre: outline.titre, realData }),
        { maxTokens: 2000 }
      );
      sections[i] = cleanSectionHtml(r.text);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, outline.plan.length) }, worker));
  return { ...outline, contenu_html: sections.join("\n") };
}
