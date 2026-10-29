// Utilitaires e-mail + lien signé. PAS une route API (dossier api/_lib/).
import crypto from "node:crypto";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function secret() {
  const s = process.env.BLOCK_SECRET;
  if (!s) throw new Error("BLOCK_SECRET manquant dans les variables Vercel");
  return s;
}

// Signature du lien « Bloquer » : impossible à deviner sans BLOCK_SECRET
export function signId(id) {
  return crypto.createHmac("sha256", secret()).update(String(id)).digest("hex").slice(0, 32);
}
export function verifySig(id, sig) {
  try {
    const a = Buffer.from(signId(id));
    const b = Buffer.from(String(sig || ""));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) { return false; }
}

export function appUrl(req) {
  return (process.env.APP_URL || `https://${req?.headers?.host || ""}`).replace(/\/$/, "");
}

export async function sendMail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY manquant dans les variables Vercel");
  if (!to) throw new Error("Aucune adresse e-mail de destinataire (notify_email)");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "Noria <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Resend ${r.status} ${raw.slice(0, 200)}`);
  return JSON.parse(raw);
}

const shell = (inner) => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#101828;line-height:1.6;">${inner}<p style="color:#98a2b3;font-size:12px;margin-top:32px;">Envoyé par Noria</p></div>`;
const button = (href, label, color) => `<p style="margin:24px 0;"><a href="${esc(href)}" style="background:${color};color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:700;display:inline-block;">${esc(label)}</a></p>`;

export function noticeEmail({ title, metaDescription, publishAt, geoScore, blockUrl, editUrl, siteName }) {
  const when = new Date(publishAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" });
  return shell(`
    <h2 style="margin:0 0 8px;">Un article sera publié le ${esc(when)}</h2>
    <p><strong>${esc(title)}</strong>${siteName ? ` — ${esc(siteName)}` : ""}</p>
    ${metaDescription ? `<p style="color:#475467;">${esc(metaDescription)}</p>` : ""}
    ${geoScore != null ? `<p style="color:#475467;">Score GEO : ${esc(geoScore)}/100</p>` : ""}
    <p>Sans action de votre part, il sera publié automatiquement à cette date. Pour l'empêcher :</p>
    ${button(blockUrl, "Bloquer la publication", "#d92d20")}
    <p><a href="${esc(editUrl)}">Relire ou modifier l'article dans WordPress</a></p>`);
}

export function draftEmail({ title, editUrl, siteName }) {
  return shell(`
    <h2 style="margin:0 0 8px;">Un article est prêt à être validé</h2>
    <p><strong>${esc(title)}</strong>${siteName ? ` — ${esc(siteName)}` : ""}</p>
    <p>Il est enregistré en brouillon dans WordPress. Relisez-le puis publiez-le quand vous le souhaitez.</p>
    ${button(editUrl, "Ouvrir le brouillon", "#2e5bff")}`);
}

export function pageHtml(title, body) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head><body style="font-family:Arial,Helvetica,sans-serif;background:#f9fafb;margin:0;padding:48px 16px;color:#101828;"><div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:10px;padding:32px;"><h1 style="font-size:20px;margin-top:0;">${esc(title)}</h1>${body}</div></body></html>`;
}
export { esc };
