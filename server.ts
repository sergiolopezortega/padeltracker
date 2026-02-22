import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

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
        .order("date", { ascending: false });

      if (error) throw error;
      res.json(data);
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

  app.put("/api/matches/:id", async (req, res) => {
    const { id } = req.params;
    const { date, time, club, team, result, status } = req.body;
    if (!date || !club || !team) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const { data, error } = await supabase
        .from("matches")
        .update({ date, time, club, team, result, status })
        .eq("id", parseInt(id))
        .select();

      if (error) throw error;
      res.status(200).json(data[0]);
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: "Error al actualizar el partido" });
    }
  });

  app.post("/api/matches", async (req, res) => {
    const { date, time, club, team, result, status } = req.body;
    if (!date || !club || !team) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const { data, error } = await supabase
        .from("matches")
        .insert([{ date, time, club, team, result, status }])
        .select();

      if (error) throw error;
      res.status(201).json(data[0]);
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
