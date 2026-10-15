import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Phone,
  Video,
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  Play,
  Pause,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Film,
  Trash2,
  CornerUpLeft,
  X,
  FileText,
  AlertTriangle,
  UserX,
  Search,
  ChevronUp,
  ChevronDown,
  Filter,
  List,
  Star,
  Palette,
  Upload,
  RotateCcw,
  Loader2,
  Clock,
  Calendar,
  AlertCircle,
  Edit3,
  SendHorizontal,
  Info,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Conversation, Message, UserProfile, ScheduledMessage, MessageReaction, TypingStatus } from '../types';
import { sounds } from '../utils/audioChimes';

const CHAT_COLOR_PRESETS = [
  { name: 'Default', value: '#f8fafc' },
  { name: 'Soft Sky', value: '#f0f9ff' },
  { name: 'Warm Cream', value: '#fffbeb' },
  { name: 'Gentle Rose', value: '#fff1f2' },
  { name: 'Mint Green', value: '#f0fdf4' },
  { name: 'Lavender', value: '#f5f3ff' },
  { name: 'Ocean Teal', value: '#ecfeff' },
  { name: 'Midnight', value: '#0f172a' },
];

const CHAT_GRADIENT_PRESETS = [
  { name: 'Sunrise', value: 'linear-gradient(135deg, #fff1f2 0%, #fef3c7 50%, #f0f9ff 100%)' },
  { name: 'Sky Breeze', value: 'linear-gradient(180deg, #e0f2fe 0%, #f8fafc 100%)' },
  { name: 'Sunset Glow', value: 'linear-gradient(135deg, #ffedd5 0%, #fee2e2 100%)' },
  { name: 'Emerald', value: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 50%, #e0f2fe 100%)' },
  { name: 'Cyber Neon', value: 'linear-gradient(135deg, #2e1065 0%, #0f172a 100%)' },
  { name: 'Cosmic Slate', value: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
];

const CHAT_WALLPAPER_PRESETS = [
  { name: 'Calm Clouds', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80' },
  { name: 'Fluid Abstract', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80' },
  { name: 'Geometric', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80' },
  { name: 'Dark Cyber', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80' },
  { name: 'Misty Pines', url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80' },
  { name: 'Architecture', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80' },
];

const QUICK_REACTION_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '👏', '🎉'];
const EXTENDED_REACTION_EMOJIS = [
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '🔥', '✨', '💯', '🎉',
  '👍', '👎', '👏', '🙌', '🙏', '🤝', '💪', '👊', '✌️', '👌', '👋', '🚀',
  '😂', '🤣', '😊', '😍', '🥰', '😘', '😋', '😎', '🤩', '🥳', '🤔', '🤫',
  '😮', '😲', '🥺', '😢', '😭', '😱', '😤', '😡', '😴', '😷', '🤯', '💀',
];

interface MessageReactionsProps {
  conversationId: string;
  messageId: string;
  currentUser: UserProfile;
  isMe: boolean;
  isActive: boolean;
  onToggleActive: () => void;
  onClose: () => void;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  conversationId,
  messageId,
  currentUser,
  isMe,
  isActive,
  onToggleActive,
  onClose,
}) => {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [showExtendedPicker, setShowExtendedPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to real-time reactions in the Firestore message sub-collection
  useEffect(() => {
    if (!conversationId || !messageId) return;
    const reactionsRef = collection(
      db,
      'conversations',
      conversationId,
      'messages',
      messageId,
      'reactions'
    );
    const unsub = onSnapshot(
      reactionsRef,
      (snapshot) => {
        const items: MessageReaction[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            messageId: data.messageId || messageId,
            conversationId: data.conversationId || conversationId,
            userId: data.userId,
            userName: data.userName || 'Anonymous',
            userPhoto: data.userPhoto,
            emoji: data.emoji,
            createdAt: data.createdAt || '',
          });
        });
        setReactions(items);
      },
      (err) => {
        console.error('Error listening to message reactions:', err);
      }
    );
    return () => unsub();
  }, [conversationId, messageId]);

  // Click outside listener for the active reaction picker
  useEffect(() => {
    if (!isActive) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
        setShowExtendedPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActive, onClose]);

  // Toggle emoji reaction
  const handleToggleEmoji = async (emoji: string) => {
    try {
      const existing = reactions.find(
        (r) => r.userId === currentUser.id && r.emoji === emoji
      );
      if (existing) {
        // Remove reaction (toggle off)
        await deleteDoc(
          doc(
            db,
            'conversations',
            conversationId,
            'messages',
            messageId,
            'reactions',
            existing.id
          )
        );
        sounds.playMessagePop();
      } else {
        // Add new reaction to the Firestore sub-collection
        await addDoc(
          collection(
            db,
            'conversations',
            conversationId,
            'messages',
            messageId,
            'reactions'
          ),
          {
            messageId,
            conversationId,
            userId: currentUser.id,
            userName: currentUser.fullName,
            userPhoto: currentUser.photoURL || '',
            emoji,
            createdAt: new Date().toISOString(),
          }
        );
        sounds.playMessagePop();
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `conversations/${conversationId}/messages/${messageId}/reactions`
      );
    } finally {
      onClose();
      setShowExtendedPicker(false);
    }
  };

  // Group reactions by emoji
  const grouped = React.useMemo(() => {
    const map = new Map<
      string,
      { emoji: string; count: number; users: string[]; hasReacted: boolean }
    >();
    reactions.forEach((r) => {
      if (!map.has(r.emoji)) {
        map.set(r.emoji, {
          emoji: r.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        });
      }
      const entry = map.get(r.emoji)!;
      entry.count += 1;
      entry.users.push(r.userId === currentUser.id ? 'You' : (r.userName || 'Someone'));
      if (r.userId === currentUser.id) {
        entry.hasReacted = true;
      }
    });
    return Array.from(map.values());
  }, [reactions, currentUser.id]);

  return (
    <div className="relative mt-1">
      {/* Floating Reaction Quick Bar */}
      {isActive && (
        <div
          ref={pickerRef}
          className={`absolute -top-11 z-40 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-2 py-1 shadow-lg animate-in zoom-in-95 duration-150 ${
            isMe ? 'right-0' : 'left-0'
          }`}
        >
          {QUICK_REACTION_EMOJIS.map((emoji) => {
            const hasReacted = reactions.some(
              (r) => r.userId === currentUser.id && r.emoji === emoji
            );
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggleEmoji(emoji)}
                className={`text-base p-1 rounded-full transition-transform hover:scale-125 select-none ${
                  hasReacted ? 'bg-sky-100 ring-2 ring-sky-400' : 'hover:bg-slate-100'
                }`}
                title={hasReacted ? `Remove ${emoji}` : `React with ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowExtendedPicker(!showExtendedPicker)}
            className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors ml-0.5"
            title="More emojis"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              setShowExtendedPicker(false);
            }}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Extended emoji palette popover */}
          {showExtendedPicker && (
            <div
              className={`absolute top-11 ${
                isMe ? 'right-0' : 'left-0'
              } bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 w-64 z-50 animate-in fade-in zoom-in-95 duration-150`}
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                Choose Reaction
              </div>
              <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto pr-0.5">
                {EXTENDED_REACTION_EMOJIS.map((emoji) => {
                  const hasReacted = reactions.some(
                    (r) => r.userId === currentUser.id && r.emoji === emoji
                  );
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleToggleEmoji(emoji)}
                      className={`text-lg p-1.5 rounded-xl transition-all hover:scale-125 flex items-center justify-center ${
                        hasReacted ? 'bg-sky-100 ring-2 ring-sky-400' : 'hover:bg-slate-100'
                      }`}
                      title={hasReacted ? `Remove ${emoji}` : `React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render Reaction Badges under Message Bubble */}
      {grouped.length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-1 ${
            isMe ? 'justify-end' : 'justify-start'
          }`}
        >
          {grouped.map((g) => (
            <button
              key={g.emoji}
              type="button"
              onClick={() => handleToggleEmoji(g.emoji)}
              title={`${g.users.join(', ')} reacted with ${g.emoji}`}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all active:scale-95 select-none border shadow-2xs ${
                g.hasReacted
                  ? 'bg-sky-50 border-sky-300 text-sky-700 font-semibold ring-1 ring-sky-200'
                  : 'bg-white/95 hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span className="text-sm leading-none">{g.emoji}</span>
              <span className={`text-[11px] ${g.hasReacted ? 'font-bold text-sky-700' : 'text-slate-600'}`}>
                {g.count}
              </span>
            </button>
          ))}

          {/* Quick Plus button to add another emoji reaction */}
          <button
            type="button"
            onClick={onToggleActive}
            title="Add reaction"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-slate-600 border border-slate-200 text-xs shadow-2xs transition-transform active:scale-90"
          >
            <Smile className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

interface ChatRoomProps {
  conversation: Conversation;
  currentUser: UserProfile;
  otherUser?: UserProfile;
  onBack: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onOpenVoiceRecorder: () => void;
  onReportUser: (user: UserProfile) => void;
  onBlockUser: (userId: string) => void;
  onOpenStarred?: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  conversation,
  currentUser,
  otherUser,
  onBack,
  onStartCall,
  onOpenVoiceRecorder,
  onReportUser,
  onBlockUser,
  onOpenStarred,
  onProfileUpdated,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [isSavingWallpaper, setIsSavingWallpaper] = useState(false);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [mediaUploadPreview, setMediaUploadPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [filterOnlyMatches, setFilterOnlyMatches] = useState(false);
  const [isSearchingSubcollection, setIsSearchingSubcollection] = useState(false);
  const [searchResultsList, setSearchResultsList] = useState<Message[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [hasSearchedKeyword, setHasSearchedKeyword] = useState<string>('');
  const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(new Set());
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [selectedMessageForInfo, setSelectedMessageForInfo] = useState<Message | null>(null);

  // Message Scheduling States
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showScheduledListModal, setShowScheduledListModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDraftText, setScheduleDraftText] = useState('');
  const [editingScheduledMessage, setEditingScheduledMessage] = useState<ScheduledMessage | null>(null);
  const [isSavingScheduled, setIsSavingScheduled] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleToast, setScheduleToast] = useState<string | null>(null);

  // Real-time typing indicators state
  const [otherTypingUsers, setOtherTypingUsers] = useState<TypingStatus[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingUpdateRef = useRef<number>(0);
  const isSelfTypingRef = useRef<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wallpaperUploadRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to user's starred message IDs
  useEffect(() => {
    const q = collection(db, 'users', currentUser.id, 'starredMessages');
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const ids = new Set<string>();
        snapshot.forEach((d) => ids.add(d.id));
        setStarredMessageIds(ids);
      },
      (err) => {
        console.error('Error listening to starred messages:', err);
      }
    );
    return () => unsub();
  }, [currentUser.id]);

  // Subscribe to messages in this conversation with an explicit 'readBy' array update trigger
  useEffect(() => {
    const q = query(
      collection(db, 'conversations', conversation.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    // Track message IDs currently being processed to prevent redundant updates
    const pendingReadUpdates = new Set<string>();

    // Dedicated 'readBy' array update trigger for the message listener
    const triggerReadByArrayUpdate = async (docsToMark: Array<{ id: string; data: Message }>) => {
      if (!docsToMark || docsToMark.length === 0) return;

      try {
        const batch = writeBatch(db);
        let batchCount = 0;

        docsToMark.forEach((item) => {
          const messageRef = doc(db, 'conversations', conversation.id, 'messages', item.id);
          batch.update(messageRef, {
            readBy: arrayUnion(currentUser.id),
          });
          batchCount++;
        });

        if (batchCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.warn('Batch read receipt update error, falling back to individual updates:', err);
        for (const item of docsToMark) {
          try {
            await updateDoc(doc(db, 'conversations', conversation.id, 'messages', item.id), {
              readBy: arrayUnion(currentUser.id),
            });
          } catch (individualErr) {
            console.warn('Failed to update readBy receipt for message:', item.id, individualErr);
          }
        }
      }

      // Update parent conversation lastMessage readBy if recipient reads it
      if (
        conversation.lastMessage &&
        (!conversation.lastMessage.readBy || !conversation.lastMessage.readBy.includes(currentUser.id))
      ) {
        try {
          await updateDoc(doc(db, 'conversations', conversation.id), {
            'lastMessage.readBy': arrayUnion(currentUser.id),
          });
        } catch (convErr) {
          console.warn('Failed to update conversation lastMessage readBy:', convErr);
        }
      }
    };

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        const unreadDocs: Array<{ id: string; data: Message }> = [];

        // Scan snapshot documents: if currentUser is in the conversation and hasn't read this message, trigger readBy update
        snapshot.forEach((d) => {
          const msg = { id: d.id, ...d.data() } as Message;
          msgs.push(msg);

          if (!msg.readBy || !msg.readBy.includes(currentUser.id)) {
            if (!pendingReadUpdates.has(d.id)) {
              pendingReadUpdates.add(d.id);
              unreadDocs.push({ id: d.id, data: msg });
            }
          }
        });

        // Explicit readBy trigger for real-time document additions/modifications in the listener
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = { id: change.doc.id, ...change.doc.data() } as Message;
            if (!data.readBy || !data.readBy.includes(currentUser.id)) {
              if (!pendingReadUpdates.has(change.doc.id)) {
                pendingReadUpdates.add(change.doc.id);
                unreadDocs.push({ id: change.doc.id, data });
              }
            }
          }
        });

        setMessages(msgs);

        // Execute 'readBy' array update trigger
        if (unreadDocs.length > 0) {
          triggerReadByArrayUpdate(unreadDocs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `conversations/${conversation.id}/messages`);
      }
    );

    // Also mark read when window/tab is focused
    const handleWindowFocus = () => {
      setMessages((prev) => {
        const unread = prev
          .filter((m) => !m.readBy || !m.readBy.includes(currentUser.id))
          .filter((m) => !pendingReadUpdates.has(m.id))
          .map((m) => {
            pendingReadUpdates.add(m.id);
            return { id: m.id, data: m };
          });
        if (unread.length > 0) {
          triggerReadByArrayUpdate(unread);
        }
        return prev;
      });
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      unsub();
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [conversation.id, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to real-time typing indicators in this conversation
  useEffect(() => {
    const typingCol = collection(db, 'conversations', conversation.id, 'typing');
    const unsub = onSnapshot(
      typingCol,
      (snapshot) => {
        const now = Date.now();
        const active: TypingStatus[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as TypingStatus;
          if (data.userId !== currentUser.id && data.isTyping) {
            const time = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
            if (now - time < 8000) {
              active.push({ ...data, id: d.id });
            }
          }
        });
        setOtherTypingUsers(active);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `conversations/${conversation.id}/typing`);
      }
    );

    // Periodic sweep every 2 seconds to remove stale typing indicators
    const interval = setInterval(() => {
      const now = Date.now();
      setOtherTypingUsers((prev) =>
        prev.filter((u) => {
          const time = u.updatedAt ? new Date(u.updatedAt).getTime() : 0;
          return u.isTyping && now - time < 8000;
        })
      );
    }, 2000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [conversation.id, currentUser.id]);

  // Clean up own typing indicator when switching conversations or on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      try {
        const typingDocRef = doc(db, 'conversations', conversation.id, 'typing', currentUser.id);
        setDoc(
          typingDocRef,
          {
            id: currentUser.id,
            conversationId: conversation.id,
            userId: currentUser.id,
            userName: currentUser.fullName || 'Someone',
            isTyping: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});
      } catch {}
      isSelfTypingRef.current = false;
    };
  }, [conversation.id, currentUser.id]);

  // Auto-scroll when another participant starts or stops typing
  useEffect(() => {
    if (otherTypingUsers.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [otherTypingUsers.length]);

  // Update typing indicator state in Firestore for current user
  const setTypingStateInFirestore = async (isTyping: boolean) => {
    try {
      const typingDocRef = doc(db, 'conversations', conversation.id, 'typing', currentUser.id);
      await setDoc(
        typingDocRef,
        {
          id: currentUser.id,
          conversationId: conversation.id,
          userId: currentUser.id,
          userName: currentUser.fullName || 'Someone',
          userPhoto: currentUser.photoURL || '',
          isTyping,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      isSelfTypingRef.current = isTyping;
      if (isTyping) {
        lastTypingUpdateRef.current = Date.now();
      }
    } catch (error) {
      console.warn('Failed to update typing indicator:', error);
    }
  };

  // Debounced typing handler invoked on keystroke/change in the input field
  const handleTypingActivity = (forceStop: boolean = false) => {
    if (forceStop) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setTypingStateInFirestore(false);
      return;
    }

    const now = Date.now();
    // Throttle writes to at most once every 2 seconds while continuous typing
    if (!isSelfTypingRef.current || now - lastTypingUpdateRef.current > 2000) {
      setTypingStateInFirestore(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Inactivity timeout: stop typing after 2.5 seconds of no key presses
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStateInFirestore(false);
    }, 2500);
  };

  // Auto-dismiss schedule toast
  useEffect(() => {
    if (!scheduleToast) return;
    const timer = setTimeout(() => setScheduleToast(null), 4000);
    return () => clearTimeout(timer);
  }, [scheduleToast]);

  // Subscribe to scheduled messages for this conversation
  useEffect(() => {
    const q = query(
      collection(db, 'scheduledMessages'),
      where('conversationId', '==', conversation.id)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ScheduledMessage[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ScheduledMessage);
        });
        list.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
        setScheduledMessages(list);
      },
      (error) => {
        console.warn('Error listening to scheduled messages:', error);
      }
    );

    return () => unsub();
  }, [conversation.id]);

  // Automated delivery of scheduled messages when their time arrives
  useEffect(() => {
    const processDueScheduledMessages = async () => {
      const now = Date.now();
      const dueMessages = scheduledMessages.filter(
        (m) =>
          m.status === 'pending' &&
          m.senderId === currentUser.id &&
          new Date(m.scheduledFor).getTime() <= now
      );

      for (const msg of dueMessages) {
        try {
          // Immediately mark as sent to avoid repeated triggers
          await updateDoc(doc(db, 'scheduledMessages', msg.id), {
            status: 'sent',
          });

          // Post to conversation messages
          await addDoc(collection(db, 'conversations', conversation.id, 'messages'), {
            conversationId: conversation.id,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderPhoto: msg.senderPhoto || '',
            text: msg.text,
            mediaType: msg.mediaType || 'text',
            mediaUrl: msg.mediaUrl || '',
            timestamp: new Date().toISOString(),
            readBy: [currentUser.id],
          });

          // Update conversation lastMessage
          await updateDoc(doc(db, 'conversations', conversation.id), {
            lastMessage: {
              text: msg.text || (msg.mediaType ? `[${msg.mediaType}]` : ''),
              senderId: msg.senderId,
              senderName: msg.senderName,
              timestamp: new Date().toISOString(),
              mediaType: msg.mediaType || 'text',
              readBy: [currentUser.id],
            },
            updatedAt: new Date().toISOString(),
          });

          sounds.playMessagePop();
          setScheduleToast(`Scheduled message sent: "${msg.text.slice(0, 28)}${msg.text.length > 28 ? '...' : ''}"`);
        } catch (err) {
          console.error('Failed to automatically send scheduled message:', err);
        }
      }
    };

    processDueScheduledMessages();
    const interval = setInterval(processDueScheduledMessages, 5000);
    return () => clearInterval(interval);
  }, [scheduledMessages, conversation.id, currentUser]);

  const getDefaultScheduleDateTime = () => {
    const d = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return {
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`,
    };
  };

  const handleOpenScheduleModal = (scheduledMsg?: ScheduledMessage) => {
    if (scheduledMsg) {
      setEditingScheduledMessage(scheduledMsg);
      setScheduleDraftText(scheduledMsg.text);
      const d = new Date(scheduledMsg.scheduledFor);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setScheduleDate(`${yyyy}-${mm}-${dd}`);
      setScheduleTime(`${hh}:${min}`);
    } else {
      setEditingScheduledMessage(null);
      setScheduleDraftText(inputText);
      const defaults = getDefaultScheduleDateTime();
      setScheduleDate(defaults.date);
      setScheduleTime(defaults.time);
    }
    setScheduleError('');
    setShowScheduleModal(true);
  };

  const applySchedulePreset = (offsetMs: number, targetHour?: number) => {
    let target = new Date();
    if (targetHour !== undefined) {
      target.setDate(target.getDate() + 1);
      target.setHours(targetHour, 0, 0, 0);
    } else {
      target = new Date(Date.now() + offsetMs);
    }
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const hh = String(target.getHours()).padStart(2, '0');
    const min = String(target.getMinutes()).padStart(2, '0');
    setScheduleDate(`${yyyy}-${mm}-${dd}`);
    setScheduleTime(`${hh}:${min}`);
    setScheduleError('');
  };

  const handleSaveScheduledMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSchedule = scheduleDraftText.trim() || inputText.trim();
    if (!textToSchedule && !mediaUploadPreview && !editingScheduledMessage?.mediaUrl) {
      setScheduleError('Please enter a message or provide media to schedule.');
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      setScheduleError('Please select both a date and a time.');
      return;
    }

    const [year, month, day] = scheduleDate.split('-').map(Number);
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    const scheduledDateTime = new Date(year, month - 1, day, hours, minutes);

    if (isNaN(scheduledDateTime.getTime())) {
      setScheduleError('Invalid date or time selected.');
      return;
    }

    if (scheduledDateTime.getTime() <= Date.now() + 30000) {
      setScheduleError('Scheduled time must be at least 1 minute in the future.');
      return;
    }

    setIsSavingScheduled(true);
    setScheduleError('');

    try {
      if (editingScheduledMessage) {
        await updateDoc(doc(db, 'scheduledMessages', editingScheduledMessage.id), {
          text: textToSchedule,
          scheduledFor: scheduledDateTime.toISOString(),
        });
        setScheduleToast(`Scheduled message updated for ${formatScheduledTime(scheduledDateTime.toISOString())}`);
      } else {
        await addDoc(collection(db, 'scheduledMessages'), {
          conversationId: conversation.id,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          senderPhoto: currentUser.photoURL || '',
          text: textToSchedule,
          mediaType: mediaUploadPreview ? mediaUploadPreview.type : 'text',
          mediaUrl: mediaUploadPreview ? mediaUploadPreview.url : '',
          scheduledFor: scheduledDateTime.toISOString(),
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        if (textToSchedule === inputText.trim()) {
          setInputText('');
        }
        setMediaUploadPreview(null);
        setScheduleToast(`Message scheduled for ${formatScheduledTime(scheduledDateTime.toISOString())}`);
      }

      setShowScheduleModal(false);
      setEditingScheduledMessage(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scheduledMessages');
      setScheduleError('Failed to schedule message. Please try again.');
    } finally {
      setIsSavingScheduled(false);
    }
  };

  const handleSendScheduledNow = async (scheduledMsg: ScheduledMessage) => {
    try {
      await updateDoc(doc(db, 'scheduledMessages', scheduledMsg.id), {
        status: 'sent',
      });

      await addDoc(collection(db, 'conversations', conversation.id, 'messages'), {
        conversationId: conversation.id,
        senderId: scheduledMsg.senderId,
        senderName: scheduledMsg.senderName,
        senderPhoto: scheduledMsg.senderPhoto || '',
        text: scheduledMsg.text,
        mediaType: scheduledMsg.mediaType || 'text',
        mediaUrl: scheduledMsg.mediaUrl || '',
        timestamp: new Date().toISOString(),
        readBy: [currentUser.id],
      });

      await updateDoc(doc(db, 'conversations', conversation.id), {
        lastMessage: {
          text: scheduledMsg.text || (scheduledMsg.mediaType ? `[${scheduledMsg.mediaType}]` : ''),
          senderId: scheduledMsg.senderId,
          senderName: scheduledMsg.senderName,
          timestamp: new Date().toISOString(),
          mediaType: scheduledMsg.mediaType || 'text',
          readBy: [currentUser.id],
        },
        updatedAt: new Date().toISOString(),
      });

      sounds.playMessagePop();
      setScheduleToast('Scheduled message sent now!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `scheduledMessages/${scheduledMsg.id}`);
    }
  };

  const handleCancelScheduledMessage = async (scheduledId: string) => {
    try {
      await deleteDoc(doc(db, 'scheduledMessages', scheduledId));
      setScheduleToast('Scheduled message cancelled.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `scheduledMessages/${scheduledId}`);
    }
  };

  const formatScheduledTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatScheduledCountdown = (dateStr: string) => {
    try {
      const target = new Date(dateStr).getTime();
      const now = Date.now();
      const diffMs = target - now;
      if (diffMs <= 0) return 'Sending soon...';
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins < 60) return `in ${diffMins} min${diffMins > 1 ? 's' : ''}`;
      const diffHours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      if (diffHours < 24) {
        return `in ${diffHours}h ${remMins > 0 ? `${remMins}m` : ''}`;
      }
      const diffDays = Math.floor(diffHours / 24);
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } catch {
      return dateStr;
    }
  };

  const pendingScheduled = scheduledMessages.filter(
    (m) => m.status === 'pending' && m.senderId === currentUser.id
  );

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !mediaUploadPreview) return;

    const textToSend = inputText.trim();
    const mediaToSend = mediaUploadPreview;

    setInputText('');
    setMediaUploadPreview(null);
    setReplyMessage(null);
    setShowEmojiPicker(false);
    handleTypingActivity(true);

    try {
      sounds.playMessagePop();

      const newMsg: Partial<Message> = {
        conversationId: conversation.id,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        senderPhoto: currentUser.photoURL || '',
        text: textToSend,
        mediaType: mediaToSend ? mediaToSend.type : 'text',
        mediaUrl: mediaToSend ? mediaToSend.url : '',
        timestamp: new Date().toISOString(),
        readBy: [currentUser.id],
      };

      if (replyMessage) {
        newMsg.replyTo = {
          id: replyMessage.id,
          text: replyMessage.text || 'Media attachment',
          senderName: replyMessage.senderName,
        };
      }

      await addDoc(collection(db, 'conversations', conversation.id, 'messages'), newMsg);

      // Update parent conversation preview
      await updateDoc(doc(db, 'conversations', conversation.id), {
        lastMessage: {
          text: textToSend || (mediaToSend ? `[${mediaToSend.type}]` : ''),
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          timestamp: new Date().toISOString(),
          mediaType: mediaToSend ? mediaToSend.type : 'text',
          readBy: [currentUser.id],
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversation.id}/messages`);
    }
  };

  const handleToggleAudio = (msg: Message) => {
    if (!msg.mediaUrl) return;

    if (playingAudioId === msg.id) {
      const audio = audioElementsRef.current[msg.id];
      if (audio) {
        audio.pause();
        setPlayingAudioId(null);
      }
    } else {
      // Pause any previous playing audio
      if (playingAudioId && audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }

      let audio = audioElementsRef.current[msg.id];
      if (!audio) {
        audio = new Audio(msg.mediaUrl);
        audioElementsRef.current[msg.id] = audio;

        audio.ontimeupdate = () => {
          if (audio.duration) {
            setAudioProgress((prev) => ({
              ...prev,
              [msg.id]: (audio.currentTime / audio.duration) * 100,
            }));
          }
        };

        audio.onended = () => {
          setPlayingAudioId(null);
          setAudioProgress((prev) => ({ ...prev, [msg.id]: 0 }));
        };
      }

      audio.play();
      setPlayingAudioId(msg.id);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      alert('Please upload an image or video file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaUploadPreview({
        url: reader.result as string,
        type: isVideo ? 'video' : 'image',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (confirm('Delete this message?')) {
      try {
        await deleteDoc(doc(db, 'conversations', conversation.id, 'messages', msgId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `conversations/${conversation.id}/messages/${msgId}`);
      }
    }
  };

  const handleToggleStar = async (msg: Message) => {
    const isCurrentlyStarred = starredMessageIds.has(msg.id);
    const starDocRef = doc(db, 'users', currentUser.id, 'starredMessages', msg.id);
    try {
      if (isCurrentlyStarred) {
        await deleteDoc(starDocRef);
      } else {
        sounds.playMessagePop();
        await setDoc(starDocRef, {
          id: msg.id,
          messageId: msg.id,
          conversationId: conversation.id,
          conversationName: displayName,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderPhoto: msg.senderPhoto || '',
          text: msg.text || '',
          mediaType: msg.mediaType,
          mediaUrl: msg.mediaUrl || '',
          audioDuration: msg.audioDuration || 0,
          timestamp: msg.timestamp,
          starredAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to toggle star on message:', err);
    }
  };

  const specificWallpaper = currentUser.conversationBackgrounds?.[conversation.id];
  const hasSpecificWallpaper = Boolean(specificWallpaper);

  const getBackgroundStyle = (): React.CSSProperties => {
    // 1. Check specific conversation background preference
    const specificBg = currentUser.conversationBackgrounds?.[conversation.id];
    // 2. Fall back to user's global chat background preference
    const bg = specificBg || currentUser.chatBackground;

    if (!bg || bg === '#f8fafc') {
      return { backgroundColor: '#f8fafc' };
    }
    if (bg.startsWith('http') || bg.startsWith('data:image')) {
      return {
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    if (bg.includes('gradient')) {
      return { background: bg };
    }
    return { backgroundColor: bg };
  };

  const handleSetConversationWallpaper = async (bgUrl: string) => {
    setIsSavingWallpaper(true);
    try {
      const updatedMap = {
        ...(currentUser.conversationBackgrounds || {}),
        [conversation.id]: bgUrl,
      };
      await updateDoc(doc(db, 'users', currentUser.id), {
        conversationBackgrounds: updatedMap,
      });
      onProfileUpdated?.({
        ...currentUser,
        conversationBackgrounds: updatedMap,
      });
    } catch (err) {
      console.error('Failed to set conversation wallpaper:', err);
    } finally {
      setIsSavingWallpaper(false);
    }
  };

  const handleResetConversationWallpaper = async () => {
    setIsSavingWallpaper(true);
    try {
      const updatedMap = { ...(currentUser.conversationBackgrounds || {}) };
      delete updatedMap[conversation.id];
      await updateDoc(doc(db, 'users', currentUser.id), {
        conversationBackgrounds: updatedMap,
      });
      onProfileUpdated?.({
        ...currentUser,
        conversationBackgrounds: updatedMap,
      });
    } catch (err) {
      console.error('Failed to reset conversation wallpaper:', err);
    } finally {
      setIsSavingWallpaper(false);
    }
  };

  const handleUploadConversationWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          handleSetConversationWallpaper(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const displayName = conversation.type === 'group' ? (conversation.name || 'Group Chat') : (otherUser?.fullName || 'Chat');
  const displayPhoto = conversation.type === 'group' ? conversation.photoURL : otherUser?.photoURL;
  const isOnline = otherUser?.online;

  // Global search feature: queries the messages sub-collection of the active conversation for a specific keyword
  const searchMessagesSubcollection = useCallback(
    async (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed) {
        setSearchResultsList([]);
        setIsSearchingSubcollection(false);
        setHasSearchedKeyword('');
        return;
      }

      setIsSearchingSubcollection(true);
      try {
        const messagesRef = collection(db, 'conversations', conversation.id, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);

        const lowerKeyword = trimmed.toLowerCase();
        const results: Message[] = [];

        snapshot.forEach((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() } as Message;
          const textMatch = data.text && data.text.toLowerCase().includes(lowerKeyword);
          const senderMatch = data.senderName && data.senderName.toLowerCase().includes(lowerKeyword);
          const replyMatch = data.replyTo?.text && data.replyTo.text.toLowerCase().includes(lowerKeyword);
          if (textMatch || senderMatch || replyMatch) {
            results.push(data);
          }
        });

        setSearchResultsList(results);
        setHasSearchedKeyword(trimmed);
        setCurrentMatchIndex(0);

        if (results.length > 0) {
          setTimeout(() => {
            const targetId = results[0].id;
            document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 120);
        }
      } catch (err) {
        console.error('Error querying messages sub-collection:', err);
        handleFirestoreError(err, OperationType.GET, `conversations/${conversation.id}/messages`);
      } finally {
        setIsSearchingSubcollection(false);
      }
    },
    [conversation.id]
  );

  // Debounced auto-search when search query changes
  useEffect(() => {
    if (showSearch && searchQuery.trim()) {
      const timer = setTimeout(() => {
        searchMessagesSubcollection(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResultsList([]);
      setIsSearchingSubcollection(false);
      setHasSearchedKeyword('');
      setShowResultsDropdown(false);
    }
  }, [showSearch, searchQuery, searchMessagesSubcollection]);

  // Find messages matching search query (from Firestore messages subcollection or local state fallback)
  const matchingMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    if (searchResultsList.length > 0 || hasSearchedKeyword === searchQuery.trim()) {
      return searchResultsList;
    }
    const q = searchQuery.toLowerCase().trim();
    return messages.filter((m) => {
      return (
        (m.text && m.text.toLowerCase().includes(q)) ||
        (m.senderName && m.senderName.toLowerCase().includes(q)) ||
        (m.replyTo?.text && m.replyTo.text.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, searchResultsList, hasSearchedKeyword, messages]);

  // Displayed messages: either all messages in conversation history or filtered only
  const displayedMessages = filterOnlyMatches && searchQuery.trim() ? matchingMessages : messages;

  const jumpToMatch = (index: number) => {
    if (index < 0 || index >= matchingMessages.length) return;
    setCurrentMatchIndex(index);
    const targetId = matchingMessages[index].id;
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (matchingMessages.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchingMessages.length;
    jumpToMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (matchingMessages.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchingMessages.length) % matchingMessages.length;
    jumpToMatch(prevIdx);
  };

  const highlightMatch = (text: string, query: string, isActiveMatch: boolean = false) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className={`font-bold px-1.5 py-0.5 rounded shadow-xs transition-all ${
            isActiveMatch
              ? 'bg-[#FF1F35] text-white ring-2 ring-red-400 ring-offset-1 inline-block'
              : 'bg-[#FFD51B] text-slate-900 ring-1 ring-amber-400'
          }`}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const popularEmojis = ['😊', '😂', '❤️', '👍', '🔥', '🎉', '🙏', '🙌', '😍', '😎', '✨', '👏'];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top Conversation Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar with status indicator */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
              {displayPhoto ? (
                <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-slate-600">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
            {conversation.type === 'direct' && isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight truncate max-w-[160px] sm:max-w-xs">
              {displayName}
            </h3>
            <p className="text-[11px] text-slate-500">
              {conversation.type === 'group'
                ? `${conversation.participantIds.length} members`
                : isOnline
                ? 'Online'
                : otherUser?.lastSeen
                ? `Last seen ${new Date(otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Offline'}
            </p>
          </div>
        </div>

        {/* Action icons: Search, Video Call, Audio Call, More Menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search conversation toggle button */}
          <button
            type="button"
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery('');
            }}
            title="Search messages"
            className={`p-2 rounded-full transition-colors ${
              showSearch ? 'text-[#19B9F4] bg-sky-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>

          {conversation.type === 'direct' && (
            <>
              <button
                type="button"
                onClick={() => onStartCall('video')}
                title="Start Video Call"
                className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-full transition-colors"
              >
                <Video className="w-5 h-5 text-[#19B9F4]" />
              </button>
              <button
                type="button"
                onClick={() => onStartCall('audio')}
                title="Start Audio Call"
                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              >
                <Phone className="w-5 h-5 text-[#FF1F35]" />
              </button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-30 text-xs">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowSearch(true);
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Search className="w-4 h-4 text-slate-400" />
                  Search Conversation
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowWallpaperModal(true);
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Palette className="w-4 h-4 text-sky-500" />
                  Chat Wallpaper
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowScheduledListModal(true);
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-500" />
                    Scheduled Messages
                  </span>
                  {pendingScheduled.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 rounded-full">
                      {pendingScheduled.length}
                    </span>
                  )}
                </button>
                {onOpenStarred && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenStarred();
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    Starred Messages
                  </button>
                )}
                {otherUser && (
                  <>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onReportUser(otherUser);
                      }}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Report User
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onBlockUser(otherUser.id);
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <UserX className="w-4 h-4 text-red-500" />
                      Block User
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Global Search Input Bar querying messages sub-collection */}
      {showSearch && (
        <div className="bg-slate-50 px-3 sm:px-4 py-2 border-b border-slate-200 flex flex-col gap-2 z-20 shadow-xs animate-in fade-in duration-150 relative">
          <div className="flex flex-wrap items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                searchMessagesSubcollection(searchQuery);
              }}
              className="relative flex-1 min-w-[200px]"
            >
              {isSearchingSubcollection ? (
                <Loader2 className="w-4 h-4 text-[#19B9F4] absolute left-3 top-2.5 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages sub-collection..."
                autoFocus
                className="w-full pl-9 pr-14 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#19B9F4]"
              />
              <div className="absolute right-2 top-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResultsList([]);
                      setHasSearchedKeyword('');
                      setShowResultsDropdown(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    title="Clear query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>

            {/* Match Counter and Stepper */}
            {searchQuery.trim() && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-600 px-1 whitespace-nowrap">
                  {matchingMessages.length > 0
                    ? `${currentMatchIndex + 1} of ${matchingMessages.length}`
                    : isSearchingSubcollection
                    ? 'Searching...'
                    : '0 matches'}
                </span>

                {/* Stepper buttons */}
                <div className="flex items-center border-l border-slate-200 pl-1">
                  <button
                    type="button"
                    onClick={handlePrevMatch}
                    disabled={matchingMessages.length === 0}
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100 transition-colors"
                    title="Previous match"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMatch}
                    disabled={matchingMessages.length === 0}
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100 transition-colors"
                    title="Next match"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Results List Dropdown Toggle */}
            {matchingMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setShowResultsDropdown(!showResultsDropdown)}
                className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  showResultsDropdown
                    ? 'bg-[#19B9F4] border-[#19B9F4] text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="View results list"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden sm:inline">
                  Matches ({matchingMessages.length})
                </span>
              </button>
            )}

            {/* Filter toggle button */}
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setFilterOnlyMatches(!filterOnlyMatches)}
                className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                  filterOnlyMatches
                    ? 'bg-sky-50 border-sky-300 text-sky-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title={filterOnlyMatches ? 'Showing only matching messages' : 'Showing all messages with highlights'}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">
                  {filterOnlyMatches ? 'Filtered' : 'All'}
                </span>
              </button>
            )}

            {/* Close Search */}
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResultsList([]);
                setHasSearchedKeyword('');
                setFilterOnlyMatches(false);
                setShowResultsDropdown(false);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg text-xs"
              title="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Results Drawer / Popover */}
          {showResultsDropdown && matchingMessages.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-2 max-h-56 overflow-y-auto z-30 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>{matchingMessages.length} Matches Found</span>
                <button
                  type="button"
                  onClick={() => setShowResultsDropdown(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 mt-1">
                {matchingMessages.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      jumpToMatch(idx);
                      setShowResultsDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 hover:bg-sky-50/70 rounded-xl transition-colors flex flex-col gap-0.5 ${
                      currentMatchIndex === idx ? 'bg-sky-50 border-l-2 border-[#19B9F4]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">{m.senderName}</span>
                      <span className="text-[10px] text-slate-400">
                        {m.timestamp
                          ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {m.text || (m.mediaType ? `[${m.mediaType.toUpperCase()}]` : '')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 transition-colors duration-300" style={getBackgroundStyle()}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center text-[#19B9F4] mb-3">
              <Smile className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-700 text-sm">Start the conversation!</h4>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Say hi, share photos, record a voice note, or start an audio/video call.
            </p>
          </div>
        ) : searchQuery.trim() && displayedMessages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Search className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
            <h4 className="font-bold text-slate-700 text-sm">No messages found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              No messages matching "{searchQuery}" found in this conversation.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Clear search
            </button>
          </div>
        ) : (
          displayedMessages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id;
            const isDirectChat = conversation.type === 'direct';
            const allParticipants = conversation.participantIds || [];

            // Participants in the conversation who need to read this message (excluding the sender)
            const otherParticipants = allParticipants.filter((id) => id !== msg.senderId);
            const targetCount = otherParticipants.length;
            const readRecipients = otherParticipants.filter((id) => (msg.readBy || []).includes(id));
            const readCount = readRecipients.length;

            // Direct chat check: has the other participant read it?
            const otherDirectId = isDirectChat
              ? (otherUser?.id || allParticipants.find((id) => id !== msg.senderId))
              : null;
            const isDirectRead = Boolean(otherDirectId && (msg.readBy || []).includes(otherDirectId));

            // Has this message been read by all participants in the conversation?
            const isFullyRead = isDirectChat
              ? isDirectRead
              : targetCount > 0
              ? otherParticipants.every((id) => (msg.readBy || []).includes(id))
              : (msg.readBy || []).length > 1;

            const isPartiallyRead = !isFullyRead && (isDirectChat ? isDirectRead : readCount > 0);
            const isRead = isFullyRead || isPartiallyRead;
            const isMatch = Boolean(searchQuery.trim() && matchingMessages.some((m) => m.id === msg.id));
            const isCurrentMatch = Boolean(searchQuery.trim() && matchingMessages[currentMatchIndex]?.id === msg.id);

            return (
              <div
                id={`msg-${msg.id}`}
                key={msg.id || index}
                className={`flex flex-col group transition-all duration-150 ${
                  isMe ? 'items-end' : 'items-start'
                }`}
              >
                {/* Sender name for group chats */}
                {conversation.type === 'group' && !isMe && (
                  <span className="text-[10px] font-semibold text-slate-500 mb-0.5 ml-2">
                    {highlightMatch(msg.senderName, searchQuery, false)}
                  </span>
                )}

                {/* Reply To Preview in message bubble */}
                <div className={`relative max-w-[85%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'}`}>
                  {msg.replyTo && (
                    <div
                      className={`text-[11px] p-2 rounded-t-xl mb-0.5 border-l-4 ${
                        isMe
                          ? 'bg-sky-100 border-sky-400 text-slate-700'
                          : 'bg-slate-100 border-[#FF1F35] text-slate-600'
                      }`}
                    >
                      <div className="font-bold text-[10px]">{msg.replyTo.senderName}</div>
                      <div className="truncate">{highlightMatch(msg.replyTo.text, searchQuery, false)}</div>
                    </div>
                  )}

                  {/* Message Bubble Body */}
                  <div
                    onDoubleClick={() =>
                      setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)
                    }
                    className={`p-3 rounded-2xl shadow-xs transition-all relative select-text cursor-pointer ${
                      isCurrentMatch
                        ? 'ring-3 ring-[#FF1F35] ring-offset-2 ring-offset-slate-100 shadow-md'
                        : isMatch
                        ? 'ring-2 ring-[#FFD51B] ring-offset-1 ring-offset-slate-50'
                        : ''
                    } ${
                      isMe
                        ? 'bg-gradient-to-r from-[#19B9F4] to-sky-500 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                    }`}
                  >
                    {/* TEXT MESSAGE WITH VISUAL HIGHLIGHTING */}
                    {msg.text && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {highlightMatch(msg.text, searchQuery, isCurrentMatch)}
                      </p>
                    )}

                    {/* IMAGE MESSAGE */}
                    {msg.mediaType === 'image' && msg.mediaUrl && (
                      <div className="rounded-xl overflow-hidden mt-1 max-h-72">
                        <img
                          src={msg.mediaUrl}
                          alt="Shared photo"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-95"
                          onClick={() => window.open(msg.mediaUrl, '_blank')}
                        />
                      </div>
                    )}

                    {/* VIDEO MESSAGE */}
                    {msg.mediaType === 'video' && msg.mediaUrl && (
                      <div className="rounded-xl overflow-hidden mt-1 max-h-72">
                        <video src={msg.mediaUrl} controls className="w-full h-full rounded-xl" />
                      </div>
                    )}

                    {/* VOICE NOTE MESSAGE (matching mockup screen 4) */}
                    {msg.mediaType === 'audio' && msg.mediaUrl && (
                      <div
                        className={`flex items-center gap-3 p-2 rounded-xl mt-1 ${
                          isMe ? 'bg-sky-600/40 text-white' : 'bg-sky-50 text-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleAudio(msg)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 ${
                            isMe ? 'bg-white text-[#19B9F4]' : 'bg-[#19B9F4] text-white'
                          }`}
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>

                        {/* Interactive Waveform Progress */}
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="flex items-center gap-1 h-5">
                            {[20, 45, 70, 30, 85, 55, 90, 40, 65, 35, 80, 50, 25].map((h, i) => {
                              const prog = audioProgress[msg.id] || 0;
                              const barPercent = (i / 13) * 100;
                              const isPast = prog >= barPercent;
                              return (
                                <div
                                  key={i}
                                  style={{ height: `${h}%` }}
                                  className={`w-1 rounded-full ${
                                    isPast
                                      ? isMe
                                        ? 'bg-white'
                                        : 'bg-[#19B9F4]'
                                      : isMe
                                      ? 'bg-sky-300'
                                      : 'bg-slate-300'
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <div className="text-[10px] font-medium opacity-85">
                            {msg.audioDuration ? `0:${msg.audioDuration < 10 ? '0' : ''}${msg.audioDuration}` : 'Voice Note'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timestamp, Star indicator & Read Receipt */}
                    <div
                      className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                        isMe ? 'text-sky-100' : 'text-slate-400'
                      }`}
                    >
                      {starredMessageIds.has(msg.id) && (
                        <span
                          title="Starred message"
                          className="inline-flex items-center text-amber-300 drop-shadow-xs"
                        >
                          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                        </span>
                      )}
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && (
                        <span
                          data-testid="message-read-receipt"
                          className="inline-flex items-center ml-0.5 cursor-pointer transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMessageForInfo(msg);
                          }}
                          title={
                            isFullyRead
                              ? isDirectChat
                                ? `Read by ${otherUser?.fullName || 'recipient'}`
                                : `Read by all ${targetCount} participants`
                              : isPartiallyRead
                              ? `Read by ${readCount} of ${targetCount} participants`
                              : 'Delivered'
                          }
                        >
                          {isFullyRead ? (
                            <CheckCheck
                              data-testid="double-check-all-read"
                              className="w-3.5 h-3.5 text-yellow-300 stroke-[2.5] drop-shadow-xs animate-in zoom-in-75 duration-200"
                            />
                          ) : isPartiallyRead ? (
                            <CheckCheck
                              data-testid="double-check-partial-read"
                              className="w-3.5 h-3.5 text-white/90 stroke-[2]"
                            />
                          ) : (
                            <Check
                              data-testid="single-check-delivered"
                              className="w-3.5 h-3.5 text-white/70 stroke-[2]"
                            />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Emoji Reactions displayed under each message bubble */}
                  <MessageReactions
                    conversationId={conversation.id}
                    messageId={msg.id}
                    currentUser={currentUser}
                    isMe={isMe}
                    isActive={activeReactionMsgId === msg.id}
                    onToggleActive={() =>
                      setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)
                    }
                    onClose={() => setActiveReactionMsgId(null)}
                  />

                  {/* Hover action menu for react / star / reply / delete */}
                  <div
                    className={`absolute top-0 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 shadow-sm text-slate-500 z-10 ${
                      isMe ? 'left-0 -translate-x-full mr-2' : 'right-0 translate-x-full ml-2'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)
                      }
                      title="React with emoji"
                      className="p-1 hover:text-amber-500 hover:bg-slate-50 rounded-full transition-colors"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStar(msg)}
                      title={starredMessageIds.has(msg.id) ? 'Unstar message' : 'Star message'}
                      className={`p-1 rounded-full transition-colors ${
                        starredMessageIds.has(msg.id)
                          ? 'text-amber-500 hover:text-amber-600 bg-amber-50'
                          : 'hover:text-amber-500 hover:bg-slate-50'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          starredMessageIds.has(msg.id) ? 'fill-amber-400 text-amber-500' : ''
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyMessage(msg)}
                      title="Reply"
                      className="p-1 hover:text-sky-600 rounded-full"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => setSelectedMessageForInfo(msg)}
                        title="Message info and read receipts"
                        className="p-1 hover:text-sky-600 rounded-full"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        title="Delete"
                        className="p-1 hover:text-red-600 rounded-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Real-time "User is typing..." indicator bubble in chat messages stream */}
        {otherTypingUsers.length > 0 && (
          <div className="flex items-end gap-2 my-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Typing user avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border border-white shadow-xs">
              {otherTypingUsers[0].userPhoto ? (
                <img
                  src={otherTypingUsers[0].userPhoto}
                  alt={otherTypingUsers[0].userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-sky-400 to-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                  {(otherTypingUsers[0].userName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Bubble with 3 bouncing dots and typing label */}
            <div className="bg-white/95 border border-slate-200/80 shadow-xs px-3.5 py-2.5 rounded-2xl rounded-bl-xs flex items-center gap-2.5 backdrop-blur-xs">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#19B9F4] animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#19B9F4] animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#19B9F4] animate-bounce"></span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {otherTypingUsers.length === 1
                  ? `${otherTypingUsers[0].userName} is typing...`
                  : otherTypingUsers.length === 2
                  ? `${otherTypingUsers[0].userName} and ${otherTypingUsers[1].userName} are typing...`
                  : `${otherTypingUsers[0].userName} and ${otherTypingUsers.length - 1} others are typing...`}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner preview */}
      {replyMessage && (
        <div className="bg-slate-100 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 border-l-2 border-[#19B9F4] pl-2">
            <span className="font-semibold text-slate-700">Replying to {replyMessage.senderName}:</span>
            <span className="text-slate-500 truncate max-w-xs">{replyMessage.text || 'Media'}</span>
          </div>
          <button onClick={() => setReplyMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Media Upload Preview */}
      {mediaUploadPreview && (
        <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 border border-slate-300">
              {mediaUploadPreview.type === 'image' ? (
                <img src={mediaUploadPreview.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={mediaUploadPreview.url} className="w-full h-full object-cover" />
              )}
            </div>
            <span className="text-xs text-slate-700 font-medium">Ready to send {mediaUploadPreview.type}</span>
          </div>
          <button
            onClick={() => setMediaUploadPreview(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Quick Emojis Bar */}
      {showEmojiPicker && (
        <div className="bg-white px-4 py-2.5 border-t border-slate-100 flex items-center gap-2 overflow-x-auto shadow-inner">
          {popularEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setInputText((prev) => prev + emoji);
              }}
              className="text-xl hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Toast Notification */}
      {scheduleToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white text-xs py-2 px-4 rounded-full shadow-xl flex items-center gap-2 border border-slate-700/60 backdrop-blur-xs animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="font-medium max-w-[280px] sm:max-w-md truncate">{scheduleToast}</span>
          <button
            type="button"
            onClick={() => setScheduleToast(null)}
            className="ml-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pending Scheduled Messages Banner */}
      {pendingScheduled.length > 0 && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border-t border-violet-100 px-3 sm:px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-violet-900 min-w-0">
            <Clock className="w-4 h-4 text-violet-600 flex-shrink-0 animate-pulse" />
            <span className="font-bold text-[12px] truncate">
              {pendingScheduled.length} scheduled message{pendingScheduled.length > 1 ? 's' : ''}
            </span>
            <span className="text-[11px] text-violet-600 hidden sm:inline truncate">
              • Next: {formatScheduledCountdown(pendingScheduled[0].scheduledFor)} ({formatScheduledTime(pendingScheduled[0].scheduledFor)})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowScheduledListModal(true)}
            className="text-[11px] font-bold text-violet-700 hover:text-violet-950 bg-white hover:bg-violet-100/60 px-3 py-1 rounded-xl border border-violet-200/80 shadow-2xs transition-all flex items-center gap-1.5 flex-shrink-0 ml-2"
          >
            <span>Manage</span>
          </button>
        </div>
      )}

      {/* Real-time "User is typing..." indicator banner above input bar */}
      {otherTypingUsers.length > 0 && (
        <div className="bg-slate-50/95 border-t border-slate-200/80 px-4 py-1.5 flex items-center justify-between text-xs backdrop-blur-xs animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 text-slate-600">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#19B9F4] animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#19B9F4] animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#19B9F4] animate-bounce"></span>
            </div>
            <span className="font-medium text-slate-700">
              {otherTypingUsers.length === 1
                ? `${otherTypingUsers[0].userName} is typing...`
                : otherTypingUsers.length === 2
                ? `${otherTypingUsers[0].userName} and ${otherTypingUsers[1].userName} are typing...`
                : `${otherTypingUsers[0].userName} and ${otherTypingUsers.length - 1} others are typing...`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active now</span>
        </div>
      )}

      {/* Bottom Message Input Bar (matching mockup screen 4) */}
      <div className="bg-white px-3 sm:px-4 py-2.5 border-t border-slate-200 flex items-center gap-2">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-full transition-colors ${
            showEmojiPicker ? 'text-[#FF1F35] bg-red-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Attachment Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,video/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          title="Share photo or video"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              handleTypingActivity();
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') {
                handleTypingActivity();
              }
            }}
            onBlur={() => {
              if (!inputText.trim()) {
                handleTypingActivity(true);
              }
            }}
            placeholder="Type a message..."
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-300 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
          />
        </form>

        {/* Schedule Message Button */}
        <button
          type="button"
          onClick={() => handleOpenScheduleModal()}
          className={`p-2 rounded-full transition-all flex-shrink-0 ${
            inputText.trim() || mediaUploadPreview
              ? 'text-violet-600 bg-violet-50 hover:bg-violet-100 scale-105'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          title="Schedule message to be sent at future time"
        >
          <Clock className="w-5 h-5" />
        </button>

        {/* Microphone or Send button */}
        {inputText.trim() || mediaUploadPreview ? (
          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="p-2.5 bg-[#19B9F4] hover:bg-sky-600 active:bg-sky-700 text-white rounded-full shadow-md shadow-sky-200 transition-transform active:scale-90 flex-shrink-0"
            title="Send immediately"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenVoiceRecorder}
            className="p-2.5 bg-[#FF1F35] hover:bg-red-600 active:bg-red-700 text-white rounded-full shadow-md shadow-red-200 transition-transform active:scale-90 flex-shrink-0"
            title="Record voice note"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Custom Conversation Wallpaper Modal */}
      {showWallpaperModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#FF1F35] flex items-center justify-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Conversation Wallpaper</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                    {displayName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWallpaperModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Status Banner */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  {hasSpecificWallpaper ? (
                    <span className="text-sky-600 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Custom wallpaper active
                    </span>
                  ) : (
                    <span>Using global default background</span>
                  )}
                </span>
                {hasSpecificWallpaper && (
                  <button
                    type="button"
                    onClick={handleResetConversationWallpaper}
                    disabled={isSavingWallpaper}
                    className="text-[10px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Global
                  </button>
                )}
              </div>

              {/* Solid Colors */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Preset Colors</label>
                <div className="flex flex-wrap items-center gap-2">
                  {CHAT_COLOR_PRESETS.map((c) => {
                    const isSelected = (specificWallpaper || currentUser.chatBackground) === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handleSetConversationWallpaper(c.value)}
                        title={c.name}
                        className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 flex items-center justify-center ${
                          isSelected ? 'border-[#FF1F35] ring-2 ring-red-200 scale-110' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {isSelected && <Check className={`w-3.5 h-3.5 ${c.value === '#0f172a' ? 'text-white' : 'text-[#FF1F35]'}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gradients */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Gradients</label>
                <div className="grid grid-cols-3 gap-2">
                  {CHAT_GRADIENT_PRESETS.map((g) => {
                    const isSelected = (specificWallpaper || currentUser.chatBackground) === g.value;
                    return (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => handleSetConversationWallpaper(g.value)}
                        className={`p-1.5 rounded-xl border text-left h-12 flex flex-col justify-between transition-transform active:scale-95 ${
                          isSelected ? 'border-[#FF1F35] ring-2 ring-red-200' : 'border-slate-200'
                        }`}
                        style={{ background: g.value }}
                      >
                        <span className={`text-[9px] font-bold truncate ${g.value.includes('#0f172a') || g.value.includes('#2e1065') ? 'text-white' : 'text-slate-800'}`}>
                          {g.name}
                        </span>
                        {isSelected && <Check className={`w-3 h-3 self-end ${g.value.includes('#0f172a') || g.value.includes('#2e1065') ? 'text-white' : 'text-[#FF1F35]'}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallpapers */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Curated Wallpapers</label>
                <div className="grid grid-cols-3 gap-2">
                  {CHAT_WALLPAPER_PRESETS.map((w) => {
                    const isSelected = (specificWallpaper || currentUser.chatBackground) === w.url;
                    return (
                      <button
                        key={w.name}
                        type="button"
                        onClick={() => handleSetConversationWallpaper(w.url)}
                        className={`h-14 rounded-xl overflow-hidden border relative group transition-transform active:scale-95 ${
                          isSelected ? 'border-[#FF1F35] ring-2 ring-red-200' : 'border-slate-200'
                        }`}
                      >
                        <img src={w.url} alt={w.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 flex items-end p-1">
                          <span className="text-[9px] font-bold text-white truncate">{w.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-white ml-auto stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload Custom File */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <input
                  type="file"
                  ref={wallpaperUploadRef}
                  onChange={handleUploadConversationWallpaper}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => wallpaperUploadRef.current?.click()}
                  disabled={isSavingWallpaper}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSavingWallpaper ? (
                    <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-sky-500" />
                  )}
                  <span>{isSavingWallpaper ? 'Saving...' : 'Upload Custom Image'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowWallpaperModal(false)}
                  className="px-4 py-1.5 bg-[#FF1F35] hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Message Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingScheduledMessage ? 'Edit Scheduled Message' : 'Schedule Message'}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                    To: {displayName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  setEditingScheduledMessage(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Message Draft Textarea */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Message Content</label>
                <textarea
                  rows={3}
                  value={scheduleDraftText}
                  onChange={(e) => setScheduleDraftText(e.target.value)}
                  placeholder="Type the message to schedule..."
                  className="w-full p-3 rounded-2xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 text-xs text-slate-800 placeholder:text-slate-400 outline-none resize-none transition-all"
                />
              </div>

              {/* Media Attachment indicator if any */}
              {(mediaUploadPreview || editingScheduledMessage?.mediaUrl) && (
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                    <img
                      src={mediaUploadPreview?.url || editingScheduledMessage?.mediaUrl}
                      alt="Attachment"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-slate-700 block">Attached Media</span>
                    <span className="text-[10px] text-slate-400">Will be sent along with your scheduled message</span>
                  </div>
                </div>
              )}

              {/* Date & Time Selectors */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">Pick Date & Time</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={scheduleDate}
                        onChange={(e) => {
                          setScheduleDate(e.target.value);
                          setScheduleError('');
                        }}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-violet-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Time</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => {
                          setScheduleTime(e.target.value);
                          setScheduleError('');
                        }}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-violet-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Time Presets */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Quick Presets
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(15 * 60 * 1000)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-[11px] font-medium text-slate-700 transition-colors text-center"
                  >
                    +15 mins
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(30 * 60 * 1000)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-[11px] font-medium text-slate-700 transition-colors text-center"
                  >
                    +30 mins
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(60 * 60 * 1000)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-[11px] font-medium text-slate-700 transition-colors text-center"
                  >
                    +1 hour
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(3 * 60 * 60 * 1000)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-[11px] font-medium text-slate-700 transition-colors text-center"
                  >
                    +3 hours
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(0, 9)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-[11px] font-medium text-slate-700 transition-colors text-center"
                  >
                    Tomorrow 9 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset(0, 18)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-[11px] font-medium text-slate-700 transition-colors text-center"
                  >
                    Tomorrow 6 PM
                  </button>
                </div>
              </div>

              {/* Scheduled Summary Pill */}
              {scheduleDate && scheduleTime && (
                <div className="p-3 rounded-2xl bg-violet-50 border border-violet-100 flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                  <div className="text-violet-900 leading-tight">
                    <span className="font-bold text-[11px] block">Scheduled Delivery</span>
                    <span className="text-[11px]">
                      {(() => {
                        const [y, m, d] = scheduleDate.split('-').map(Number);
                        const [hh, mm] = scheduleTime.split(':').map(Number);
                        const dt = new Date(y, m - 1, d, hh, mm);
                        if (isNaN(dt.getTime())) return 'Invalid date/time';
                        return `${formatScheduledTime(dt.toISOString())} (${formatScheduledCountdown(dt.toISOString())})`;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {scheduleError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center gap-2 text-[11px]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{scheduleError}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  setEditingScheduledMessage(null);
                }}
                disabled={isSavingScheduled}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScheduledMessage}
                disabled={isSavingScheduled}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-md shadow-violet-200 disabled:opacity-50"
              >
                {isSavingScheduled ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>
                  {isSavingScheduled
                    ? 'Saving...'
                    : editingScheduledMessage
                    ? 'Update Schedule'
                    : 'Schedule Message'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Messages Management List Modal */}
      {showScheduledListModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Scheduled Messages</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 rounded-full">
                      {scheduledMessages.filter((m) => m.senderId === currentUser.id).length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Active schedules for {displayName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduledListModal(false);
                    handleOpenScheduleModal();
                  }}
                  className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>+ Schedule New</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduledListModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {scheduledMessages.filter((m) => m.senderId === currentUser.id).length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-500 mx-auto flex items-center justify-center shadow-inner">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No scheduled messages</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Schedule messages to be automatically sent at a specific date and time in the future.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowScheduledListModal(false);
                      handleOpenScheduleModal();
                    }}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                  >
                    Schedule a Message
                  </button>
                </div>
              ) : (
                scheduledMessages
                  .filter((m) => m.senderId === currentUser.id)
                  .map((msg) => {
                    const isPending = msg.status === 'pending';
                    const isSent = msg.status === 'sent';
                    return (
                      <div
                        key={msg.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isPending
                            ? 'bg-white border-violet-200/80 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 opacity-75'
                        }`}
                      >
                        {/* Top Timing & Status Row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isPending ? 'text-violet-600' : 'text-slate-400'}`} />
                            <span className="font-bold text-slate-800 text-[11px]">
                              {formatScheduledTime(msg.scheduledFor)}
                            </span>
                            {isPending && (
                              <span className="text-[10px] text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded-md">
                                {formatScheduledCountdown(msg.scheduledFor)}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isSent
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {msg.status}
                          </span>
                        </div>

                        {/* Message Preview */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-800 mb-3 whitespace-pre-wrap break-words">
                          {msg.text || <span className="italic text-slate-400">No text caption</span>}
                          {msg.mediaUrl && (
                            <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-black/5">
                              <img src={msg.mediaUrl} alt="Scheduled media" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {isPending && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleCancelScheduledMessage(msg.id)}
                              className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 p-1 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowScheduledListModal(false);
                                  handleOpenScheduleModal(msg);
                                }}
                                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendScheduledNow(msg)}
                                className="px-3 py-1 bg-[#19B9F4] hover:bg-sky-600 text-white font-bold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <SendHorizontal className="w-3.5 h-3.5" />
                                <span>Send Now</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowScheduledListModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Info & Read Receipts Modal */}
      {selectedMessageForInfo && (() => {
        const infoMsg = selectedMessageForInfo;
        const allParticipants = conversation.participantIds || [];
        const recipients = allParticipants.filter((id) => id !== infoMsg.senderId);
        const targetCount = recipients.length;
        const readByIds = infoMsg.readBy || [];
        const readRecipients = recipients.filter((id) => readByIds.includes(id));
        const readCount = readRecipients.length;

        const isDirect = conversation.type === 'direct';
        const otherDirectId = isDirect
          ? (otherUser?.id || allParticipants.find((id) => id !== infoMsg.senderId))
          : null;
        const isDirectRead = Boolean(otherDirectId && readByIds.includes(otherDirectId));

        const isAllRead = isDirect
          ? isDirectRead
          : targetCount > 0
          ? recipients.every((id) => readByIds.includes(id))
          : readByIds.length > 1;

        const isPartialRead = !isAllRead && (isDirect ? isDirectRead : readCount > 0);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#19B9F4] flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Message Details</h3>
                    <p className="text-[11px] text-slate-500">Read receipts & delivery</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMessageForInfo(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message preview snippet */}
              <div className="p-4 border-b border-slate-100 bg-sky-50/30">
                <div className="text-xs text-slate-800 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                  {infoMsg.text && <p className="whitespace-pre-wrap break-words">{infoMsg.text}</p>}
                  {infoMsg.mediaUrl && (
                    <div className="mt-1.5 w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img src={infoMsg.mediaUrl} alt="Attached media" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                    <span>Sent: {new Date(infoMsg.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span className="flex items-center gap-1 font-semibold">
                      {isAllRead ? (
                        <span className="inline-flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                          <CheckCheck className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
                          Read by all
                        </span>
                      ) : isPartialRead ? (
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          <CheckCheck className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
                          Read ({readCount}/{targetCount})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Check className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                          Delivered
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Read receipts list */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Participants ({targetCount || 1})
                </h4>

                {isDirect && otherUser ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                        {otherUser.photoURL ? (
                          <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#19B9F4] text-white flex items-center justify-center text-[10px] font-bold">
                            {(otherUser.fullName || 'U').charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-slate-800">{otherUser.fullName}</span>
                    </div>
                    {isAllRead ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        <CheckCheck className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
                        Read
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                        Delivered
                      </span>
                    )}
                  </div>
                ) : recipients.length > 0 ? (
                  recipients.map((recipId) => {
                    const hasRead = readByIds.includes(recipId);
                    return (
                      <div
                        key={recipId}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#19B9F4]/20 text-[#19B9F4] flex items-center justify-center font-bold text-[10px]">
                            {recipId.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                            {recipId === currentUser.id ? 'You' : `User (${recipId.slice(0, 6)}...)`}
                          </span>
                        </div>
                        {hasRead ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            <CheckCheck className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
                            Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            <Check className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                            Delivered
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-400 text-center py-4">No additional participants.</p>
                )}
              </div>

              {/* Modal footer */}
              <div className="p-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setSelectedMessageForInfo(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
