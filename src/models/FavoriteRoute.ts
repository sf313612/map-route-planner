import mongoose from "mongoose";

const favoriteRouteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    routeName: String,
    startPoint: String,
    endPoint: String
});

export default mongoose.model("FavoriteRoute", favoriteRouteSchema);