import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, user_id, site, id } = req.body || req.query;

  try {
    // Sauvegarder un site (création ou mise à jour si "id" est fourni)
    if (action === "save") {
      if (!user_id || !site?.wp_url || !site?.wp_user || !site?.wp_pass) {
        return res.status(400).json({ error: "Champs manquants (user_id, wp_url, wp_user, wp_pass)" });
      }
      const payload = {
        user_id,
        name: site.name || "",
        sector: site.sector || "",
        location: site.location || "",
        wp_url: site.wp_url,
        wp_user: site.wp_user,
        wp_pass: site.wp_pass,
      };

      let result;
      if (site.id) {
        result = await supabase
          .from("client_sites")
          .update(payload)
          .eq("id", site.id)
          .eq("user_id", user_id)
          .select();
      } else {
        result = await supabase.from("client_sites").insert(payload).select();
      }

      if (result.error) return res.status(400).json({ error: result.error.message });
      return res.status(200).json({ site: result.data[0] });
    }

    // Lister les sites d'un utilisateur
    if (action === "list") {
      if (!user_id) return res.status(400).json({ error: "user_id requis" });
      const { data, error } = await supabase
        .from("client_sites")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ sites: data });
    }

    // Supprimer un site
    if (action === "delete") {
      if (!id || !user_id) return res.status(400).json({ error: "id et user_id requis" });
      const { error } = await supabase
        .from("client_sites")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id);

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Action invalide" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
