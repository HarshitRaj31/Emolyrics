/**
 * EmoLyrics Plugin Registry Catalog
 * Defines the initial set of 6 trusted integrations with metadata, settings schemas,
 * permissions, and compliance guarantees.
 */

export const PLUGIN_CATEGORIES = [
  "All",
  "Metadata & Discovery",
  "Streaming Integration",
  "Lyrics & Content",
  "Audio & Video",
  "AI & Analytics",
  "Localization"
];

export const INITIAL_PLUGINS = [
  {
    id: "musicbrainz",
    name: "MusicBrainz Explorer",
    tagline: "Free & open recording, artist, and album release metadata",
    category: "Metadata & Discovery",
    version: "1.2.0",
    author: "MetaBrainz Foundation Community",
    authorUrl: "https://musicbrainz.org",
    icon: "Disc3",
    color: "#38bdf8", // Sky blue
    gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    description:
      "Connects EmoLyrics directly to the free, public MusicBrainz database. Search tracks by title, artist, or album release without proprietary API keys. Automatically links with the open Cover Art Archive to display official album artwork.",
    features: [
      "Real-time track search with artist credits and release dates",
      "Automatic Cover Art Archive cover resolution (front-250 / front-500)",
      "Release disambiguation (studio album, remix, single, live version)",
      "Strict compliance with MusicBrainz rate-limiting etiquette"
    ],
    permissions: [
      "Read public track and artist metadata",
      "Display release artwork from Cover Art Archive"
    ],
    complianceNotice:
      "Uses the official, free MusicBrainz XML/JSON REST API. No private API key or account registration required. Operates under open community data licensing.",
    featured: true,
    rating: 4.9,
    reviewsCount: 342,
    downloads: "14.2k",
    defaultInstalled: true,
    defaultEnabled: true,
    settingsFields: [
      {
        key: "searchLimit",
        label: "Max Search Results",
        type: "select",
        options: [
          { value: 5, label: "5 results" },
          { value: 10, label: "10 results (Recommended)" },
          { value: 20, label: "20 results" }
        ],
        default: 10
      },
      {
        key: "fetchCoverArt",
        label: "Fetch High-Res Album Art",
        type: "boolean",
        description: "Automatically retrieve cover images from the Cover Art Archive",
        default: true
      },
      {
        key: "includeDisambiguation",
        label: "Show Release Disambiguation",
        type: "boolean",
        description: "Display notes such as (Remastered), (Acoustic), or (Live)",
        default: true
      }
    ]
  },
  {
    id: "lrclib-lyrics",
    name: "LRCLIB Lyrics Provider",
    tagline: "Authorized, legal & non-scraping plain and synced lyrics",
    category: "Lyrics & Content",
    version: "2.1.0",
    author: "LRCLIB Open Community",
    authorUrl: "https://lrclib.net",
    icon: "FileText",
    color: "#10b981", // Emerald green
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    description:
      "Official integration with LRCLIB, the crowd-sourced, open-license lyrics database. Retrieves plain and time-synchronized lyrics strictly through authorized public REST endpoints. Zero web scraping, zero copyright evasion.",
    features: [
      "Authorized REST API delivering clean, curated plain lyrics",
      "Time-synchronized lyrics (LRC timestamps) capability",
      "Automatic detection of instrumental tracks without lyrics",
      "High accuracy matching via track name, artist, and duration"
    ],
    permissions: [
      "Retrieve song lyrics via authorized API",
      "Send lyrics to built-in emotion classifier"
    ],
    complianceNotice:
      "100% legal, non-scraping API. LRCLIB operates as an open community resource designed specifically for music players and developer tools. No scraping of copyrighted websites.",
    featured: true,
    rating: 5.0,
    reviewsCount: 518,
    downloads: "22.5k",
    defaultInstalled: true,
    defaultEnabled: true,
    settingsFields: [
      {
        key: "preferSyncedLyrics",
        label: "Enable Synchronized Lyrics (LRC)",
        type: "boolean",
        description: "Store time-tagged lyrics when available for future audio sync",
        default: true
      },
      {
        key: "fallbackToTitleSearch",
        label: "Fuzzy Title Search Fallback",
        type: "boolean",
        description: "Search by title if exact artist-track combination returns empty",
        default: true
      },
      {
        key: "stripUnsynchronizedTags",
        label: "Clean Text Formatting",
        type: "boolean",
        description: "Automatically strip bracketed audio cues like [Guitar Solo]",
        default: true
      }
    ]
  },
  {
    id: "ai-insights",
    name: "AI Mood Insights",
    tagline: "Deep dimensional valence-arousal & psychological analysis",
    category: "AI & Analytics",
    version: "2.0.1",
    author: "EmoLyrics Research Lab",
    authorUrl: "https://github.com/Chandrima2507/SONG_LYRICS_EMOTION_CLASSIFICATION07",
    icon: "BrainCircuit",
    color: "#a855f7", // Purple
    gradient: "from-purple-500/20 via-fuchsia-500/10 to-transparent",
    description:
      "Enhances the built-in ML classifier with multi-dimensional psychological breakdown. Visualizes lyrical positivity (valence), arousal (energy level), sentiment polarity, and highlights emotional triggers within song verses.",
    features: [
      "Valence-Arousal dimensional mood mapping",
      "Keyword density radar with emotional weight breakdown",
      "Bilingual psychological explanation for English and Hindi/Hinglish",
      "Completely private: runs entirely on your local EmoLyrics instance"
    ],
    permissions: [
      "Read NLP prediction scores",
      "Generate dimensional psychological breakdown"
    ],
    complianceNotice:
      "Runs on top of the built-in NLP emotion classification model. Zero third-party cloud analytics or external trackers.",
    featured: true,
    rating: 4.9,
    reviewsCount: 409,
    downloads: "18.7k",
    defaultInstalled: true,
    defaultEnabled: true,
    settingsFields: [
      {
        key: "detailLevel",
        label: "Insight Depth",
        type: "select",
        options: [
          { value: "standard", label: "Standard (Valence & Key Words)" },
          { value: "deep", label: "Deep (Valence, Arousal & Secondary Moods)" },
          { value: "research", label: "Research (Full Lexical Weight Matrix)" }
        ],
        default: "deep"
      },
      {
        key: "highlightKeywords",
        label: "Highlight Emotion Triggers in Lyrics",
        type: "boolean",
        description: "Visually emphasize detected emotional keywords in lyrics view",
        default: true
      },
      {
        key: "showSecondaryMoods",
        label: "Display Secondary Mood Candidates",
        type: "boolean",
        description: "Show runner-up emotions with confidence percentages",
        default: true
      }
    ]
  },
  {
    id: "spotify",
    name: "Spotify Connect",
    tagline: "Track link discovery, artist insights & album linking",
    category: "Streaming Integration",
    version: "1.0.4",
    author: "EmoLyrics Ecosystem",
    icon: "Headphones",
    color: "#22c55e", // Spotify Green
    gradient: "from-green-500/20 via-emerald-500/10 to-transparent",
    description:
      "Enables Spotify track linking, artist follower metrics, and web player deep links. Core EmoLyrics mood analysis remains 100% operational without Spotify. Note: Audio streaming requires active Spotify Premium eligibility and official authorization.",
    features: [
      "Instant Spotify web player links for matched songs",
      "Artist follower counts, popularity index, and genre tags",
      "Seamless album view redirection",
      "Graceful degradation when Spotify credentials are not configured"
    ],
    permissions: [
      "Read public track metadata via Spotify Web API",
      "Deep link to official Spotify Web Player"
    ],
    complianceNotice:
      "Adheres strictly to Spotify Developer Terms of Service. Does not attempt unofficial playback or scrape Spotify servers. Full streaming playback requires user's own Spotify Premium account.",
    featured: false,
    rating: 4.8,
    reviewsCount: 284,
    downloads: "9.8k",
    defaultInstalled: false,
    defaultEnabled: false,
    settingsFields: [
      {
        key: "marketCode",
        label: "Default Regional Market",
        type: "select",
        options: [
          { value: "US", label: "United States (US)" },
          { value: "IN", label: "India (IN)" },
          { value: "GB", label: "United Kingdom (GB)" },
          { value: "GLOBAL", label: "Global / Worldwide" }
        ],
        default: "GLOBAL"
      },
      {
        key: "autoMatchTrackLink",
        label: "Auto-Generate Spotify Link",
        type: "boolean",
        description: "Automatically search for Spotify track link after mood analysis",
        default: true
      },
      {
        key: "showPopularityIndex",
        label: "Show Popularity Metric",
        type: "boolean",
        description: "Display Spotify's 0-100 track popularity score",
        default: false
      }
    ]
  },
  {
    id: "youtube-discovery",
    name: "YouTube Music Discovery",
    tagline: "Official music videos, acoustic sessions & live performances",
    category: "Audio & Video",
    version: "1.1.2",
    author: "EmoLyrics Ecosystem",
    icon: "Video",
    color: "#ef4444", // YouTube Red
    gradient: "from-red-500/20 via-rose-500/10 to-transparent",
    description:
      "Finds official music videos and live performances matching the analyzed song. Displays official embeds and external YouTube links without scraping or downloading protected media.",
    features: [
      "Finds official music videos, lyric videos, and acoustic versions",
      "Displays secure, responsive YouTube iframe embeds",
      "External video links opening directly in YouTube Music",
      "Strict adherence: zero media downloading or ripping"
    ],
    permissions: [
      "Query public YouTube Search endpoints",
      "Embed official YouTube video players"
    ],
    complianceNotice:
      "Integrates via standard YouTube IFrame Embed API. All playback generates views for the official copyright holders. No video downloading or format conversion.",
    featured: false,
    rating: 4.7,
    reviewsCount: 219,
    downloads: "11.3k",
    defaultInstalled: false,
    defaultEnabled: false,
    settingsFields: [
      {
        key: "embedMode",
        label: "Display Mode",
        type: "select",
        options: [
          { value: "embed", label: "Inline Video Embed Player" },
          { value: "link_only", label: "External Link Badge Only" }
        ],
        default: "embed"
      },
      {
        key: "preferOfficialOnly",
        label: "Prioritize VEVO / Official Artists",
        type: "boolean",
        description: "Filter out fan covers and unauthorized re-uploads",
        default: true
      },
      {
        key: "safeSearch",
        label: "SafeSearch Filter",
        type: "select",
        options: [
          { value: "moderate", label: "Moderate Filter" },
          { value: "strict", label: "Strict Filter" }
        ],
        default: "moderate"
      }
    ]
  },
  {
    id: "lyrics-translator",
    name: "Multi-Language Lyrics Translator",
    tagline: "Translate song lyrics across English, Hindi, Spanish & more",
    category: "Localization",
    version: "1.3.0",
    author: "OpenTranslation Project",
    icon: "Languages",
    color: "#f59e0b", // Amber
    gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
    description:
      "Enables bilingual side-by-side lyrics view for international and regional music. Translates between English, Hindi, Spanish, French, German, and Japanese using authorized public translation endpoints.",
    features: [
      "Side-by-side original and translated lyrics display",
      "Support for Hindi (Devanagari), English, Spanish, French, and Japanese",
      "Preserves verse line-breaks and poetic rhythm formatting",
      "Client-side caching to prevent repeated translation requests"
    ],
    permissions: [
      "Read lyrics text for translation",
      "Query authorized translation endpoint"
    ],
    complianceNotice:
      "Provides derivative text translations solely for non-commercial linguistic and educational understanding. Complies with authorized translation API limits.",
    featured: false,
    rating: 4.6,
    reviewsCount: 167,
    downloads: "8.1k",
    defaultInstalled: false,
    defaultEnabled: false,
    settingsFields: [
      {
        key: "defaultTargetLanguage",
        label: "Default Translation Language",
        type: "select",
        options: [
          { value: "en", label: "English" },
          { value: "hi", label: "Hindi (हिंदी)" },
          { value: "es", label: "Spanish (Español)" },
          { value: "fr", label: "French (Français)" },
          { value: "de", label: "German (Deutsch)" },
          { value: "ja", label: "Japanese (日本語)" }
        ],
        default: "en"
      },
      {
        key: "showSideBySide",
        label: "Side-by-Side Dual View",
        type: "boolean",
        description: "Display original lyrics and translation in two parallel columns",
        default: true
      },
      {
        key: "autoDetectSource",
        label: "Auto-Detect Source Language",
        type: "boolean",
        description: "Automatically identify whether lyrics are English, Hindi, or others",
        default: true
      }
    ]
  }
];
