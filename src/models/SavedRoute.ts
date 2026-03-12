import mongoose from "mongoose";

const savedRouteSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    route: [{type: String, required: true }],
    totalDistance: {type: Number, required: true } //shoud it be String?
});

export default mongoose.model("SavedRoute", savedRouteSchema);