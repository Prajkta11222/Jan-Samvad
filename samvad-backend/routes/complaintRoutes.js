const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const complaintController = require("../controllers/complaintController");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");
const { translateText, translateForPreview, SUPPORTED_LANGUAGES } = require("../services/translationService");
const { categorizeComplaint, CATEGORIES } = require("../services/categorizationService");

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const LANGUAGE_NAMES = {
  en: "English", hi: "Hindi", es: "Spanish", fr: "French", de: "German",
  ar: "Arabic", bn: "Bengali", gu: "Gujarati", kn: "Kannada", ml: "Malayalam",
  mr: "Marathi", pa: "Punjabi", ta: "Tamil", te: "Telugu", ur: "Urdu",
  zh: "Chinese", ja: "Japanese", ko: "Korean", pt: "Portuguese", ru: "Russian",
  it: "Italian", nl: "Dutch", pl: "Polish", tr: "Turkish", vi: "Vietnamese", th: "Thai",
};

// Test route
router.get("/test", complaintController.testComplaint);

// Supported languages
router.get("/languages", (req, res) => {
  res.json({
    languages: SUPPORTED_LANGUAGES.map((code) => ({
      code,
      name: LANGUAGE_NAMES[code] || code,
    })),
  });
});

// Get valid complaint categories (for dropdown; use POST /categorize to get suggested from description)
router.get("/categories", (req, res) => {
  res.json({
    categories: CATEGORIES,
    defaultLabel: "Select category",
    hint: "Category updates automatically from description, or choose manually",
  });
});

// Auto-categorize from description (AI or keyword fallback)
// Call when description changes to update suggested category for "Select category" dropdown
router.post("/categorize", async (req, res) => {
  try {
    const { description = "", title = "" } = req.body;
    const text = String(description || title || "").trim();
    const result = text
      ? await categorizeComplaint(text)
      : { category: "Other", source: "default" };
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Categorization failed" });
  }
});

// Translate text snippet
router.post("/translate", async (req, res) => {
  try {
    const { text, targetLanguage = "en", sourceLanguage = "auto" } = req.body;
    if (!text) return res.status(400).json({ message: "Text to translate is required" });
    const translated = await translateText(text, targetLanguage, sourceLanguage);
    res.json({ original: text, translated, targetLanguage, sourceLanguage });
  } catch (error) {
    res.status(500).json({ message: error.message || "Translation failed" });
  }
});

// Batch preview: translate complaint fields (for Hindi→English preview)
router.post("/translate-preview", async (req, res) => {
  try {
    const { title = "", description = "", category = "", location = "", targetLanguage = "en", sourceLanguage = "auto" } = req.body;
    const fields = { title, description, category, location };
    const hasContent = Object.values(fields).some((v) => v && String(v).trim());
    if (!hasContent) return res.status(400).json({ message: "At least one field (title, description, category, location) is required" });
    const translated = await translateForPreview(fields, targetLanguage, sourceLanguage);
    res.json({ original: fields, translated, targetLanguage, sourceLanguage });
  } catch (error) {
    res.status(500).json({ message: error.message || "Translation failed" });
  }
});

// Create complaint (user, multipart form)
router.post(
  "/create",
  verifyToken,
  upload.fields([{ name: "photo", maxCount: 1 }, { name: "voiceNote", maxCount: 1 }]),
  complaintController.createComplaint
);

// Get my complaints (user)
router.get("/my", verifyToken, complaintController.getMyComplaints);

// Get all complaints (admin)
router.get("/all", requireAdmin, complaintController.getAllComplaints);

// Update complaint status (admin)
router.patch("/:id/status", requireAdmin, complaintController.updateStatus);

// Reply to complaint (admin)
router.post(
  "/:id/reply",
  requireAdmin,
  upload.single("photo"),
  complaintController.replyToComplaint
);

module.exports = router;