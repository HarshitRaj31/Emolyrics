const mongoose = require("mongoose");

const AnalysisSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Untitled Track",
      trim: true,
      maxlength: 120
    },
    artist: {
      type: String,
      default: "Unknown Artist",
      trim: true,
      maxlength: 100
    },
    lyrics: {
      type: String,
      required: [true, "Lyrics are required for analysis"],
      trim: true
    },
    mood: {
      type: String,
      required: true,
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
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    explanation: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: "English"
    },
    scores: {
      type: Map,
      of: Number,
      default: {}
    },
    detectedKeywords: [String],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

AnalysisSchema.index({ mood: 1, createdAt: -1 });
AnalysisSchema.index({ user: 1, createdAt: -1 });
AnalysisSchema.index({ user: 1, mood: 1 });
AnalysisSchema.index({ title: 1, artist: 1 });

module.exports = mongoose.model("Analysis", AnalysisSchema);
