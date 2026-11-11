import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  RefreshCw,
  Compass,
  Music,
  ListMusic,
  History,
  FileText,
  HelpCircle,
  AlertCircle,
  CornerDownLeft,
  ChevronRight,
  ChevronDown,
  User,
  HeartHandshake,
  Square
} from "lucide-react";
import { api } from "../services/api";
import SongRecommendationCard from "../components/assistant/SongRecommendationCard";
import PlaylistDraftCard from "../components/assistant/PlaylistDraftCard";
import AnalysisResultCard from "../components/assistant/AnalysisResultCard";

const STARTER_PROMPTS = [
  {
    icon: "🚗",
    title: "Road Trip Anthems",
    prompt: "Recommend high-energy happy songs for a long scenic road trip"
  },
  {
    icon: "🌧️",
    title: "Rainy Evening",
    prompt: "Create a soothing playlist for a quiet, contemplative rainy evening"
  },
  {
    icon: "📚",
    title: "Deep Study & Focus",
    prompt: "Find calm and chill ambient music to help me concentrate while studying"
  },
  {
    icon: "💖",
    title: "Romantic Bollywood",
    prompt: "Suggest soulful romantic songs from Bollywood with deep emotions"
  },
  {
    icon: "🔍",
    title: "Analyze Sample Lyrics",
    prompt: "Analyze these lyrics: 'I'm walking on sunshine, whoa-oh! And don't it feel good! Hey, all right now!'"
  },
  {
    icon: "📊",
    title: "My Mood History",
    prompt: "Summarize my song mood history and tell me my most frequent emotions"
  }
];

const QUICK_ACTIONS = [
  { label: "Discover Songs", prompt: "Discover popular upbeat happy songs" },
  { label: "Analyze Lyrics", prompt: "Analyze lyrics: " },
  { label: "Create Playlist", prompt: "Create a mood playlist with " },
  { label: "Mood Analytics", prompt: "Show mood trends and analytics breakdown" },
  { label: "Why Is It Sad?", prompt: "Explain how sad lyrics are detected by the ML model" }
];

