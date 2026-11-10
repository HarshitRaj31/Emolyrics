const mongoose = require("mongoose");

let isConnected = false;

// Seed initial memory store for zero-friction local execution without MongoDB
const memoryStore = {
  users: [],
  chatMessages: [],
  analyses: [
    {
      _id: "demo-analysis-1",
      title: "Walking on Sunshine",
      artist: "Katrina and the Waves",
      lyrics: "Walking on sunshine, feeling so alive\nEvery moment sparkles, happiness will thrive\nSmiles all around me, laughter fills the air\nLife is so amazing, not a single care",
      mood: "Happy",
      confidence: 94.5,
      explanation: "Identified vibrant joy markers (sunshine, happiness, smiles, laughter) radiating euphoric energy.",
      language: "English",
      isPublic: true,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      _id: "demo-analysis-2",
      title: "Rainy Window",
      artist: "Blue Melodies",
      lyrics: "Tears fall like rain on my window pane\nLoneliness whispers, echoing my pain\nMemories of you haunt me every night\nIn this empty room, nothing feels right",
      mood: "Sad",
      confidence: 91.2,
      explanation: "Profound sorrow and melancholic imagery through tears, pain, and isolation markers.",
      language: "English",
      isPublic: true,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      _id: "demo-analysis-3",
      title: "Vatan Ki Khushboo",
      artist: "Desh Premi",
      lyrics: "Tiranga lehraye aasmaan me shaan se\nDesh hamara sabse pyara jaan se\nVeer jawan karenge watan ki hifazat\nHindustan ki mitti me basi hai virasat",
      mood: "Patriotic",
      confidence: 96.0,
      explanation: "High patriotic resonance with national symbols (tiranga, watan, desh, veer jawan).",
      language: "Hindi (Hinglish)",
      isPublic: true,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ],
  playlists: [
    {
      _id: "pl-happy",
      mood: "Happy",
      title: "Pure Euphoria & Sunshine",
      description: "High-energy feel-good anthems to elevate your spirit.",
      songs: [
        { title: "Walking on Sunshine", artist: "Katrina and the Waves", duration: "3:58" },
        { title: "Happy", artist: "Pharrell Williams", duration: "3:53" },
        { title: "Good as Hell", artist: "Lizzo", duration: "2:39" },
        { title: "Badtameez Dil", artist: "Benny Dayal", duration: "4:12" }
      ]
    },
    {
      _id: "pl-sad",
      mood: "Sad",
      title: "Midnight Melancholy & Tears",
      description: "Gentle emotional tracks for quiet contemplation.",
      songs: [
        { title: "Someone Like You", artist: "Adele", duration: "4:45" },
        { title: "Fix You", artist: "Coldplay", duration: "4:55" },
        { title: "Channa Mereya", artist: "Arijit Singh", duration: "4:49" },
        { title: "Skinny Love", artist: "Bon Iver", duration: "3:59" }
      ]
    },
    {
      _id: "pl-angry",
      mood: "Angry",
      title: "Pure Adrenaline & Cathartic Rage",
      description: "High-voltage riffs and intense vocals to channel raw energy.",
      songs: [
        { title: "Break Stuff", artist: "Limp Bizkit", duration: "2:46" },
        { title: "Killing In The Name", artist: "Rage Against The Machine", duration: "5:14" },
        { title: "Apna Time Aayega", artist: "Ranveer Singh", duration: "2:10" }
      ]
    },
    {
      _id: "pl-romantic",
      mood: "Romantic",
      title: "Sweet Devotion & Starlight",
      description: "Warm soulful melodies celebrating affection and closeness.",
      songs: [
        { title: "Perfect", artist: "Ed Sheeran", duration: "4:23" },
        { title: "Tum Hi Ho", artist: "Arijit Singh", duration: "4:22" },
        { title: "All of Me", artist: "John Legend", duration: "4:30" },
        { title: "Kesariya", artist: "Arijit Singh", duration: "4:28" }
      ]
    },
    {
      _id: "pl-chill",
      mood: "Calm/Chill",
      title: "Tranquil Horizons & Ocean Breeze",
      description: "Atmospheric textures and acoustic vibrations for relaxation.",
      songs: [
        { title: "Weightless", artist: "Marconi Union", duration: "8:05" },
        { title: "Sunset Lover", artist: "Petit Biscuit", duration: "3:57" },
        { title: "Kabira (Acoustic)", artist: "Rekha Bhardwaj", duration: "4:11" }
      ]
    },
    {
      _id: "pl-exciting",
      mood: "Exciting",
      title: "Electric Pulse & Festival Hype",
      description: "Fast-tempo festival bangers to get your heart pumping.",
      songs: [
        { title: "Don't You Worry Child", artist: "Swedish House Mafia", duration: "3:32" },
        { title: "Wake Me Up", artist: "Avicii", duration: "4:07" },
        { title: "Kar Gayi Chull", artist: "Badshah, Neha Kakkar", duration: "3:07" }
      ]
    },
    {
      _id: "pl-patriotic",
      mood: "Patriotic",
      title: "Tribute to the Homeland",
      description: "Inspiring anthems honoring the land, courage, and solidarity.",
      songs: [
        { title: "Maa Tujhe Salaam", artist: "A.R. Rahman", duration: "6:14" },
        { title: "Teri Mitti", artist: "B Praak", duration: "5:14" },
        { title: "Sandese Aate Hai", artist: "Roop Kumar Rathod", duration: "10:33" }
      ]
    },
    {
      _id: "pl-thrilling",
      mood: "Thrilling",
      title: "Edge of the Seat Suspense",
      description: "Cinematic, driving soundscapes full of suspense and mystery.",
      songs: [
        { title: "Supermassive Black Hole", artist: "Muse", duration: "3:29" },
        { title: "Believer", artist: "Imagine Dragons", duration: "3:24" },
        { title: "Chase Theme", artist: "Hans Zimmer", duration: "5:40" }
      ]
    },
    {
      _id: "pl-horror",
      mood: "Horror",
      title: "Shadows in the Dark",
      description: "Eerie synths, haunting vocal chops, and chilling acoustics.",
      songs: [
        { title: "Tubular Bells", artist: "Mike Oldfield", duration: "4:50" },
        { title: "Thriller", artist: "Michael Jackson", duration: "5:57" },
        { title: "Stranger Things Theme", artist: "Survive", duration: "1:07" }
      ]
    }
  ]
};

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/emolyrics";
  try {
    mongoose.set("strictQuery", false);
    // Attempt with 2-second timeout so app never hangs
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    isConnected = true;
    console.log(" Connected successfully to MongoDB at", uri);
  } catch (error) {
    isConnected = false;
    console.warn(" MongoDB connection failed or not running locally.");
    console.warn(" Seamlessly falling back to high-performance in-memory/JSON store for zero-friction local execution.");
  }
}

function getIsConnected() {
  return isConnected;
}

module.exports = {
  connectDB,
  getIsConnected,
  memoryStore
};
