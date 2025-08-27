import express from "express";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import xlsx from "xlsx";
import upload from "../middleware/upload.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Agent from "../models/agent.js";
import ListItem from "../models/listItem.js";

const router = express.Router();
const UPLOAD_DIR = "uploads";

// 🔹 Upload + Distribute in one go
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const agents = await Agent.find();
    if (!agents.length) return res.status(400).json({ message: "No agents available" });

    let items = [];

    // ✅ CSV
    if (req.file.mimetype === "text/csv" || req.file.mimetype === "application/vnd.ms-excel") {
      const rows = await parseCSV(req.file.path);
      items = rows.map((row) => ({
        firstName: row.FirstName || row.Name,
        phone: row.Phone,
        notes: row.Notes || "",
      }));
    }
    // ✅ Excel
    else if (req.file.mimetype.includes("sheet")) {
      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);
      items = data.map((row) => ({
        firstName: row.FirstName || row.name,
        phone: row.Phone || row.phone,
        notes: row.Notes || row.notes || "",
      }));
    }
    // ✅ JSON
    else if (req.file.mimetype === "application/json") {
      const data = JSON.parse(fs.readFileSync(req.file.path));
      items = data.map((row) => ({
        firstName: row.FirstName || row.name,
        phone: row.Phone || row.phone,
        notes: row.Notes || row.notes || "",
      }));
    } else {
      return res.status(400).json({ message: "Unsupported file type" });
    }

    // ✅ Distribute & save
    await distributeAndSave(items, agents);

    res.status(201).json({
      message: "File uploaded & distributed successfully",
      file: {
        originalName: req.file.originalname,
        storedName: req.file.filename,
        size: req.file.size,
        path: req.file.path,
        uploadedAt: new Date(),
      },
      distributedCount: items.length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Get all distributed tasks
router.get("/tasks", authMiddleware, async (req, res) => {
  try {
    const tasks = await ListItem.find()
      .populate("agent", "name email")
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Delete a task (optional if you need cleanup)
router.delete("/tasks/:id", authMiddleware, async (req, res) => {
  try {
    await ListItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Helpers ---
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

async function distributeAndSave(items, agents) {
  let agentIndex = 0;
  const savedItems = [];

  for (let i = 0; i < items.length; i++) {
    const assignedAgent = agents[agentIndex];
    const newItem = new ListItem({
      ...items[i],
      agent: assignedAgent._id,
    });
    savedItems.push(newItem.save());
    agentIndex = (agentIndex + 1) % agents.length;
  }

  await Promise.all(savedItems);
}

export default router;