export default function AssistantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // Initialize or load session ID
  useEffect(() => {
    let sid = localStorage.getItem("emolyrics_assistant_session_id");
    if (!sid) {
      sid = "sess_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
      localStorage.setItem("emolyrics_assistant_session_id", sid);
    }
    setSessionId(sid);
  }, []);

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Scroll to bottom helper
  const scrollToBottom = ({ smooth = true } = {}) => {
    isAtBottomRef.current = true;
    setShowScrollBottom(false);
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    }
  };

  // Scroll event listener: tracks whether user has scrolled up away from the bottom
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // Consider user at bottom if within 80px
    const atBottom = distanceFromBottom < 80;
    isAtBottomRef.current = atBottom;

    // Show floating button only if scrolled up and there are messages
    if (!atBottom && messages.length > 0) {
      setShowScrollBottom(true);
    } else {
      setShowScrollBottom(false);
    }
  };

  // Fetch initial history once session ID is set
  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;
    const fetchHistory = async () => {
      setInitialLoading(true);
      try {
        const res = await api.getAssistantHistory(sessionId);
        const historyList = res.history || res.messages || [];
        if (isMounted && res.success && historyList.length > 0) {
          setMessages(historyList);
          // Initial scroll to bottom once history is loaded
          setTimeout(() => {
            scrollToBottom({ smooth: false });
          }, 60);
        }
      } catch (err) {
        console.warn("Could not load previous assistant chat history:", err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setLoading(false);
    // Mark last assistant message as finished streaming
    setMessages((prev) => {
      const lastIndex = prev.length - 1;
      if (lastIndex >= 0 && prev[lastIndex].role === "assistant") {
        const updated = [...prev];
        updated[lastIndex] = { ...updated[lastIndex], isStreaming: false };
        return updated;
      }
      return prev;
    });
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading || isStreaming) return;

    setInput("");
    setErrorMsg("");

    // 1. Optimistically add user message
    const userMsg = {
      role: "user",
      content: query,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);

    // 2. Set loading state (displays typing indicator before first chunk arrives)
    setLoading(true);
    setIsStreaming(true);

    // Requirement 3: Automatically scroll to latest message when user sends a new message
    isAtBottomRef.current = true;
    setShowScrollBottom(false);
    setTimeout(() => {
      scrollToBottom({ smooth: true });
    }, 30);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let hasReceivedFirstChunk = false;
    let metaData = null;
    let metaIntent = null;
    let metaProvider = "Ollama Local CPU";

    try {
      const stream = api.streamAssistantMessage(query, sessionId, {
        signal: abortController.signal
      });

      for await (const event of stream) {
        if (event.type === "start") {
          metaData = event.data || null;
          metaIntent = event.intent || null;
          if (event.provider) metaProvider = event.provider;
        } else if (event.type === "chunk") {
          const chunkText = event.content || "";
          if (!hasReceivedFirstChunk) {
            hasReceivedFirstChunk = true;
            // First chunk received: hide typing indicator, mount assistant message bubble
            setLoading(false);
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: chunkText,
                intent: metaIntent,
                provider: metaProvider,
                data: metaData,
                isStreaming: true,
                timestamp: new Date().toISOString()
              }
            ]);

            // Auto-scroll only if user is at the bottom
            if (isAtBottomRef.current) {
              setTimeout(() => {
                scrollToBottom({ smooth: true });
              }, 30);
            }
          } else {
            // Progressive chunks: update message in-place
            setMessages((prev) => {
              const lastIndex = prev.length - 1;
              if (lastIndex < 0 || prev[lastIndex].role !== "assistant") return prev;
              const updated = [...prev];
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: updated[lastIndex].content + chunkText
              };
              return updated;
            });

            // Requirement 4: Auto-scroll ONLY if user is currently at bottom.
            // If user scrolled upwards, do NOT force scroll!
            if (isAtBottomRef.current && messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
          }
        } else if (event.type === "done") {
          // Finalize message with complete metadata
          setMessages((prev) => {
            const lastIndex = prev.length - 1;
            if (lastIndex < 0 || prev[lastIndex].role !== "assistant") return prev;
            const updated = [...prev];
            const finalData = {
              ...(metaData || {}),
              ...(event.data || {}),
              followUpSuggestions: event.followUpSuggestions || []
            };
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: event.reply || updated[lastIndex].content,
              responseTimeMs: event.responseTimeMs || updated[lastIndex].responseTimeMs,
              provider: event.provider || updated[lastIndex].provider,
              data: finalData,
              isStreaming: false
            };
            return updated;
          });

          // Scroll to bottom if user is still near bottom
          if (isAtBottomRef.current) {
            setTimeout(() => {
              scrollToBottom({ smooth: true });
            }, 50);
          }
        } else if (event.type === "error") {
          throw new Error(event.message || "Streaming error from assistant");
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("[AIAssistant] Chat stream stopped by user.");
      } else {
        console.error("Chat error:", err);
        const friendlyErr = err.message || "Could not connect to AI Assistant. Please try again.";
        setErrorMsg(friendlyErr);
        if (!hasReceivedFirstChunk) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                friendlyErr.toLowerCase().includes("required") || friendlyErr.toLowerCase().includes("empty")
                  ? friendlyErr
                  : "I'm sorry, I encountered a temporary problem processing that request. Please try again or rephrase your prompt.",
              timestamp: new Date().toISOString()
            }
          ]);
          if (isAtBottomRef.current) {
            setTimeout(() => {
              scrollToBottom({ smooth: true });
            }, 30);
          }
        }
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear your conversation history with the AI Assistant?")) return;
    try {
      await api.clearAssistantHistory(sessionId);
      // Generate fresh session ID
      const newSid = "sess_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
      localStorage.setItem("emolyrics_assistant_session_id", newSid);
      setSessionId(newSid);
      setMessages([]);
      setShowScrollBottom(false);
      isAtBottomRef.current = true;
      showToast("Conversation cleared");
    } catch (err) {
      console.error("Failed to clear chat:", err);
      showToast("Failed to clear conversation");
    }
  };

  const handleSavePlaylist = async (playlistDraft) => {
    try {
      const res = await api.saveAssistantPlaylist(playlistDraft);
      if (res.success) {
        showToast("Playlist saved to your library!");
      } else {
        showToast("Could not save playlist: " + (res.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Save playlist error:", err);
      showToast("Error saving playlist. Please try again.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 overflow-hidden bg-surface-page text-ink-main transition-colors duration-200 relative">
      {/* Toast alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-purple-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-purple-400 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Assistant Header */}
      <div className="shrink-0 border-b border-white/10 light:border-slate-200/80 bg-neutral-900/80 light:bg-white/90 backdrop-blur-md z-20 transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-neutral-950 light:bg-white rounded-[14px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400 light:text-purple-600" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-ink-main leading-none">
                  AI Music Assistant
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 light:bg-emerald-500 animate-pulse" />
                  Active
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 light:bg-purple-50 text-purple-300 light:text-purple-700 border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400 light:text-purple-600" />
                  {isStreaming ? "Streaming Live" : "Ollama Stream (CPU)"}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted hidden sm:block mt-0.5">
                Conversational music intelligence • Natural Language Search • Lyrics Mood NLU
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-xs px-2.5 py-1.5 rounded-xl bg-white/5 light:bg-slate-100 hover:bg-rose-500/15 text-ink-muted hover:text-rose-400 light:hover:text-rose-600 border border-white/10 light:border-slate-300 transition-colors flex items-center gap-1.5"
                title="Clear current conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Action Chips Bar */}
        <div className="max-w-5xl mx-auto px-4 pb-2.5 overflow-x-auto no-scrollbar flex items-center gap-2">
          <span className="text-[11px] text-ink-dim font-medium shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400 light:text-purple-600" />
            Quick:
          </span>
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                if (action.prompt.endsWith(": ") || action.prompt.endsWith("with ")) {
                  setInput(action.prompt);
                  inputRef.current?.focus();
                } else {
                  handleSendMessage(action.prompt);
                }
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-900 light:bg-slate-100 border border-white/10 light:border-slate-200 hover:border-purple-500/40 hover:bg-purple-950/20 light:hover:bg-purple-50 text-ink-secondary hover:text-purple-300 light:hover:text-purple-700 transition-all shrink-0 whitespace-nowrap"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Conversation Container with fixed available height */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6 focus:outline-none"
      >
        <div className="max-w-5xl w-full mx-auto flex flex-col min-h-full justify-between">
        {initialLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-ink-muted space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 light:text-purple-600" />
            <p className="text-sm">Connecting to AI Music Assistant...</p>
          </div>
        ) : messages.length === 0 ? (
          /* Welcome View with Starters */
          <div className="flex-1 flex flex-col justify-center py-8">
            <div className="text-center max-w-xl mx-auto mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-purple-600/30 to-amber-500/30 light:from-purple-100 light:to-amber-100 border border-purple-500/30 flex items-center justify-center shadow-inner">
                <Sparkles className="w-8 h-8 text-purple-300 light:text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-ink-main mb-2">
                What music do you want to explore today?
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Ask for mood-based recommendations, analyze song lyrics, generate themed playlists,
                or explore how songs connect emotionally.
              </p>
            </div>

            {/* Suggested Starter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto w-full">
              {STARTER_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-3.5 rounded-2xl theme-card hover:border-purple-500/40 text-left transition-all group flex flex-col justify-between hover:shadow-lg hover:shadow-purple-500/10"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{item.icon}</span>
                      <h3 className="text-xs font-semibold text-ink-main group-hover:text-purple-300 light:group-hover:text-purple-700 transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-ink-muted leading-snug line-clamp-2">
                      {item.prompt}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center text-[11px] text-purple-400 light:text-purple-600 font-medium group-hover:translate-x-1 transition-transform">
                    <span>Ask assistant</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Stream */
          <div className="space-y-6 pb-6">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const songs = msg.data?.songs || [];
              const playlist = msg.data?.playlist;
              const analysis = msg.data?.analysis;
              const followUps = msg.data?.followUpSuggestions || [];

              return (
                <div
                  key={index}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`flex items-start gap-3 max-w-[92%] sm:max-w-[80%] ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-md ${
                        isUser
                          ? "bg-purple-600 text-white"
                          : "theme-well text-purple-400 light:text-purple-600"
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? "bg-purple-600 text-white rounded-tr-none shadow-md"
                          : "theme-card text-ink-main rounded-tl-none shadow-lg"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {msg.content}
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-purple-400 light:bg-purple-600 animate-pulse rounded-sm shadow-sm shadow-purple-500/50" />
                        )}
                      </div>

                      {/* Rich Content: Analysis Result Card */}
                      {analysis && (
                        <div className="mt-4">
                          <AnalysisResultCard
                            analysis={analysis}
                            onFollowUp={(query) => handleSendMessage(query)}
                          />
                        </div>
                      )}

                      {/* Rich Content: Playlist Draft Card */}
                      {playlist && (
                        <div className="mt-4">
                          <PlaylistDraftCard
                            playlist={playlist}
                            onSave={handleSavePlaylist}
                          />
                        </div>
                      )}

                      {/* Rich Content: Recommendation Song Cards Grid */}
                      {songs.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {songs.map((song, sIdx) => (
                            <SongRecommendationCard key={sIdx} song={song} />
                          ))}
                        </div>
                      )}

                      {/* Follow-up Suggestion Chips */}
                      {followUps.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 light:border-slate-200">
                          <span className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold block mb-1.5">
                            Suggested next:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {followUps.map((chip, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => handleSendMessage(chip)}
                                className="text-xs px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 light:bg-purple-50 light:hover:bg-purple-100 text-purple-300 light:text-purple-700 border border-purple-500/30 transition-colors flex items-center gap-1 text-left"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-purple-400 light:text-purple-600 shrink-0" />
                                <span>{chip}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-11 text-[10px] text-ink-dim">
                    <span>
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ""}
                    </span>
                    {msg.responseTimeMs ? (
                      <span className="text-[10px] text-purple-400 light:text-purple-600 font-mono flex items-center gap-0.5">
                        <span>⚡</span>
                        <span>{(msg.responseTimeMs / 1000).toFixed(1)}s</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator (shows before first chunk arrives) */}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl theme-well text-purple-400 light:text-purple-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-3.5 rounded-2xl theme-card text-ink-muted text-xs flex items-center gap-2">
                  <span className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-purple-400 light:bg-purple-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-purple-400 light:bg-purple-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-purple-400 light:bg-purple-600 rounded-full animate-bounce"></span>
                  </span>
                  <span>Connecting to CPU-optimized Ollama stream...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom({ smooth: true })}
          className="absolute bottom-24 right-6 sm:right-10 z-30 px-3.5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-2xl shadow-purple-600/40 border border-purple-400/30 flex items-center gap-2 text-xs font-semibold transition-all transform hover:scale-105 active:scale-95 animate-fade-in"
          aria-label="Scroll to bottom"
          title="Scroll to latest messages"
        >
          <ChevronDown className="w-4 h-4 animate-bounce" />
          <span>Latest messages</span>
        </button>
      )}

      {/* Input Box Bar (Fixed at bottom) */}
      <div className="shrink-0 border-t border-white/10 light:border-slate-200/80 bg-neutral-900/90 light:bg-white/95 backdrop-blur-md p-3 sm:p-4 z-20">
        <div className="max-w-5xl mx-auto">
          {errorMsg && (
            <div className="mb-2 p-2 rounded-xl bg-rose-500/20 light:bg-rose-50 border border-rose-500/30 text-rose-300 light:text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for songs, moods, playlists, or paste lyrics to analyze..."
              className="flex-1 glass-input rounded-2xl px-4 py-3 text-sm text-ink-main placeholder-neutral-500 light:placeholder-slate-400 transition-all resize-none max-h-32"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopStreaming}
                className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20 flex items-center justify-center shrink-0"
                title="Stop generating"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-600/20 shrink-0"
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-ink-dim mt-2 px-1">
            <span>Press Enter to send, Shift+Enter for newline</span>
            <span className="hidden sm:inline">Powered by EmoLyrics AI & Multilingual ML</span>
          </div>
        </div>
      </div>
    </div>
  );
}
