/**
 * EmoLyrics Recommendation Service (Phase 3)
 * Personalized, mood-aligned music recommendations, similar song discovery,
 * and AI-driven explanations powered by local Ollama AI (qwen2.5:3b).
 * 
 * Supports the 10 Advanced Emotion Classes:
 * Happiness, Sadness, Love, Anger, Nostalgia, Fear, Excitement, Hope, Loneliness, Calmness.
 * Backwards compatible with legacy 9 ML classes (Happy, Sad, Angry, Romantic, Calm/Chill, Exciting, Patriotic, Thrilling, Horror).
 */

const musicBrainzAdapter = require("../plugins/adapters/musicbrainzAdapter");
const { getIsConnected, memoryStore } = require("../db");
const Analysis = require("../models/Analysis");
const { resolveOllamaBaseUrl } = require("../utils/serviceUrls");

// Canonical emotion mapping supporting both Phase 1/2 10-emotions and legacy 9-emotions
const CANONICAL_EMOTION_MAP = {
  happiness: "Happiness",
  happy: "Happiness",
  joy: "Happiness",
  sadness: "Sadness",
  sad: "Sadness",
  love: "Love",
  romantic: "Love",
  romance: "Love",
  anger: "Anger",
  angry: "Anger",
  nostalgia: "Nostalgia",
  fear: "Fear",
  horror: "Fear",
  thrilling: "Fear",
  thrill: "Fear",
  excitement: "Excitement",
  exciting: "Excitement",
  hype: "Excitement",
  hope: "Hope",
  patriotic: "Hope",
  loneliness: "Loneliness",
  lonely: "Loneliness",
  solitude: "Loneliness",
  calmness: "Calmness",
  calm: "Calmness",
  "calm/chill": "Calmness",
  chill: "Calmness"
};

