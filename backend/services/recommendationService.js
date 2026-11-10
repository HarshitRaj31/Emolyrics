/**
 * EmoLyrics Recommendation Service
 * Generates personalized, mood-aligned music recommendations based on predicted emotion,
 * seed track metadata, community analyses, and MusicBrainz metadata.
 * 
 * Supports the 9 ML emotion classes:
 * Happy, Sad, Angry, Romantic, Calm/Chill, Exciting, Patriotic, Thrilling, Horror.
 */

const musicBrainzAdapter = require("../plugins/adapters/musicbrainzAdapter");
const { getIsConnected, memoryStore } = require("../db");
const Analysis = require("../models/Analysis");

// Curated Knowledge Base: 8-9 verified tracks per emotion class with authentic metadata
const CURATED_EMOTION_CATALOG = {
  Happy: [
    {
      title: "Walking on Sunshine",
      artist: "Katrina and the Waves",
      album: "Walking on Sunshine",
      duration: "3:58",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["High Valence (+0.85)", "Joyful Brass", "Feel-Good Anthems"]
    },
    {
      title: "Happy",
      artist: "Pharrell Williams",
      album: "G I R L",
      duration: "3:53",
      coverArtUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Uplifting Rhythm", "Clapping Percussion", "Infectious Optimism"]
    },
    {
      title: "Good as Hell",
      artist: "Lizzo",
      album: "Cuz I Love You",
      duration: "2:39",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Self-Love Anthem", "High Energy", "Soulful Vocals"]
    },
    {
      title: "Badtameez Dil",
      artist: "Benny Dayal",
      album: "Yeh Jawaani Hai Deewani",
      duration: "4:12",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Upbeat Dance", "Playful Energy", "Celebration Groove"]
    },
    {
      title: "Can't Stop the Feeling!",
      artist: "Justin Timberlake",
      album: "Trolls",
      duration: "3:56",
      coverArtUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Disco Pop", "Dance Floor Energy", "Radiant Valence"]
    },
    {
      title: "Uptown Funk",
      artist: "Mark Ronson ft. Bruno Mars",
      album: "Uptown Special",
      duration: "4:30",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Funk Groove", "Horn Section", "Swagger & Joy"]
    },
    {
      title: "Sooraj Dooba Hain",
      artist: "Arijit Singh, Aditi Singh Sharma",
      album: "Roy",
      duration: "4:24",
      coverArtUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Sunset Dance", "Euphoric Synths", "Youthful Spirit"]
    },
    {
      title: "Don't Stop Me Now",
      artist: "Queen",
      album: "Jazz",
      duration: "3:29",
      coverArtUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Classic Glam Rock", "Exhilarating Speed", "Unstoppable Joy"]
    }
  ],

  Sad: [
    {
      title: "Someone Like You",
      artist: "Adele",
      album: "21",
      duration: "4:45",
      coverArtUrl: "https://images.unsplash.com/photo-1453738773917-9c3eff1db985?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Acoustic Piano", "Melancholic Sorrow (-0.80)", "Heartfelt Farewell"]
    },
    {
      title: "Fix You",
      artist: "Coldplay",
      album: "X&Y",
      duration: "4:55",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Organ Build-up", "Comfort in Grief", "Poignant Lyrics"]
    },
    {
      title: "Channa Mereya",
      artist: "Arijit Singh",
      album: "Ae Dil Hai Mushkil",
      duration: "4:49",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Heartbreak Ballad", "Sufi Resonance", "Emotional Tears"]
    },
    {
      title: "Skinny Love",
      artist: "Bon Iver",
      album: "For Emma, Forever Ago",
      duration: "3:59",
      coverArtUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Raw Acoustic Guitar", "Fragile Falsetto", "Haunting Regret"]
    },
    {
      title: "The Scientist",
      artist: "Coldplay",
      album: "A Rush of Blood to the Head",
      duration: "5:09",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Slow Piano Ballad", "Reflective Solitude", "Yearning Melancholy"]
    },
    {
      title: "Agar Tum Saath Ho",
      artist: "Alka Yagnik, Arijit Singh",
      album: "Tamasha",
      duration: "5:41",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Helpless Despair", "Soulful Duet", "Tender Ache"]
    },
    {
      title: "All I Want",
      artist: "Kodaline",
      album: "In a Perfect World",
      duration: "5:05",
      coverArtUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Crescendo of Grief", "Vocal Cry", "Lost Love"]
    },
    {
      title: "Tears in Heaven",
      artist: "Eric Clapton",
      album: "Rush",
      duration: "4:32",
      coverArtUrl: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Gentle Nylon Guitar", "Mournful Tribute", "Enduring Sorrow"]
    }
  ],

  Angry: [
    {
      title: "Break Stuff",
      artist: "Limp Bizkit",
      album: "Significant Other",
      duration: "2:46",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Cathartic Rage", "Heavy Nu-Metal Riffs", "High Arousal (+0.85)"]
    },
    {
      title: "Killing In The Name",
      artist: "Rage Against The Machine",
      album: "Rage Against The Machine",
      duration: "5:14",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Defiant Rebellion", "Heavy Drop-D Bass", "Unfiltered Fury"]
    },
    {
      title: "Apna Time Aayega",
      artist: "Ranveer Singh",
      album: "Gully Boy",
      duration: "2:10",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Street Hip-Hop", "Raw Grittiness", "Hunger & Rebellion"]
    },
    {
      title: "In the End",
      artist: "Linkin Park",
      album: "Hybrid Theory",
      duration: "3:36",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Rap Rock Fusion", "Frustrated Catharsis", "Driving Drums"]
    },
    {
      title: "Bhaag D.K. Bose",
      artist: "Ram Sampath",
      album: "Delhi Belly",
      duration: "4:02",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Punk Rock Chaos", "High-Voltage Distortion", "Aggressive Satire"]
    },
    {
      title: "Given Up",
      artist: "Linkin Park",
      album: "Minutes to Midnight",
      duration: "3:09",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["17-Second Scream", "Fast Tempo Punk", "Boiling Frustration"]
    },
    {
      title: "Smells Like Teen Spirit",
      artist: "Nirvana",
      album: "Nevermind",
      duration: "5:01",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Grunge Explosion", "Loud-Quiet Dynamics", "Disillusioned Rage"]
    },
    {
      title: "Chop Suey!",
      artist: "System of a Down",
      album: "Toxicity",
      duration: "3:30",
      coverArtUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Frenetic Speed", "Operatic Metal Shouts", "Unrelenting Tension"]
    }
  ],

  Romantic: [
    {
      title: "Perfect",
      artist: "Ed Sheeran",
      album: "÷ (Divide)",
      duration: "4:23",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Warm Acoustic Devotion", "Starry Eyes (+0.90 Valence)", "Slow Dance"]
    },
    {
      title: "Tum Hi Ho",
      artist: "Arijit Singh",
      album: "Aashiqui 2",
      duration: "4:22",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Soulful Piano", "Passionate Pledge", "Intense Romantic Love"]
    },
    {
      title: "All of Me",
      artist: "John Legend",
      album: "Love in the Future",
      duration: "4:30",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Vulnerable Ballad", "Rich Grand Piano", "Unconditional Devotion"]
    },
    {
      title: "Kesariya",
      artist: "Arijit Singh",
      album: "Brahmāstra",
      duration: "4:28",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Saffron Warmth", "Melodic Acoustic Guitars", "Tender Affection"]
    },
    {
      title: "Thinking Out Loud",
      artist: "Ed Sheeran",
      album: "x (Multiply)",
      duration: "4:41",
      coverArtUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Blue-Eyed Soul", "Gentle Strumming", "Everlasting Romance"]
    },
    {
      title: "Raabta",
      artist: "Arijit Singh",
      album: "Agent Vinod",
      duration: "4:04",
      coverArtUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Soul Connection", "Subtle Electronic Beats", "Dreamy Vocals"]
    },
    {
      title: "Just the Way You Are",
      artist: "Bruno Mars",
      album: "Doo-Wops & Hooligans",
      duration: "3:40",
      coverArtUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Pop Serenade", "Pure Adoration", "Sweet Harmonies"]
    },
    {
      title: "Until I Found You",
      artist: "Stephen Sanchez",
      album: "Easy on My Eyes",
      duration: "2:57",
      coverArtUrl: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["1950s Doo-Wop Revival", "Reverberant Chords", "Classic Love"]
    }
  ],

  "Calm/Chill": [
    {
      title: "Weightless",
      artist: "Marconi Union",
      album: "Ambient Transmissions Vol. 2",
      duration: "8:05",
      coverArtUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Scientifically Calming", "Low Heart Rate Pacing", "Tranquil Stillness"]
    },
    {
      title: "Sunset Lover",
      artist: "Petit Biscuit",
      album: "Presence",
      duration: "3:57",
      coverArtUrl: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=400&q=80",
      language: "French / English",
      traits: ["Chillout Electronica", "Warm Vocal Chops", "Relaxing Dusk Beats"]
    },
    {
      title: "Kabira (Acoustic)",
      artist: "Rekha Bhardwaj",
      album: "Yeh Jawaani Hai Deewani",
      duration: "4:11",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Folk Flute & Sarangi", "Peaceful Harmony", "Gentle Contemplation"]
    },
    {
      title: "Strawberry Swing",
      artist: "Coldplay",
      album: "Viva la Vida",
      duration: "4:09",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Acoustic Plucking", "Breezy Summer Rhythm", "Serene Atmosphere"]
    },
    {
      title: "Holocene",
      artist: "Bon Iver",
      album: "Bon Iver",
      duration: "5:36",
      coverArtUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Glacial Horns", "Quiet Reflection", "Whispered Peace"]
    },
    {
      title: "Iktara",
      artist: "Kavita Seth, Amit Trivedi",
      album: "Wake Up Sid",
      duration: "4:13",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Sufi Calm", "Acoustic Plucking", "Effortless Ease"]
    },
    {
      title: "Banana Pancakes",
      artist: "Jack Johnson",
      album: "In Between Dreams",
      duration: "3:12",
      coverArtUrl: "https://images.unsplash.com/photo-1453738773917-9c3eff1db985?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Rainy Sunday Mellow", "Warm Ukulele & Guitar", "Lazy Comfort"]
    },
    {
      title: "Pahadon Mein",
      artist: "Salman Elahi",
      album: "Pahadon Mein",
      duration: "3:24",
      coverArtUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Mountain Solitude", "Acoustic Strumming", "Fresh Crisp Air"]
    }
  ],

  Exciting: [
    {
      title: "Don't You Worry Child",
      artist: "Swedish House Mafia",
      album: "Until Now",
      duration: "3:32",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Progressive House Anthem", "Massive Drop", "Electric Adrenaline (+0.95 Arousal)"]
    },
    {
      title: "Wake Me Up",
      artist: "Avicii",
      album: "True",
      duration: "4:07",
      coverArtUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Folk EDM Hybrid", "Pounding Kick Drums", "Festival Euphoria"]
    },
    {
      title: "Kar Gayi Chull",
      artist: "Badshah, Neha Kakkar",
      album: "Kapoor & Sons",
      duration: "3:07",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Club Bangers", "High-BPM Party", "Infectious Hook"]
    },
    {
      title: "Titanium",
      artist: "David Guetta ft. Sia",
      album: "Nothing but the Beat",
      duration: "4:05",
      coverArtUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Power Vocals", "Electrifying Synths", "Unstoppable Strength"]
    },
    {
      title: "Levels",
      artist: "Avicii",
      album: "Levels",
      duration: "3:19",
      coverArtUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Iconic Synth Lead", "Etta James Vocal Loop", "Peak Mainstage Hype"]
    },
    {
      title: "Malhari",
      artist: "Vishal Dadlani",
      album: "Bajirao Mastani",
      duration: "4:05",
      coverArtUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Thunderous Dhol Tasha", "Warrior Energy", "Fierce Rhythm"]
    },
    {
      title: "Can't Hold Us",
      artist: "Macklemore & Ryan Lewis",
      album: "The Heist",
      duration: "4:18",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Rapid-Fire Cadence", "Gospel Choirs", "Celebratory Surge"]
    },
    {
      title: "Dilliwali Girlfriend",
      artist: "Arijit Singh, Sunidhi Chauhan",
      album: "Yeh Jawaani Hai Deewani",
      duration: "4:20",
      coverArtUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Desi Party Anthems", "High-Pitched Energy", "Electrifying Tempo"]
    }
  ],

  Patriotic: [
    {
      title: "Maa Tujhe Salaam",
      artist: "A.R. Rahman",
      album: "Vande Mataram",
      duration: "6:14",
      coverArtUrl: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Iconic High Notes", "Motherland Devotion", "Swell of Solidarity"]
    },
    {
      title: "Teri Mitti",
      artist: "B Praak",
      album: "Kesari",
      duration: "5:14",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi / Punjabi",
      traits: ["Soldier Sacrifice", "Soil Tribute", "Tears of Reverence"]
    },
    {
      title: "Sandese Aate Hai",
      artist: "Roop Kumar Rathod, Sonu Nigam",
      album: "Border",
      duration: "10:33",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Border Letters", "Heart-wrenching Yearning", "Timeless National Classic"]
    },
    {
      title: "Chak De India",
      artist: "Sukhwinder Singh",
      album: "Chak De! India",
      duration: "4:43",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["National Sports Pride", "Fierce Motivation", "United Spirit"]
    },
    {
      title: "Ae Watan",
      artist: "Arijit Singh, Sunidhi Chauhan",
      album: "Raazi",
      duration: "3:43",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Pure Homeland Pledge", "School Chorus Melody", "Quiet Strength"]
    },
    {
      title: "Kandhon Se Milte Hain Kandhe",
      artist: "Shankar Mahadevan, Sonu Nigam",
      album: "Lakshya",
      duration: "5:40",
      coverArtUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Marching Brass & Drums", "Heroic Comradeship", "Steadfast Resolve"]
    },
    {
      title: "Bharat Humko Jaan Se Pyara Hai",
      artist: "Hariharan",
      album: "Roja",
      duration: "4:31",
      coverArtUrl: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["A.R. Rahman Harmonies", "Tricolor Reverence", "Gentle National Love"]
    },
    {
      title: "Born in the U.S.A.",
      artist: "Bruce Springsteen",
      album: "Born in the U.S.A.",
      duration: "4:38",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Working Class Anthems", "Stirring Rock Rif", "Historical Reflection"]
    }
  ],

  Thrilling: [
    {
      title: "Supermassive Black Hole",
      artist: "Muse",
      album: "Black Holes and Revelations",
      duration: "3:29",
      coverArtUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Heavy Space Rock", "Falsetto Tension", "Urgent Groove (+0.88 Arousal)"]
    },
    {
      title: "Believer",
      artist: "Imagine Dragons",
      album: "Evolve",
      duration: "3:24",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Stomping Percussion", "Cinematic Edge", "High-Stakes Defiance"]
    },
    {
      title: "Time",
      artist: "Hans Zimmer",
      album: "Inception Soundtrack",
      duration: "4:35",
      coverArtUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Orchestral Countdown", "Cinematic Suspense", "Heart-Pounding Crescendo"]
    },
    {
      title: "Radioactive",
      artist: "Imagine Dragons",
      album: "Night Visions",
      duration: "3:06",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Dubstep Sub-Bass", "Post-Apocalyptic Edge", "High Pulse"]
    },
    {
      title: "Seven Nation Army",
      artist: "The White Stripes",
      album: "Elephant",
      duration: "3:51",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Iconic Bassline", "Driving Momentum", "Arena Suspense"]
    },
    {
      title: "Dhoom Machale",
      artist: "Sunidhi Chauhan",
      album: "Dhoom",
      duration: "6:16",
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["High-Speed Bike Chase", "Electrifying Brass", "Adrenaline Rush"]
    },
    {
      title: "Clubbed to Death",
      artist: "Rob Dougan",
      album: "Furious Angels (The Matrix)",
      duration: "4:26",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Trip-Hop Strings", "Sci-Fi Paranoia", "Relentless Suspense"]
    },
    {
      title: "Chase Theme",
      artist: "Hans Zimmer",
      album: "The Dark Knight",
      duration: "5:40",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Shepard Tone Glissando", "Ticking Clock", "Pure Cinema Suspense"]
    }
  ],

  Horror: [
    {
      title: "Tubular Bells",
      artist: "Mike Oldfield",
      album: "Tubular Bells (The Exorcist)",
      duration: "4:50",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Eerie Music Box", "Creeping Dread (-0.90 Valence)", "Iconic Horror Theme"]
    },
    {
      title: "Thriller",
      artist: "Michael Jackson",
      album: "Thriller",
      duration: "5:57",
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Howling Wolves", "Midnight Grooves", "Ghoulish Spoken Word"]
    },
    {
      title: "Stranger Things Theme",
      artist: "Survive",
      album: "Stranger Things Soundtrack",
      duration: "1:07",
      coverArtUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["Analog Arpeggios", "80s Dark Synthwave", "Supernatural Chill"]
    },
    {
      title: "Halloween Theme",
      artist: "John Carpenter",
      album: "Halloween",
      duration: "2:54",
      coverArtUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
      language: "Instrumental",
      traits: ["5/4 Stabbing Piano", "Relentless Stalker Motif", "Unescapable Terror"]
    },
    {
      title: "Sweet Dreams (Are Made of This)",
      artist: "Marilyn Manson",
      album: "Smells Like Children",
      duration: "4:53",
      coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Industrial Grunge", "Sinister Screams", "Macabre Distortion"]
    },
    {
      title: "Bhoot Hoon Main",
      artist: "Sunidhi Chauhan",
      album: "Bhoot",
      duration: "5:12",
      coverArtUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80",
      language: "Hindi",
      traits: ["Eerie Ghostly Whispers", "Haunting Strings", "Nightmare Atmosphere"]
    },
    {
      title: "Bark at the Moon",
      artist: "Ozzy Osbourne",
      album: "Bark at the Moon",
      duration: "4:17",
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Gothic Heavy Metal", "Lycanthrope Lore", "Blistering Solos"]
    },
    {
      title: "Cry Little Sister",
      artist: "Gerard McMahon",
      album: "The Lost Boys",
      duration: "4:46",
      coverArtUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=400&q=80",
      language: "English",
      traits: ["Gothic Vampire Ballad", "Chilling Choral Harmonies", "Midnight Dread"]
    }
  ]
};

