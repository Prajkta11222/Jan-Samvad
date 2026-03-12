const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "samvad_secret_key";

// In-memory user store (MongoDB NOT used for login)
// Demo passwords: admin123, public123
const users = [
  { id: "admin-001", name: "Admin", email: "admin@samvad.gov", password: "admin123", role: "admin" },
  { id: "public-001", name: "Public User", email: "public@samvad.gov", password: "public123", role: "public" },
];

// Register user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    if (users.find((u) => u.email === email))
      return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      password: undefined, // registered users use hash
      passwordHash,
      role: "user",
    };
    users.push(newUser);

    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    res.status(500).json({ message: "Registration error" });
  }
};

// Login user - uses IN-MEMORY users only (MongoDB is NOT used for auth)
exports.loginUser = async (req, res) => {
  try {
    // Support both flat body and nested (credentials/user)
    const body = req.body || {};
    const email = body.email ?? body.credentials?.email ?? body.user?.email;
    const password = body.password ?? body.credentials?.password ?? body.user?.password;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        debug: process.env.NODE_ENV !== "production" ? { receivedEmail: !!email, receivedPassword: !!password } : undefined,
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === emailNorm);
    if (!user) {
      console.log("[Login] User not found:", emailNorm);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordClean = String(password).trim();
    const isMatch = user.password
      ? user.password === passwordClean
      : await bcrypt.compare(passwordClean, user.passwordHash);
    if (!isMatch) {
      console.log("[Login] Wrong password for:", emailNorm);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login error" });
  }
};

exports.testAuth = (req, res) => res.send("Auth Controller Working");

// Reference: login emails (no passwords exposed)
exports.getLoginRef = (req, res) => {
  res.json({
    hint: "Use POST /api/auth/login with JSON body: { email, password }",
    accounts: [
      { role: "admin", email: "admin@samvad.gov" },
      { role: "public", email: "public@samvad.gov" },
    ],
  });
};
