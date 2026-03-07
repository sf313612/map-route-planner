import mongoose from "mongoose";

const savedRouteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    route: [String],
    totalDistance: Number
});

export default mongoose.model("SavedRoute", savedRouteSchema);