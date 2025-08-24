import express from "express";
import fs from "fs";
import csv from "csv-parser";
import xlsx from "xlsx";
import upload from "../middleware/upload.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Agent from "../models/agent.js";
import ListItem from "../models/listItem.js";

const router = express.Router();

router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const agents = await Agent.find();
    if (!agents.length) return res.status(400).json({ message: "No agents available" });

    let items = [];

    if (req.file.mimetype === "text/csv" || req.file.mimetype === "application/vnd.ms-excel") {
      const rows = [];
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", async () => {
          items = rows.map((row) => ({
            firstName: row.FirstName,
            phone: row.Phone,
            notes: row.Notes,
          }));
          await distributeAndSave(items, agents, req.file.originalname);
          res.json({ message: "File uploaded & distributed successfully" });
        });
    } else if (req.file.mimetype.includes("sheet")) {
      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);
      items = data.map((row) => ({
        firstName: row.FirstName || row.name,
        phone: row.Phone || row.phone,
        notes: row.Notes || row.notes,
      }));
      await distributeAndSave(items, agents, req.file.originalname);
      res.json({ message: "File uploaded & distributed successfully" });
    } else if (req.file.mimetype === "application/json") {
      const data = JSON.parse(fs.readFileSync(req.file.path));
      items = data.map((row) => ({
        firstName: row.FirstName || row.name,
        phone: row.Phone || row.phone,
        notes: row.Notes || row.notes,
      }));
      await distributeAndSave(items, agents, req.file.originalname);
      res.json({ message: "File uploaded & distributed successfully" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const lists = await ListItem.find().populate("agent", "name email").sort({ createdAt: -1 });
    res.json(lists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function distributeAndSave(items, agents, fileName) {
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
