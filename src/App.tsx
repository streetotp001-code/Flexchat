import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import {
  auth,
  db,
  syncUserProfile,
  updateUserPresence,
  handleFirestoreError,
  OperationType,
  DEFAULT_ADMIN_EMAIL,
} from './firebase';
import { UserProfile, Conversation, CallRecord } from './types';
import { Logo } from './components/Logo';
import { WelcomeSplashScreen } from './components/WelcomeSplashScreen';
import { AuthModal } from './components/AuthModal';
import { ChatList } from './components/ChatList';
import { ChatRoom } from './components/ChatRoom';
import { ContactsView } from './components/ContactsView';
import { CallsHistoryView } from './components/CallsHistoryView';
import { SettingsView } from './components/SettingsView';
import { AdminDashboard } from './components/AdminDashboard';
import { VoiceRecorderModal } from './components/VoiceRecorderModal';
import { CallModal } from './components/CallModal';
import { IncomingCallBanner } from './components/IncomingCallBanner';
import { NewGroupModal } from './components/NewGroupModal';
import { ReportModal } from './components/ReportModal';
import { StarredMessagesView } from './components/StarredMessagesView';
import { BottomNav, MainTab } from './components/BottomNav';
import { MessageSquare, Phone, Users, ShieldAlert, Sparkles, Star } from 'lucide-react';
import { sounds } from './utils/audioChimes';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);

  // Core Data
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<MainTab>('chats');
  const [activeTopTab, setActiveTopTab] = useState<'chats' | 'contacts'>('chats');

  // Modals & Panels
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [reportingUser, setReportingUser] = useState<UserProfile | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showStarredMessages, setShowStarredMessages] = useState(false);

  // Calling States
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    isCaller: boolean;
    callType: 'audio' | 'video';
    targetUser: { id: string; fullName: string; photoURL?: string };
  } | null>(null);

  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);

  // 1. Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await syncUserProfile(user);
          setCurrentUser(profile);
          updateUserPresence(user.uid, true);
        } catch (e) {
          console.error('Error syncing user profile:', e);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  // Window unload presence update
  useEffect(() => {
    if (!currentUser) return;
    const handleBeforeUnload = () => {
      updateUserPresence(currentUser.id, false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // 2. Fetch Users Directory
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const uList: UserProfile[] = [];
        const map: Record<string, UserProfile> = {};
        snapshot.forEach((d) => {
          const u = { id: d.id, ...d.data() } as UserProfile;
          uList.push(u);
          map[u.id] = u;
        });
        setAllUsers(uList);
        setUsersMap(map);

        // Keep current user updated
        if (map[currentUser.id]) {
          setCurrentUser(map[currentUser.id]);
        }
      },
      (err) => console.error(err)
    );

    return () => unsub();
  }, [currentUser?.id]);

  // 3. Fetch Conversations for current user
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', currentUser.id)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const cList: Conversation[] = [];
        snapshot.forEach((d) => {
          cList.push({ id: d.id, ...d.data() } as Conversation);
        });
        cList.sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );
        setConversations(cList);

        // Sync selected conversation
        if (selectedConversation) {
          const updatedSelected = cList.find((c) => c.id === selectedConversation.id);
          if (updatedSelected) {
            setSelectedConversation(updatedSelected);
          }
        }
      },
      (error) => {
        console.error('Conversations listener error:', error);
      }
    );

    return () => unsub();
  }, [currentUser?.id, selectedConversation?.id]);

  // 4. Listen for Incoming Calls
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUser.id),
      where('status', '==', 'calling')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CallRecord;
        // Don't show if user is blocked or already in call
        if (!currentUser.blockedUserIds?.includes(callData.callerId) && !activeCall) {
          setIncomingCall(callData);
        }
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsub();
  }, [currentUser?.id, activeCall]);

  // Start chat with a user (find existing or create direct conversation)
  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    try {
      const existing = conversations.find(
        (c) =>
          c.type === 'direct' &&
          c.participantIds.includes(targetUser.id) &&
          c.participantIds.includes(currentUser.id)
      );

      if (existing) {
        setSelectedConversation(existing);
      } else {
        const newConvData = {
          type: 'direct' as const,
          participantIds: [currentUser.id, targetUser.id],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const ref = await addDoc(collection(db, 'conversations'), newConvData);
        const createdConv: Conversation = { id: ref.id, ...newConvData };
        setSelectedConversation(createdConv);
      }
      setActiveTab('chats');
    } catch (e) {
      console.error('Failed to create direct conversation:', e);
    }
  };

  // Start Call (Audio or Video)
  const handleStartCall = async (targetUser: UserProfile, type: 'audio' | 'video') => {
    if (!currentUser) return;
    const callId = `${currentUser.id}_${targetUser.id}_${Date.now()}`;
    setActiveCall({
      callId,
      isCaller: true,
      callType: type,
      targetUser: {
        id: targetUser.id,
        fullName: targetUser.fullName,
        photoURL: targetUser.photoURL,
      },
    });
  };

  // Accept incoming call
  const handleAcceptIncomingCall = () => {
    if (!incomingCall || !currentUser) return;
    const call = incomingCall;
    setIncomingCall(null);
    sounds.stopRingtone();
    setActiveCall({
      callId: call.id,
      isCaller: false,
      callType: call.type,
      targetUser: {
        id: call.callerId,
        fullName: call.callerName,
        photoURL: call.callerPhoto,
      },
    });
  };

  // Decline incoming call
  const handleDeclineIncomingCall = async () => {
    if (!incomingCall) return;
    sounds.stopRingtone();
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), {
        status: 'declined',
        endedAt: new Date().toISOString(),
      });
    } catch {}
    setIncomingCall(null);
  };

  // Voice note sender handler
  const handleSendVoiceNote = async (audioBase64: string, durationSeconds: number) => {
    if (!selectedConversation || !currentUser) return;
    try {
      sounds.playMessagePop();

      const newMsg = {
        conversationId: selectedConversation.id,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        senderPhoto: currentUser.photoURL || '',
        text: '',
        mediaType: 'audio' as const,
        mediaUrl: audioBase64,
        audioDuration: durationSeconds,
        timestamp: new Date().toISOString(),
        readBy: [currentUser.id],
      };

      await addDoc(
        collection(db, 'conversations', selectedConversation.id, 'messages'),
        newMsg
      );

      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: {
          text: 'Voice note',
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          timestamp: new Date().toISOString(),
          mediaType: 'audio',
          readBy: [currentUser.id],
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to send voice note:', e);
    }
  };

  // Block a user
  const handleBlockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    if (confirm('Block this user? They will no longer be able to message or call you.')) {
      try {
        const updatedBlocked = [...(currentUser.blockedUserIds || []), targetUserId];
        await updateDoc(doc(db, 'users', currentUser.id), {
          blockedUserIds: updatedBlocked,
        });
        setCurrentUser({ ...currentUser, blockedUserIds: updatedBlocked });
        setSelectedConversation(null);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Loading Splash Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none">
        <Logo size="lg" layout="vertical" />
        <div className="w-8 h-8 border-3 border-[#FF1F35] border-t-transparent rounded-full animate-spin mt-8" />
        <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-4">
          Connecting to FLEXchat...
        </p>
      </div>
    );
  }

  // If Not Authenticated -> Show Welcome Screen or Login
  if (!firebaseUser || !currentUser) {
    if (showWelcomeScreen) {
      return <WelcomeSplashScreen onGetStarted={() => setShowWelcomeScreen(false)} />;
    }
    return <AuthModal onSuccess={() => {}} />;
  }

  // Target contact for current active conversation
  const otherUserId = selectedConversation?.participantIds.find((id) => id !== currentUser.id);
  const otherUser = otherUserId ? usersMap[otherUserId] : undefined;

  return (
    <div className="h-screen w-screen bg-slate-100 flex flex-col overflow-hidden text-slate-800">
      {/* Main Responsive Application Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR OR MOBILE ACTIVE TAB */}
        <div
          className={`h-full flex flex-col bg-white border-r border-slate-200 transition-all ${
            selectedConversation ? 'hidden md:flex md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96'
          }`}
        >
          {activeTab === 'chats' && (
            <ChatList
              conversations={conversations}
              usersMap={usersMap}
              currentUserId={currentUser.id}
              selectedConversationId={selectedConversation?.id || null}
              onSelectConversation={(conv) => setSelectedConversation(conv)}
              onOpenNewChat={() => setActiveTab('contacts')}
              onOpenNewGroup={() => setShowNewGroupModal(true)}
              onTabChange={(tab) => {
                setActiveTopTab(tab);
                if (tab === 'contacts') setActiveTab('contacts');
              }}
              activeTopTab={activeTopTab}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsView
              currentUser={currentUser}
              allUsers={allUsers}
              onStartChatWithUser={handleStartChatWithUser}
              onStartCallWithUser={handleStartCall}
            />
          )}

          {activeTab === 'calls' && (
            <CallsHistoryView
              currentUser={currentUser}
              usersMap={usersMap}
              onStartCall={handleStartCall}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              allUsers={allUsers}
              conversations={conversations}
              onOpenAdmin={() => setShowAdminDashboard(true)}
              onProfileUpdated={(updated) => setCurrentUser(updated)}
              onOpenStarred={() => setShowStarredMessages(true)}
            />
          )}

          {/* Mobile Bottom Navigation */}
          <BottomNav
            activeTab={activeTab}
            onChangeTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'chats') setActiveTopTab('chats');
            }}
          />
        </div>

        {/* MAIN CONVERSATION AREA (DESKTOP OR MOBILE ACTIVE ROOM) */}
        <div
          className={`flex-1 h-full flex flex-col bg-slate-50 overflow-hidden ${
            selectedConversation ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedConversation ? (
            <ChatRoom
              conversation={selectedConversation}
              currentUser={currentUser}
              otherUser={otherUser}
              onBack={() => setSelectedConversation(null)}
              onStartCall={(type) => {
                if (otherUser) {
                  handleStartCall(otherUser, type);
                }
              }}
              onOpenVoiceRecorder={() => setShowVoiceRecorder(true)}
              onReportUser={(u) => setReportingUser(u)}
              onBlockUser={handleBlockUser}
              onOpenStarred={() => setShowStarredMessages(true)}
              onProfileUpdated={(updated) => setCurrentUser(updated)}
            />
          ) : (
            /* Desktop Empty State (matching tagline and branding) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-slate-50">
              <div className="w-24 h-24 mb-4">
                <Logo size="xl" layout="vertical" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                Chat. Call. Be Closer.
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Select a conversation from the sidebar or start a new direct chat, voice note, or call.
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('contacts')}
                  className="px-4 py-2.5 bg-[#FF1F35] hover:bg-red-600 active:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-red-200 transition-transform active:scale-95 flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Find Contacts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(true)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold shadow-xs transition-transform active:scale-95 flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-[#19B9F4]" />
                  <span>Create Group</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Note Recording Full Modal */}
      {showVoiceRecorder && (
        <VoiceRecorderModal
          recipientName={
            selectedConversation?.type === 'group'
              ? (selectedConversation.name || 'Group Chat')
              : (otherUser?.fullName || 'Contact')
          }
          recipientPhoto={
            selectedConversation?.type === 'group'
              ? selectedConversation.photoURL
              : otherUser?.photoURL
          }
          onSend={handleSendVoiceNote}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* Active WebRTC Calling Screen (Audio / Video) */}
      {activeCall && (
        <CallModal
          callId={activeCall.callId}
          isCaller={activeCall.isCaller}
          currentUser={{
            id: currentUser.id,
            fullName: currentUser.fullName,
            photoURL: currentUser.photoURL,
          }}
          targetUser={activeCall.targetUser}
          callType={activeCall.callType}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      {/* Incoming Call Ringing Alert */}
      {incomingCall && !activeCall && (
        <IncomingCallBanner
          call={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* New Group Modal */}
      {showNewGroupModal && (
        <NewGroupModal
          currentUser={currentUser}
          contacts={allUsers.filter((u) => u.id !== currentUser.id)}
          onClose={() => setShowNewGroupModal(false)}
          onGroupCreated={(groupConv) => {
            setSelectedConversation(groupConv);
            setActiveTab('chats');
          }}
        />
      )}

      {/* Report User Modal */}
      {reportingUser && (
        <ReportModal
          reportedUser={reportingUser}
          currentUser={currentUser}
          onClose={() => setReportingUser(null)}
        />
      )}

      {/* Administrator Protected Dashboard */}
      {showAdminDashboard && (
        <AdminDashboard
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={() => setShowAdminDashboard(false)}
        />
      )}

      {/* Starred Messages View Modal */}
      {showStarredMessages && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full sm:h-[85vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            <StarredMessagesView
              currentUser={currentUser}
              conversations={conversations}
              onClose={() => setShowStarredMessages(false)}
              onSelectConversation={(convoId) => {
                const target = conversations.find((c) => c.id === convoId);
                if (target) {
                  setSelectedConversation(target);
                  setActiveTab('chats');
                }
                setShowStarredMessages(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
