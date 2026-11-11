/**
 * EmoLyrics Client-Side PDF Report Generator
 * Pure JavaScript PDF-1.4 binary document builder.
 * Generates formatted, multi-page analysis reports with zero external dependencies.
 */

// Indic Script Transliteration & Latin-1 Diacritics Mapping
// Enables Unicode support for Hindi (Devanagari) and Bengali in PDF-1.4 Type-1 Helvetica fonts
const DEV_VOWELS = { "अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ऋ":"ri","ए":"e","ऐ":"ai","ओ":"o","औ":"au" };
const DEV_MATRAS = { "ा":"aa","ि":"i","ी":"ee","ु":"u","ू":"oo","ृ":"ri","े":"e","ै":"ai","ो":"o","ौ":"au","्":"" };
const DEV_CONS = {
  "क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"ng",
  "च":"ch","छ":"chh","ज":"j","झ":"jh","ञ":"ny",
  "ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n",
  "त":"t","थ":"th","द":"d","ध":"dh","न":"n",
  "प":"p","फ":"ph","ब":"b","भ":"bh","म":"m",
  "य":"y","र":"r","ल":"l","व":"v",
  "श":"sh","ष":"sh","स":"s","ह":"h",
  "क़":"q","ख़":"kh","ग़":"gh","ज़":"z","ड़":"r","ढ़":"rh","फ़":"f"
};

const BN_VOWELS = { "অ":"o","আ":"a","ই":"i","ঈ":"ee","উ":"u","ঊ":"oo","ঋ":"ri","এ":"e","ঐ":"oi","ও":"o","ঔ":"ou" };
const BN_MATRAS = { "া":"a","ি":"i","ী":"ee","ু":"u","ূ":"oo","ৃ":"ri","ে":"e","ৈ":"oi","ো":"o","ৌ":"ou","্":"" };
const BN_CONS = {
  "ক":"k","খ":"kh","গ":"g","ঘ":"gh","ঙ":"ng",
  "চ":"ch","ছ":"chh","জ":"j","ঝ":"jh","ঞ":"ny",
  "ট":"t","ঠ":"th","ড":"d","ঢ":"dh","ণ":"n",
  "ত":"t","থ":"th","দ":"d","ध":"dh","ন":"n",
  "প":"p","ফ":"ph","ব":"b","ভ":"bh","ম":"m",
  "য":"j","র":"r","ল":"l",
  "শ":"sh","ষ":"sh","স":"s","হ":"h",
  "ড়":"r","ঢ়":"rh","য়":"y","ৎ":"t"
};

const INDIC_MODIFIERS = {
  "ं":"n","ँ":"n","ः":"h","ং":"ng","ঁ":"n","ঃ":"h","ऽ":"'"
};

const LATIN_ACCENTS = {
  "á":"a","à":"a","â":"a","ä":"a","ã":"a","å":"a",
  "é":"e","è":"e","ê":"e","ë":"e",
  "í":"i","ì":"i","î":"i","ï":"i",
  "ó":"o","ò":"o","ô":"o","ö":"o","õ":"o",
  "ú":"u","ù":"u","û":"u","ü":"u",
  "ñ":"n","ç":"c","ý":"y","ÿ":"y",
  "Á":"A","À":"A","Â":"A","Ä":"A","Ã":"A",
  "É":"E","È":"E","Ê":"E","Ë":"E",
  "Í":"I","Ì":"I","Î":"I","Ï":"I",
  "Ó":"O","Ò":"O","Ô":"O","Ö":"O","Õ":"O",
  "Ú":"U","Ù":"U","Û":"U","Ü":"U",
  "Ñ":"N","Ç":"C","¿":"?","¡":"!"
};