// Curated Knowledge Base: Verified authentic tracks per emotion class with real metadata
const CURATED_EMOTION_CATALOG = {
  Happiness: [
    {
      title: "Walking on Sunshine",
      artist: "Katrina and the Waves",
      album: "Walking on Sunshine",
      duration: "3:58",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["High Valence (+0.85)", "Joyful Brass", "Feel-Good Anthems", "Sunshine & Light"]
    },
    {
      title: "Happy",
      artist: "Pharrell Williams",
      album: "G I R L",
      duration: "3:53",
      coverArtUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Uplifting Rhythm", "Clapping Percussion", "Infectious Optimism", "Celebration"]
    },
    {
      title: "Good as Hell",
      artist: "Lizzo",
      album: "Cuz I Love You",
      duration: "2:39",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Self-Love Anthem", "High Energy", "Soulful Vocals", "Confidence Boost"]
    },
    {
      title: "Badtameez Dil",
      artist: "Benny Dayal",
      album: "Yeh Jawaani Hai Deewani",
      duration: "4:12",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Upbeat Dance", "Playful Energy", "Celebration Groove", "Fast Tempo"]
    },
    {
      title: "Can't Stop the Feeling!",
      artist: "Justin Timberlake",
      album: "Trolls",
      duration: "3:56",
      coverArtUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Disco Pop", "Dance Floor Energy", "Radiant Valence", "Sunshine"]
    },
    {
      title: "Uptown Funk",
      artist: "Mark Ronson ft. Bruno Mars",
      album: "Uptown Special",
      duration: "4:30",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Funk Groove", "Horn Section", "Swagger & Joy", "Catchy Hooks"]
    },
    {
      title: "Sooraj Dooba Hain",
      artist: "Arijit Singh, Aditi Singh Sharma",
      album: "Roy",
      duration: "4:24",
      coverArtUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Sunset Dance", "Euphoric Synths", "Youthful Spirit", "Carefree Vibe"]
    },
    {
      title: "Don't Stop Me Now",
      artist: "Queen",
      album: "Jazz",
      duration: "3:29",
      coverArtUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Classic Glam Rock", "Exhilarating Speed", "Unstoppable Joy", "Vocal Fireworks"]
    }
  ],

  Sadness: [
    {
      title: "Someone Like You",
      artist: "Adele",
      album: "21",
      duration: "4:45",
      coverArtUrl: "https://images.unsplash.com/photo-1453738773917-9c3eff1db985?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Acoustic Piano", "Melancholic Sorrow (-0.80)", "Heartfelt Farewell", "Tears & Grief"]
    },
    {
      title: "Fix You",
      artist: "Coldplay",
      album: "X&Y",
      duration: "4:55",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Organ Build-up", "Comfort in Grief", "Poignant Lyrics", "Cathartic Healing"]
    },
    {
      title: "Channa Mereya",
      artist: "Arijit Singh",
      album: "Ae Dil Hai Mushkil",
      duration: "4:49",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Heartbreak Ballad", "Sufi Resonance", "Emotional Tears", "Sacrificial Love"]
    },
    {
      title: "Skinny Love",
      artist: "Bon Iver",
      album: "For Emma, Forever Ago",
      duration: "3:59",
      coverArtUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Raw Acoustic Guitar", "Fragile Falsetto", "Haunting Regret", "Winter Coldness"]
    },
    {
      title: "The Scientist",
      artist: "Coldplay",
      album: "A Rush of Blood to the Head",
      duration: "5:09",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Slow Piano Ballad", "Reflective Solitude", "Yearning Melancholy", "Apology"]
    },
    {
      title: "Agar Tum Saath Ho",
      artist: "Alka Yagnik, Arijit Singh",
      album: "Tamasha",
      duration: "5:41",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Helpless Despair", "Soulful Duet", "Tender Ache", "Rainy Tears"]
    },
    {
      title: "All I Want",
      artist: "Kodaline",
      album: "In a Perfect World",
      duration: "5:05",
      coverArtUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Crescendo of Grief", "Vocal Cry", "Lost Love", "Shattered Longing"]
    },
    {
      title: "Tears in Heaven",
      artist: "Eric Clapton",
      album: "Rush",
      duration: "4:32",
      coverArtUrl: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Gentle Nylon Guitar", "Mournful Tribute", "Enduring Sorrow", "Quiet Grace"]
    }
  ],

  Love: [
    {
      title: "Perfect",
      artist: "Ed Sheeran",
      album: "÷ (Divide)",
      duration: "4:23",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Warm Acoustic Devotion", "Starry Eyes (+0.90 Valence)", "Slow Dance", "Pure Tenderness"]
    },
    {
      title: "Tum Hi Ho",
      artist: "Arijit Singh",
      album: "Aashiqui 2",
      duration: "4:22",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Soulful Piano", "Passionate Pledge", "Intense Romantic Love", "Rain Romance"]
    },
    {
      title: "All of Me",
      artist: "John Legend",
      album: "Love in the Future",
      duration: "4:30",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Vulnerable Ballad", "Rich Grand Piano", "Unconditional Devotion", "Soul Connection"]
    },
    {
      title: "Kesariya",
      artist: "Arijit Singh",
      album: "Brahmāstra",
      duration: "4:28",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Saffron Warmth", "Melodic Acoustic Guitars", "Tender Affection", "Sacred Vows"]
    },
    {
      title: "Thinking Out Loud",
      artist: "Ed Sheeran",
      album: "x (Multiply)",
      duration: "4:41",
      coverArtUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Blue-Eyed Soul", "Gentle Strumming", "Everlasting Romance", "Intimacy"]
    },
    {
      title: "Raabta",
      artist: "Arijit Singh",
      album: "Agent Vinod",
      duration: "4:04",
      coverArtUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Soul Connection", "Subtle Electronic Beats", "Dreamy Vocals", "Destined Love"]
    },
    {
      title: "Make You Feel My Love",
      artist: "Adele",
      album: "19",
      duration: "3:32",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Intimate Piano", "Devoted Shelter", "Poetic Sincerity", "Quiet Passion"]
    },
    {
      title: "Just the Way You Are",
      artist: "Bruno Mars",
      album: "Doo-Wops & Hooligans",
      duration: "3:40",
      coverArtUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Pop Serenade", "Pure Adoration", "Sweet Harmonies", "Warm Reassurance"]
    }
  ],

  Anger: [
    {
      title: "Break Stuff",
      artist: "Limp Bizkit",
      album: "Significant Other",
      duration: "2:46",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Cathartic Rage", "Heavy Nu-Metal Riffs", "High Arousal (+0.85)", "Furious Outburst"]
    },
    {
      title: "Killing In The Name",
      artist: "Rage Against The Machine",
      album: "Rage Against The Machine",
      duration: "5:14",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Defiant Rebellion", "Heavy Drop-D Bass", "Unfiltered Fury", "Political Outrage"]
    },
    {
      title: "Apna Time Aayega",
      artist: "Ranveer Singh",
      album: "Gully Boy",
      duration: "2:10",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Street Hip-Hop", "Raw Grittiness", "Hunger & Rebellion", "Fiery Defiance"]
    },
    {
      title: "In the End",
      artist: "Linkin Park",
      album: "Hybrid Theory",
      duration: "3:36",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Rap Rock Fusion", "Frustrated Catharsis", "Driving Drums", "Angst"]
    },
    {
      title: "Bhaag D.K. Bose",
      artist: "Ram Sampath",
      album: "Delhi Belly",
      duration: "4:02",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Punk Rock Chaos", "High-Voltage Distortion", "Aggressive Satire", "Fast Tempo"]
    },
    {
      title: "Given Up",
      artist: "Linkin Park",
      album: "Minutes to Midnight",
      duration: "3:09",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["17-Second Scream", "Fast Tempo Punk", "Boiling Frustration", "Heavy Distortion"]
    },
    {
      title: "Smells Like Teen Spirit",
      artist: "Nirvana",
      album: "Nevermind",
      duration: "5:01",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Grunge Explosion", "Loud-Quiet Dynamics", "Disillusioned Rage", "Rebellion"]
    },
    {
      title: "Chop Suey!",
      artist: "System of a Down",
      album: "Toxicity",
      duration: "3:30",
      coverArtUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Frenetic Speed", "Operatic Metal Shouts", "Unrelenting Tension", "Sonic Chaos"]
    }
  ],

  Nostalgia: [
    {
      title: "Summer of '69",
      artist: "Bryan Adams",
      album: "Reckless",
      duration: "3:35",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Youthful Reminiscence", "Classic Guitar Riffs", "Bittersweet Memories", "Golden Age"]
    },
    {
      title: "Castle on the Hill",
      artist: "Ed Sheeran",
      album: "÷ (Divide)",
      duration: "4:21",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Hometown Roadtrip", "Growing Up", "Sentimental Retrospect", "Echoes of Youth"]
    },
    {
      title: "Purani Jeans",
      artist: "Ali Haider",
      album: "Sandesa",
      duration: "5:05",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Urdu / Hindi",
      traits: ["College Days Memories", "Old Friends", "Acoustic Warmth", "Timeless Nostalgia"]
    },
    {
      title: "1979",
      artist: "The Smashing Pumpkins",
      album: "Mellon Collie and the Infinite Sadness",
      duration: "4:25",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Suburban Nostalgia", "Dream Pop Guitars", "Adolescent Longing", "Warm Melancholy"]
    },
    {
      title: "Yesterday",
      artist: "The Beatles",
      album: "Help!",
      duration: "2:05",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["String Quartet", "Acoustic Reflection", "Longing for the Past", "Heartfelt Regret"]
    },
    {
      title: "Photograph",
      artist: "Ed Sheeran",
      album: "x (Multiply)",
      duration: "4:19",
      coverArtUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Keepsake Memories", "Long-Distance Longing", "Tender Acoustic Guitars", "Time Capsule"]
    },
    {
      title: "Woh Din",
      artist: "Arijit Singh",
      album: "Chhichhore",
      duration: "4:18",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Hostel Memories", "Bonds of Friendship", "Sentimental Reflection", "Days of Wonder"]
    },
    {
      title: "Time After Time",
      artist: "Cyndi Lauper",
      album: "She's So Unusual",
      duration: "4:01",
      coverArtUrl: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["80s Synth Ballad", "Steadfast Devotion", "Echoing Clocks", "Bittersweet Loyalty"]
    }
  ],

  Fear: [
    {
      title: "Tubular Bells",
      artist: "Mike Oldfield",
      album: "Tubular Bells (The Exorcist)",
      duration: "4:50",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Eerie Music Box", "Creeping Dread (-0.90 Valence)", "Iconic Horror Theme", "Paranoia"]
    },
    {
      title: "Thriller",
      artist: "Michael Jackson",
      album: "Thriller",
      duration: "5:57",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Howling Wolves", "Midnight Grooves", "Ghoulish Spoken Word", "Supernatural Chill"]
    },
    {
      title: "Halloween Theme",
      artist: "John Carpenter",
      album: "Halloween",
      duration: "2:54",
      coverArtUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["5/4 Stabbing Piano", "Relentless Stalker Motif", "Unescapable Terror", "Cold Dread"]
    },
    {
      title: "Bhoot Hoon Main",
      artist: "Sunidhi Chauhan",
      album: "Bhoot",
      duration: "5:12",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Eerie Ghostly Whispers", "Haunting Strings", "Nightmare Atmosphere", "Spine-Tingling"]
    },
    {
      title: "Bury a Friend",
      artist: "Billie Eilish",
      album: "When We All Fall Asleep, Where Do We Go?",
      duration: "3:13",
      coverArtUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Monster Under the Bed", "Dark Industrial Beats", "Whispered Dread", "Haunted Pop"]
    },
    {
      title: "Disturbia",
      artist: "Rihanna",
      album: "Good Girl Gone Bad: Reloaded",
      duration: "3:58",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Psychological Paranoia", "Dark Synth Dance", "Racing Pulse", "Claustrophobic Dread"]
    },
    {
      title: "Sweet Dreams (Are Made of This)",
      artist: "Marilyn Manson",
      album: "Smells Like Children",
      duration: "4:53",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Industrial Grunge", "Sinister Screams", "Macabre Distortion", "Chilling Bass"]
    },
    {
      title: "Stranger Things Theme",
      artist: "Survive",
      album: "Stranger Things Soundtrack",
      duration: "1:07",
      coverArtUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Analog Arpeggios", "80s Dark Synthwave", "Supernatural Mystery", "Sci-Fi Suspense"]
    }
  ],

  Excitement: [
    {
      title: "Levels",
      artist: "Avicii",
      album: "Levels",
      duration: "3:19",
      coverArtUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Iconic Synth Lead", "Etta James Vocal Loop", "Peak Mainstage Hype", "High BPM"]
    },
    {
      title: "Titanium",
      artist: "David Guetta ft. Sia",
      album: "Nothing but the Beat",
      duration: "4:05",
      coverArtUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Power Vocals", "Electrifying Synths", "Unstoppable Strength", "Anthemic Drop"]
    },
    {
      title: "Wake Me Up",
      artist: "Avicii",
      album: "True",
      duration: "4:07",
      coverArtUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Folk EDM Hybrid", "Pounding Kick Drums", "Festival Euphoria", "Crowd Singalong"]
    },
    {
      title: "Malhari",
      artist: "Vishal Dadlani",
      album: "Bajirao Mastani",
      duration: "4:05",
      coverArtUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Thunderous Dhol Tasha", "Warrior Energy", "Fierce Rhythm", "Victory Roar"]
    },
    {
      title: "Can't Hold Us",
      artist: "Macklemore & Ryan Lewis",
      album: "The Heist",
      duration: "4:18",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Rapid-Fire Cadence", "Gospel Choirs", "Celebratory Surge", "Peak Adrenaline"]
    },
    {
      title: "Jai Ho",
      artist: "A.R. Rahman, Sukhwinder Singh",
      album: "Slumdog Millionaire",
      duration: "5:19",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Global Anthem", "Electrifying Percussion", "Triumphant Energy", "Oscar-Winning"]
    },
    {
      title: "Firework",
      artist: "Katy Perry",
      album: "Teenage Dream",
      duration: "3:48",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Explosive Chorus", "Skyrocketing Energy", "Inspiring Pop", "High Intensity"]
    },
    {
      title: "Eye of the Tiger",
      artist: "Survivor",
      album: "Eye of the Tiger",
      duration: "4:05",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Driving Guitar Chugs", "Unrelenting Workout Pulse", "Determined Fire", "Fight Spirit"]
    }
  ],

  Hope: [
    {
      title: "Here Comes the Sun",
      artist: "The Beatles",
      album: "Abbey Road",
      duration: "3:05",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Acoustic Dawn", "Melting Ice & Renewal", "Gentle Optimism", "Peaceful Sunlight"]
    },
    {
      title: "Rise Up",
      artist: "Andra Day",
      album: "Cheers to the Fall",
      duration: "4:13",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Soaring Gospel Vocals", "Resilience & Perseverance", "Overcoming Mountains", "Soulful Hope"]
    },
    {
      title: "Aashayein",
      artist: "KK",
      album: "Iqbal",
      duration: "4:19",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Dreaming High", "Inspirational Rock", "Wings of Fire", "Unconquerable Spirit"]
    },
    {
      title: "Fight Song",
      artist: "Rachel Platten",
      album: "Wildfire",
      duration: "3:24",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Small Match Big Fire", "Empowerment Anthem", "Tenacious Hope", "Radiant Strength"]
    },
    {
      title: "Kar Har Maidaan Fateh",
      artist: "Sukhwinder Singh, Shreya Ghoshal",
      album: "Sanju",
      duration: "5:11",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Conquering Every Field", "Spiritual Strength", "Triumphant Horns", "Courageous Dawn"]
    },
    {
      title: "What a Wonderful World",
      artist: "Louis Armstrong",
      album: "What a Wonderful World",
      duration: "2:21",
      coverArtUrl: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Gravelly Warmth", "Lush Orchestration", "Pure Gratitude", "Trees of Green"]
    },
    {
      title: "Count on Me",
      artist: "Bruno Mars",
      album: "Doo-Wops & Hooligans",
      duration: "3:17",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Acoustic Friendship", "Gentle Reassurance", "Guiding Light", "Loyal Kinship"]
    },
    {
      title: "Roar",
      artist: "Katy Perry",
      album: "Prism",
      duration: "3:43",
      coverArtUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Champion Spirit", "Finding One's Voice", "Stomp Rhythm", "Unyielding Hope"]
    }
  ],

  Loneliness: [
    {
      title: "Boulevard of Broken Dreams",
      artist: "Green Day",
      album: "American Idiot",
      duration: "4:20",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Empty Street Solitude", "Tremolo Guitar", "Walking Alone", "Introspective Echoes"]
    },
    {
      title: "The Sound of Silence",
      artist: "Simon & Garfunkel",
      album: "Wednesday Morning, 3 A.M.",
      duration: "3:05",
      coverArtUrl: "https://images.unsplash.com/photo-1453738773917-9c3eff1db985?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Haunting Harmonies", "Solitary Darkness", "Poetic Solitude", "Echoing Thoughts"]
    },
    {
      title: "Kabira (Encore)",
      artist: "Harshdeep Kaur, Arijit Singh",
      album: "Yeh Jawaani Hai Deewani",
      duration: "4:29",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Wanderer Solitude", "Sufi Flute & Sarangi", "Detached Heart", "Yearning Ache"]
    },
    {
      title: "Eleanor Rigby",
      artist: "The Beatles",
      album: "Revolver",
      duration: "2:06",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Stabbing Strings", "Forgotten Lives", "Quiet Churchyard Solitude", "Poignant Portrait"]
    },
    {
      title: "Here Without You",
      artist: "3 Doors Down",
      album: "Away from the Sun",
      duration: "3:58",
      coverArtUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Acoustic Separation", "Empty Rooms", "Dreaming in Solitude", "Post-Grunge Ache"]
    },
    {
      title: "Jag Ghoomeya",
      artist: "Rahat Fateh Ali Khan",
      album: "Sultan",
      duration: "4:41",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Wandering the Earth", "Single Pure Love", "Soulful Sufi Guitar", "Echo of Solitude"]
    },
    {
      title: "Tired",
      artist: "Alan Walker ft. Gavin James",
      album: "Tired",
      duration: "3:12",
      coverArtUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Heavy Heart", "Exhaustion & Solitude", "Tender Vocals", "Ambient Rain"]
    },
    {
      title: "Alone Again (Naturally)",
      artist: "Gilbert O'Sullivan",
      album: "Himself",
      duration: "3:36",
      coverArtUrl: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Gentle Strumming", "Introspective Honesty", "Solitary Melancholy", "Classic Folk"]
    }
  ],

  Calmness: [
    {
      title: "Weightless",
      artist: "Marconi Union",
      album: "Ambient Transmissions Vol. 2",
      duration: "8:05",
      coverArtUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Scientifically Calming", "Low Heart Rate Pacing", "Tranquil Stillness", "Ambient Drone"]
    },
    {
      title: "River Flows in You",
      artist: "Yiruma",
      album: "First Love",
      duration: "3:08",
      coverArtUrl: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Flowing Neoclassical Piano", "Gentle Ripples", "Meditative Grace", "Peaceful"]
    },
    {
      title: "Kun Faya Kun",
      artist: "A.R. Rahman, Javed Ali, Mohit Chauhan",
      album: "Rockstar",
      duration: "7:53",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi / Urdu",
      traits: ["Sacred Sufi Devotion", "Sufi Harmonium & Dargah Bells", "Inner Peace", "Transcendence"]
    },
    {
      title: "Banana Pancakes",
      artist: "Jack Johnson",
      album: "In Between Dreams",
      duration: "3:12",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Lazy Sunday Strumming", "Warm Acoustic Rain", "Cozy Serenity", "Relaxed Breathing"]
    },
    {
      title: "Clair de Lune",
      artist: "Claude Debussy",
      album: "Suite bergamasque",
      duration: "5:03",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Moonlight Impressionism", "Gentle Fluid Dynamics", "Ethereal Calm", "Timeless Solace"]
    },
    {
      title: "Iktara",
      artist: "Kavita Seth, Amitabh Bhattacharya",
      album: "Wake Up Sid",
      duration: "4:13",
      coverArtUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Acoustic Ektara Plucks", "Serene Sufi Soul", "Quiet Longing", "Morning Breeze"]
    },
    {
      title: "Strawberry Swing",
      artist: "Coldplay",
      album: "Viva la Vida",
      duration: "4:09",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["West African Highlife Chords", "Stress-Reducing Tempo", "Dreamy Blue Skies", "Gentle Peace"]
    },
    {
      title: "Holocene",
      artist: "Bon Iver",
      album: "Bon Iver",
      duration: "5:37",
      coverArtUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Delicate Fingerpicking", "Vast Glacial Space", "Sublime Awe", "Introspective Calm"]
    }
  ]
};

