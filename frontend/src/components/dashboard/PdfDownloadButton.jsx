import React, { useState } from "react";
import { FileDown, Check, Loader2, Sparkles } from "lucide-react";
import { downloadPdfReport } from "./pdfReportGenerator";

export default function PdfDownloadButton({
  data,
  lyrics = "",
  title = "",
  artist = "",
  className = ""
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);

    try {
      // Allow UI to update to loading state briefly before CPU processing
      await new Promise((resolve) => setTimeout(resolve, 80));

      downloadPdfReport({
        data,
        lyrics,
        title: data?.metadata?.title || title || "Song Analysis",
        artist: data?.metadata?.artist || artist || "Independent Artist"
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF report: " + (err.message || "Unknown error"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading || !data}
      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
        downloadSuccess
          ? "bg-emerald-600/90 text-white border border-emerald-400"
          : "bg-white/10 hover:bg-white/20 text-white border border-white/15 light:bg-white light:hover:bg-slate-100 light:text-slate-800 light:border-slate-300/80 light:shadow-sm"
      } ${className}`}
      title="Download comprehensive PDF analysis report including line-by-line sentiment, timeline, and Ollama interpretation"
    >
      {downloading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
          <span>Generating PDF...</span>
        </>
      ) : downloadSuccess ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-300" />
          <span className="text-emerald-100 font-bold">Report Downloaded</span>
        </>
      ) : (
        <>
          <FileDown className="w-3.5 h-3.5 text-purple-400" />
          <span>Download PDF Report</span>
        </>
      )}
    </button>
  );
}

