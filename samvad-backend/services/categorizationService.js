const axios = require("axios");

// Complaint categories for civic/government issues
const CATEGORIES = [
  "Infrastructure",
  "Utilities",
  "Sanitation",
  "Roads",
  "Security",
  "Public Health",
  "Environment",
  "Education",
  "Transport",
  "Other",
];

// Simple keyword fallback when no AI API key is set (English + common Hindi)
const KEYWORD_MAP = {
  Infrastructure: ["building", "bridge", "structure", "construction", "collapsed", "damaged", "इमारत", "मकान"],
  Utilities: ["water", "electricity", "power", "supply", "connection", "meter", "bill", "पानी", "बिजली"],
  Sanitation: ["garbage", "waste", "drainage", "sewer", "clean", "trash", "dirty", "dump", "कूड़ा", "गंदगी", "नाली"],
  Roads: ["road", "pothole", "street", "path", "traffic", "footpath", "highway", "सड़क", "गड्ढा"],
  Security: ["theft", "crime", "police", "safety", "robbery", "violence", "चोरी", "पुलिस"],
  "Public Health": ["hospital", "health", "doctor", "medicine", "disease", "mosquito", "vaccine", "अस्पताल", "डॉक्टर"],
  Environment: ["pollution", "air", "noise", "tree", "park", "green", "प्रदूषण", "हवा"],
  Education: ["school", "teacher", "student", "college", "exam", "education", "स्कूल", "शिक्षा"],
  Transport: ["bus", "metro", "train", "vehicle", "transport", "rickshaw", "बस", "मेट्रो", "ट्रेन"],
};

function keywordMatch(text) {
  const lower = text.toLowerCase().trim();
  const scores = {};
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    scores[cat] = keywords.filter((k) => lower.includes(k)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best?.[1] > 0 ? best[0] : "Other";
}

async function categorizeWithOpenAI(description) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Classify this civic complaint into exactly ONE category. Reply with only the category name, nothing else.
Categories: ${CATEGORIES.join(", ")}

Complaint: "${description}"`;

  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 20,
        temperature: 0,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000,
      }
    );
    const reply = (res.data?.choices?.[0]?.message?.content || "").trim();
    const matched = CATEGORIES.find((c) => reply.toLowerCase().includes(c.toLowerCase()));
    return matched || null;
  } catch (err) {
    console.error("[Categorization] OpenAI error:", err?.response?.data || err.message);
    return null;
  }
}

async function categorizeWithGemini(description) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Classify this civic complaint into exactly ONE category. Reply with only the category name.
Categories: ${CATEGORIES.join(", ")}

Complaint: "${description}"`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 20, temperature: 0 },
      },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const matched = CATEGORIES.find((c) => text.toLowerCase().includes(c.toLowerCase()));
    return matched || null;
  } catch (err) {
    console.error("[Categorization] Gemini error:", err?.response?.data || err.message);
    return null;
  }
}

/**
 * Auto-categorize a complaint from its description using AI or keyword fallback
 * @param {string} description - Complaint description
 * @returns {Promise<{ category: string, source: string }>}
 */
async function categorizeComplaint(description) {
  if (!description || typeof description !== "string") {
    return { category: "Other", source: "fallback" };
  }
  const text = description.trim();
  if (!text) return { category: "Other", source: "fallback" };

  // Try OpenAI first, then Gemini, then keyword
  let category = await categorizeWithOpenAI(text);
  if (category) return { category, source: "openai" };

  category = await categorizeWithGemini(text);
  if (category) return { category, source: "gemini" };

  category = keywordMatch(text);
  return { category, source: "keyword" };
}

module.exports = {
  categorizeComplaint,
  CATEGORIES,
  KEYWORD_MAP,
};