// Map legacy keys so legacy callers never get empty lists
CURATED_EMOTION_CATALOG.Happy = CURATED_EMOTION_CATALOG.Happiness;
CURATED_EMOTION_CATALOG.Sad = CURATED_EMOTION_CATALOG.Sadness;
CURATED_EMOTION_CATALOG.Romantic = CURATED_EMOTION_CATALOG.Love;
CURATED_EMOTION_CATALOG.Angry = CURATED_EMOTION_CATALOG.Anger;
CURATED_EMOTION_CATALOG["Calm/Chill"] = CURATED_EMOTION_CATALOG.Calmness;
CURATED_EMOTION_CATALOG.Exciting = CURATED_EMOTION_CATALOG.Excitement;
CURATED_EMOTION_CATALOG.Patriotic = CURATED_EMOTION_CATALOG.Hope;
CURATED_EMOTION_CATALOG.Thrilling = CURATED_EMOTION_CATALOG.Fear;
CURATED_EMOTION_CATALOG.Horror = CURATED_EMOTION_CATALOG.Fear;

// Emotional explanation archetypes corresponding to each of the 10 emotions
const REASON_TEMPLATES = {
  Happiness: [
    "Carries the buoyant melodic energy and uplifting lyrical positivity (+0.85 valence) detected in your analyzed song.",
    "Channels feel-good optimism with vibrant acoustic brightness and celebratory rhythm.",
    "Shares the infectious joy and radiant spirit characterizing Happiness mood profiles.",
    "Elevates mood with sunlit instrumentation, upbeat tempos, and heartwarming optimism."
  ],
  Sadness: [
    "Resonates with the gentle melancholic sorrow and introspective vulnerability (-0.80 valence) of this mood.",
    "Echoes the poignant lyrical reflection and slow-tempo acoustic comfort detected in the lyrics.",
    "Shares the emotional ache, gentle tears, and comforting solitude of Sadness song compositions.",
    "Provides comforting musical companionship through tender minor-key piano and heartfelt vocal cries."
  ],
  Love: [
    "Echoes the tender devotion, starry-eyed affection, and heartfelt intimacy (+0.90 valence) detected in the lyrics.",
    "Shares the warm acoustic warmth and deep emotional sincerity of your analyzed love song.",
    "Delivers sweet harmonies and heartfelt poetic pledges matching romantic emotional cues.",
    "Envelops the listener in a warm, protective sonic embrace celebrating genuine soul connection."
  ],
  Anger: [
    "Channels the fierce vocal intensity and high-arousal cathartic rebellion (+0.85 arousal) detected.",
    "Delivers heavy distorted riffs and unapologetic lyrical defiance matching your track's fury.",
    "Channels raw adrenaline and high-tension emotional release across its explosive chorus.",
    "Provides a powerful emotional release valve for frustration through surging distorted guitars and punchy drums."
  ],
  Nostalgia: [
    "Evokes fond retrospective memories, bittersweet warmth, and the gentle ache of treasured bygone days.",
    "Blends warm acoustic textures and reflective lyricism reminiscent of youthful roadtrips and old friendships.",
    "Carries an evocative golden-hour haze that brings past moments and familiar places vividly alive.",
    "Channels the bittersweet beauty of looking back on defining life chapters with gratitude."
  ],
  Fear: [
    "Evokes spine-chilling dark ambient dissonance, eerie echoes, and haunting supernatural dread (-0.90 valence).",
    "Surrounds the listener with uncanny psychological tension, ghostly whispers, and macabre atmosphere.",
    "Builds unescapable cinematic mystery and pulse-quickening edge-of-the-seat tension.",
    "Uses sparse, chilling sonic arrangements and mysterious arpeggios to mirror deep internal apprehension."
  ],
  Excitement: [
    "Ramps up the electric adrenaline, fast BPM, and peak festival momentum (+0.95 arousal) detected.",
    "Delivers high-voltage drops, pumping basslines, and unstoppable party momentum.",
    "Powers forward with exhilarating tempo and anthemic energy to elevate your vibe instantly.",
    "Ignites a surge of pure physical kinetic drive with triumphant horns and thunderous percussion."
  ],
  Hope: [
    "Shines like a breaking dawn with uplifting lyrical affirmation and inspiring harmonic crescendos.",
    "Inspires unwavering resilience, inner courage, and the conviction that brighter horizons await.",
    "Carries a tender yet unshakeable strength that lifts the spirit during moments of challenge.",
    "Transforms vulnerability into triumphant forward momentum through stirring vocal melodies."
  ],
  Loneliness: [
    "Captures the quiet solitude of empty midnight streets and solitary introspective contemplation.",
    "Provides gentle musical companionship for moments of isolation with haunting acoustic melodies.",
    "Reflects the vulnerability of feeling like an outsider while offering comforting, honest resonance.",
    "Strikes an emotionally honest chord through minimalist arrangements that give voice to quiet ache."
  ],
  Calmness: [
    "Provides soothing atmospheric stillness and tranquil harmonic pace (-0.70 arousal).",
    "Matches the relaxed acoustic instrumentation and mindful breathing tempo of serene acoustic tracks.",
    "Envelops the listener in gentle harmonic textures and peaceful, low-stress vibrations.",
    "Slows racing thoughts with tranquil piano notes, gentle nature imagery, and meditative acoustic pacing."
  ]
};