export function transliterateIndicAndAccents(text) {
  if (!text) return "";
  let out = "";
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];
    const next = i + 1 < len ? text[i + 1] : "";

    // 1. Latin Accents
    if (LATIN_ACCENTS[ch] !== undefined) {
      out += LATIN_ACCENTS[ch];
      continue;
    }

    // 2. Devanagari Script
    if (DEV_VOWELS[ch] !== undefined) {
      out += DEV_VOWELS[ch];
      continue;
    }
    if (DEV_CONS[ch] !== undefined) {
      if (next && DEV_MATRAS[next] !== undefined) {
        out += DEV_CONS[ch] + DEV_MATRAS[next];
        i++; // skip matra
      } else {
        out += DEV_CONS[ch] + "a";
      }
      continue;
    }

    // 3. Bengali Script
    if (BN_VOWELS[ch] !== undefined) {
      out += BN_VOWELS[ch];
      continue;
    }
    if (BN_CONS[ch] !== undefined) {
      if (next && BN_MATRAS[next] !== undefined) {
        out += BN_CONS[ch] + BN_MATRAS[next];
        i++; // skip matra
      } else {
        out += BN_CONS[ch] + "a";
      }
      continue;
    }

    // 4. Modifiers (Anusvara, Chandrabindu, Visarga)
    if (INDIC_MODIFIERS[ch] !== undefined) {
      out += INDIC_MODIFIERS[ch];
      continue;
    }

    // 5. Default
    out += ch;
  }

  return out;
}

// Helper to sanitize and encode text for standard PDF Type-1 fonts
function sanitizePdfText(str) {
  if (!str) return "";
  // Transliterate Indic and normalize accents first so text is never erased into blanks
  const transliterated = transliterateIndicAndAccents(String(str));

  return transliterated
    // Replace smart quotes and dashes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    // Remove non-printable chars outside ASCII printable range
    .replace(/[^\x20-\x7E\r\n\t]/g, "")
    // Escape PDF special characters
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

// Convert hex color (#RRGGBB) to PDF RGB float values [0.0 - 1.0]
function hexToPdfRgb(hex, defaultRgb = [0.2, 0.2, 0.3]) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return defaultRgb;
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return defaultRgb;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [
    Math.round(r * 1000) / 1000,
    Math.round(g * 1000) / 1000,
    Math.round(b * 1000) / 1000
  ];
}

class PdfWriter {
  constructor() {
    this.pageWidth = 612; // 8.5 in * 72 pt
    this.pageHeight = 792; // 11.0 in * 72 pt
    this.margin = 44;
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.cursorY = this.pageHeight - this.margin;
    this.pages = [];
    this.currentPageOps = [];
    this.objects = [];
  }

  startPage() {
    if (this.currentPageOps.length > 0 || this.pages.length === 0) {
      if (this.currentPageOps.length > 0) {
        this.pages.push(this.currentPageOps);
      }
      this.currentPageOps = [];
      this.cursorY = this.pageHeight - this.margin;
    }
  }

  checkPageBreak(neededHeight) {
    if (this.cursorY - neededHeight < this.margin + 30) {
      this.startPage();
    }
  }

  // Draw filled/stroked rectangle
  rect(x, y, w, h, fillColor = null, strokeColor = null, lineWidth = 1) {
    let cmd = "";
    if (fillColor) {
      cmd += `${fillColor[0]} ${fillColor[1]} ${fillColor[2]} rg `;
    }
    if (strokeColor) {
      cmd += `${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG ${lineWidth} w `;
    }
    cmd += `${x} ${y} ${w} ${h} re `;
    if (fillColor && strokeColor) cmd += "B\n";
    else if (fillColor) cmd += "f\n";
    else if (strokeColor) cmd += "S\n";
    this.currentPageOps.push(cmd);
  }

