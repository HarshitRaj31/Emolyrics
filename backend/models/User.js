const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SavedSongSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, default: "Unknown Artist" },
  album: { type: String, default: "" },
  mood: { type: String, required: true },
  confidence: { type: Number, default: 0 },
  coverArtUrl: { type: String, default: "" },
  spotifyUrl: { type: String, default: "" },
  youtubeUrl: { type: String, default: "" },
  lyrics: { type: String, default: "" },
  savedAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ["user", "admin", "researcher"],
      default: "user"
    },
    avatar: {
      type: String,
      default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
    },
    savedAnalyses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Analysis"
      }
    ],
    savedSongs: [SavedSongSchema]
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", UserSchema);
