const { v4: uuidv4 } = require("uuid");
const { translateComplaint, translateText, detectHindi } = require("../services/translationService");
const { categorizeComplaint } = require("../services/categorizationService");

// In-memory complaint store
const complaints = [];

// Create complaint (user)
exports.createComplaint = async (req, res) => {
  try {
    let { title, description, category, location, targetLanguage, sourceLanguage } = req.body;

    if (!title || !description || !location)
      return res.status(400).json({ message: "Title, description and location are required" });

    // Auto-categorize if category not provided
    if (!category || !String(category).trim()) {
      const { category: suggested } = await categorizeComplaint(description);
      category = suggested;
    }

    let complaint = {
      id: uuidv4(),
      userId: req.user.userId,
      userName: req.user.name,
      userEmail: req.user.email,
      title,
      description,
      category,
      location,
      status: "Pending",
      photo: req.files?.photo ? `/uploads/${req.files.photo[0].filename}` : null,
      voiceNote: req.files?.voiceNote ? `/uploads/${req.files.voiceNote[0].filename}` : null,
      replies: [],
      createdAt: new Date().toISOString(),
      translatedLanguage: null,
    };

    // Translate when: explicit targetLanguage OR complaint is in Hindi (auto-translate to English)
    const hasHindi = detectHindi(title + " " + description);
    const shouldTranslate =
      (targetLanguage && targetLanguage !== (sourceLanguage || "en")) || (hasHindi && !targetLanguage);
    if (shouldTranslate) {
      const target = targetLanguage || "en";
      const source = sourceLanguage || (hasHindi ? "auto" : "en");
      complaint = {
        ...complaint,
        ...(await translateComplaint(complaint, target, source)),
        id: complaint.id,
        userId: complaint.userId,
        userName: complaint.userName,
        userEmail: complaint.userEmail,
        status: complaint.status,
        photo: complaint.photo,
        voiceNote: complaint.voiceNote,
        replies: complaint.replies,
        createdAt: complaint.createdAt,
      };
    }

    complaints.push(complaint);

    const wasAutoCategory = !req.body?.category || !String(req.body.category).trim();
    res.status(201).json({
      message: "Complaint submitted successfully",
      complaint,
      categorySource: wasAutoCategory ? "auto" : "manual",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error submitting complaint" });
  }
};

// Get current user's complaints
exports.getMyComplaints = (req, res) => {
  const userComplaints = complaints
    .filter((c) => c.userId === req.user.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ complaints: userComplaints });
};

// Get all complaints (admin)
exports.getAllComplaints = (req, res) => {
  const sorted = [...complaints].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({ complaints: sorted });
};

// Update complaint status (admin)
exports.updateStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["Pending", "In Progress", "Resolved", "Rejected"];
  if (!validStatuses.includes(status))
    return res.status(400).json({ message: "Invalid status" });

  const complaint = complaints.find((c) => c.id === id);
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });

  complaint.status = status;
  complaint.updatedAt = new Date().toISOString();
  res.json({ message: "Status updated", complaint });
};

// Reply to complaint (admin)
exports.replyToComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, targetLanguage, sourceLanguage } = req.body;

    const complaint = complaints.find((c) => c.id === id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    let replyText = text || "";
    if (targetLanguage && text) {
      replyText = await translateText(text, targetLanguage, sourceLanguage || "auto");
    }

    const reply = {
      id: uuidv4(),
      adminName: req.user.name || "Admin",
      text: replyText,
      originalText: text,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString(),
    };

    complaint.replies.push(reply);
    if (complaint.status === "Pending") {
      complaint.status = "In Progress";
    }

    res.json({ message: "Reply sent", reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error sending reply" });
  }
};

exports.testComplaint = (req, res) => res.send("Complaint Controller Working");
