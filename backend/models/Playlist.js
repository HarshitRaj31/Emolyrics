const mongoose = require("mongoose");

const SongItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: { type: String, default: "" },
  duration: { type: String, default: "3:30" },
  coverArtUrl: { type: String, default: "" },
  spotifyUrl: { type: String, default: "" },
  youtubeUrl: { type: String, default: "" },
  mood: { type: String, default: "" },
  confidence: { type: Number, default: null },
  source: {
    type: String,
    enum: ["analyzed", "history", "recommended", "manual"],
    default: "recommended"
  },
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Analysis",
    default: null
  }
});

const PlaylistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    mood: {
      type: String,
      required: true,
      default: "Happy"
    },
    emotions: [
      {
        type: String,
        enum: [
          "Happy",
          "Sad",
          "Angry",
          "Romantic",
          "Calm/Chill",
          "Exciting",
          "Patriotic",
          "Thrilling",
          "Horror"
        ]
      }
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    isSystemPreset: {
      type: Boolean,
      default: false
    },
    artwork: {
      type: String,
      default: ""
    },
    songs: [SongItemSchema]
  },
  { timestamps: true }
);

// Indexes for fast lookup
PlaylistSchema.index({ user: 1, createdAt: -1 });
PlaylistSchema.index({ isSystemPreset: 1, mood: 1 });
PlaylistSchema.index({ mood: 1, createdAt: -1 });

module.exports = mongoose.model("Playlist", PlaylistSchema);
