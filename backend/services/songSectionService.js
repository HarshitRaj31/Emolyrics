/**
 * EmoLyrics Song Section Detection & Emotional Journey Analyzer
 *
 * Identifies song structure (Intro, Verse, Chorus, Bridge, Outro) using:
 *  1. Explicit structural headers ([Chorus], [Verse 1], (Bridge), etc.)
 *  2. Refrain / repeated stanza detection when headers are absent
 *  3. Coherent stanza grouping
 *
 * Computes data-driven emotional progression:
 *  - Dominant emotion per section
 *  - Section-level 10-emotion probability distribution
 *  - Emotional intensity and diversity (Shannon entropy)
 *  - Significant emotional transitions across sections
 *  - Strongest and most diverse sections
 *  - Beginning-to-ending emotional trajectory
 */

const SECTION_HEADER_REGEX = /^(?:\[(.*?)\]|\((.*?)\)|(intro|verse|chorus|bridge|outro|pre-chorus|hook|interlude|refrain)\s*([\d:]*))$/i;

class SongSectionService {
  /**
   * Partitions lines into structured sections and calculates emotional journey metrics
   * @param {Array} analyzedLines - Array of analyzed line objects from line-by-line model
   * @param {string} rawLyrics - Original raw lyrics text
   * @param {string} primarySongEmotion - Overall song primary emotion as fallback
   */
  analyzeSectionsAndJourney(analyzedLines = [], rawLyrics = "", primarySongEmotion = "Happiness") {
    if (!analyzedLines || analyzedLines.length === 0) {
      return {
        sections: [],
        transitions: [],
        strongestSection: null,
        mostDiverseSection: null,
        beginningToEnding: null,
        dominantProgression: []
      };
    }

    // 1. Group analyzed lines into sections
    const rawSections = this._partitionLines(analyzedLines, rawLyrics);

    // 2. Compute metrics for each section
    const sections = rawSections.map((sec, idx) => {
      return this._computeSectionMetrics(sec, idx + 1, primarySongEmotion);
    });

    // 3. Compute emotional journey and transitions between sections
    const journey = this._computeJourney(sections);

    return {
      sections,
      ...journey
    };
  }

