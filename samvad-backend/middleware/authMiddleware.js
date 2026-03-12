const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "samvad_secret_key";

const verifyToken = (req, res, next) => {
  let token = req.headers.authorization;
  if (!token)
    return res.status(401).json({ message: "Access denied. No token provided." });
  if (token.startsWith("Bearer ")) token = token.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, role, name, email }
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.role !== "admin")
      return res.status(403).json({ message: "Admin access required" });
    next();
  });
};

module.exports = { verifyToken, requireAdmin };
