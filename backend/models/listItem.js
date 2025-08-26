import mongoose from "mongoose";

const listItemSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    phone: { type: String, required: true },
    notes: { type: String },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },

    // ✅ Added fields
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ListItem", listItemSchema);
