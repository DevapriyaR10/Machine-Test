import express from "express";
import fs from "fs";
import csv from "csv-parser";
import xlsx from "xlsx";
import upload from "../middleware/upload.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Agent from "../models/agent.js";
import ListItem from "../models/listItem.js";

const router = express.Router();

// Upload & Distribute
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const agents = await Agent.find();
    if (agents.length < 1) return res.status(400).json({ message: "No agents available" });

    let items = [];

    // If CSV
    if (req.file.mimetype === "text/csv" || req.file.mimetype === "application/vnd.ms-excel") {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          items.push({
            firstName: row.FirstName,
            phone: row.Phone,
            notes: row.Notes,
          });
        })
        .on("end", async () => {
          await distributeAndSave(items, agents);
          res.json({ message: "List uploaded & distributed successfully" });
        });
    } else {
      // If Excel
      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      items = data.map((row) => ({
        firstName: row.FirstName,
        phone: row.Phone,
        notes: row.Notes,
      }));

      await distributeAndSave(items, agents);
      res.json({ message: "List uploaded & distributed successfully" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get lists for all agents
router.get("/", authMiddleware, async (req, res) => {
  try {
    const lists = await ListItem.find().populate("agent", "name email");
    res.json(lists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Function: distribute equally among agents
async function distributeAndSave(items, agents) {
  let agentIndex = 0;
  const savedItems = [];

  for (let i = 0; i < items.length; i++) {
    const assignedAgent = agents[agentIndex];
    const newItem = new ListItem({ ...items[i], agent: assignedAgent._id });
    savedItems.push(newItem.save());

    // move to next agent
    agentIndex = (agentIndex + 1) % agents.length;
  }

  await Promise.all(savedItems);
}

export default router;
