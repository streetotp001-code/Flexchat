import React, { useState } from 'react';
import { X, Users, Check } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Conversation } from '../types';

interface NewGroupModalProps {
  currentUser: UserProfile;
  contacts: UserProfile[];
  onClose: () => void;
  onGroupCreated: (conv: Conversation) => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  currentUser,
  contacts,
  onClose,
  onGroupCreated,
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleUserSelection = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedUserIds((prev) => [...prev, userId]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const allMembers = [currentUser.id, ...selectedUserIds];
      const newGroupData = {
        type: 'group' as const,
        name: groupName.trim(),
        photoURL: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName.trim())}`,
        participantIds: allMembers,
        adminIds: [currentUser.id],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'conversations'), newGroupData);
      onGroupCreated({ id: docRef.id, ...newGroupData });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'conversations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-50 text-[#19B9F4] rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Create Group Chat</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Group Name</label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Family Group, Project Team"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF1F35]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Members ({selectedUserIds.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {contacts.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">No contacts available to add.</p>
              ) : (
                contacts.map((contact) => {
                  const isSelected = selectedUserIds.includes(contact.id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleUserSelection(contact.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={contact.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.id}`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-xs font-semibold text-slate-800">{contact.fullName}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isSelected ? 'bg-[#FF1F35] border-[#FF1F35] text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !groupName.trim() || selectedUserIds.length === 0}
              className="px-5 py-2 bg-[#FF1F35] hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
