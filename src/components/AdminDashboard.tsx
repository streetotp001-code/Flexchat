import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Activity,
  Server,
  Lock,
} from 'lucide-react';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AbuseReport, UserProfile } from '../types';

interface AdminDashboardProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  allUsers,
  onClose,
}) => {
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [stats, setStats] = useState({
    conversationsCount: 0,
    messagesCount: 0,
    callsCount: 0,
  });
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'reports'>('metrics');

  useEffect(() => {
    // Listen to abuse reports
    const unsub = onSnapshot(collection(db, 'reports'), (snap) => {
      const repList: AbuseReport[] = [];
      snap.forEach((d) => repList.push({ id: d.id, ...d.data() } as AbuseReport));
      setReports(repList);
    });

    // Load counts
    const loadCounts = async () => {
      try {
        const convSnap = await getDocs(collection(db, 'conversations'));
        const callsSnap = await getDocs(collection(db, 'calls'));
        setStats({
          conversationsCount: convSnap.size,
          messagesCount: convSnap.size * 12, // aggregate estimation
          callsCount: callsSnap.size,
        });
      } catch (e) {
        console.error(e);
      }
    };
    loadCounts();

    return () => unsub();
  }, []);

  if (currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <Lock className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-2">
          Administrator privileges are required to view this dashboard.
        </p>
        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold"
        >
          Return to FLEXchat
        </button>
      </div>
    );
  }

  const handleToggleSuspendUser = async (targetUser: UserProfile) => {
    try {
      const isCurrentlySuspended = targetUser.isSuspended || false;
      await updateDoc(doc(db, 'users', targetUser.id), {
        isSuspended: !isCurrentlySuspended,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAdminRole = async (targetUser: UserProfile) => {
    try {
      const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', targetUser.id), {
        role: newRole,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
    } catch (e) {
      console.error(e);
    }
  };

  const activeUsersCount = allUsers.filter((u) => u.online).length;
  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FF1F35]" /> FLEXchat Administrator Center
              </h2>
            </div>
            <p className="text-[11px] text-slate-400">Authenticated as {currentUser.email} (Super Admin)</p>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
              activeTab === 'metrics' ? 'bg-[#FF1F35] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Analytics & Health
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
              activeTab === 'users' ? 'bg-[#FF1F35] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Users ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
              activeTab === 'reports' ? 'bg-[#FF1F35] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Abuse Reports</span>
            {pendingReportsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                {pendingReportsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Total Users</span>
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-black text-white">{allUsers.length}</div>
                <div className="text-[11px] text-emerald-400 mt-1 font-medium">{activeUsersCount} currently online</div>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Conversations</span>
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white">{stats.conversationsCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Real-time chat rooms</div>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Total Calls</span>
                  <Phone className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">{stats.callsCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Audio & Video sessions</div>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Reports</span>
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-black text-white">{reports.length}</div>
                <div className="text-[11px] text-amber-400 mt-1">{pendingReportsCount} pending review</div>
              </div>
            </div>

            {/* Service Health Card */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" /> Service Infrastructure & Health
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Cloud Firestore</div>
                    <div className="text-[10px] text-slate-400">Database & Security Rules</div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Operational
                  </span>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Firebase Auth</div>
                    <div className="text-[10px] text-slate-400">Google OAuth & Passwords</div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Connected
                  </span>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">WebRTC STUN Signaling</div>
                    <div className="text-[10px] text-slate-400">Audio/Video Calling</div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Registered Users Directory</h3>
            </div>

            <div className="divide-y divide-slate-800">
              {allUsers.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-850">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                      <img
                        src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{u.fullName}</span>
                        {u.role === 'admin' && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                            Admin
                          </span>
                        )}
                        {u.isSuspended && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                            Suspended
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAdminRole(u)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300"
                    >
                      {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSuspendUser(u)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg ${
                        u.isSuspended
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {u.isSuspended ? 'Restore' : 'Suspend'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-white text-sm">No abuse reports</h4>
                <p className="text-xs text-slate-400 mt-1">All clear! No pending content or user reports.</p>
              </div>
            ) : (
              reports.map((rep) => (
                <div key={rep.id} className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{rep.reportedUserName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase">
                        {rep.reason}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Status: <strong className="text-amber-400">{rep.status}</strong>
                      </span>
                    </div>
                    {rep.details && <p className="text-xs text-slate-300 mt-1">{rep.details}</p>}
                    <p className="text-[10px] text-slate-500 mt-1">
                      Reported by {rep.reporterEmail} on {new Date(rep.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateReportStatus(rep.id, 'resolved')}
                      className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateReportStatus(rep.id, 'dismissed')}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
