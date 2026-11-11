const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getIsConnected, memoryStore } = require("../db");
const User = require("../models/User");
const { authenticateJWT, optionalJWT, getJwtSecret } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Generate signed JWT
function createToken(userId, role) {
  return jwt.sign({ id: userId, role }, getJwtSecret(), { expiresIn: "7d" });
}

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (
      !name ||
      typeof name !== "string" ||
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid string values for name, email, and password are all required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (getIsConnected()) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "An account with this email address already exists."
        });
      }

      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password
      });

      const token = createToken(user._id, user.role);

      return res.status(201).json({
        success: true,
        message: "Registration successful! Welcome to EmoLyrics.",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      });
    } else {
      // Memory Store Fallback
      const existing = memoryStore.users.find(u => u.email === normalizedEmail);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "An account with this email address already exists."
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        _id: "user-" + Date.now(),
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "user",
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        createdAt: new Date().toISOString()
      };
      memoryStore.users.push(newUser);

      const token = createToken(newUser._id, newUser.role);

      return res.status(201).json({
        success: true,
        message: "Registration successful! Welcome to EmoLyrics.",
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid email and password strings are required."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (getIsConnected()) {
      const user = await User.findOne({ email: normalizedEmail }).select("+password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password credentials."
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password credentials."
        });
      }

      const token = createToken(user._id, user.role);

      return res.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      });
    } else {
      // Memory Store Fallback
      const user = memoryStore.users.find(u => u.email === normalizedEmail);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password credentials."
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password credentials."
        });
      }

      const token = createToken(user._id, user.role);

      return res.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get("/me", optionalJWT, async (req, res) => {
  if (!req.user) {
    return res.json({
      success: true,
      user: null
    });
  }
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar
    }
  });
});

module.exports = router;
