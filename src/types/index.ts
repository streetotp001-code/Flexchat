export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  photoURL?: string;
  statusMessage?: string;
  online: boolean;
  lastSeen: string;
  role: 'user' | 'admin';
  blockedUserIds?: string[];
  createdAt: string;
  isSuspended?: boolean;
  chatBackground?: string;
  chatWallpaperPattern?: string;
  conversationBackgrounds?: Record<string, string>;
  readReceiptsEnabled?: boolean;
}

export interface ContactRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  fromUserEmail: string;
  toUserEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  photoURL?: string;
  participantIds: string[];
  adminIds?: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    mediaType?: 'text' | 'image' | 'video' | 'audio';
    readBy?: string[];
  };
  pinnedMessages?: string[];
  updatedAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  audioDuration?: number;
  timestamp: string;
  readBy: string[];
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

export interface StarredMessage {
  id: string;
  messageId: string;
  conversationId: string;
  conversationName?: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  audioDuration?: number;
  timestamp: string;
  starredAt: string;
}

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  scheduledFor: string; // ISO 8601 string
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  emoji: string;
  createdAt: string;
}

export interface TypingStatus {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  isTyping: boolean;
  updatedAt: string;
}

export interface CallRecord {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto?: string;
  type: 'audio' | 'video';
  status: 'calling' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed';
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  duration?: number;
  offer?: string;
  answer?: string;
  callerCandidates?: string[];
  receiverCandidates?: string[];
}

export interface AbuseReport {
  id: string;
  reporterId: string;
  reporterEmail: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: 'message' | 'contact_request' | 'missed_call' | 'call';
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}