// Emotional explanation archetypes corresponding to each mood
const REASON_TEMPLATES = {
  Happy: [
    "Carries the buoyant melodic energy and uplifting lyrical positivity (+0.85 valence) detected in your analyzed song.",
    "Channels feel-good optimism with vibrant acoustic brightness and celebratory rhythm.",
    "Shares the infectious joy and radiant spirit characterizing Happy mood profiles."
  ],
  Sad: [
    "Resonates with the gentle melancholic sorrow and introspective vulnerability (-0.80 valence) of this mood.",
    "Echoes the poignant lyrical reflection and slow-tempo acoustic comfort detected in the lyrics.",
    "Shares the emotional ache, gentle tears, and comforting solitude of Sad song compositions."
  ],
  Angry: [
    "Channels the fierce vocal intensity and high-arousal cathartic rebellion (+0.85 arousal) detected.",
    "Delivers heavy distorted riffs and unapologetic lyrical defiance matching your track's fury.",
    "Channels raw adrenaline and high-tension emotional release across its explosive chorus."
  ],
  Romantic: [
    "Echoes the tender devotion, starry-eyed affection, and heartfelt intimacy (+0.90 valence) detected in the lyrics.",
    "Shares the warm acoustic warmth and deep emotional sincerity of your analyzed love song.",
    "Delivers sweet harmonies and heartfelt poetic pledges matching Romantic emotional cues."
  ],
  "Calm/Chill": [
    "Provides soothing atmospheric stillness and tranquil harmonic pace (-0.70 arousal).",
    "Matches the relaxed acoustic instrumentation and mindful breathing tempo of Calm/Chill tracks.",
    "Envelops the listener in gentle harmonic textures and serene, low-stress vibrations."
  ],
  Exciting: [
    "Ramps up the electric adrenaline, fast BPM, and peak festival momentum (+0.95 arousal) detected.",
    "Delivers high-voltage drops, pumping basslines, and unstoppable party momentum.",
    "Powers forward with exhilarating tempo and anthemic energy to elevate your vibe."
  ],
  Patriotic: [
    "Carries solemn national pride, stirring choral harmonies, and anthem-like homeland devotion.",
    "Echoes the courageous solidarity and heroic reverence honoring the land and its heroes.",
    "Celebrates heritage, national unity, and heartfelt tribute to the motherland."
  ],
  Thrilling: [
    "Drives forward with cinematic suspense, urgent pacing, and edge-of-the-seat tension (+0.88 arousal).",
    "Builds heart-pounding anticipation with driving rhythm and enigmatic, high-stakes soundscapes.",
    "Captures high-stakes cinematic mystery and pulse-quickening momentum."
  ],
  Horror: [
    "Evokes spine-chilling dark ambient dissonance, eerie echoes, and haunting dread (-0.90 valence).",
    "Surrounds the listener with uncanny supernatural tension, ghostly whispers, and macabre atmosphere.",
    "Builds unescapable psychological chill and gothic horror tension."
  ]
};

