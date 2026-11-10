import { RefreshCw } from "lucide-react";

export default function PageLoadingSkeleton() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 px-4 py-20 text-neutral-400">
      <div className="w-12 h-12 rounded-2xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Loading EmoLyrics Experience...</p>
        <p className="text-xs text-neutral-500 mt-1">Fetching dynamic application chunk</p>
      </div>
    </div>
  );
}

