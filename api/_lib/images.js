// api/_lib/images.js — cherche une photo libre de droits pour illustrer l'article.
// Variables Vercel (une des deux suffit) : PIXABAY_API_KEY ou PEXELS_API_KEY.
// Sans clé, l'article est publié sans image (pas d'erreur).

async function searchPexels(query, lang, exclude = []) {
  const url =
    "https://api.pexels.com/v1/search?per_page=30&orientation=landscape&locale=" +
    (lang === "en" ? "en-US" : "fr-FR") + "&query=" + encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = await res.json();
  const list = data.photos || [];
  const photo = list.find((p) => p.width >= 1200 && !exclude.includes(p.url)) || list.find((p) => !exclude.includes(p.url)) || list[Math.floor(Math.random() * list.length)];
  if (!photo) return null;
  return {
    url: photo.src?.large2x || photo.src?.large || photo.src?.original,
    described: (photo.alt || "").trim(),
    credit: photo.photographer,
    source: photo.url,
  };
}

async function searchPixabay(query, lang, exclude = []) {
  const url =
    "https://pixabay.com/api/?key=" + encodeURIComponent(process.env.PIXABAY_API_KEY) +
    "&q=" + encodeURIComponent(query.slice(0, 100)) +
    "&lang=" + (lang === "en" ? "en" : "fr") +
    "&image_type=photo&orientation=horizontal&safesearch=true&min_width=1000&per_page=40";
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  const data = await res.json();
  const hits = data.hits || [];
  const hit = hits.find((h) => !exclude.includes(h.pageURL)) || hits[Math.floor(Math.random() * hits.length)];
  if (!hit) return null;
  const tags = String(hit.tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3).join(", ");
  return {
    url: hit.largeImageURL || hit.webformatURL,
    described: tags,
    credit: hit.user,
    source: hit.pageURL,
  };
}

// exclude = adresses (pageURL) des photos déjà utilisées pour ce site
export async function findImage({ keyword, sector, lang = "fr", exclude = [] }) {
  const providers = [];
  if (process.env.PIXABAY_API_KEY) providers.push(searchPixabay);
  if (process.env.PEXELS_API_KEY) providers.push(searchPexels);
  if (!providers.length) return null;

  for (const q of [keyword, sector].filter(Boolean)) {
    for (const search of providers) {
      try {
        const r = await search(q, lang, exclude);
        if (r && r.url) {
          // Texte alternatif : reprend le sujet + décrit l'image (sans bourrage)
          const alt = `Illustration : ${keyword}`;
          return { url: r.url, alt: alt.slice(0, 200), credit: r.credit, source: r.source };
        }
      } catch (e) {
        // image optionnelle : on essaie la suite sans bloquer la publication
      }
    }
  }
  return null;
}
