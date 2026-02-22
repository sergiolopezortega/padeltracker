import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("padel.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    club TEXT NOT NULL,
    team TEXT NOT NULL,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/matches", (req, res) => {
    try {
      const matches = db.prepare("SELECT * FROM matches ORDER BY date DESC").all();
      res.json(matches);
    } catch (error) {
      console.error("Fetch error:", error);
      res.status(500).json({ error: "Error al obtener los partidos" });
    }
  });

  app.delete("/api/matches/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM matches WHERE id = ?").run(id);
      res.status(200).json({ message: "Partido eliminado" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Error al eliminar el partido" });
    }
  });

  app.put("/api/matches/:id", (req, res) => {
    const { id } = req.params;
    const { date, club, team, result } = req.body;
    if (!date || !club || !team) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      db.prepare(
        "UPDATE matches SET date = ?, club = ?, team = ?, result = ? WHERE id = ?"
      ).run(date, club, team, result, id);
      res.status(200).json({ id, date, club, team, result });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: "Error al actualizar el partido" });
    }
  });

  app.post("/api/matches", (req, res) => {
    const { date, club, team, result } = req.body;
    if (!date || !club || !team) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const info = db.prepare(
        "INSERT INTO matches (date, club, team, result) VALUES (?, ?, ?, ?)"
      ).run(date, club, team, result);
      res.status(201).json({ id: info.lastInsertRowid, date, club, team, result });
    } catch (error) {
      res.status(500).json({ error: "Failed to save match" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
