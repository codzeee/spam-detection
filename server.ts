import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory "database" for keywords
  let spamKeywords = [
    "buy now", "click here", "free money", "win a prize", "subscribe",
    "make money fast", "cheap pharmacy", "viagra", "casino", "lottery",
    "inheritance", "urgent action", "verify your account", "limited time offer"
  ];

  // API Routes
  app.get("/api/keywords", (req, res) => {
    res.json(spamKeywords);
  });

  app.post("/api/keywords", (req, res) => {
    const { keyword } = req.body;
    if (keyword && !spamKeywords.includes(keyword.toLowerCase())) {
      spamKeywords.push(keyword.toLowerCase());
      res.json({ success: true, keywords: spamKeywords });
    } else {
      res.status(400).json({ error: "Invalid or duplicate keyword" });
    }
  });

  app.delete("/api/keywords/:keyword", (req, res) => {
    const { keyword } = req.params;
    spamKeywords = spamKeywords.filter(k => k !== keyword.toLowerCase());
    res.json({ success: true, keywords: spamKeywords });
  });

  // Simple keyword analysis route (AI analysis moved to frontend)
  app.post("/api/analyze-keywords", (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const foundKeywords = spamKeywords.filter(k => text.toLowerCase().includes(k));
    const score = Math.min(foundKeywords.length * 20, 100);

    res.json({
      score,
      foundKeywords
    });
  });

  // Scraping Route (Returns raw words for frontend AI to process)
  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract common words/phrases from the page
      const bodyText = $("body").text().toLowerCase();
      const words = Array.from(new Set(bodyText.match(/\b\w{4,}\b/g) || [])).slice(0, 100);
      
      res.json({ url, words });
    } catch (error) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: "Failed to scrape URL" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
