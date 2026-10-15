import React, { useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Mail,
  Check,
  X,
  Phone,
  Video,
  MessageSquare,
  Clock,
  UserCheck,
  AlertCircle,
  Users,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
} from 'firebase/firestore';
import { db, findUserByEmail, handleFirestoreError, OperationType } from '../firebase';
import { ContactRequest, UserProfile, Conversation } from '../types';

interface ContactsViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onStartChatWithUser: (user: UserProfile) => void;
  onStartCallWithUser: (user: UserProfile, type: 'audio' | 'video') => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  currentUser,
  allUsers,
  onStartChatWithUser,
  onStartCallWithUser,
}) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'requests' | 'add'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');

  // Add friend states
  const [lookupEmail, setLookupEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [lookupMessage, setLookupMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);

  // Requests states
  const [incomingRequests, setIncomingRequests] = useState<ContactRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ContactRequest[]>([]);

  // Listen for incoming requests
  useEffect(() => {
    const qIn = query(
      collection(db, 'contactRequests'),
      where('toUserId', '==', currentUser.id),
      where('status', '==', 'pending')
    );

    const unsubIn = onSnapshot(qIn, (snap) => {
      const reqs: ContactRequest[] = [];
      snap.forEach((d) => reqs.push({ id: d.id, ...d.data() } as ContactRequest));
      setIncomingRequests(reqs);
    });

    const qOut = query(
      collection(db, 'contactRequests'),
      where('fromUserId', '==', currentUser.id),
      where('status', '==', 'pending')
    );

    const unsubOut = onSnapshot(qOut, (snap) => {
      const reqs: ContactRequest[] = [];
      snap.forEach((d) => reqs.push({ id: d.id, ...d.data() } as ContactRequest));
      setOutgoingRequests(reqs);
    });

    return () => {
      unsubIn();
      unsubOut();
    };
  }, [currentUser.id]);

  const handleSearchGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail.trim()) return;

    if (lookupEmail.trim().toLowerCase() === currentUser.email?.toLowerCase()) {
      setLookupMessage({ text: "You cannot add your own email address.", type: 'error' });
      setSearchedUser(null);
      return;
    }

    setIsSearching(true);
    setLookupMessage(null);
    setSearchedUser(null);

    try {
      const found = await findUserByEmail(lookupEmail.trim());
      if (found) {
        if (found.id === currentUser.id) {
          setLookupMessage({ text: "You cannot add yourself.", type: 'error' });
        } else {
          setSearchedUser(found);
        }
      } else {
        setLookupMessage({
          text: `No registered FLEXchat user found with email "${lookupEmail.trim()}". Ask them to join FLEXchat!`,
          type: 'error',
        });
      }
    } catch (e: any) {
      setLookupMessage({ text: 'Error looking up user: ' + e.message, type: 'error' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchedUser) return;
    try {
      const requestId = `${currentUser.id}_${searchedUser.id}`;
      await setDoc(doc(db, 'contactRequests', requestId), {
        id: requestId,
        fromUserId: currentUser.id,
        toUserId: searchedUser.id,
        fromUserName: currentUser.fullName,
        fromUserPhoto: currentUser.photoURL || '',
        fromUserEmail: currentUser.email,
        toUserEmail: searchedUser.email,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setLookupMessage({
        text: `Friend request sent to ${searchedUser.fullName}!`,
        type: 'success',
      });
      setSearchedUser(null);
      setLookupEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contactRequests');
    }
  };

  const handleAcceptRequest = async (req: ContactRequest) => {
    try {
      await updateDoc(doc(db, 'contactRequests', req.id), {
        status: 'accepted',
      });

      // Find or create direct conversation between them
      const convQuery = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', currentUser.id)
      );
      const snap = await getDocs(convQuery);
      let existingConvId: string | null = null;

      snap.forEach((d) => {
        const data = d.data() as Conversation;
        if (data.type === 'direct' && data.participantIds.includes(req.fromUserId)) {
          existingConvId = d.id;
        }
      });

      if (!existingConvId) {
        const newConvRef = await addDoc(collection(db, 'conversations'), {
          type: 'direct',
          participantIds: [currentUser.id, req.fromUserId],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Switch to contacts tab
      setActiveTab('contacts');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contactRequests/${req.id}`);
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      await deleteDoc(doc(db, 'contactRequests', reqId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `contactRequests/${reqId}`);
    }
  };

  // Contacts list (users in allUsers except me)
  const contactsList = allUsers.filter((u) => {
    if (u.id === currentUser.id) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-white px-4 py-3.5 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Contacts & Connections</h2>
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF1F35] hover:bg-red-600 active:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add by Gmail</span>
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'contacts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Contacts ({contactsList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#FF1F35] text-white text-[10px] font-bold flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'add'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Find by Email
          </button>
        </div>
      </div>

      {/* Main Body depending on activeTab */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ADD BY GMAIL TAB */}
        {activeTab === 'add' && (
          <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#19B9F4] flex items-center justify-center mx-auto mb-2">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Add Friends with Gmail</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your friend or family member's registered Gmail address to send a friend request.
              </p>
            </div>

            <form onSubmit={handleSearchGmail} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="friend@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#19B9F4]"
                />
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full py-2.5 bg-[#19B9F4] hover:bg-sky-600 active:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search User'}
              </button>
            </form>

            {/* Results */}
            {lookupMessage && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                  lookupMessage.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : lookupMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{lookupMessage.text}</span>
              </div>
            )}

            {searchedUser && (
              <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-200 overflow-hidden border border-white shadow-xs">
                    <img
                      src={searchedUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${searchedUser.id}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{searchedUser.fullName}</h4>
                    <p className="text-[11px] text-slate-500">{searchedUser.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendRequest}
                  className="px-3 py-1.5 bg-[#FF1F35] hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Send Request</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="max-w-md mx-auto space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Incoming Requests ({incomingRequests.length})
              </h3>

              {incomingRequests.length === 0 ? (
                <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                  No pending incoming friend requests.
                </div>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border">
                          <img
                            src={req.fromUserPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.fromUserId}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{req.fromUserName}</h4>
                          <p className="text-[11px] text-slate-400">{req.fromUserEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(req)}
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-xs"
                          title="Accept Request"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineRequest(req.id)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                          title="Decline Request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {outgoingRequests.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Sent Requests ({outgoingRequests.length})
                </h3>
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{req.toUserEmail}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-500" /> Pending approval
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(req.id)}
                        className="text-slate-400 hover:text-red-500 text-[11px] font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ALL CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registered contacts by name or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
              />
            </div>

            {contactsList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h4 className="font-bold text-slate-700 text-sm">No contacts found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Search registered users above or invite your friends using their Gmail address.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {contactsList.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-sky-300 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                          <img
                            src={contact.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.id}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {contact.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate leading-tight">
                          {contact.fullName}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">{contact.email}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {contact.statusMessage || (contact.online ? 'Online' : 'Offline')}
                        </p>
                      </div>
                    </div>

                    {/* Quick Call / Chat Buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => onStartChatWithUser(contact)}
                        className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                        title="Open Chat"
                      >
                        <MessageSquare className="w-4 h-4 text-[#19B9F4]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartCallWithUser(contact, 'audio')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Audio Call"
                      >
                        <Phone className="w-4 h-4 text-[#FF1F35]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartCallWithUser(contact, 'video')}
                        className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4 text-[#19B9F4]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
