import React, { useState, useEffect } from 'react';
import {
  Star,
  Search,
  ArrowLeft,
  Trash2,
  ExternalLink,
  MessageSquare,
  Play,
  Pause,
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  Mic,
  Calendar,
  X,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { StarredMessage, UserProfile, Conversation } from '../types';

interface StarredMessagesViewProps {
  currentUser: UserProfile;
  conversations: Conversation[];
  onClose: () => void;
  onSelectConversation?: (conversationId: string, messageId?: string) => void;
}

export const StarredMessagesView: React.FC<StarredMessagesViewProps> = ({
  currentUser,
  conversations,
  onClose,
  onSelectConversation,
}) => {
  const [starredMessages, setStarredMessages] = useState<StarredMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterConversationId, setFilterConversationId] = useState<string>('all');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Subscribe to user's starred messages
  useEffect(() => {
    const q = query(
      collection(db, 'users', currentUser.id, 'starredMessages'),
      orderBy('starredAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: StarredMessage[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as StarredMessage);
        });
        setStarredMessages(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching starred messages:', err);
        setLoading(false);
      }
    );

    return () => {
      unsub();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentUser.id]);

  const handleUnstar = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'users', currentUser.id, 'starredMessages', id));
    } catch (err) {
      console.error('Failed to unstar message:', err);
    }
  };

  const handleCopyText = (msg: StarredMessage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (msg.text) {
      navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleToggleAudio = (msg: StarredMessage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!msg.mediaUrl) return;

    if (playingAudioId === msg.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const newAudio = new Audio(msg.mediaUrl);
      audioRef.current = newAudio;
      newAudio.onended = () => setPlayingAudioId(null);
      newAudio.play();
      setPlayingAudioId(msg.id);
    }
  };

  // Filter messages based on search and conversation
  const filteredMessages = starredMessages.filter((msg) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (msg.text && msg.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (msg.senderName && msg.senderName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (msg.conversationName && msg.conversationName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesConvo =
      filterConversationId === 'all' || msg.conversationId === filterConversationId;

    return matchesSearch && matchesConvo;
  });

  // Get unique conversations from starred messages for filter dropdown
  const conversationOptions = Array.from(
    new Set(starredMessages.map((m) => m.conversationId))
  ).map((convoId) => {
    const convo = conversations.find((c) => c.id === convoId);
    const firstMsg = starredMessages.find((m) => m.conversationId === convoId);
    return {
      id: convoId,
      name: convo?.name || firstMsg?.conversationName || 'Conversation',
    };
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-3.5 border-b border-slate-200 flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Starred Messages
              </h2>
              <p className="text-xs text-slate-500">
                {starredMessages.length} saved message{starredMessages.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row gap-2 z-10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search starred messages..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#19B9F4]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {conversationOptions.length > 1 && (
          <select
            value={filterConversationId}
            onChange={(e) => setFilterConversationId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#19B9F4]"
          >
            <option value="all">All Conversations</option>
            {conversationOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs">Loading starred messages...</p>
          </div>
        ) : starredMessages.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-3 shadow-xs">
              <Star className="w-8 h-8 fill-amber-300 text-amber-500" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No starred messages yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Bookmark important notes, addresses, media, or voice messages in any chat by tapping the star icon on a message.
            </p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Search className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
            <h4 className="font-bold text-slate-700 text-sm">No matching messages</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              No starred messages match your search filter "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterConversationId('all');
              }}
              className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const convoName =
              conversations.find((c) => c.id === msg.conversationId)?.name ||
              msg.conversationName ||
              'Chat';

            return (
              <div
                key={msg.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group relative"
              >
                {/* Top Meta info */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                      {msg.senderPhoto ? (
                        <img src={msg.senderPhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600">
                          {msg.senderName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        <span className="text-[10px] text-slate-400">• in {convoName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(msg.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {msg.text && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyText(msg, e)}
                        title="Copy text"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {onSelectConversation && (
                      <button
                        type="button"
                        onClick={() => onSelectConversation(msg.conversationId, msg.messageId)}
                        title="Go to conversation"
                        className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Go to chat</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleUnstar(msg.id, e)}
                      title="Remove from starred"
                      className="p-1.5 text-amber-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-2">
                  {msg.text && (
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  )}

                  {msg.mediaType === 'image' && msg.mediaUrl && (
                    <div className="rounded-xl overflow-hidden max-h-60 max-w-sm border border-slate-100 bg-slate-50">
                      <img
                        src={msg.mediaUrl}
                        alt="Starred media"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-95"
                        onClick={() => window.open(msg.mediaUrl, '_blank')}
                      />
                    </div>
                  )}

                  {msg.mediaType === 'video' && msg.mediaUrl && (
                    <div className="rounded-xl overflow-hidden max-h-60 max-w-sm border border-slate-100">
                      <video src={msg.mediaUrl} controls className="w-full h-full" />
                    </div>
                  )}

                  {msg.mediaType === 'audio' && msg.mediaUrl && (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-sky-50 max-w-sm">
                      <button
                        type="button"
                        onClick={(e) => handleToggleAudio(msg, e)}
                        className="w-8 h-8 rounded-full bg-[#19B9F4] text-white flex items-center justify-center flex-shrink-0 shadow-xs"
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 h-3">
                          {[30, 60, 40, 80, 50, 70, 90, 45, 65, 30].map((h, i) => (
                            <div
                              key={i}
                              style={{ height: `${h}%` }}
                              className="w-1 bg-[#19B9F4] rounded-full"
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                          Voice Note {msg.audioDuration ? `(0:${msg.audioDuration < 10 ? '0' : ''}${msg.audioDuration})` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer bookmark badge */}
                <div className="flex items-center justify-end gap-1 mt-2.5 pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>Starred {new Date(msg.starredAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
