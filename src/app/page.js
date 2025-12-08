"use client";

import React, {
  useState,
  useRef,
  useEffect
} from 'react';

import {
  useSession,
  signIn,
  signOut
} from "next-auth/react";

import {
  motion,
  AnimatePresence
} from "framer-motion";

import {
  MessageSquare,
  Command,
  Moon,
  Sun,
  Settings,
  Search,
  Pin,
  X,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  CheckCircle,
  Share2,
  Sparkles,
  Mail,
  ArrowLeft,
  Send,
  Keyboard,
  LogOut,
  User,
  Check,
  Loader2
} from 'lucide-react';

import {
  Jua
} from 'next/font/google';

// Initialize the font
const jua = Jua({
  weight: '400',
  subsets: ['latin'],
});

// --- ROBUST UTILS ---

const extractPreviewImage = (htmlContent) => {
  if (typeof window === 'undefined' || !htmlContent) return null;
  try {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const images = doc.querySelectorAll('img');
    if (images.length >= 2) {
      return images[1].src;
    }
    if (images.length === 1) {
      return images[0].src;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const extractSnippet = (htmlContent, wordCount = 10) => {
  if (typeof window === 'undefined' || !htmlContent) return "";
  try {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const text = (doc.body.textContent || "").replace(/\s+/g, ' ').trim();
    if (!text) return "";
    const words = text.split(' ');
    return words.length <= wordCount
      ? text
      : words.slice(0, wordCount).join(' ') + "...";
  } catch (e) {
    return "";
  }
};

const extractContentForAI = (htmlContent, charLimit = 6000) => {
  if (typeof window === 'undefined' || !htmlContent) return "";
  try {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const links = doc.querySelectorAll('a');
    links.forEach(a => {
      const href = a.getAttribute('href');
      const text = a.textContent.trim();
      if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
        a.textContent = `${text} (${href})`;
      }
    });
    let fullText = (doc.body.textContent || "").replace(/\s+/g, ' ').trim();
    return fullText.slice(0, charLimit);
  } catch (e) {
    return "";
  }
};

// --- SUB-COMPONENTS ---

const DockItem = ({ icon, onClick, darkMode, isActive }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-2xl transition-all duration-300 ${
      isActive
        ? (darkMode ? 'bg-white/20 text-white' : 'bg-black/10 text-black')
        : (darkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-black/10')
    }`}
  >
    {icon}
  </button>
);

const EmptyState = ({ message, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
    <div className="w-16 h-16 bg-[#1c1c1e] rounded-full flex items-center justify-center mb-4">
      <Icon size={24} className="opacity-50" />
    </div>
    <h3 className="text-xl font-bold opacity-50">{message}</h3>
  </div>
);

const SettingsView = ({ onClose, user }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="fixed inset-0 z-50 bg-black flex flex-col"
  >
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-black/60 backdrop-blur-md border-gray-800">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Settings size={20} /> Settings
      </h2>
      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>
    </div>
    <div className="max-w-2xl mx-auto w-full p-8 pt-32 flex flex-col items-center">
      <div className="w-full bg-[#1c1c1e] border border-gray-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl mb-8">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-800 mb-6 relative">
          {user?.image ? (
            <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <User size={32} className="text-gray-400" />
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{user?.name}</h1>
        <p className="text-gray-500 font-mono mb-8">{user?.email}</p>
        <div className="w-full h-px bg-gray-800 mb-8" />
        <button
          className="flex items-center gap-2 px-8 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all font-medium border border-red-500/20 hover:border-red-500"
          onClick={() => signOut()}
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
      <div className="text-center text-gray-600 text-sm">
        <p>MailSage (Powered by OpenAI and Gmail API)</p>
        <p>Made by: Luan de Souza</p>
      </div>
    </div>
  </motion.div>
);

const EmailCard = ({
  email,
  isExpanded,
  onToggleExpand,
  onSummarize,
  onPin,
  onDelete,
  onArchive,
  onOpen,
  isSummarizing
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const previewImage = extractPreviewImage(email.body);
  const displaySnippet = isExpanded
    ? extractSnippet(email.body, 30)
    : extractSnippet(email.body, 10);
  const showSecondaryIcons = isHovered || isExpanded;
  const isActive = isExpanded || isHovered;

  const handleCardClick = (e) => {
    if (e.target.closest('button')) return;
    onToggleExpand(email.id);
  };

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.2, type: "tween" } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full max-w-2xl mx-auto mb-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
        isExpanded
          ? 'bg-[#111] border-gray-700 z-10 scale-[1.02]'
          : 'bg-black border-gray-800 hover:border-gray-600 hover:scale-[1.01] z-0'
      }`}
      style={{
        borderColor: isActive ? email.sender.color : undefined,
        boxShadow: isActive ? `0 25px 50px -12px ${email.sender.color}40` : 'none'
      }}
    >
      <div
        className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-opacity duration-300"
        style={{
          backgroundColor: email.sender.color,
          opacity: isActive ? 1 : 0.5
        }}
      />
      <div className="p-6 pl-8 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-lg">{email.sender.name}</span>
              <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full border border-gray-800">{email.date}</span>
              {/* Visual Pin Icon on Card */}
              {email.isPinned && !isExpanded && <Pin size={14} className="fill-current text-white" />}
            </div>
            {isExpanded && email.sender.name !== email.sender.email && (
              <span className="text-xs text-gray-500 mt-1">{email.sender.email}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSummarize(email.id);
              }}
              className={`p-2 rounded-full transition-all duration-300 ${
                email.hasSummary || showSecondaryIcons
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none'
              } ${
                email.hasSummary
                  ? 'text-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_-3px_rgba(250,204,21,0.5)]'
                  : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 hover:shadow-[0_0_10px_-3px_rgba(250,204,21,0.4)]'
              }`}
              disabled={isSummarizing}
            >
              {isSummarizing ? (
                <Loader2 size={18} className="animate-spin text-yellow-400" />
              ) : (
                <Sparkles size={18} className={email.hasSummary ? "fill-current" : ""} />
              )}
            </button>
            
            {/* PIN BUTTON - Highlights Blue if Pinned */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin(email.id);
              }}
              className={`p-2 rounded-full transition-all duration-200 ${
                showSecondaryIcons ? 'opacity-100' : 'opacity-0 pointer-events-none'
              } ${
                email.isPinned
                  ? 'text-blue-400 bg-blue-400/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Pin size={18} className={email.isPinned ? "fill-current" : ""} />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(email.id);
              }}
              className={`p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200 ${
                showSecondaryIcons ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(email.id);
              }}
              className={`p-2 rounded-full text-gray-400 hover:text-green-400 hover:bg-green-900/20 transition-all duration-200 ${
                showSecondaryIcons ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <CheckCircle size={18} />
            </button>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-100">{email.subject}</h3>
        <div className="relative">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 mb-2">
            {isExpanded ? "PREVIEW" : "RAW"}
          </span>
          {displaySnippet && (
            <p className="leading-relaxed text-sm text-gray-400">{displaySnippet}</p>
          )}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                {previewImage && (
                  <div className="rounded-xl overflow-hidden border border-gray-800 mb-4 bg-black/50">
                    <img src={previewImage} alt="Context" className="w-full max-h-96 object-contain" />
                  </div>
                )}
                <div className="flex justify-end pt-2 relative z-50">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpen(email.id);
                    }}
                    className="p-3 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors bg-black border border-gray-800"
                    title="Open Full View"
                  >
                    <Mail size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {!isExpanded && (
        <div className="absolute bottom-6 right-6 z-20">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpen(email.id);
            }}
            className={`p-2 rounded-full transition-all duration-300 ${
              isHovered && !isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } text-gray-400 hover:text-white hover:bg-white/10`}
          >
            <Mail size={18} />
          </button>
        </div>
      )}
    </motion.div>
  );
};

const FullEmailView = ({
  email,
  onClose,
  onSummarize,
  onPin,
  onDelete,
  onArchive,
  isSummarizing
}) => {
  const renderContent = (text) => {
    if (!text) return null;
    const elements = [];
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let lastIndex = 0;
    let match;
    let keyIndex = 0;
    while ((match = markdownLinkRegex.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) {
        elements.push(
          <span key={`chunk-${keyIndex++}`}>
            {processTextContent(before, keyIndex)}
          </span>
        );
      }
      elements.push(
        <a
          key={`link-${keyIndex++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline hover:text-blue-300 font-medium"
        >
          {match[1]}
        </a>
      );
      lastIndex = markdownLinkRegex.lastIndex;
    }
    const remaining = text.slice(lastIndex);
    if (remaining) {
      elements.push(
        <span key={`chunk-${keyIndex++}`}>
          {processTextContent(remaining, keyIndex)}
        </span>
      );
    }
    return elements;
  };

  const processTextContent = (text, baseKey) => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    const parts = text.split(emailRegex);
    return parts.map((part, i) => {
      const uniqueKey = `${baseKey}-${i}`;
      if (part.match(emailRegex)) {
        return (
          <a
            key={`email-${uniqueKey}`}
            href={`mailto:${part}`}
            className="text-blue-400 hover:underline hover:text-blue-300 font-medium"
          >
            {part}
          </a>
        );
      }
      return processActionItems(part, uniqueKey);
    });
  };

  const processActionItems = (text, keyPrefix) => {
    const parts = text.split("Action Items:");
    if (parts.length === 1) {
      return <React.Fragment key={`text-${keyPrefix}`}>{text}</React.Fragment>;
    }
    return parts.map((part, i) => (
      <React.Fragment key={`ai-${keyPrefix}-${i}`}>
        {part}
        {i < parts.length - 1 && (
          <span className="font-bold text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]">
            Action Items:
          </span>
        )}
      </React.Fragment>
    ));
  };

  if (!email) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-black/60 backdrop-blur-md">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} /> Back
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <button
            onClick={() => onSummarize(email.id)}
            className={`p-2 rounded-full transition-all duration-300 ${
              email.hasSummary
                ? 'text-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_-3px_rgba(250,204,21,0.5)]'
                : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 hover:shadow-[0_0_10px_-3px_rgba(250,204,21,0.4)]'
            }`}
            disabled={isSummarizing}
          >
            {isSummarizing ? (
              <Loader2 size={18} className="animate-spin text-yellow-400" />
            ) : (
              <Sparkles size={18} className={email.hasSummary ? "fill-current" : ""} />
            )}
          </button>
          <button
            onClick={() => onPin(email.id)}
            className={`p-2 rounded-full transition-all duration-200 ${
              email.isPinned
                ? 'text-blue-400 bg-blue-400/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Pin size={18} className={email.isPinned ? "fill-current" : ""} />
          </button>
          <button
            onClick={() => {
              onDelete(email.id);
              onClose();
            }}
            className="p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={() => {
              onArchive(email.id);
              onClose();
            }}
            className="p-2 rounded-full text-gray-400 hover:text-green-400 hover:bg-green-900/20 transition-all duration-200"
          >
            <CheckCircle size={18} />
          </button>
        </div>
        <div className="w-[60px]"></div>
      </div>
      <div className="max-w-3xl mx-auto w-full p-8 pt-32 overflow-y-auto">
        {email.hasSummary && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-gray-700"
          >
            <div className="flex items-center gap-2 mb-3 text-yellow-500">
              <Sparkles size={18} className="fill-current" />
              <span className="text-xs font-bold uppercase tracking-widest">
                AI Summary
              </span>
            </div>
            <div className="text-lg leading-relaxed text-gray-200 whitespace-pre-wrap font-sans">
              {renderContent(email.summary)}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
              <span className="text-xs text-gray-500">Was this summary helpful?</span>
              <div className="flex gap-2">
                <button className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-green-400">
                  <ThumbsUp size={16} />
                </button>
                <button className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-red-400">
                  <ThumbsDown size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
        <h1 className="text-3xl font-bold mb-4 text-white">{email.subject}</h1>
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-black font-bold"
            style={{ backgroundColor: email.sender.color }}
          >
            {email.sender.name[0]}
          </div>
          <div>
            <div className="font-bold text-white">{email.sender.name}</div>
            <div className="text-sm text-gray-500">{email.sender.email}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-gray-500">{email.date}</div>
            <div className="text-xs text-gray-600">
              {new Date(email.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          </div>
        </div>
        <div className="prose prose-invert max-w-none text-gray-300">
          <div dangerouslySetInnerHTML={{ __html: email.body }} />
        </div>
      </div>
    </motion.div>
  );
};

const App = () => {
  const { data: session } = useSession();
  const [emails, setEmails] = useState([]);
  const [activeLabelId, setActiveLabelId] = useState('INBOX');
  // --- NEW: Persistent Pinned State ---
  const [pinnedIds, setPinnedIds] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [summarizingIds, setSummarizingIds] = useState(new Set());
  const [expandedEmailId, setExpandedEmailId] = useState(null);
  const [viewingEmailId, setViewingEmailId] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('Inbox');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      content: "I am ready to help you parse your inbox. Ask me anything about your emails."
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // --- FILTER EMAILS ---
  const filteredEmails = emails
    .filter(email => {
      // 1. Pinned Tab Logic: Only show emails that are in the Pinned Set
      if (activeTab === 'Pinned' && !pinnedIds.has(email.id)) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchSubject = email.subject?.toLowerCase().includes(query);
        const matchSenderName = email.sender.name?.toLowerCase().includes(query);
        const matchSenderEmail = email.sender.email?.toLowerCase().includes(query);
        const matchBody = email.body?.toLowerCase().includes(query);
        if (!matchSubject && !matchSenderName && !matchSenderEmail && !matchBody) return false;
      }
      const now = new Date();
      const emailDate = new Date(email.timestamp);
      const diffTime = Math.abs(now - emailDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (timeRange === '1d' && diffDays > 1) return false;
      if (timeRange === '7d' && diffDays > 7) return false;
      if (timeRange === '14d' && diffDays > 14) return false;
      if (timeRange === '30d' && diffDays > 30) return false;
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const closeChat = () => {
    setShowChat(false);
    setChatMessages([
      {
        role: 'ai',
        content: "I am ready to help you parse your inbox. Ask me anything about your emails."
      }
    ]);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        if (searchQuery === '') {
          setIsSearchOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchQuery]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    // Only switch API source for Inbox. For Pinned, we stay on INBOX but filter locally.
    if (tabName === 'Inbox') setActiveLabelId('INBOX');
    // We don't fetch specific 'STARRED' label from Gmail to avoid overwriting local state.
    // We just filter the existing list.
  };

  useEffect(() => {
    const fetchEmails = async () => {
      if (session) {
        try {
          const res = await fetch(`/api/emails?labelId=${activeLabelId}`);
          if (!res.ok) {
            console.warn("API Error:", res.status);
            return;
          }
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (data.emails) {
              // MERGE API DATA WITH LOCAL PINS
              // If an email from API is in our pinnedIds set, mark it as isPinned=true
              const mergedEmails = data.emails.map(e => ({
                ...e,
                isPinned: pinnedIds.has(e.id)
              }));
              setEmails(mergedEmails);
            }
          } catch (e) {
            console.warn("API returned non-JSON response:", text);
          }
        } catch (err) {
          console.error("Email fetch failed", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchEmails();
  }, [session, activeLabelId]); // Note: pinnedIds is not a dependency to avoid refetch loops

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          e.target.blur();
          if (searchQuery === '') setIsSearchOpen(false);
          closeChat();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (showChat) {
          closeChat();
        } else {
          setShowShortcuts(false);
          setShowSettings(false);
          setShowChat(true);
        }
      }
      if (e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 10);
      }
      if (e.key === 'Escape') {
        closeChat();
        setShowShortcuts(false);
        setShowSettings(false);
        setViewingEmailId(null);
        setExpandedEmailId(null);
        if (searchQuery === '') setIsSearchOpen(false);
      }
      if (!viewingEmailId && !showChat && !showShortcuts && !showSettings) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const idx = filteredEmails.findIndex(e => e.id === expandedEmailId);
          const next = idx + 1;
          if (next < filteredEmails.length) {
            setExpandedEmailId(filteredEmails[next].id);
          } else if (idx === -1 && filteredEmails.length > 0) {
            setExpandedEmailId(filteredEmails[0].id);
          }
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const idx = filteredEmails.findIndex(e => e.id === expandedEmailId);
          const prev = idx - 1;
          if (prev >= 0) {
            setExpandedEmailId(filteredEmails[prev].id);
          }
        }
        if (e.key === 'Enter' && expandedEmailId) {
          e.preventDefault();
          setViewingEmailId(expandedEmailId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    expandedEmailId,
    filteredEmails,
    viewingEmailId,
    showChat,
    showShortcuts,
    showSettings,
    searchQuery
  ]);

  if (!session)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className={`text-6xl mb-8 ${jua.className}`}>MailSage</h1>
        <button
          onClick={() => signIn('google')}
          className="flex items-center gap-3 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-all"
        >
          <img
            src="https://authjs.dev/img/providers/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Sign in with Google
        </button>
      </div>
    );

  const handleArchive = (id) => setEmails(prev => prev.filter(e => e.id !== id));
  const handleDelete = (id) => setEmails(prev => prev.filter(e => e.id !== id));

  // --- UPDATED PIN HANDLER: Updates both Email List AND Master Pin Set ---
  const handlePin = (id) => {
    // 1. Update the Email Object (Visual UI)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isPinned: !e.isPinned } : e));
    
    // 2. Update the Master Pin Set (Persistence)
    setPinnedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSummarize = (id) =>
    setEmails(prev =>
      prev.map(e => (e.id === id ? { ...e, hasSummary: !e.hasSummary } : e))
    );
  const toggleExpand = (id) => setExpandedEmailId(prev => (prev === id ? null : id));

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);
    try {
      const emailContext = filteredEmails.map(e => ({
        id: e.id,
        sender: e.sender,
        subject: e.subject,
        date: e.date
      }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, emailContext })
      });
      if (!res.ok) {
        setChatMessages(prev => [
          ...prev,
          { role: 'ai', content: "Error: AI Service Unavailable." }
        ]);
        return;
      }
      const data = await res.json();
      let aiText = data.reply;
      const actionRegex = /\[ACTION:([A-Z]+):([^\]]+)\]/;
      const match = aiText.match(actionRegex);
      if (match) {
        if (match[1] === 'PIN') handlePin(match[2]);
        aiText = aiText.replace(match[0], '').trim();
      }
      setChatMessages(prev => [...prev, { role: 'ai', content: aiText }]);
    } catch (e) {
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', content: "Connection error." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSummarizeHandler = async (id) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;
    if (email.hasSummary) {
      setEmails(prev =>
        prev.map(e => (e.id === id ? { ...e, hasSummary: false } : e))
      );
      return;
    }
    setSummarizingIds(prev => new Set(prev).add(id));
    try {
      const textToSummarize = extractContentForAI(email.body);
      const res = await fetch('/api/summary', {
        method: 'POST',
        body: JSON.stringify({ text: textToSummarize })
      });
      if (!res.ok) throw new Error("Summary API failed");
      const data = await res.json();
      if (data.summary)
        setEmails(prev =>
          prev.map(e =>
            e.id === id ? { ...e, hasSummary: true, summary: data.summary } : e
          )
        );
    } catch (e) {
      console.error("Summary failed", e);
    } finally {
      setSummarizingIds(prev => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  return (
    <div className="min-h-screen w-full font-sans selection:bg-blue-500 selection:text-white bg-black text-white">
      <AnimatePresence>
        {viewingEmailId && (
          <FullEmailView
            email={emails.find(e => e.id === viewingEmailId)}
            onClose={() => {
              setViewingEmailId(null);
              setExpandedEmailId(null);
            }}
            onSummarize={handleSummarizeHandler}
            onPin={handlePin}
            onDelete={handleDelete}
            onArchive={handleArchive}
            isSummarizing={summarizingIds.has(viewingEmailId)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSettings && (
          <SettingsView
            onClose={() => setShowSettings(false)}
            user={session.user}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeChat}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1c1e] w-full max-w-lg rounded-3xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[600px]"
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
                <h3 className="font-bold flex items-center gap-2 text-white">
                  <div className="bg-blue-500/20 p-1.5 rounded-lg">
                    <MessageSquare size={16} className="text-blue-500" />
                  </div>
                  AI Assistant
                </h3>
                <button
                  onClick={closeChat}
                  className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#1c1c1e]">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-gray-800 text-gray-200 rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 px-4 py-2 rounded-2xl rounded-tl-sm flex gap-1">
                      <span
                        className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-black/40 border-t border-gray-800">
                <div className="relative">
                  <input
                    ref={chatInputRef}
                    type="text"
                    placeholder="Type a command..."
                    className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gray-800 hover:bg-blue-600 rounded-lg text-gray-400 hover:text-white transition-all">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShortcuts(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1c1e] w-full max-w-sm rounded-3xl border border-gray-800 shadow-2xl overflow-hidden p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold flex items-center gap-2 text-white text-lg">
                  <Keyboard size={20} className="text-gray-400" />
                  Shortcuts
                </h3>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Open AI Assistant</span>
                  <div className="flex gap-1">
                    <kbd className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-300 font-mono text-xs">
                      ⌘
                    </kbd>
                    <kbd className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-300 font-mono text-xs">
                      K
                    </kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Global Search</span>
                  <div className="flex gap-1">
                    <kbd className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-300 font-mono text-xs">
                      /
                    </kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Next / Prev Card</span>
                  <div className="flex gap-1">
                    <kbd className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-300 font-mono text-xs">
                      ↓
                    </kbd>
                    <kbd className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-300 font-mono text-xs">
                      ↑
                    </kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Expand Card / Open</span>
                  <div className="flex gap-1">
                    <kbd className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-300 font-mono text-xs">
                      Enter
                    </kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Close / Back</span>
                  <div className="flex gap-1">
                    <kbd className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-300 font-mono text-xs">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {!viewingEmailId && (
        <div className="fixed top-0 left-0 right-0 z-40 pt-8 px-6 pb-4 bg-black/60 backdrop-blur-md">
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            <div className="flex justify-center">
              <div
                className={`p-1 rounded-2xl flex space-x-1 transition-colors duration-300 ${
                  darkMode
                    ? 'bg-[#1c1c1e] border border-white/10'
                    : 'bg-white/90 border border-transparent'
                }`}
              >
                {['1d', '7d', '14d', '30d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`w-12 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      timeRange === range
                        ? darkMode
                          ? 'bg-white text-black'
                          : 'bg-black text-white'
                        : darkMode
                        ? 'text-gray-500 hover:text-white'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between w-full relative">
              <div className="flex items-center space-x-3">
                {['Inbox', 'Pinned'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
                      activeTab === tab.toLowerCase() ||
                      (activeTab === 'Inbox' && tab === 'Inbox') ||
                      (activeTab === 'Pinned' && tab === 'Pinned')
                        ? 'bg-[#1c1c1e] text-white border-gray-700'
                        : 'text-gray-500 border-transparent hover:text-white hover:bg-[#1c1c1e]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div
                ref={searchContainerRef}
                className={`relative flex items-center transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] rounded-full h-10 ${
                  isSearchOpen
                    ? 'w-64 bg-[#1c1c1e] border border-gray-800 shadow-xl'
                    : 'w-10 bg-transparent border border-transparent'
                } overflow-hidden`}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full h-full bg-transparent border-none text-white text-sm placeholder-gray-500 focus:outline-none pl-4 pr-12 transition-opacity duration-200 ${
                    isSearchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />
                <button
                  onClick={() => {
                    if (!isSearchOpen) {
                      setIsSearchOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 10);
                    } else {
                      if (searchQuery === '') setIsSearchOpen(false);
                    }
                  }}
                  className={`absolute right-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isSearchOpen
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Search size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {!viewingEmailId && (
        <main className="pt-48 pb-32 px-4 min-h-screen">
          <div className="max-w-2xl mx-auto">
            {loading ? (
              <div className="flex justify-center items-center h-64 text-gray-500 animate-pulse">
                <Loader2 size={32} className="animate-spin mr-2" /> Loading
                Emails...
              </div>
            ) : filteredEmails.length === 0 ? (
              <EmptyState
                message={
                  searchQuery ? "No results found" : "All Caught Up"
                }
                icon={searchQuery ? Search : CheckCircle}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredEmails.map((email) => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    isExpanded={expandedEmailId === email.id}
                    onToggleExpand={toggleExpand}
                    onSummarize={handleSummarizeHandler}
                    onPin={handlePin}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                    onOpen={setViewingEmailId}
                    isSummarizing={summarizingIds.has(email.id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </main>
      )}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <div
          className={`backdrop-blur-2xl border p-2 rounded-3xl shadow-2xl flex items-center space-x-3 pointer-events-auto transition-colors duration-300 ${
            darkMode
              ? 'bg-[#1c1c1e]/90 border-white/10'
              : 'bg-white/90 border-transparent'
          }`}
        >
          <DockItem
            icon={<MessageSquare size={20} />}
            onClick={() => {
              if (showChat) {
                closeChat();
              } else {
                setShowShortcuts(false);
                setShowSettings(false);
                setShowChat(true);
              }
            }}
            isActive={showChat}
            darkMode={darkMode}
          />
          <div
            className={`w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
          />
          <DockItem
            icon={<Command size={20} />}
            onClick={() => {
              if (showShortcuts) {
                setShowShortcuts(false);
              } else {
                setShowChat(false);
                setShowSettings(false);
                setShowShortcuts(true);
              }
            }}
            isActive={showShortcuts}
            darkMode={darkMode}
          />
          <DockItem
            icon={darkMode ? <Sun size={20} /> : <Moon size={20} />}
            onClick={() => setDarkMode(!darkMode)}
            darkMode={darkMode}
          />
          <div
            className={`w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
          />
          <DockItem
            icon={<Settings size={20} />}
            onClick={() => {
              if (showSettings) {
                setShowSettings(false);
              } else {
                setShowChat(false);
                setShowShortcuts(false);
                setShowSettings(true);
              }
            }}
            isActive={showSettings}
            darkMode={darkMode}
          />
        </div>
      </div>
    </div>
  );
};

export default App;