  // Draw straight line
  line(x1, y1, x2, y2, color = [0.8, 0.8, 0.8], width = 1) {
    const cmd = `${color[0]} ${color[1]} ${color[2]} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
    this.currentPageOps.push(cmd);
  }

  // Draw single line text
  text(str, x, y, size = 10, color = [0.1, 0.1, 0.1], isBold = false) {
    const font = isBold ? "/F2" : "/F1";
    const sanitized = sanitizePdfText(str);
    const cmd = `BT ${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg ${x} ${y} Td (${sanitized}) Tj ET\n`;
    this.currentPageOps.push(cmd);
  }

  // Draw word-wrapped text block
  wrappedText(text, x, maxWidth, fontSize = 9, lineHeight = 12, color = [0.2, 0.2, 0.2], isBold = false) {
    if (!text) return 0;
    const words = String(text).split(/\s+/);
    let currentLine = "";
    const lines = [];

    // Approximate character capacity per line
    const avgCharWidth = fontSize * (isBold ? 0.58 : 0.52);
    const maxChars = Math.floor(maxWidth / avgCharWidth);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if ((currentLine + " " + word).trim().length > maxChars && currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += (currentLine ? " " : "") + word;
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    for (let i = 0; i < lines.length; i++) {
      this.checkPageBreak(lineHeight);
      this.text(lines[i], x, this.cursorY, fontSize, color, isBold);
      this.cursorY -= lineHeight;
    }

    return lines.length * lineHeight;
  }

  // Build the complete PDF file binary
  build() {
    if (this.currentPageOps.length > 0) {
      this.pages.push(this.currentPageOps);
    }
    if (this.pages.length === 0) {
      this.pages.push(["BT /F1 12 Tf 50 750 Td (Empty Document) Tj ET\n"]);
    }

    const totalPages = this.pages.length;

    // Add page numbers and footers to each page
    for (let p = 0; p < totalPages; p++) {
      const footerY = 24;
      const footerText = sanitizePdfText(
        `EmoLyrics Music Intelligence Platform  *  Page ${p + 1} of ${totalPages}`
      );
      const footerCmd = `0.85 0.85 0.88 RG 0.5 w ${this.margin} ${footerY + 12} m ${this.pageWidth - this.margin} ${footerY + 12} l S\nBT /F1 8 Tf 0.5 0.5 0.55 rg ${this.margin} ${footerY} Td (${footerText}) Tj ET\n`;
      this.pages[p].push(footerCmd);
    }

    const objs = [];
    const addObj = (content) => {
      objs.push(content);
      return objs.length; // 1-indexed object id
    };

    // 1: Catalog
    addObj("<< /Type /Catalog /Pages 2 0 R >>");

    // 2: Pages root (we'll update this with kid IDs)
    const pageObjStart = 3;
    const pageObjIds = [];
    for (let i = 0; i < totalPages; i++) {
      pageObjIds.push(pageObjStart + i * 2); // Page objects at 3, 5, 7...
    }
    const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(" ");
    objs.push(`<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>`);

    // Add Font objects
    const font1Id = pageObjStart + totalPages * 2;
    const font2Id = font1Id + 1;

    // Create Page and Content Stream objects
    for (let i = 0; i < totalPages; i++) {
      const contentObjId = pageObjStart + i * 2 + 1;
      const streamContent = this.pages[i].join("");

      // Page Object
      objs.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> >>`
      );

      // Content Stream Object
      objs.push(
        `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`
      );
    }

    // Font 1: Helvetica (Regular)
    objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    // Font 2: Helvetica-Bold
    objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    // Assemble PDF file with cross-reference table
    let body = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const xref = [0];

    for (let i = 0; i < objs.length; i++) {
      xref.push(body.length);
      body += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
    }

    const startXref = body.length;
    body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objs.length; i++) {
      const offset = String(xref[i]).padStart(10, "0");
      body += `${offset} 00000 n \n`;
    }

    body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return new Blob([body], { type: "application/pdf" });
  }
}

/**
 * Generate a comprehensive PDF Analysis Report from Phase 1 & 2 analysis data
 */
