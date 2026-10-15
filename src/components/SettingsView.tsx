import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Bell,
  Eye,
  LogOut,
  ShieldAlert,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  Palette,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Star,
  Globe,
  MessageSquare,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Conversation } from '../types';
import { Logo } from './Logo';

interface SettingsViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  conversations?: Conversation[];
  onOpenAdmin: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onOpenStarred?: () => void;
}

const compressWallpaperImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1280;
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
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  allUsers,
  conversations = [],
  onOpenAdmin,
  onProfileUpdated,
  onOpenStarred,
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [statusMessage, setStatusMessage] = useState(currentUser.statusMessage || 'Available on FLEXchat');
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
  const [isOnlineVisible, setIsOnlineVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [starredCount, setStarredCount] = useState<number>(0);

  // Subscribe to count of starred messages
  useEffect(() => {
    const q = collection(db, 'users', currentUser.id, 'starredMessages');
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setStarredCount(snapshot.size);
      },
      (err) => {
        console.error('Error fetching starred count:', err);
      }
    );
    return () => unsub();
  }, [currentUser.id]);

  // Target: 'global' or a conversationId
  const [selectedTarget, setSelectedTarget] = useState<string>('global');

  const getBackgroundForTarget = (targetId: string): string => {
    if (targetId === 'global') {
      return currentUser.chatBackground || '#f8fafc';
    }
    return (
      currentUser.conversationBackgrounds?.[targetId] ||
      currentUser.chatBackground ||
      '#f8fafc'
    );
  };

  const hasCustomOverride =
    selectedTarget !== 'global' &&
    Boolean(currentUser.conversationBackgrounds?.[selectedTarget]);

  const [chatBackground, setChatBackground] = useState<string>(() =>
    getBackgroundForTarget('global')
  );

  useEffect(() => {
    setChatBackground(getBackgroundForTarget(selectedTarget));
  }, [selectedTarget, currentUser.chatBackground, currentUser.conversationBackgrounds]);

  const [isSavingBg, setIsSavingBg] = useState(false);
  const [bgSavedSuccess, setBgSavedSuccess] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const wallpaperInputRef = React.useRef<HTMLInputElement | null>(null);

  const getConversationDisplayName = (conv: Conversation) => {
    if (conv.type === 'group') {
      return conv.name || 'Group Chat';
    }
    const otherId = conv.participantIds.find((id) => id !== currentUser.id);
    const other = otherId ? allUsers.find((u) => u.id === otherId) : null;
    return other ? other.fullName : 'Direct Chat';
  };

  const colorPresets = [
    { name: 'Default Slate', value: '#f8fafc', bg: 'bg-slate-100' },
    { name: 'Soft Sky', value: '#f0f9ff', bg: 'bg-sky-50' },
    { name: 'Warm Cream', value: '#fffbeb', bg: 'bg-amber-50' },
    { name: 'Gentle Rose', value: '#fff1f2', bg: 'bg-rose-50' },
    { name: 'Mint Green', value: '#f0fdf4', bg: 'bg-emerald-50' },
    { name: 'Lavender', value: '#f5f3ff', bg: 'bg-purple-50' },
    { name: 'Ocean Teal', value: '#ecfeff', bg: 'bg-cyan-50' },
    { name: 'Midnight Dark', value: '#0f172a', bg: 'bg-slate-900' },
  ];

  const gradientPresets = [
    {
      name: 'FLEXchat Sunrise',
      value: 'linear-gradient(135deg, #fff1f2 0%, #fef3c7 50%, #f0f9ff 100%)',
    },
    {
      name: 'Sky Breeze',
      value: 'linear-gradient(180deg, #e0f2fe 0%, #f8fafc 100%)',
    },
    {
      name: 'Sunset Glow',
      value: 'linear-gradient(135deg, #ffedd5 0%, #fee2e2 100%)',
    },
    {
      name: 'Emerald Twilight',
      value: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 50%, #e0f2fe 100%)',
    },
    {
      name: 'Cyber Violet',
      value: 'linear-gradient(135deg, #2e1065 0%, #0f172a 100%)',
    },
    {
      name: 'Cosmic Slate',
      value: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    },
  ];

  const imageWallpapers = [
    {
      name: 'Calm Clouds',
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Abstract Fluid',
      url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Geometric Minimal',
      url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Dark Cyberpunk',
      url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Misty Pines',
      url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Clean Architecture',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
    },
  ];

  const handleSaveChatBackground = async (newBg?: string) => {
    const bgToSave = newBg !== undefined ? newBg : chatBackground;
    setIsSavingBg(true);
    setBgSavedSuccess(false);

    try {
      const userRef = doc(db, 'users', currentUser.id);
      if (selectedTarget === 'global') {
        await updateDoc(userRef, { chatBackground: bgToSave });
        onProfileUpdated({ ...currentUser, chatBackground: bgToSave });
      } else {
        const updatedBgMap = {
          ...(currentUser.conversationBackgrounds || {}),
          [selectedTarget]: bgToSave,
        };
        await updateDoc(userRef, { conversationBackgrounds: updatedBgMap });
        onProfileUpdated({
          ...currentUser,
          conversationBackgrounds: updatedBgMap,
        });
      }
      setBgSavedSuccess(true);
      setTimeout(() => setBgSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update chat background preference:', err);
    } finally {
      setIsSavingBg(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsSavingBg(true);
    setBgSavedSuccess(false);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      if (selectedTarget === 'global') {
        const defaultBg = '#f8fafc';
        setChatBackground(defaultBg);
        await updateDoc(userRef, { chatBackground: defaultBg });
        onProfileUpdated({ ...currentUser, chatBackground: defaultBg });
      } else {
        const updatedBgMap = { ...(currentUser.conversationBackgrounds || {}) };
        delete updatedBgMap[selectedTarget];
        await updateDoc(userRef, { conversationBackgrounds: updatedBgMap });
        onProfileUpdated({
          ...currentUser,
          conversationBackgrounds: updatedBgMap,
        });
        setChatBackground(currentUser.chatBackground || '#f8fafc');
      }
      setBgSavedSuccess(true);
      setTimeout(() => setBgSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to reset chat background:', err);
    } finally {
      setIsSavingBg(false);
    }
  };

  const handleCustomWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file for your chat wallpaper.');
      return;
    }

    try {
      setIsCompressing(true);
      const dataUrl = await compressWallpaperImage(file);
      setChatBackground(dataUrl);
      await handleSaveChatBackground(dataUrl);
    } catch (err) {
      console.error('Failed to process wallpaper upload:', err);
      alert('Could not process this image file. Please try another image.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleApplyUrl = async () => {
    const url = customUrlInput.trim();
    if (!url) return;
    setChatBackground(url);
    await handleSaveChatBackground(url);
    setCustomUrlInput('');
    setShowUrlInput(false);
  };

  const avatarPresets = [
    `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id}`,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const userRef = doc(db, 'users', currentUser.id);
      const updated = {
        fullName: fullName.trim(),
        statusMessage: statusMessage.trim(),
        photoURL: photoURL.trim(),
      };
      await updateDoc(userRef, updated);
      onProfileUpdated({ ...currentUser, ...updated });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    try {
      const updatedBlocked = (currentUser.blockedUserIds || []).filter((id) => id !== blockedId);
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, { blockedUserIds: updatedBlocked });
      onProfileUpdated({ ...currentUser, blockedUserIds: updatedBlocked });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out from FLEXchat?')) {
      try {
        await updateDoc(doc(db, 'users', currentUser.id), {
          online: false,
          lastSeen: new Date().toISOString(),
        });
      } catch {}
      await signOut(auth);
    }
  };

  const blockedUsers = allUsers.filter((u) => currentUser.blockedUserIds?.includes(u.id));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 select-none overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Settings & Profile</h2>
            <p className="text-xs text-slate-500">Manage your profile, preferences, and security</p>
          </div>
          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-3.5 py-2 bg-gradient-to-r from-red-500 to-amber-500 hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </button>
          )}
        </div>

        {/* Profile Edit Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#FF1F35]" /> Personal Profile
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar Preview & presets */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-full border-2 border-[#19B9F4] overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
                <img
                  src={photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-600 mb-1.5 block">Choose Avatar:</span>
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {avatarPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoURL(preset)}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform active:scale-95 ${
                        photoURL === preset ? 'border-[#FF1F35] ring-2 ring-red-200 scale-105' : 'border-slate-200'
                      }`}
                    >
                      <img src={preset} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF1F35]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Message</label>
              <input
                type="text"
                maxLength={200}
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="e.g. Chat. Call. Be Closer."
                className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF1F35]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Registered)</label>
              <input
                type="text"
                disabled
                value={currentUser.email}
                className="w-full py-2.5 px-3.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Profile updated!
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="ml-auto py-2 px-5 bg-[#FF1F35] hover:bg-red-600 text-white font-bold rounded-xl text-xs shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Chat Wallpaper & Theme Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#FF1F35]" /> Chat Room Wallpaper & Colors
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload or select a custom background image or color for all chats or a specific conversation.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isSavingBg}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 self-start sm:self-auto px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{hasCustomOverride ? 'Reset to Global' : 'Reset to Default'}</span>
            </button>
          </div>

          {/* Conversation Target Selector */}
          <div className="mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                <span>Apply Preference To:</span>
              </label>

              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#19B9F4] shadow-2xs"
              >
                <option value="global">🌐 All Conversations (Default Background)</option>
                {conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    💬 {getConversationDisplayName(c)} {c.type === 'group' ? '(Group)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Status indicator */}
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                {selectedTarget === 'global' ? (
                  <span>Applies as the standard default for all your chat rooms.</span>
                ) : hasCustomOverride ? (
                  <span className="text-sky-700 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3 text-sky-600" /> Custom wallpaper set for this specific chat.
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Currently inheriting the global default background.
                  </span>
                )}
              </span>

              {hasCustomOverride && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[10px] text-red-600 hover:text-red-700 font-semibold underline"
                >
                  Use Global Wallpaper
                </button>
              )}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="mb-5 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span>Live Wallpaper Preview</span>
              <span className="text-[10px] font-medium text-slate-500">
                {selectedTarget === 'global'
                  ? 'Global Default'
                  : `Chat: ${
                      conversations.find((c) => c.id === selectedTarget)
                        ? getConversationDisplayName(conversations.find((c) => c.id === selectedTarget)!)
                        : 'Selected Chat'
                    }`}
              </span>
            </div>
            <div
              className="p-4 space-y-2.5 min-h-[145px] flex flex-col justify-center transition-all duration-300 relative"
              style={
                chatBackground.startsWith('http') || chatBackground.startsWith('data:image')
                  ? {
                      backgroundImage: `url(${chatBackground})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : chatBackground.includes('gradient')
                  ? { background: chatBackground }
                  : { backgroundColor: chatBackground }
              }
            >
              <div className="self-start max-w-[80%] p-2.5 rounded-2xl rounded-tl-none bg-white/95 backdrop-blur-xs text-slate-800 text-xs shadow-sm border border-slate-100">
                Hey! How do you like this wallpaper? 😊
                <span className="block text-[9px] text-slate-400 text-right mt-0.5">10:42 AM</span>
              </div>
              <div className="self-end max-w-[80%] p-2.5 rounded-2xl rounded-tr-none bg-gradient-to-r from-[#19B9F4] to-sky-500 text-white text-xs shadow-sm">
                Looks clean, vibrant, and super legible! ✨
                <span className="block text-[9px] text-sky-100 text-right mt-0.5">10:43 AM ✓✓</span>
              </div>
            </div>
          </div>

          {/* Solid Colors */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Preset Colors</label>
            <div className="flex flex-wrap items-center gap-2.5">
              {colorPresets.map((c) => {
                const isSelected = chatBackground === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      setChatBackground(c.value);
                      handleSaveChatBackground(c.value);
                    }}
                    title={c.name}
                    className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 flex items-center justify-center ${
                      isSelected ? 'border-[#FF1F35] ring-2 ring-red-200 scale-110' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {isSelected && <Check className={`w-4 h-4 ${c.value === '#0f172a' ? 'text-white' : 'text-[#FF1F35]'}`} />}
                  </button>
                );
              })}

              {/* Custom Color Input */}
              <label
                className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 hover:border-slate-400 flex items-center justify-center cursor-pointer transition-colors relative"
                title="Custom Color"
              >
                <input
                  type="color"
                  value={chatBackground.startsWith('#') ? chatBackground : '#f8fafc'}
                  onChange={(e) => {
                    setChatBackground(e.target.value);
                    handleSaveChatBackground(e.target.value);
                  }}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
                <Palette className="w-4 h-4 text-slate-500" />
              </label>
            </div>
          </div>

          {/* Gradients */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Subtle Gradients</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gradientPresets.map((g) => {
                const isSelected = chatBackground === g.value;
                return (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => {
                      setChatBackground(g.value);
                      handleSaveChatBackground(g.value);
                    }}
                    className={`p-2 rounded-xl text-left border-2 transition-transform active:scale-95 flex flex-col justify-between h-14 ${
                      isSelected ? 'border-[#FF1F35] ring-2 ring-red-200' : 'border-slate-200'
                    }`}
                    style={{ background: g.value }}
                  >
                    <span className={`text-[10px] font-bold ${g.value.includes('#0f172a') || g.value.includes('#2e1065') ? 'text-white' : 'text-slate-800'}`}>
                      {g.name}
                    </span>
                    {isSelected && (
                      <Check className={`w-3.5 h-3.5 self-end ${g.value.includes('#0f172a') || g.value.includes('#2e1065') ? 'text-white' : 'text-[#FF1F35]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wallpapers / Photo Patterns */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Curated Wallpaper Images</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {imageWallpapers.map((w) => {
                const isSelected = chatBackground === w.url;
                return (
                  <button
                    key={w.name}
                    type="button"
                    onClick={() => {
                      setChatBackground(w.url);
                      handleSaveChatBackground(w.url);
                    }}
                    className={`h-16 rounded-xl overflow-hidden border-2 relative group transition-transform active:scale-95 ${
                      isSelected ? 'border-[#FF1F35] ring-2 ring-red-200' : 'border-slate-200'
                    }`}
                  >
                    <img src={w.url} alt={w.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 flex items-end p-1.5">
                      <span className="text-[10px] font-bold text-white truncate drop-shadow-sm">{w.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white ml-auto stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload Custom Image & Image URL Input */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={wallpaperInputRef}
                  onChange={handleCustomWallpaperUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => wallpaperInputRef.current?.click()}
                  disabled={isCompressing || isSavingBg}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isCompressing ? (
                    <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-sky-500" />
                  )}
                  <span>{isCompressing ? 'Compressing Image...' : 'Upload Image File'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Paste Image URL</span>
                </button>
              </div>

              {bgSavedSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-4 h-4" /> Preference saved!
                </span>
              )}
            </div>

            {/* URL input drawer */}
            {showUrlInput && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-150">
                <input
                  type="url"
                  placeholder="Paste direct image URL (https://...)"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#19B9F4]"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={!customUrlInput.trim() || isSavingBg}
                  className="px-3 py-1.5 bg-[#19B9F4] text-white rounded-lg text-xs font-bold hover:bg-sky-500 disabled:opacity-50 transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Starred Messages Card */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0 border border-amber-100 shadow-2xs">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Starred Messages</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {starredCount}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {starredCount === 0
                  ? 'Bookmark messages for quick access anytime'
                  : `${starredCount} saved message${starredCount === 1 ? '' : 's'} across conversations`}
              </p>
            </div>
          </div>
          {onOpenStarred && (
            <button
              type="button"
              onClick={onOpenStarred}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Star className="w-3.5 h-3.5 fill-white text-white" />
              <span>Open Starred Messages</span>
            </button>
          )}
        </div>

        {/* Privacy & Visibility */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-[#19B9F4]" /> Privacy & Security
          </h3>

          <div className="divide-y divide-slate-100 text-sm">
            <div className="py-3 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-800 text-xs">Show Online Status</h4>
                <p className="text-[11px] text-slate-500">Let contacts see when you are active</p>
              </div>
              <input
                type="checkbox"
                checked={isOnlineVisible}
                onChange={(e) => setIsOnlineVisible(e.target.checked)}
                className="w-4 h-4 accent-[#19B9F4] rounded"
              />
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-800 text-xs">Read Receipts</h4>
                <p className="text-[11px] text-slate-500">Send blue double checks when messages are seen</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#19B9F4] rounded" />
            </div>

            {/* Blocked users */}
            <div className="pt-3">
              <h4 className="font-semibold text-slate-800 text-xs mb-2">Blocked Users</h4>
              {blockedUsers.length === 0 ? (
                <p className="text-[11px] text-slate-400">No users are currently blocked.</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {blockedUsers.map((bUser) => (
                    <div key={bUser.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                      <span>{bUser.fullName}</span>
                      <button
                        type="button"
                        onClick={() => handleUnblock(bUser.id)}
                        className="text-[#19B9F4] font-semibold hover:underline"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sign Out Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-[#FF1F35] rounded-2xl">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">Sign Out of FLEXchat</h4>
              <p className="text-[11px] text-slate-500">End session on this device</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 border border-red-200 text-[#FF1F35] hover:bg-red-50 font-bold rounded-xl text-xs transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Footer Brand */}
        <div className="text-center pt-2 pb-6">
          <Logo size="sm" layout="vertical" />
          <p className="text-[10px] text-slate-400 font-medium mt-2">
            FLEXchat by CYCM • Chat. Call. Be Closer. • v1.0
          </p>
        </div>
      </div>
    </div>
  );
};
