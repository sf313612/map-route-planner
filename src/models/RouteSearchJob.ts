//
import mongoose from "mongoose";

export type RouteSearchJobStatus = "CREATED" | "PROCESSING" | "DONE" | "ERROR";

const routeSearchJobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    idempotencyKey: { type: String, required: true },
    fromCityId: { type: String, required: true },
    toCityId: { type: String, required: true },
    status: {
      type: String,
      enum: ["CREATED", "PROCESSING", "DONE", "ERROR"],
      required: true,
      default: "CREATED",
    },
    progress: { type: Number, default: 0 },
    result: { type: mongoose.Schema.Types.Mixed },
    errorMessage: { type: String },
    requestPublishedAt: { type: Date },
  },
  { timestamps: true }
);

// one same route possible
routeSearchJobSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

export default mongoose.model("RouteSearchJob", routeSearchJobSchema);
