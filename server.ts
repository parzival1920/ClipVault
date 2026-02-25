import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("clips.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS clips (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_url TEXT,
    ai_summary TEXT NOT NULL,
    ai_tags TEXT NOT NULL, -- JSON string array
    ai_category TEXT,
    extracted_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  // Serve uploaded files
  app.use("/uploads", express.static(uploadsDir));

  // API Routes
  app.get("/api/clips", (req, res) => {
    const { query, type } = req.query;
    let sql = "SELECT * FROM clips";
    const params = [];

    const conditions = [];
    if (type) {
      conditions.push("file_type = ?");
      params.push(type);
    }
    if (query) {
      conditions.push("(filename LIKE ? OR ai_summary LIKE ? OR ai_tags LIKE ? OR ai_category LIKE ?)");
      const search = `%${query}%`;
      params.push(search, search, search, search);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY created_at DESC";

    const clips = db.prepare(sql).all(...params);
    res.json(clips.map(c => ({
      ...c,
      ai_tags: JSON.parse(c.ai_tags as string)
    })));
  });

  app.post("/api/clips", (req, res) => {
    const { 
      id, filename, file_type, file_size, 
      base64Data, ai_summary, ai_tags, ai_category, extracted_text 
    } = req.body;

    try {
      const storagePath = `${id}-${filename}`;
      const filePath = path.join(uploadsDir, storagePath);
      
      // Save file
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);

      const thumbnailUrl = file_type === 'image' ? `/uploads/${storagePath}` : null;

      const stmt = db.prepare(`
        INSERT INTO clips (id, filename, file_type, file_size, storage_path, thumbnail_url, ai_summary, ai_tags, ai_category, extracted_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id, filename, file_type, file_size, 
        storagePath, thumbnailUrl, ai_summary, 
        JSON.stringify(ai_tags), ai_category, extracted_text
      );

      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error saving clip:", error);
      res.status(500).json({ error: "Failed to save clip" });
    }
  });

  app.delete("/api/clips/:id", (req, res) => {
    const { id } = req.params;
    const clip = db.prepare("SELECT storage_path FROM clips WHERE id = ?").get(id) as { storage_path: string } | undefined;

    if (clip) {
      const filePath = path.join(uploadsDir, clip.storage_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      db.prepare("DELETE FROM clips WHERE id = ?").run(id);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Clip not found" });
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
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