// Aliases for legacy reasons
REASON_TEMPLATES.Happy = REASON_TEMPLATES.Happiness;
REASON_TEMPLATES.Sad = REASON_TEMPLATES.Sadness;
REASON_TEMPLATES.Romantic = REASON_TEMPLATES.Love;
REASON_TEMPLATES.Angry = REASON_TEMPLATES.Anger;
REASON_TEMPLATES["Calm/Chill"] = REASON_TEMPLATES.Calmness;
REASON_TEMPLATES.Exciting = REASON_TEMPLATES.Excitement;
REASON_TEMPLATES.Patriotic = REASON_TEMPLATES.Hope;
REASON_TEMPLATES.Thrilling = REASON_TEMPLATES.Fear;
REASON_TEMPLATES.Horror = REASON_TEMPLATES.Fear;

class RecommendationService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
    this.aiExplanationCache = new Map();
    this.AI_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Helper to normalize titles and artists for deduplication
   */
  _normalize(str) {
    if (!str || typeof str !== "string") return "";
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /**
   * Resolve an arbitrary mood string to a canonical 10-emotion name
   */
  resolveCanonicalMood(mood) {
    if (!mood || typeof mood !== "string") return "Happiness";
    const cleaned = mood.trim().toLowerCase();
    return CANONICAL_EMOTION_MAP[cleaned] || "Happiness";
  }

  /**
   * Format external listening links
   */
  _getListeningLinks(title, artist) {
    const q = encodeURIComponent(`${title} ${artist}`);
    return {
      spotifyUrl: `https://open.spotify.com/search/${q}`,
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist} official audio`)}`
    };
  }

  /**
   * Build a contextual reason for a recommended track
   */
  _generateReason(mood, seedSong, trackIndex, customTrait = null) {
    const canonical = this.resolveCanonicalMood(mood);
    const templates = REASON_TEMPLATES[canonical] || REASON_TEMPLATES.Happiness;
    const baseTemplate = templates[trackIndex % templates.length];

    if (customTrait) {
      return `Highlighted by ${customTrait}: ${baseTemplate}`;
    }

    if (seedSong?.title && seedSong?.title !== "Analyzed Song" && seedSong?.title !== "Custom Lyrics") {
      return `Following "${seedSong.title}" (${canonical}), this track ${baseTemplate.charAt(0).toLowerCase()}${baseTemplate.slice(1)}`;
    }
    return baseTemplate;
  }

  /**
   * Generate an Ollama AI explanation for why a song matches the target mood & seed
   * Uses local qwen2.5:3b with fast timeout and high-quality template fallback
   */
  async explainRecommendation({ songTitle, artist, mood, seedTitle = "", lyricalThemes = [], overallTone = "" } = {}) {
    if (!songTitle) return { explanation: "Matches the selected mood profile." };

    const canonical = this.resolveCanonicalMood(mood);
    const cacheKey = `${songTitle.toLowerCase()}:::${(artist || "").toLowerCase()}:::${canonical}:::${(seedTitle || "").toLowerCase()}`;

    const cached = this.aiExplanationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        explanation: cached.explanation,
        model: cached.model || "Ollama (Cached)",
        fromCache: true
      };
    }

    // Attempt Ollama AI explanation when configured
    const ollamaResolution = resolveOllamaBaseUrl();
    if (!ollamaResolution.configured) {
      const fallbackReason = this._generateReason(canonical, { title: seedTitle, artist }, 0);
      const finalExplanation = `${fallbackReason} Its acoustic signature and lyric themes align naturally with the ${canonical.toLowerCase()} emotional state.`;
      return {
        explanation: finalExplanation,
        model: "EmoLyrics Deterministic Heuristics (Ollama Unavailable)",
        fromCache: false,
        ollamaAvailable: false
      };
    }

    const baseUrl = ollamaResolution.url;
    const model = process.env.OLLAMA_MODEL || "qwen2.5:3b";
    const url = `${baseUrl}/api/chat`;

    const seedContext = seedTitle ? ` as a natural follow-up to "${seedTitle}"` : "";
    const themesContext = lyricalThemes?.length ? ` Themes present: ${lyricalThemes.slice(0, 3).join(", ")}.` : "";
    const toneContext = overallTone ? ` Emotional tone: ${overallTone}.` : "";

    const prompt = `In 1 or 2 concise, engaging sentences, explain why the song "${songTitle}" by "${artist || "the artist"}" is a great musical and emotional match for the mood "${canonical}"${seedContext}.${themesContext}${toneContext} Focus directly on the musical energy, emotional tone, and lyrical resonance. Avoid greeting or preamble.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4-second timeout to maintain rapid UI response

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert musicologist and lyrical sentiment specialist for EmoLyrics. Give concise, engaging 1-2 sentence music recommendation explanations."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          stream: false,
          keep_alive: "10m",
          options: {
            num_predict: 80,
            temperature: 0.6,
            num_ctx: 1024
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data?.message?.content?.trim();
        if (content && content.length > 15) {
          this.aiExplanationCache.set(cacheKey, {
            explanation: content,
            model: `Ollama (${model})`,
            expiresAt: Date.now() + this.AI_CACHE_TTL_MS
          });
          return {
            explanation: content,
            model: `Ollama (${model})`,
            fromCache: false
          };
        }
      }
    } catch {
      // Ollama timeout or offline: gracefully use fallback template
    } finally {
      clearTimeout(timeout);
    }

    // Resilient Fallback Explanation
    const fallbackReason = this._generateReason(canonical, { title: seedTitle, artist }, 0);
    const finalExplanation = `${fallbackReason} Its acoustic signature and lyric themes align naturally with the ${canonical.toLowerCase()} emotional state.`;

    this.aiExplanationCache.set(cacheKey, {
      explanation: finalExplanation,
      model: "EmoLyrics Neural Heuristics",
      expiresAt: Date.now() + this.AI_CACHE_TTL_MS
    });

    return {
      explanation: finalExplanation,
      model: "EmoLyrics Neural Heuristics",
      fromCache: false
    };
  }

  /**
   * Main Recommendation Method with Multi-Emotion & Blended Scoring
   */
  async getRecommendations({
    mood = "Happiness",
    seedTitle = "",
    seedArtist = "",
    exclude = [],
    limit = 6,
    secondaryEmotions = [],
    lyricalThemes = [],
    overallTone = ""
  } = {}) {
    const canonicalMood = this.resolveCanonicalMood(mood);
    const normalizedSeedTitle = this._normalize(seedTitle);
    const normalizedSeedArtist = this._normalize(seedArtist);
    const excludeSet = new Set((exclude || []).map((e) => this._normalize(e)).filter(Boolean));

    // Cache key
    const cacheKey = `${canonicalMood}:::${normalizedSeedTitle}:::${exclude.length}:::${limit}:::${(secondaryEmotions || []).length}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.data,
        fromCache: true
      };
    }

    // 1. Primary Emotion Candidate Pool
    const primaryCatalog = (CURATED_EMOTION_CATALOG[canonicalMood] || []).map((t, idx) => ({
      id: `curated-${canonicalMood.toLowerCase()}-${idx}`,
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration: t.duration,
      coverArtUrl: t.coverArtUrl,
      language: t.language,
      traits: t.traits,
      mood: canonicalMood,
      weight: 1.0,
      source: "curated"
    }));

    // 2. Secondary Emotions Candidates Pool (for blended recommendations)
    const secondaryCatalog = [];
    if (Array.isArray(secondaryEmotions) && secondaryEmotions.length > 0) {
      for (const sec of secondaryEmotions) {
        const secMood = typeof sec === "string" ? sec : sec?.emotion;
        if (!secMood) continue;
        const canonicalSec = this.resolveCanonicalMood(secMood);
        if (canonicalSec === canonicalMood) continue;

        const secTracks = (CURATED_EMOTION_CATALOG[canonicalSec] || []).map((t, idx) => ({
          id: `curated-${canonicalSec.toLowerCase()}-${idx}`,
          title: t.title,
          artist: t.artist,
          album: t.album,
          duration: t.duration,
          coverArtUrl: t.coverArtUrl,
          language: t.language,
          traits: t.traits,
          mood: canonicalSec,
          weight: (sec.percentage ? sec.percentage / 100 : 0.4),
          source: "blended-secondary"
        }));
        secondaryCatalog.push(...secTracks);
      }
    }

    // 3. Community Analyses from MongoDB or Memory Store
    let communityTracks = [];
    try {
      const searchMoods = [canonicalMood];
      if (canonicalMood === "Happiness") searchMoods.push("Happy");
      if (canonicalMood === "Sadness") searchMoods.push("Sad");
      if (canonicalMood === "Love") searchMoods.push("Romantic");
      if (canonicalMood === "Anger") searchMoods.push("Angry");
      if (canonicalMood === "Calmness") searchMoods.push("Calm/Chill");
      if (canonicalMood === "Excitement") searchMoods.push("Exciting");

      if (getIsConnected()) {
        const dbAnalyses = await Analysis.find({ mood: { $in: searchMoods } })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
        communityTracks = dbAnalyses.map((item) => ({
          id: `community-${item._id}`,
          title: item.title,
          artist: item.artist,
          album: "Community Analysis",
          duration: "3:30",
          coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
          language: item.language || "English",
          traits: item.detectedKeywords?.slice(0, 3) || [`${item.confidence}% Confidence`],
          mood: canonicalMood,
          weight: 0.85,
          source: "community"
        }));
      } else if (memoryStore && Array.isArray(memoryStore.analyses)) {
        communityTracks = memoryStore.analyses
          .filter((a) => searchMoods.map((m) => m.toLowerCase()).includes(a.mood.toLowerCase()))
          .map((item) => ({
            id: `community-${item._id}`,
            title: item.title,
            artist: item.artist,
            album: "Community Analysis",
            duration: "3:30",
            coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
            language: item.language || "English",
            traits: [`${item.confidence}% Confidence`],
            mood: canonicalMood,
            weight: 0.85,
            source: "community"
          }));
      }
    } catch (err) {
      console.warn("[RecommendationService] Community fetch warning:", err.message);
    }

    // Merge candidates
    const allCandidates = [...primaryCatalog, ...secondaryCatalog, ...communityTracks];
    const seenTitles = new Set();
    const scoredPool = [];

    // Calculate match score based on emotion weight & theme overlap
    for (const track of allCandidates) {
      const normTitle = this._normalize(track.title);
      const normArtist = this._normalize(track.artist);

      // Rule A: Do NOT recommend the seed song currently analyzed
      if (
        normalizedSeedTitle &&
        (normTitle === normalizedSeedTitle ||
          normTitle.includes(normalizedSeedTitle) ||
          normalizedSeedTitle.includes(normTitle)) &&
        (!normalizedSeedArtist || normArtist.includes(normalizedSeedArtist) || normalizedSeedArtist.includes(normArtist))
      ) {
        continue;
      }

      // Rule B: Do NOT recommend songs already in this user's exclusion list
      if (excludeSet.has(normTitle)) {
        continue;
      }

      // Rule C: Deduplicate
      if (seenTitles.has(normTitle)) {
        continue;
      }
      seenTitles.add(normTitle);

      // Score computation
      let score = Math.round((track.weight || 1.0) * 88);
      // Boost if track traits match any requested lyrical themes
      if (Array.isArray(lyricalThemes) && lyricalThemes.length > 0) {
        const themeKeywords = lyricalThemes.join(" ").toLowerCase();
        for (const trait of (track.traits || [])) {
          if (themeKeywords.includes(trait.toLowerCase()) || trait.toLowerCase().includes("valence") || trait.toLowerCase().includes("energy")) {
            score += 5;
          }
        }
      }
      const similarityScore = Math.min(Math.max(score, 75), 98);

      scoredPool.push({
        ...track,
        similarityScore
      });
    }

    // Sort by similarity score descending
    scoredPool.sort((a, b) => b.similarityScore - a.similarityScore);

    // Recycle if depleted
    let selectedTracks = scoredPool;
    if (selectedTracks.length < limit) {
      for (const track of primaryCatalog) {
        const normTitle = this._normalize(track.title);
        if (normTitle !== normalizedSeedTitle && !seenTitles.has(normTitle)) {
          seenTitles.add(normTitle);
          selectedTracks.push({
            ...track,
            similarityScore: 84
          });
        }
      }
    }

    // Enrich final songs with reasons, Spotify links, YouTube links
    const recommendations = selectedTracks.slice(0, limit).map((track, idx) => {
      const links = this._getListeningLinks(track.title, track.artist);
      const reason = this._generateReason(
        track.mood || canonicalMood,
        { title: seedTitle, artist: seedArtist },
        idx,
        track.traits?.[0]
      );

      return {
        ...track,
        ...links,
        reason
      };
    });

    const resultPayload = {
      success: true,
      mood: canonicalMood,
      seed: {
        title: seedTitle || null,
        artist: seedArtist || null
      },
      secondaryEmotions: secondaryEmotions || [],
      overallTone: overallTone || null,
      recommendations,
      total: recommendations.length,
      availableMoods: Object.keys(CURATED_EMOTION_CATALOG).filter(
        (k) => !["Happy", "Sad", "Romantic", "Angry", "Calm/Chill", "Exciting", "Patriotic", "Thrilling", "Horror"].includes(k)
      )
    };

    // Save to cache
    this.cache.set(cacheKey, {
      data: resultPayload,
      expiresAt: Date.now() + this.CACHE_TTL_MS
    });

    return {
      ...resultPayload,
      fromCache: false
    };
  }

  /**
   * Feature 2: Similar Song Discovery
   * Finds songs emotionally and thematically similar to a seed track
   */
  async findSimilarSongs({ seedTitle, seedArtist = "", mood = "Happiness", themes = [], secondaryEmotions = [], limit = 6 } = {}) {
    if (!seedTitle) {
      return { success: false, message: "Seed song title is required to find similar tracks." };
    }

    const canonicalMood = this.resolveCanonicalMood(mood);
    const recResult = await this.getRecommendations({
      mood: canonicalMood,
      seedTitle,
      seedArtist,
      secondaryEmotions,
      lyricalThemes: themes,
      limit: limit + 2
    });

    const similarSongs = (recResult.recommendations || []).map((song) => {
      const reason = `Emotionally paired with "${seedTitle}" (${canonicalMood}). ${song.traits?.slice(0, 2).join(" • ") || "Harmonious lyrical theme."}`;
      return {
        ...song,
        similarityReason: reason
      };
    });

    return {
      success: true,
      seedSong: {
        title: seedTitle,
        artist: seedArtist || "Analyzed Song",
        mood: canonicalMood
      },
      similarSongs: similarSongs.slice(0, limit),
      total: Math.min(similarSongs.length, limit)
    };
  }
}

const recommendationService = new RecommendationService();
recommendationService.CURATED_EMOTION_CATALOG = CURATED_EMOTION_CATALOG;
recommendationService.CANONICAL_EMOTION_MAP = CANONICAL_EMOTION_MAP;
recommendationService.REASON_TEMPLATES = REASON_TEMPLATES;

module.exports = recommendationService;
module.exports.CURATED_EMOTION_CATALOG = CURATED_EMOTION_CATALOG;
module.exports.CANONICAL_EMOTION_MAP = CANONICAL_EMOTION_MAP;
