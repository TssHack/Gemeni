const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const port = 3000;

// Your Gemini API keys
const API_KEYS = [
  "AIzaSyCo5VB_H6pN-DDk1YUjR2MLYV6d4CdRItM",
  "AIzaSyBv27XqopLRpDoJWoETuVN5XWnfjQnaf-E",
  "AIzaSyBv8Ix7n9sPvswwazsXyQuzrhUifaKgEXE",
  "AIzaSyBq_BlDIr2Qtc3Bgb1u7hkOhQwfmuhdZ18"
];

// Model alias mapping
const MODEL_ALIAS = {
  "2": "gemini-2.0-flash",
  "1.5pro": "gemini-1.5-pro",
  "2.5pro": "gemini-2.5-pro-preview-03-25"
};

app.use(bodyParser.json());

// Function to query Gemini
async function queryGemini(prompt, modelName) {
  const apiKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  const response = await axios.post(url, body);
  const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
  return reply;
}

// POST
app.post("/gemini/chat", async (req, res) => {
  const { prompt, model } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt is required and must be a string." });
  }

  const realModel = MODEL_ALIAS[model];
  if (!realModel) {
    return res.status(400).json({ error: `Invalid model. Available options: ${Object.keys(MODEL_ALIAS).join(", ")}` });
  }

  try {
    const result = await queryGemini(prompt, realModel);
    res.json({
      method: "POST",
      author: "Created by ehsan fazli",
      model_used: realModel,
      result
    });
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).json({ error: "Gemini API error", details: error?.response?.data || error.message });
  }
});

// GET
app.get("/gemini/chat", async (req, res) => {
  const prompt = req.query.prompt;
  const model = req.query.model;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Query param 'prompt' is required." });
  }

  const realModel = MODEL_ALIAS[model];
  if (!realModel) {
    return res.status(400).json({ error: `Invalid model. Available options: ${Object.keys(MODEL_ALIAS).join(", ")}` });
  }

  try {
    const result = await queryGemini(prompt, realModel);
    res.json({
      method: "GET",
      author: "Created by ehsan fazli",
      model_used: realModel,
      result
    });
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).json({ error: "Gemini API error", details: error?.response?.data || error.message });
  }
});

app.listen(port, () => {
  console.log(`Gemini API server running at http://localhost:${port}`);
});
