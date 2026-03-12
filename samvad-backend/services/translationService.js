const axios = require("axios");

const LIBRETRANSLATE_API = "https://libretranslate.com/translate";
const MYMEMORY_API = "https://api.mymemory.translated.net/get";

// Supported language codes (ISO 639-1)
const SUPPORTED_LANGUAGES = [
  "en", "hi", "es", "fr", "de", "ar", "bn", "gu", "kn", "ml", "mr", "pa", "ta", "te", "ur",
  "zh", "ja", "ko", "pt", "ru", "it", "nl", "pl", "tr", "vi", "th"
];

// Detect if text contains Devanagari (Hindi) script
function detectHindi(text) {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Translate text using LibreTranslate (if API key set) or MyMemory (free fallback)
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code (e.g., "hi", "en")
 * @param {string} sourceLanguage - Source language code (default: "en", use "auto" for auto-detect)
 * @returns {Promise<string>} Translated text
 */
const translateText = async (text, targetLanguage = "en", sourceLanguage = "en") => {
  if (!text || typeof text !== "string") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  const target = targetLanguage.toLowerCase().slice(0, 2);
  let source = sourceLanguage?.toLowerCase().slice(0, 2) || "en";
  if (sourceLanguage?.toLowerCase() === "auto") {
    source = detectHindi(trimmed) ? "hi" : "en";
  }
  if (source === target) return trimmed;

  try {
    if (process.env.LIBRETRANSLATE_API_KEY) {
      return await translateWithLibreTranslate(trimmed, source, target);
    }
    return await translateWithMyMemory(trimmed, source, target);
  } catch (error) {
    console.error("Translation error:", error?.response?.data || error.message);
    throw new Error("Translation failed");
  }
};

async function translateWithLibreTranslate(text, source, target) {
  const response = await axios.post(
    LIBRETRANSLATE_API,
    {
      q: text,
      source,
      target,
      format: "text",
      api_key: process.env.LIBRETRANSLATE_API_KEY,
    },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 }
  );
  return response.data?.translatedText ?? text;
}

async function translateWithMyMemory(text, source, target) {
  const langpair = `${source}|${target}`;
  const MAX_CHARS = 450; // MyMemory limit ~500 bytes; stay safe for UTF-8
  const chunks = [];
  for (let i = 0; i < text.length; i += MAX_CHARS) {
    chunks.push(text.slice(i, i + MAX_CHARS));
  }
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await axios.get(MYMEMORY_API, {
        params: { q: chunk, langpair },
        timeout: 10000,
      });
      return response.data?.responseData?.translatedText || chunk;
    })
  );
  return results.join("");
}

/**
 * Translate multiple complaint fields (supports both en→hi and hi→en)
 */
const translateComplaint = async (complaint, targetLanguage, sourceLanguage = "en") => {
  const target = targetLanguage?.toLowerCase().slice(0, 2);
  if (!target) return complaint;

  const [title, description, category, location] = await Promise.all([
    complaint.title ? translateText(complaint.title, target, sourceLanguage) : "",
    complaint.description ? translateText(complaint.description, target, sourceLanguage) : "",
    complaint.category ? translateText(complaint.category, target, sourceLanguage) : "",
    complaint.location ? translateText(complaint.location, target, sourceLanguage) : "",
  ]);

  return {
    ...complaint,
    title: title || complaint.title,
    description: description || complaint.description,
    category: category || complaint.category,
    location: location || complaint.location,
    translatedLanguage: target,
  };
};

/**
 * Translate complaint fields for preview (e.g. Hindi → English)
 */
const translateForPreview = async (fields, targetLanguage = "en", sourceLanguage = "auto") => {
  const target = targetLanguage?.toLowerCase().slice(0, 2);
  if (!target) return fields;

  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value && typeof value === "string") {
      result[key] = await translateText(value, target, sourceLanguage);
    } else {
      result[key] = value;
    }
  }
  return result;
};

module.exports = {
  translateText,
  translateComplaint,
  translateForPreview,
  detectHindi,
  SUPPORTED_LANGUAGES,
};
