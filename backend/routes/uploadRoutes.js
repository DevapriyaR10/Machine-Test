import express from "express";
import fs from "fs";
import path from "path";
import upload from "../middleware/upload.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const UPLOAD_DIR = "uploads";

router.post("/upload", authMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  res.status(201).json({
    message: "File uploaded successfully",
    file: {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date(),
    },
  });
});

router.get("/", authMiddleware, (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ message: err.message });

    const uploads = files
      .map((file) => {
        const stats = fs.statSync(path.join(UPLOAD_DIR, file));
        return {
          name: file,
          size: stats.size,
          uploadedAt: stats.birthtime,
        };
      })
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    res.json(uploads);
  });
});

export default router;
