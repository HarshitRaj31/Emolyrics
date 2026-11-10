export const MOOD_DEFINITIONS = {
  Happy: {
    emoji: "☀️",
    color: "#f59e0b",
    gradient: "from-amber-400 via-orange-500 to-yellow-600",
    bgClass: "from-amber-950/60 via-orange-950/40 to-neutral-950",
    description: "Joyful, uplifting, vibrant celebration of life and laughter."
  },
  Sad: {
    emoji: "🌧️",
    color: "#3b82f6",
    gradient: "from-blue-600 via-indigo-700 to-slate-900",
    bgClass: "from-blue-950/60 via-slate-950/50 to-neutral-950",
    description: "Melancholic, poignant sorrow, emotional tears, and gentle grief."
  },
  Angry: {
    emoji: "🔥",
    color: "#ef4444",
    gradient: "from-red-600 via-red-800 to-neutral-950",
    bgClass: "from-red-950/60 via-rose-950/40 to-neutral-950",
    description: "Fiery wrath, defiant rebellion, intense fury, and high tension."
  },
  Romantic: {
    emoji: "💖",
    color: "#ec4899",
    gradient: "from-pink-500 via-rose-600 to-purple-800",
    bgClass: "from-pink-950/60 via-purple-950/40 to-neutral-950",
    description: "Sweet devotion, affectionate intimacy, starry eyes, and deep love."
  },
  "Calm/Chill": {
    emoji: "🌿",
    color: "#10b981",
    gradient: "from-teal-500 via-emerald-600 to-cyan-800",
    bgClass: "from-teal-950/60 via-emerald-950/40 to-neutral-950",
    description: "Peaceful tranquility, slow breathing, ocean whispers, and serene calm."
  },
  Exciting: {
    emoji: "⚡",
    color: "#8b5cf6",
    gradient: "from-violet-500 via-purple-600 to-amber-500",
    bgClass: "from-purple-950/60 via-violet-950/40 to-neutral-950",
    description: "Electric adrenaline, energetic anthems, unstoppable hype, and speed."
  },
  Patriotic: {
    emoji: "🇮🇳",
    color: "#f97316",
    gradient: "from-orange-500 via-neutral-200 to-emerald-600",
    bgClass: "from-orange-950/50 via-neutral-950/70 to-emerald-950/50",
    description: "National pride, honoring the motherland, heroic solidarity, and anthem power."
  },
  Thrilling: {
    emoji: "🎬",
    color: "#a855f7",
    gradient: "from-purple-600 via-fuchsia-800 to-indigo-950",
    bgClass: "from-purple-950/60 via-fuchsia-950/40 to-neutral-950",
    description: "Cinematic edge-of-seat suspense, mysterious danger, and heart-pounding chase."
  },
  Horror: {
    emoji: "👻",
    color: "#dc2626",
    gradient: "from-red-900 via-neutral-950 to-black",
    bgClass: "from-red-950/80 via-black to-neutral-950",
    description: "Eerie darkness, chilling hauntings, nightmare tremors, and dread."
  }
};

