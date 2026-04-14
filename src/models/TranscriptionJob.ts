import mongoose from "mongoose";

// possible job statuses
export type TranscriptionJobStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED";

const transcriptionJobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // not to create one job twice
    idempotencyKey: { type: String, required: true },
    sourceText: { type: String, required: true },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "DONE", "FAILED"],
      required: true,
      default: "QUEUED",
    },
    s3Key: { type: String, default: null },
    contentType: { type: String, default: null },
    size: { type: Number, default: null },
    resultStatus: {
      type: String,
      enum: ["NOT_READY", "READY", "FAILED"],
      default: "NOT_READY",
    },
    
    errorMessage: { type: String },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

transcriptionJobSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

export default mongoose.model("TranscriptionJob", transcriptionJobSchema);
