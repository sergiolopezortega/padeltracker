import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to look up club address from clubs.json
function getClubAddress(clubName: string): string | null {
  if (!clubName) return null;
  try {
    const clubsFilePath = path.join(process.cwd(), "clubs.json");
    if (!fs.existsSync(clubsFilePath)) return null;
    const content = fs.readFileSync(clubsFilePath, "utf-8");
    const clubsMap: Record<string, string> = JSON.parse(content);

    // Direct exact match
    if (clubsMap[clubName]) return clubsMap[clubName];

    // Case-insensitive / trimmed match
    const normalized = clubName.trim().toLowerCase();
    for (const [key, address] of Object.entries(clubsMap)) {
      if (key.trim().toLowerCase() === normalized) {
        return address;
      }
    }
  } catch (err) {
    console.error("Error reading clubs.json:", err);
  }
  return null;
}

// Resilient save handler supporting Direccion_Club, direccion_club, and bolas
async function saveMatchWithRetry(action: "insert" | "update", initialPayload: any, id?: number) {
  const execute = async (p: any) => {
    if (action === "insert") {
      return await supabase.from("matches").insert([p]).select();
    } else {
      return await supabase.from("matches").update(p).eq("id", id!).select();
    }
  };

  const payload = { ...initialPayload };
  let result = await execute(payload);

  // If Direccion_Club column does not exist in Supabase table, try lowercase direccion_club
  if (
    result.error &&
    ("Direccion_Club" in payload) &&
    ((result.error as any).code === "PGRST204" ||
      (result.error as any).code === "42703" ||
      (result.error as any).message?.includes("Direccion_Club"))
  ) {
    const addr = payload["Direccion_Club"];
    delete payload["Direccion_Club"];
    payload["direccion_club"] = addr;
    result = await execute(payload);
  }

  // If direccion_club also does not exist, remove address fields from DB payload
  if (
    result.error &&
    ("direccion_club" in payload || "Direccion_Club" in payload) &&
    ((result.error as any).code === "PGRST204" ||
      (result.error as any).code === "42703" ||
      (result.error as any).message?.toLowerCase().includes("direccion"))
  ) {
    delete payload["direccion_club"];
    delete payload["Direccion_Club"];
    result = await execute(payload);
  }

  // If bolas does not exist, remove bolas and retry
  if (
    result.error &&
    "bolas" in payload &&
    ((result.error as any).code === "PGRST204" ||
      (result.error as any).code === "42703" ||
      (result.error as any).message?.includes("bolas"))
  ) {
    delete payload.bolas;
    result = await execute(payload);
  }

  return result;
}

const app = express();

async function startServer() {
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/matches", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .gte("date", "2026-09-01")
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) throw error;

      const enriched = (data || []).map((m: any) => ({
        ...m,
        Direccion_Club: m.Direccion_Club || m.direccion_club || getClubAddress(m.club) || undefined
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Fetch error:", error);
      res.status(500).json({ error: "Error al obtener los partidos" });
    }
  });

  app.delete("/api/matches/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", parseInt(id));

      if (error) throw error;
      res.status(200).json({ message: "Partido eliminado" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Error al eliminar el partido" });
    }
  });

  app.get("/api/clubs", (req, res) => {
    try {
      const clubsFilePath = path.join(process.cwd(), "clubs.json");
      if (fs.existsSync(clubsFilePath)) {
        const content = fs.readFileSync(clubsFilePath, "utf-8");
        return res.json(JSON.parse(content));
      }
      res.json({});
    } catch (err) {
      console.error("Error reading clubs.json:", err);
      res.status(500).json({ error: "Error reading clubs file" });
    }
  });

  app.put("/api/matches/:id", async (req, res) => {
    const { id } = req.params;
    const { date, time, club, team, result, status, bolas } = req.body;
    if (!date || !club || !team) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const payload: any = { date, time, club, team, result, status };
      if (bolas !== undefined) payload.bolas = bolas;

      // Check if club is in clubs.json
      const clubAddress = getClubAddress(club);
      if (clubAddress) {
        payload["Direccion_Club"] = clubAddress;
      }

      const { data, error } = await saveMatchWithRetry("update", payload, parseInt(id));

      if (error) throw error;
      res.status(200).json({ ...data?.[0], bolas, Direccion_Club: clubAddress || undefined });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: "Error al actualizar el partido" });
    }
  });

  app.post("/api/matches", async (req, res) => {
    const { date, time, club, team, result, status, bolas } = req.body;
    if (!date || !club || !team) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const payload: any = { date, time, club, team, result, status };
      if (bolas !== undefined) payload.bolas = bolas;

      // Check if club is in clubs.json
      const clubAddress = getClubAddress(club);
      if (clubAddress) {
        payload["Direccion_Club"] = clubAddress;
      }

      const { data, error } = await saveMatchWithRetry("insert", payload);

      if (error) throw error;
      res.status(201).json({ ...data?.[0], bolas, Direccion_Club: clubAddress || undefined });
    } catch (error) {
      console.error("Insert error:", error);
      res.status(500).json({ error: "Failed to save match" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
