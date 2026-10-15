import React, { useState } from 'react';
import {
  Search,
  Plus,
  Users,
  MessageSquare,
  Mic,
  Image as ImageIcon,
  Check,
  CheckCheck,
  UserPlus,
} from 'lucide-react';
import { Conversation, UserProfile } from '../types';
import { Logo } from './Logo';

interface ChatListProps {
  conversations: Conversation[];
  usersMap: Record<string, UserProfile>;
  currentUserId: string;
  selectedConversationId: string | null;
  onSelectConversation: (conv: Conversation) => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onTabChange: (tab: 'chats' | 'contacts') => void;
  activeTopTab: 'chats' | 'contacts';
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  usersMap,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  onOpenNewChat,
  onOpenNewGroup,
  onTabChange,
  activeTopTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const queryLower = searchQuery.toLowerCase();

    if (c.type === 'group' && c.name?.toLowerCase().includes(queryLower)) return true;

    // Check other participant's name
    const otherId = c.participantIds.find((id) => id !== currentUserId);
    const otherUser = otherId ? usersMap[otherId] : null;
    if (otherUser?.fullName.toLowerCase().includes(queryLower)) return true;
    if (c.lastMessage?.text.toLowerCase().includes(queryLower)) return true;

    return false;
  });

  return (
    <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {/* Top Header matching mockup screen 3 */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <Logo size="sm" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
            title="Search chats"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOpenNewChat}
            className="p-2 bg-[#FF1F35] hover:bg-red-600 text-white rounded-full shadow-sm transition-transform active:scale-95"
            title="Start new chat"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              autoFocus
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>
        </div>
      )}

      {/* Top Segmented Tabs: Chats vs Contacts */}
      <div className="flex border-b border-slate-200 text-sm font-bold text-slate-500">
        <button
          type="button"
          onClick={() => onTabChange('chats')}
          className={`flex-1 py-3 text-center relative transition-colors ${
            activeTopTab === 'chats' ? 'text-[#FF1F35]' : 'hover:text-slate-800'
          }`}
        >
          <span>Chats</span>
          {activeTopTab === 'chats' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF1F35]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('contacts')}
          className={`flex-1 py-3 text-center relative transition-colors ${
            activeTopTab === 'contacts' ? 'text-[#FF1F35]' : 'hover:text-slate-800'
          }`}
        >
          <span>Contacts</span>
          {activeTopTab === 'contacts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF1F35]" />
          )}
        </button>
      </div>

      {/* Chat List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredConversations.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-600">No conversations yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Click the + button to find someone by Gmail or create a group chat.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={onOpenNewChat}
                className="px-3 py-1.5 bg-sky-50 text-[#19B9F4] text-xs font-semibold rounded-xl hover:bg-sky-100 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Friend
              </button>
              <button
                type="button"
                onClick={onOpenNewGroup}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" /> New Group
              </button>
            </div>
          </div>
        ) : (
          filteredConversations.map((c) => {
            const isGroup = c.type === 'group';
            const otherId = c.participantIds.find((id) => id !== currentUserId);
            const otherUser = otherId ? usersMap[otherId] : null;

            const name = isGroup ? (c.name || 'Group Chat') : (otherUser?.fullName || 'User');
            const photo = isGroup ? c.photoURL : otherUser?.photoURL;
            const isOnline = otherUser?.online;

            const isSelected = selectedConversationId === c.id;

            // Check if unread (simple check if last message not read by me)
            const isUnread =
              c.lastMessage &&
              c.lastMessage.senderId !== currentUserId &&
              (!c.lastMessage.readBy || !c.lastMessage.readBy.includes(currentUserId));

            return (
              <div
                key={c.id}
                onClick={() => onSelectConversation(c)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-sky-50/80 border-l-4 border-[#19B9F4]' : 'hover:bg-slate-50'
                }`}
              >
                {/* Avatar with status */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                    {photo ? (
                      <img src={photo} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                        {isGroup ? <Users className="w-6 h-6 text-[#19B9F4]" /> : name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {!isGroup && isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Info & Last message preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{name}</h4>
                    {c.lastMessage?.timestamp && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(c.lastMessage.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[200px]">
                      {c.lastMessage?.senderId === currentUserId && (
                        c.lastMessage.readBy && c.lastMessage.readBy.length > 1 ? (
                          <CheckCheck className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        )
                      )}
                      {c.lastMessage?.mediaType === 'audio' && (
                        <span className="flex items-center gap-1 text-sky-600 font-medium">
                          <Mic className="w-3.5 h-3.5 text-[#19B9F4]" /> Voice message
                        </span>
                      )}
                      {c.lastMessage?.mediaType === 'image' && (
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <ImageIcon className="w-3.5 h-3.5" /> Photo
                        </span>
                      )}
                      {(!c.lastMessage?.mediaType || c.lastMessage?.mediaType === 'text') && (
                        <span className="truncate">
                          {c.lastMessage ? c.lastMessage.text : 'Tap to start chatting'}
                        </span>
                      )}
                    </div>

                    {/* Unread badge */}
                    {isUnread && (
                      <span className="w-5 h-5 rounded-full bg-[#FF1F35] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
                        1
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
