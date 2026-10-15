import React from 'react';
import { MessageSquare, Phone, Users, Settings } from 'lucide-react';

export type MainTab = 'chats' | 'calls' | 'contacts' | 'settings';

interface BottomNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  unreadChatsCount?: number;
  missedCallsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  unreadChatsCount = 0,
  missedCallsCount = 0,
}) => {
  const tabs = [
    { id: 'chats' as MainTab, label: 'Chats', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'calls' as MainTab, label: 'Calls', icon: Phone, badge: missedCallsCount },
    { id: 'contacts' as MainTab, label: 'People', icon: Users },
    { id: 'settings' as MainTab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="md:hidden bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around z-20 shadow-md">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl relative transition-transform active:scale-95 ${
              isActive ? 'text-[#FF1F35]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#FF1F35] text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
