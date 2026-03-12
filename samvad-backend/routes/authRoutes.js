const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// test route
router.get("/test", authController.testAuth);

// login reference (emails only, no passwords)
router.get("/credentials", authController.getLoginRef);

// register route
router.post("/register", authController.registerUser);

// login route
router.post("/login", authController.loginUser);

module.exports = router;