export const EXAMPLE_LYRICS = [
  {
    mood: "Happy",
    title: "Golden Sunshine",
    artist: "The Sunbeam Collective",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    lyrics: "Walking on sunshine, feeling so alive\nEvery moment sparkles, happiness will thrive\nSmiles all around me, laughter fills the air\nLife is so amazing, not a single care",
    language: "English"
  },
  {
    mood: "Sad",
    title: "Raindrops on Glass",
    artist: "Velvet Shadows",
    image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80",
    lyrics: "Tears fall like rain on my window pane\nLoneliness whispers, echoing my pain\nMemories of you haunt me every night\nIn this empty room, nothing feels right",
    language: "English"
  },
  {
    mood: "Angry",
    title: "Internal Fire",
    artist: "Rage Horizon",
    image: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80",
    lyrics: "Fire burning inside, rage I cannot hide\nBroken promises, you lied and lied\nShattered trust, this fury will not fade\nYou crossed the line, now the price must be paid",
    language: "English"
  },
  {
    mood: "Romantic",
    title: "Constellations in Your Eyes",
    artist: "Starlight Duo",
    image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80",
    lyrics: "Your eyes hold galaxies, your smile lights my way\nIn your arms forever, is where I want to stay\nEvery kiss a promise, every touch so sweet\nOur love is endless, two hearts that beat",
    language: "English"
  },
  {
    mood: "Calm/Chill",
    title: "Ocean Whisper",
    artist: "Serene Waves",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    lyrics: "Soft breeze whispers through the trees\nPeaceful moments, mind at ease\nWaves gently rolling on the shore\nIn this stillness, I need nothing more",
    language: "English"
  },
  {
    mood: "Exciting",
    title: "Ignite the Night",
    artist: "Voltage Crew",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    lyrics: "Electric energy, we're ready to ignite\nPumping through our veins, we own the night\nNo limits, no boundaries, we're breaking free\nThis adrenaline rush is all we need to be",
    language: "English"
  },
  {
    mood: "Romantic",
    title: "Kesariya (Hindi Devanagari)",
    artist: "Arijit Singh",
    image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80",
    lyrics: "केसरिया तेरा इश्क़ है पिया, रंग जाऊं जो मैं हाथ लगाऊं\nदिन बीते सारा तेरी फ़िक्र में, रैन सारी तेरी खैर मनाऊं\nदिल की चाहत में डूबा हमसफ़र, सनम तेरे प्यार का दीवाना",
    language: "Hindi",
    flag: "🇮🇳"
  },
  {
    mood: "Happy",
    title: "Anondodhārā (Bengali)",
    artist: "Rabindranath Tagore",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    lyrics: "আনন্দধারা বহিছে ভুবনে, দিন রজনী কত অমৃতা রসধারা\nহাসিমুখ উল্লাস আর সুখের মিষ্টি আলো\nসকল ভুবনে গান বাজে আনন্দের",
    language: "Bengali",
    flag: "🇧🇩"
  },
  {
    mood: "Happy",
    title: "Fiesta y Sol (Spanish)",
    artist: "Sol Latino",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&q=80",
    lyrics: "Qué alegría y felicidad bailar bajo el sol brillante\nCantar celebrar el gozo de la fiesta con una gran sonrisa\nDisfrutar de la vida hermosa todos juntos",
    language: "Spanish",
    flag: "🇪🇸"
  },
  {
    mood: "Romantic",
    title: "La Vie En Rose (French)",
    artist: "Édith Piaf",
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80",
    lyrics: "Quand il me prend dans ses bras, il me parle tout bas\nC'est l'amour de ma vie et la tendresse de mon cœur\nDes mots d'amour de tous les jours, et ça me fait quelque chose",
    language: "French",
    flag: "🇫🇷"
  },
  {
    mood: "Patriotic",
    title: "Watan Ke Geet (Hindi)",
    artist: "Desh Ke Sipahi",
    image: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=600&q=80",
    lyrics: "Tiranga lehraye aasmaan me shaan se\nDesh hamara sabse pyara jaan se\nVeer jawan karenge watan ki hifazat\nHindustan ki mitti me basi hai virasat",
    language: "Hindi (Hinglish)",
    flag: "🇮🇳"
  },
  {
    mood: "Thrilling",
    title: "Midnight Suspense",
    artist: "Neon Syndicate",
    image: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80",
    lyrics: "On the edge, heart racing fast\nDanger lurking, shadows cast\nMystery unfolds, suspense so high\nIn this moment, we're alive or die",
    language: "English"
  },
  {
    mood: "Horror",
    title: "Echoes from the Grave",
    artist: "Phantom Hollow",
    image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=600&q=80",
    lyrics: "Shadows creeping, darkness calling\nEerie silence, terror's falling\nWhispers echo from the grave\nNo escape, no one to save",
    language: "English"
  }
];
