import mongoose from "mongoose";

const favoriteRouteSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    routeName: { type: String, required: true },
    startPoint: { type: String, required: true },
    endPoint: { type: String, required: true }
});

export default mongoose.model("FavoriteRoute", favoriteRouteSchema);