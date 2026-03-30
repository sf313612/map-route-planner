import mongoose from "mongoose";

export type TranscriptionJobStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED";

const transcriptionJobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    idempotencyKey: { type: String, required: true },
    sourceText: { type: String, required: true },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "DONE", "FAILED"],
      required: true,
      default: "QUEUED",
    },
    resultText: { type: String },
    errorMessage: { type: String },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

transcriptionJobSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

export default mongoose.model("TranscriptionJob", transcriptionJobSchema);
