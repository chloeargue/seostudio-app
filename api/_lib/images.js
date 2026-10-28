// api/_lib/images.js — cherche une photo libre de droits pour illustrer l'article.
// Variables Vercel (une des deux suffit) : PIXABAY_API_KEY ou PEXELS_API_KEY.
// Sans clé, l'article est publié sans image (pas d'erreur).

async function searchPexels(query, lang) {
  const url =
    "https://api.pexels.com/v1/search?per_page=8&orientation=landscape&locale=" +
    (lang === "en" ? "en-US" : "fr-FR") + "&query=" + encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = await res.json();
  const photo = (data.photos || []).find((p) => p.width >= 1200) || (data.photos || [])[0];
  if (!photo) return null;
  return {
    url: photo.src?.large2x || photo.src?.large || photo.src?.original,
    described: (photo.alt || "").trim(),
    credit: photo.photographer,
    source: photo.url,
  };
}

async function searchPixabay(query, lang) {
  const url =
    "https://pixabay.com/api/?key=" + encodeURIComponent(process.env.PIXABAY_API_KEY) +
    "&q=" + encodeURIComponent(query.slice(0, 100)) +
    "&lang=" + (lang === "en" ? "en" : "fr") +
    "&image_type=photo&orientation=horizontal&safesearch=true&min_width=1000&per_page=10";
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  const data = await res.json();
  const hit = (data.hits || [])[0];
  if (!hit) return null;
  const tags = String(hit.tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3).join(", ");
  return {
    url: hit.largeImageURL || hit.webformatURL,
    described: tags,
    credit: hit.user,
    source: hit.pageURL,
  };
}

export async function findImage({ keyword, sector, lang = "fr" }) {
  const providers = [];
  if (process.env.PIXABAY_API_KEY) providers.push(searchPixabay);
  if (process.env.PEXELS_API_KEY) providers.push(searchPexels);
  if (!providers.length) return null;

  for (const q of [keyword, sector].filter(Boolean)) {
    for (const search of providers) {
      try {
        const r = await search(q, lang);
        if (r && r.url) {
          // Texte alternatif : reprend le sujet + décrit l'image (sans bourrage)
          const alt = r.described ? `${keyword} : ${r.described}` : keyword;
          return { url: r.url, alt: alt.slice(0, 200), credit: r.credit, source: r.source };
        }
      } catch (e) {
        // image optionnelle : on essaie la suite sans bloquer la publication
      }
    }
  }
  return null;
}