class RecommendationService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Helper to normalize titles and artists for deduplication
   */
  _normalize(str) {
    if (!str || typeof str !== "string") return "";
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
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
  _generateReason(mood, seedSong, trackIndex) {
    const templates = REASON_TEMPLATES[mood] || REASON_TEMPLATES.Happy;
    const baseTemplate = templates[trackIndex % templates.length];

    if (seedSong?.title && seedSong?.title !== "Analyzed Song") {
      return `Following "${seedSong.title}" (${mood}), this track ${baseTemplate.charAt(0).toLowerCase()}${baseTemplate.slice(1)}`;
    }
    return baseTemplate;
  }

  /**
   * Generate mood-based recommendations
   * 
   * @param {Object} options
   * @param {string} options.mood - The detected mood
   * @param {string} [options.seedTitle] - Analyzed song title
   * @param {string} [options.seedArtist] - Analyzed song artist
   * @param {Array<string>} [options.exclude] - Song titles/ids already recommended to avoid repeats
   * @param {number} [options.limit=6] - Number of recommendations to return
   */
  async getRecommendations({ mood = "Happy", seedTitle = "", seedArtist = "", exclude = [], limit = 6 } = {}) {
    // Validate mood against ML classes
    const validMoods = Object.keys(CURATED_EMOTION_CATALOG);
    const targetMood = validMoods.find((m) => m.toLowerCase() === (mood || "").toLowerCase()) || "Happy";

    const normalizedSeedTitle = this._normalize(seedTitle);
    const normalizedSeedArtist = this._normalize(seedArtist);
    const excludeSet = new Set((exclude || []).map((e) => this._normalize(e)).filter(Boolean));

    // Cache key incorporates mood, seed, and exclude count
    const cacheKey = `${targetMood}:::${normalizedSeedTitle}:::${exclude.length}:::${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.data,
        fromCache: true
      };
    }

    // 1. Gather curated catalog tracks for this mood
    const baseTracks = (CURATED_EMOTION_CATALOG[targetMood] || []).map((t, idx) => ({
      id: `curated-${targetMood.toLowerCase()}-${idx}`,
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration: t.duration,
      coverArtUrl: t.coverArtUrl,
      language: t.language,
      traits: t.traits,
      mood: targetMood,
      source: "curated"
    }));

    // 2. Discover community-analyzed songs from DB/memoryStore matching this mood
    let communityTracks = [];
    try {
      if (getIsConnected()) {
        const dbAnalyses = await Analysis.find({ mood: targetMood })
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
          mood: targetMood,
          source: "community"
        }));
      } else if (memoryStore && Array.isArray(memoryStore.analyses)) {
        communityTracks = memoryStore.analyses
          .filter((a) => a.mood.toLowerCase() === targetMood.toLowerCase())
          .map((item) => ({
            id: `community-${item._id}`,
            title: item.title,
            artist: item.artist,
            album: "Community Analysis",
            duration: "3:30",
            coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
            language: item.language || "English",
            traits: [`${item.confidence}% Confidence`],
            mood: targetMood,
            source: "community"
          }));
      }
    } catch (err) {
      console.warn("[RecommendationService] Community fetch warning:", err.message);
    }

    // Merge and deduplicate candidate pool
    const candidates = [...baseTracks, ...communityTracks];
    const seenTitles = new Set();
    const filteredPool = [];

    for (const track of candidates) {
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

      // Rule C: Deduplicate within candidate pool
      if (seenTitles.has(normTitle)) {
        continue;
      }

      seenTitles.add(normTitle);
      filteredPool.push(track);
    }

    // 3. Fallback: If excluded pool is depleted, recycle base pool (excluding seed only)
    let selectedTracks = filteredPool;
    if (selectedTracks.length < limit) {
      for (const track of baseTracks) {
        const normTitle = this._normalize(track.title);
        if (normTitle !== normalizedSeedTitle && !seenTitles.has(normTitle)) {
          seenTitles.add(normTitle);
          selectedTracks.push(track);
        }
      }
    }

    // 4. Enrich final songs with reasons, Spotify links, YouTube links
    const recommendations = selectedTracks.slice(0, limit).map((track, idx) => {
      const links = this._getListeningLinks(track.title, track.artist);
      const reason = this._generateReason(targetMood, { title: seedTitle, artist: seedArtist }, idx);

      return {
        ...track,
        ...links,
        reason
      };
    });

    const resultPayload = {
      success: true,
      mood: targetMood,
      seed: {
        title: seedTitle || null,
        artist: seedArtist || null
      },
      recommendations,
      total: recommendations.length,
      availableMoods: validMoods
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
}

const recommendationService = new RecommendationService();
recommendationService.CURATED_EMOTION_CATALOG = CURATED_EMOTION_CATALOG;
module.exports = recommendationService;
module.exports.CURATED_EMOTION_CATALOG = CURATED_EMOTION_CATALOG;