export function generatePdfAnalysisReport({
  data,
  lyrics = "",
  title = "Untitled Song",
  artist = "Independent / Unknown"
}) {
  const doc = new PdfWriter();
  doc.startPage();

  const primaryEmotion = data?.primaryEmotion || "Happiness";
  const primaryMeta = data?.primaryEmotionMeta || {};
  const confidence = data?.confidence ? `${data.confidence}%` : "Estimated (85%)";
  const secondaryEmotions = data?.secondaryEmotions || [];
  const emotionDistribution = data?.emotionDistribution || {};
  const aiInterpretation = data?.aiInterpretation || {};
  const lines = data?.lines || [];
  const songTitle = data?.metadata?.title || title || "Untitled Song";
  const songArtist = data?.metadata?.artist || artist || "Unknown Artist";
  const language = data?.metadata?.language || "English";
  const analysisDate = data?.metadata?.analyzedAt
    ? new Date(data.metadata.analyzedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : new Date().toLocaleDateString();

  const primaryRgb = hexToPdfRgb(primaryMeta.color, [0.55, 0.2, 0.8]);

  // ========================================================
  // 1. HEADER BANNER (Top of Page 1)
  // ========================================================
  // Dark header block
  doc.rect(doc.margin, doc.cursorY - 48, doc.contentWidth, 54, [0.08, 0.08, 0.12], null);
  // Color accent stripe
  doc.rect(doc.margin, doc.cursorY - 48, 6, 54, primaryRgb, null);

  doc.text("EMOLYRICS", doc.margin + 16, doc.cursorY - 18, 14, [1, 1, 1], true);
  doc.text("Advanced AI Mood Analysis & Lyrical Intelligence Report", doc.margin + 16, doc.cursorY - 32, 9, [0.75, 0.75, 0.82]);
  doc.text(`Generated on: ${analysisDate}`, doc.contentWidth - 80, doc.cursorY - 24, 8, [0.65, 0.65, 0.72]);

  doc.cursorY -= 68;

  // ========================================================
  // 2. SONG IDENTITY CARD
  // ========================================================
  doc.rect(doc.margin, doc.cursorY - 46, doc.contentWidth, 50, [0.97, 0.97, 0.98], [0.88, 0.88, 0.9], 0.75);

  doc.text(`Song Title:  ${songTitle}`, doc.margin + 14, doc.cursorY - 18, 11, [0.1, 0.1, 0.15], true);
  doc.text(`Artist:  ${songArtist}`, doc.margin + 14, doc.cursorY - 34, 10, [0.35, 0.35, 0.42]);
  doc.text(`Language:  ${language}`, doc.margin + 280, doc.cursorY - 18, 9, [0.35, 0.35, 0.42]);
  doc.text(`Analyzed Lines:  ${data?.analyzedLines || lines.length}`, doc.margin + 280, doc.cursorY - 34, 9, [0.35, 0.35, 0.42]);
  doc.text(`Model:  ${aiInterpretation.model || "qwen2.5:3b (CPU)"}`, doc.margin + 410, doc.cursorY - 18, 8, [0.45, 0.45, 0.5]);

  doc.cursorY -= 62;

  // ========================================================
  // 3. EXECUTIVE SUMMARY: PRIMARY & SECONDARY EMOTIONS
  // ========================================================
  doc.text("EXECUTIVE EMOTION SUMMARY", doc.margin, doc.cursorY, 11, [0.12, 0.12, 0.2], true);
  doc.line(doc.margin, doc.cursorY - 4, doc.pageWidth - doc.margin, doc.cursorY - 4, [0.85, 0.85, 0.88]);
  doc.cursorY -= 16;

  // Primary Emotion Box (Left 50%)
  const boxWidth = (doc.contentWidth - 12) / 2;
  doc.rect(doc.margin, doc.cursorY - 68, boxWidth, 72, [0.98, 0.98, 1.0], primaryRgb, 1.5);
  doc.text("PRIMARY EMOTION", doc.margin + 12, doc.cursorY - 16, 8, primaryRgb, true);
  doc.text(primaryEmotion.toUpperCase(), doc.margin + 12, doc.cursorY - 36, 16, [0.1, 0.1, 0.15], true);
  doc.text(`Confidence: ${confidence} (Statistical Probability)`, doc.margin + 12, doc.cursorY - 52, 8, [0.35, 0.35, 0.45]);
  doc.text(primaryMeta.description || "Dominant lyrical mood detected", doc.margin + 12, doc.cursorY - 63, 7.5, [0.45, 0.45, 0.5]);

  // Secondary Emotions Box (Right 50%)
  const rightX = doc.margin + boxWidth + 12;
  doc.rect(rightX, doc.cursorY - 68, boxWidth, 72, [0.98, 0.98, 0.99], [0.85, 0.85, 0.88], 1);
  doc.text("SECONDARY EMOTIONS (CO-OCCURRING)", rightX + 12, doc.cursorY - 16, 8, [0.35, 0.35, 0.45], true);

  if (secondaryEmotions.length > 0) {
    let secY = doc.cursorY - 32;
    for (let s = 0; s < Math.min(secondaryEmotions.length, 3); s++) {
      const sec = secondaryEmotions[s];
      doc.text(`* ${sec.emotion}`, rightX + 14, secY, 9, [0.15, 0.15, 0.2], true);
      doc.text(`${sec.percentage}% presence`, rightX + 130, secY, 8.5, [0.4, 0.4, 0.48]);
      secY -= 14;
    }
  } else {
    doc.text("Single dominant emotion observed throughout lyrics.", rightX + 14, doc.cursorY - 36, 8.5, [0.45, 0.45, 0.5]);
  }

  doc.cursorY -= 82;

  // ========================================================
  // 4. EMOTION DISTRIBUTION SPECTRUM (10 Classes)
  // ========================================================
  doc.checkPageBreak(120);
  doc.text("10-EMOTION SPECTRUM DISTRIBUTION", doc.margin, doc.cursorY, 11, [0.12, 0.12, 0.2], true);
  doc.line(doc.margin, doc.cursorY - 4, doc.pageWidth - doc.margin, doc.cursorY - 4, [0.85, 0.85, 0.88]);
  doc.cursorY -= 16;

  const emotionEntries = Object.entries(emotionDistribution);
  const colWidth = doc.contentWidth / 2;

  for (let i = 0; i < emotionEntries.length; i += 2) {
    doc.checkPageBreak(18);
    const [emo1, pct1] = emotionEntries[i];
    const [emo2, pct2] = emotionEntries[i + 1] || ["", 0];

    // Col 1
    const isP1 = emo1 === primaryEmotion;
    doc.text(emo1, doc.margin + 4, doc.cursorY, 8.5, isP1 ? primaryRgb : [0.2, 0.2, 0.25], isP1);
    doc.text(`${pct1}%`, doc.margin + 75, doc.cursorY, 8, [0.3, 0.3, 0.35], true);
    // Bar 1
    doc.rect(doc.margin + 105, doc.cursorY - 2, 110, 6, [0.92, 0.92, 0.94], null);
    if (pct1 > 0) {
      doc.rect(doc.margin + 105, doc.cursorY - 2, Math.max(Math.round((pct1 / 100) * 110), 3), 6, isP1 ? primaryRgb : [0.5, 0.5, 0.6], null);
    }

    // Col 2
    if (emo2) {
      const isP2 = emo2 === primaryEmotion;
      const x2 = doc.margin + colWidth + 8;
      doc.text(emo2, x2, doc.cursorY, 8.5, isP2 ? primaryRgb : [0.2, 0.2, 0.25], isP2);
      doc.text(`${pct2}%`, x2 + 75, doc.cursorY, 8, [0.3, 0.3, 0.35], true);
      // Bar 2
      doc.rect(x2 + 105, doc.cursorY - 2, 110, 6, [0.92, 0.92, 0.94], null);
      if (pct2 > 0) {
        doc.rect(x2 + 105, doc.cursorY - 2, Math.max(Math.round((pct2 / 100) * 110), 3), 6, isP2 ? primaryRgb : [0.5, 0.5, 0.6], null);
      }
    }

    doc.cursorY -= 15;
  }

  doc.cursorY -= 10;

  // ========================================================
  // 5. AI INTERPRETATION & LYRICAL NARRATIVE
  // ========================================================
  doc.checkPageBreak(130);
  doc.text("AI LYRICAL INTERPRETATION & THEMATIC SYNTHESIS", doc.margin, doc.cursorY, 11, [0.12, 0.12, 0.2], true);
  doc.line(doc.margin, doc.cursorY - 4, doc.pageWidth - doc.margin, doc.cursorY - 4, [0.85, 0.85, 0.88]);
  doc.cursorY -= 16;

  // Overall Meaning
  doc.text("Overall Emotional Meaning:", doc.margin, doc.cursorY, 9, [0.15, 0.15, 0.2], true);
  doc.cursorY -= 12;
  doc.wrappedText(aiInterpretation.overallMeaning || "A deeply reflective lyrical piece centered on emotion.", doc.margin + 6, doc.contentWidth - 12, 8.5, 12, [0.25, 0.25, 0.3]);
  doc.cursorY -= 6;

  // Why Primary Emotion Was Detected
  doc.checkPageBreak(40);
  doc.text(`Why ${primaryEmotion} Was Detected:`, doc.margin, doc.cursorY, 9, [0.15, 0.15, 0.2], true);
  doc.cursorY -= 12;
  doc.wrappedText(aiInterpretation.whyPrimaryEmotion || `Dominant concentration of ${primaryEmotion} lexical markers across verses.`, doc.margin + 6, doc.contentWidth - 12, 8.5, 12, [0.25, 0.25, 0.3]);
  doc.cursorY -= 6;

  // Lyrical Themes
  if (aiInterpretation.mainThemes?.length > 0) {
    doc.checkPageBreak(25);
    doc.text(`Lyrical Themes:  ${aiInterpretation.mainThemes.join("  *  ")}`, doc.margin, doc.cursorY, 8.5, [0.35, 0.2, 0.6], true);
    doc.cursorY -= 16;
  }

  // Emotional Progression Stages
  if (aiInterpretation.emotionalProgression?.length > 0) {
    doc.checkPageBreak(50);
    doc.text("Emotional Journey Progression:", doc.margin, doc.cursorY, 9, [0.15, 0.15, 0.2], true);
    doc.cursorY -= 14;

    for (const prog of aiInterpretation.emotionalProgression) {
      doc.checkPageBreak(20);
      doc.text(`[${prog.stage}] ${prog.emotion}:`, doc.margin + 8, doc.cursorY, 8.5, [0.2, 0.2, 0.3], true);
      doc.text(prog.description || "", doc.margin + 120, doc.cursorY, 8, [0.35, 0.35, 0.4]);
      doc.cursorY -= 13;
    }
    doc.cursorY -= 6;
  }

  // ========================================================
  // 6. LINE-BY-LINE LYRICS ANALYSIS TABLE
  // ========================================================
  doc.checkPageBreak(100);
  doc.text("LINE-BY-LINE LYRICS & EMOTION BREAKDOWN", doc.margin, doc.cursorY, 11, [0.12, 0.12, 0.2], true);
  doc.line(doc.margin, doc.cursorY - 4, doc.pageWidth - doc.margin, doc.cursorY - 4, [0.85, 0.85, 0.88]);
  doc.cursorY -= 16;

  // Table Header
  doc.rect(doc.margin, doc.cursorY - 12, doc.contentWidth, 16, [0.93, 0.93, 0.95], null);
  doc.text("#", doc.margin + 4, doc.cursorY - 2, 7.5, [0.2, 0.2, 0.25], true);
  doc.text("LYRIC LINE", doc.margin + 24, doc.cursorY - 2, 7.5, [0.2, 0.2, 0.25], true);
  doc.text("EMOTION", doc.margin + 260, doc.cursorY - 2, 7.5, [0.2, 0.2, 0.25], true);
  doc.text("CONF.", doc.margin + 330, doc.cursorY - 2, 7.5, [0.2, 0.2, 0.25], true);
  doc.text("EXPLANATION & MARKERS", doc.margin + 370, doc.cursorY - 2, 7.5, [0.2, 0.2, 0.25], true);
  doc.cursorY -= 20;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    doc.checkPageBreak(18);

    if (line.isSectionHeader) {
      doc.rect(doc.margin, doc.cursorY - 10, doc.contentWidth, 14, [0.96, 0.96, 0.98], null);
      doc.text(line.text.toUpperCase(), doc.margin + 24, doc.cursorY - 1, 7.5, [0.4, 0.3, 0.7], true);
      doc.cursorY -= 16;
      continue;
    }

    const isPrimaryLine = line.emotion === primaryEmotion;
    const lineRgb = hexToPdfRgb(line.color, [0.3, 0.3, 0.4]);

    // Truncate lyric text if excessively long
    const cleanLyric = (line.text || "").length > 44 ? (line.text || "").substring(0, 42) + "..." : (line.text || "");
    const cleanExpl = (line.explanation || "").length > 38 ? (line.explanation || "").substring(0, 36) + "..." : (line.explanation || "");

    doc.text(String(line.lineIndex || l + 1), doc.margin + 4, doc.cursorY, 7.5, [0.5, 0.5, 0.55]);
    doc.text(cleanLyric, doc.margin + 24, doc.cursorY, 8, [0.15, 0.15, 0.2], isPrimaryLine);
    doc.text(line.emotion, doc.margin + 260, doc.cursorY, 8, lineRgb, true);
    doc.text(`${line.confidence || 75}%`, doc.margin + 330, doc.cursorY, 7.5, [0.4, 0.4, 0.45]);
    doc.text(cleanExpl, doc.margin + 370, doc.cursorY, 7.5, [0.4, 0.4, 0.48]);

    // Subtle row divider line
    doc.line(doc.margin, doc.cursorY - 4, doc.pageWidth - doc.margin, doc.cursorY - 4, [0.94, 0.94, 0.96], 0.5);
    doc.cursorY -= 15;
  }

  doc.cursorY -= 10;

  // ========================================================
  // 7. FULL ANALYZED LYRICS APPENDIX
  // ========================================================
  if (lyrics && typeof lyrics === "string") {
    doc.checkPageBreak(80);
    doc.text("FULL ANALYZED LYRICS TRANSCRIPT", doc.margin, doc.cursorY, 11, [0.12, 0.12, 0.2], true);
    doc.line(doc.margin, doc.cursorY - 4, doc.pageWidth - doc.margin, doc.cursorY - 4, [0.85, 0.85, 0.88]);
    doc.cursorY -= 16;

    const rawLines = lyrics.split(/\r?\n/);
    for (let r = 0; r < rawLines.length; r++) {
      const rl = rawLines[r].trim();
      if (!rl) {
        doc.cursorY -= 6;
        continue;
      }
      doc.checkPageBreak(12);
      doc.text(rl, doc.margin + 10, doc.cursorY, 8, [0.3, 0.3, 0.35]);
      doc.cursorY -= 11;
    }
  }

  return doc.build();
}

/**
 * Trigger browser file download of the PDF report
 */
export function downloadPdfReport({ data, lyrics, title, artist }) {
  const blob = generatePdfAnalysisReport({ data, lyrics, title, artist });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const rawTitle = title || "Song";
  const transliteratedTitle = transliterateIndicAndAccents(rawTitle);
  const cleanTitle = transliteratedTitle.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "Song";
  const filename = `${cleanTitle}_Emotion_Analysis_Report.pdf`;

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

