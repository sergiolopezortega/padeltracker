import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to load and parse clubs.json robustly
function loadClubsDict(): Record<string, string> {
  try {
    const clubsFilePath = path.join(process.cwd(), "clubs.json");
    if (!fs.existsSync(clubsFilePath)) return {};
    const content = fs.readFileSync(clubsFilePath, "utf-8");

    try {
      return JSON.parse(content);
    } catch (parseErr) {
      // Fallback line-by-line parser for slightly malformed JSON (e.g., missing commas)
      console.warn("Standard JSON.parse failed on clubs.json, using tolerant parser:", parseErr);
      const clubs: Record<string, string> = {};
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim().replace(/,$/, "");
        const match = trimmed.match(/^"([^"]+)"\s*:\s*"([^"]*)"/);
        if (match) {
          clubs[match[1]] = match[2];
        }
      }
      return clubs;
    }
  } catch (err) {
    console.error("Error reading clubs.json:", err);
    return {};
  }
}

// Helper to look up club address from clubs.json
function getClubAddress(clubName: string): string | null {
  if (!clubName) return null;
  const clubsMap = loadClubsDict();

  // Direct exact match
  if (clubsMap[clubName]) return clubsMap[clubName];

  // Case-insensitive / trimmed match
  const normalized = clubName.trim().toLowerCase();
  for (const [key, address] of Object.entries(clubsMap)) {
    if (key.trim().toLowerCase() === normalized) {
      return address;
    }
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

  // If updating and Direccion_Club was explicitly set to null, also ensure lowercase direccion_club is nullified if it exists
  if (!result.error && action === "update" && id && ("Direccion_Club" in initialPayload) && initialPayload["Direccion_Club"] === null) {
    try {
      await supabase.from("matches").update({ direccion_club: null }).eq("id", id);
    } catch (_) {}
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

      const enriched = (data || []).map((m: any) => {
        const isOther = m.club?.trim().toLowerCase() === "otros";
        const address = isOther
          ? undefined
          : (getClubAddress(m.club) || m.Direccion_Club || m.direccion_club || undefined);

        return {
          ...m,
          Direccion_Club: address,
          direccion_club: address,
        };
      });

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
      const clubs = loadClubsDict();
      res.json(clubs);
    } catch (err) {
      console.error("Error reading clubs.json:", err);
      res.status(500).json({ error: "Error reading clubs file" });
    }
  });

  app.put("/api/matches/:id", async (req, res) => {
    const { id } = req.params;
    const { date, time, club, team, result, status, bolas, clubSelect, isOtros } = req.body;
    if (!date || !club || !team) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const payload: any = { date, time, club, team, result, status };
      if (bolas !== undefined) payload.bolas = bolas;

      // Check if club is 'Otros' or selected as 'Otros'
      const isOtherClub = isOtros === true || clubSelect === "Otros" || club?.trim().toLowerCase() === "otros";

      if (isOtherClub) {
        // En los updates, en caso que el valor de club sea Otros se debe eliminar el campo dirección por si previamente se había añadido alguna direccion
        payload["Direccion_Club"] = null;
      } else {
        const clubAddress = getClubAddress(club);
        if (clubAddress) {
          payload["Direccion_Club"] = clubAddress;
        } else {
          // Si el club no está en clubs.json, también se vacía cualquier dirección previa
          payload["Direccion_Club"] = null;
        }
      }

      const { data, error } = await saveMatchWithRetry("update", payload, parseInt(id));

      if (error) throw error;
      const finalAddress = isOtherClub ? undefined : (getClubAddress(club) || undefined);
      res.status(200).json({
        ...data?.[0],
        bolas,
        Direccion_Club: finalAddress,
        direccion_club: finalAddress,
      });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: "Error al actualizar el partido" });
    }
  });

  app.post("/api/matches", async (req, res) => {
    const { date, time, club, team, result, status, bolas, clubSelect, isOtros } = req.body;
    if (!date || !club || !team) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const payload: any = { date, time, club, team, result, status };
      if (bolas !== undefined) payload.bolas = bolas;

      const isOtherClub = isOtros === true || clubSelect === "Otros" || club?.trim().toLowerCase() === "otros";
      const clubAddress = isOtherClub ? null : getClubAddress(club);
      if (clubAddress) {
        payload["Direccion_Club"] = clubAddress;
      } else {
        payload["Direccion_Club"] = null;
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
