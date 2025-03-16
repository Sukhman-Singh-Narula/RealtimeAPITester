import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const apiKey = process.env.OPENAI_API_KEY;
const __dirname = path.resolve();

// Configure Vite middleware for React client (only in development)
let vite;
if (process.env.NODE_ENV !== "production") {
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);
}

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "verse",
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Serve React static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist/client")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist/client", "index.html"));
  });
}

// Export Express app as a serverless function (✅ Required for Vercel)
export default app;
