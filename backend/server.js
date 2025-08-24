import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import agentRoutes from "./routes/agentRoutes.js";
import listRoutes from "./routes/listRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/upload", uploadRoutes);


mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("Database connected."))
.catch((err)=>console.log("DB error:", err));

app.get("/", (req, res)=>{
    res.send("API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));


