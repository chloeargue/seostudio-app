import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function computeNextRun(frequency, from = new Date()) {
  const d = new Date(from);
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else if (frequency === "quarterly") d.setMonth(d.getMonth() + 3);
  return d.toISOString();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, user_id, schedule, id } = req.body || req.query;

  try {
    // Créer ou mettre à jour un planning
    if (action === "save") {
      if (!user_id || !schedule?.site_id || !schedule?.frequency) {
        return res.status(400).json({ error: "Champs manquants (user_id, site_id, frequency)" });
      }
      const payload = {
        user_id,
        site_id: schedule.site_id,
        frequency: schedule.frequency,
        articles_per_period: schedule.articles_per_period || 1,
        sector: schedule.sector || "",
        geo_zone: schedule.geo_zone || "",
        prep_days_before: schedule.prep_days_before ?? 3,
        is_active: schedule.is_active ?? true,
      };
      if (!schedule.id) {
        payload.next_run_at = computeNextRun(schedule.frequency);
      }

      let result;
      if (schedule.id) {
        result = await supabase
          .from("publication_schedules")
          .update(payload)
          .eq("id", schedule.id)
          .eq("user_id", user_id)
          .select();
      } else {
        result = await supabase.from("publication_schedules").insert(payload).select();
      }

      if (result.error) return res.status(400).json({ error: result.error.message });
      return res.status(200).json({ schedule: result.data[0] });
    }

    // Lister les plannings d'un utilisateur
    if (action === "list") {
      if (!user_id) return res.status(400).json({ error: "user_id requis" });
      const { data, error } = await supabase
        .from("publication_schedules")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ schedules: data });
    }

    // Activer / mettre en pause
    if (action === "toggle") {
      if (!id || !user_id) return res.status(400).json({ error: "id et user_id requis" });
      const { schedule: s } = req.body;
      const { data, error } = await supabase
        .from("publication_schedules")
        .update({ is_active: s.is_active })
        .eq("id", id)
        .eq("user_id", user_id)
        .select();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ schedule: data[0] });
    }

    // Supprimer
    if (action === "delete") {
      if (!id || !user_id) return res.status(400).json({ error: "id et user_id requis" });
      const { error } = await supabase
        .from("publication_schedules")
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