  /**
   * Partitions lines by explicit headers or repeated refrain heuristics
   */
  _partitionLines(analyzedLines, rawLyrics) {
    const sections = [];
    let currentSection = null;
    let autoSectionCounter = 1;

    for (let i = 0; i < analyzedLines.length; i++) {
      const line = analyzedLines[i];

      if (line.isSectionHeader) {
        // Close previous section if it has lines
        if (currentSection && currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        const cleanTitle = (line.text || "").replace(/[\[\]()]/g, "").trim();
        currentSection = {
          title: cleanTitle || `Section ${autoSectionCounter++}`,
          explicitHeader: true,
          lines: []
        };
      } else {
        if (!currentSection) {
          currentSection = {
            title: `Verse 1`,
            explicitHeader: false,
            lines: []
          };
        }
        currentSection.lines.push(line);
      }
    }

    if (currentSection && currentSection.lines.length > 0) {
      sections.push(currentSection);
    }

    // If no explicit headers were present and we only have 1 massive section,
    // detect natural stanza splits (separated by blank lines in raw text) or repeating refrains
    if (sections.length === 1 && !sections[0].explicitHeader) {
      const stanzaSections = this._detectStanzasAndRefrains(analyzedLines, rawLyrics);
      if (stanzaSections.length > 1) {
        return stanzaSections;
      }
    }

    return sections;
  }

  /**
   * Refrain & Stanza Heuristic Detector when explicit headers are absent
   */
  _detectStanzasAndRefrains(analyzedLines, rawLyrics) {
    const rawLines = (rawLyrics || "").split(/\r?\n/);
    const stanzas = [];
    let currentStanza = [];

    let lineMapIdx = 0;
    for (let r = 0; r < rawLines.length; r++) {
      const trimmed = rawLines[r].trim();
      if (!trimmed) {
        if (currentStanza.length > 0) {
          stanzas.push(currentStanza);
          currentStanza = [];
        }
      } else {
        if (lineMapIdx < analyzedLines.length) {
          currentStanza.push(analyzedLines[lineMapIdx++]);
        }
      }
    }
    if (currentStanza.length > 0) {
      stanzas.push(currentStanza);
    }

    if (stanzas.length <= 1) {
      return [{
        title: "Full Song",
        explicitHeader: false,
        lines: analyzedLines
      }];
    }

    // Identify repeated stanzas as Chorus
    const stanzaSignatures = stanzas.map(st =>
      st.map(l => (l.text || "").toLowerCase().replace(/[^a-z0-9]/g, "")).join(" ")
    );

    const counts = {};
    stanzaSignatures.forEach(sig => {
      if (sig.length > 10) counts[sig] = (counts[sig] || 0) + 1;
    });

    const isRepeating = sig => (counts[sig] || 0) > 1;

    let verseCount = 1;
    let chorusCount = 1;
    const namedSections = [];

    for (let s = 0; s < stanzas.length; s++) {
      const stanzaLines = stanzas[s];
      const sig = stanzaSignatures[s];
      let title;

      if (isRepeating(sig)) {
        title = chorusCount === 1 ? "Chorus" : `Chorus ${chorusCount}`;
        chorusCount++;
      } else if (s === 0 && stanzaLines.length <= 2) {
        title = "Intro";
      } else if (s === stanzas.length - 1 && stanzaLines.length <= 3 && chorusCount > 1) {
        title = "Outro";
      } else if (s > 1 && s === stanzas.length - 2 && !isRepeating(sig) && chorusCount > 1) {
        title = "Bridge";
      } else {
        title = `Verse ${verseCount++}`;
      }

      namedSections.push({
        title,
        explicitHeader: false,
        lines: stanzaLines
      });
    }

    return namedSections;
  }

  /**
   * Computes section-level dominant emotion, probability distribution, and diversity entropy
   */
  _computeSectionMetrics(sec, sectionNumber, primarySongEmotion) {
    const lines = sec.lines || [];
    const id = `section-${sectionNumber}`;
    const title = sec.title || `Section ${sectionNumber}`;

    // Infer section structural type
    const lowerTitle = title.toLowerCase();
    let type = "section";
    if (lowerTitle.includes("intro")) type = "intro";
    else if (lowerTitle.includes("chorus") || lowerTitle.includes("hook") || lowerTitle.includes("refrain")) type = "chorus";
    else if (lowerTitle.includes("verse")) type = "verse";
    else if (lowerTitle.includes("bridge")) type = "bridge";
    else if (lowerTitle.includes("outro")) type = "outro";

    if (lines.length === 0) {
      return {
        id,
        sectionNumber,
        title,
        type,
        startLine: 0,
        endLine: 0,
        lines: [],
        dominantEmotion: primarySongEmotion,
        averageConfidence: 75.0,
        emotionalIntensity: 75.0,
        emotionalDiversity: 0.0,
        emotionDistribution: { [primarySongEmotion]: 100 }
      };
    }

    const startLine = lines[0].lineNumber || 1;
    const endLine = lines[lines.length - 1].lineNumber || lines.length;

    // Sum probabilities across all lines in this section
    const emotionSums = {};
    let confSum = 0;
    let maxConf = 0;

    for (const line of lines) {
      const conf = line.confidence || 0.7;
      confSum += conf;
      if (conf > maxConf) maxConf = conf;

      const probs = line.emotionProbabilities || {};
      for (const [emo, p] of Object.entries(probs)) {
        emotionSums[emo] = (emotionSums[emo] || 0) + Number(p);
      }
    }

    // Calculate section-level normalized percentages
    const totalWeight = Object.values(emotionSums).reduce((a, b) => a + b, 0);
    const emotionDistribution = {};
    let dominantEmotion = primarySongEmotion;
    let highestPct = -1;

    if (totalWeight > 0) {
      let allocated = 0;
      for (const [emo, sum] of Object.entries(emotionSums)) {
        const pct = Math.round((sum / totalWeight) * 100);
        emotionDistribution[emo] = pct;
        allocated += pct;
        if (pct > highestPct) {
          highestPct = pct;
          dominantEmotion = emo;
        }
      }
      // Reconcile rounding to dominant emotion
      const diff = 100 - allocated;
      if (emotionDistribution[dominantEmotion] !== undefined) {
        emotionDistribution[dominantEmotion] = Math.max(0, emotionDistribution[dominantEmotion] + diff);
      }
    } else {
      emotionDistribution[primarySongEmotion] = 100;
    }

    // Shannon Entropy for Emotional Diversity: H = -sum(p * ln(p))
    let entropy = 0;
    for (const pct of Object.values(emotionDistribution)) {
      if (pct > 0) {
        const p = pct / 100.0;
        entropy -= p * Math.log2(p);
      }
    }
    // Normalize entropy to 0.0 - 1.0 range (max entropy for 10 classes is log2(10) ≈ 3.32)
    const normalizedDiversity = Math.round((entropy / 3.322) * 100) / 100;

    const avgConfidence = Math.round((confSum / lines.length) * 100 * 10) / 10;
    const emotionalIntensity = Math.round(maxConf * 100 * 10) / 10;

    return {
      id,
      sectionNumber,
      title,
      type,
      startLine,
      endLine,
      lines,
      dominantEmotion,
      averageConfidence: avgConfidence,
      emotionalIntensity: emotionalIntensity,
      emotionalDiversity: normalizedDiversity,
      emotionDistribution
    };
  }

  /**
   * Computes transitions and overall emotional journey
   */
  _computeJourney(sections) {
    if (!sections || sections.length === 0) {
      return {
        transitions: [],
        strongestSection: null,
        mostDiverseSection: null,
        beginningToEnding: null,
        dominantProgression: []
      };
    }

    const dominantProgression = sections.map(s => ({
      sectionId: s.id,
      sectionTitle: s.title,
      sectionType: s.type,
      dominantEmotion: s.dominantEmotion,
      confidence: s.averageConfidence,
      intensity: s.emotionalIntensity
    }));

    // Identify significant emotional transitions between consecutive sections
    const transitions = [];
    for (let i = 0; i < sections.length - 1; i++) {
      const fromSec = sections[i];
      const toSec = sections[i + 1];

      if (fromSec.dominantEmotion !== toSec.dominantEmotion) {
        transitions.push({
          transitionIndex: transitions.length + 1,
          fromSection: fromSec.title,
          fromEmotion: fromSec.dominantEmotion,
          toSection: toSec.title,
          toEmotion: toSec.dominantEmotion,
          magnitude: Math.abs(toSec.averageConfidence - fromSec.averageConfidence) >= 10 ? "major" : "subtle",
          description: `Emotional shift from ${fromSec.dominantEmotion} in ${fromSec.title} to ${toSec.dominantEmotion} in ${toSec.title}`
        });
      }
    }

    // Strongest section (highest intensity / peak confidence)
    let strongestSection = sections[0];
    let mostDiverseSection = sections[0];

    for (const sec of sections) {
      if (sec.emotionalIntensity > strongestSection.emotionalIntensity) {
        strongestSection = sec;
      }
      if (sec.emotionalDiversity > mostDiverseSection.emotionalDiversity) {
        mostDiverseSection = sec;
      }
    }

    // Beginning-to-ending trajectory
    const openingSec = sections[0];
    const closingSec = sections[sections.length - 1];
    let trajectorySummary;

    if (openingSec.dominantEmotion === closingSec.dominantEmotion) {
      trajectorySummary = `Maintains a consistent overarching theme of ${openingSec.dominantEmotion} from beginning to end.`;
    } else {
      trajectorySummary = `Begins in ${openingSec.dominantEmotion} and transforms into ${closingSec.dominantEmotion} as the song concludes.`;
    }

    const beginningToEnding = {
      openingSection: openingSec.title,
      openingEmotion: openingSec.dominantEmotion,
      closingSection: closingSec.title,
      closingEmotion: closingSec.dominantEmotion,
      isEvolution: openingSec.dominantEmotion !== closingSec.dominantEmotion,
      summary: trajectorySummary
    };

    return {
      transitions,
      strongestSection: {
        id: strongestSection.id,
        title: strongestSection.title,
        dominantEmotion: strongestSection.dominantEmotion,
        intensity: strongestSection.emotionalIntensity
      },
      mostDiverseSection: {
        id: mostDiverseSection.id,
        title: mostDiverseSection.title,
        dominantEmotion: mostDiverseSection.dominantEmotion,
        diversity: mostDiverseSection.emotionalDiversity
      },
      beginningToEnding,
      dominantProgression
    };
  }
}

const songSectionService = new SongSectionService();

module.exports = {
  songSectionService,
  SongSectionService
};

