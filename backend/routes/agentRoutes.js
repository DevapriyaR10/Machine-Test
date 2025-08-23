import express from "express";
import bcrypt from "bcryptjs";
import Agent from "../models/agent.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Add new agent (Admin only)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // check if agent exists
    const existingAgent = await Agent.findOne({ email });
    if (existingAgent) return res.status(400).json({ message: "Agent already exists" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = new Agent({ name, email, mobile, password: hashedPassword });
    await agent.save();

    res.status(201).json({ message: "Agent created successfully", agent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all agents
router.get("/", authMiddleware, async (req, res) => {
  try {
    const agents = await Agent.find();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
