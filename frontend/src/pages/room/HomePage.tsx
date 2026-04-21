import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  LogOut,
  Hash,
  Lock,
  Users,
  MessageSquare,
  Compass,
  LayoutList,
  ChevronRight,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchMyRooms, fetchPublicRooms } from '../../features/room/roomSlice';
import { logout } from '../../features/auth/authSlice';
import { disconnectSocket } from '../../services/socket';
import { Avatar } from '../../components/ui/Avatar';
import { CreateRoomModal } from '../../components/chat/CreateRoomModal';
import { JoinRoomModal } from '../../components/chat/JoinRoomModal';
import api from '../../services/api';
import type { Room } from '../../types';

type Tab = 'my' | 'public';

const CARD_ACCENTS = [
  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', hover: 'group-hover:bg-indigo-500/20', icon: 'text-indigo-400' },
  { bg: 'bg-violet-500/10', border: 'border-violet-500/20', hover: 'group-hover:bg-violet-500/20', icon: 'text-violet-400' },
  { bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    hover: 'group-hover:bg-sky-500/20',    icon: 'text-sky-400'    },
  { bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',hover: 'group-hover:bg-emerald-500/20',icon: 'text-emerald-400'},
  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  hover: 'group-hover:bg-amber-500/20',  icon: 'text-amber-400'  },
  { bg: 'bg-rose-500/10',   border: 'border-rose-500/20',   hover: 'group-hover:bg-rose-500/20',   icon: 'text-rose-400'   },
  { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   hover: 'group-hover:bg-cyan-500/20',   icon: 'text-cyan-400'   },
] as const;

function accentFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CARD_ACCENTS[h % CARD_ACCENTS.length];
}

const RoomCard: React.FC<{ room: Room; onClick: () => void }> = ({ room, onClick }) => {
  const accent = accentFor(room.name);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-5 bg-zinc-900 hover:bg-zinc-800/60 rounded-2xl border border-zinc-800/80 hover:border-zinc-700/80 transition-all text-left group"
    >
      <div className={`w-12 h-12 rounded-xl ${accent.bg} border ${accent.border} ${accent.hover} flex items-center justify-center shrink-0 transition-colors`}>
        {room.type === 'private' ? (
          <Lock size={17} className={accent.icon} />
        ) : (
          <Hash size={17} className={accent.icon} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-100 text-sm truncate">{room.name}</p>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          {room.description || 'No description'}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Users size={12} />
          <span className="tabular-nums">{room.members.length}</span>
        </div>
        <ChevronRight
          size={15}
          className="text-zinc-700 group-hover:text-zinc-400 transition-colors"
        />
      </div>
    </button>
  );
};

const HomePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const myRooms = useAppSelector((s) => s.room.myRooms);
  const publicRooms = useAppSelector((s) => s.room.publicRooms);
  const [tab, setTab] = useState<Tab>('my');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchMyRooms());
    dispatch(fetchPublicRooms());
  }, [dispatch]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    disconnectSocket();
    dispatch(logout());
    navigate('/auth/login');
  };

  const rooms = tab === 'my' ? myRooms : publicRooms;
  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="h-screen flex bg-zinc-950 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-zinc-800/70 bg-[#0c0c0f]">

        {/* Brand */}
        <div className="px-6 py-5 border-b border-zinc-800/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <MessageSquare size={17} className="text-white" />
            </div>
            <span className="text-base font-bold text-zinc-100 tracking-tight">Nexus</span>
          </div>
        </div>

        {/* Primary actions */}
        <div className="px-4 pt-5 pb-4 space-y-2.5 border-b border-zinc-800/70">
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-indigo-500/20 active:scale-[0.98]"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Room
          </button>
          <button
            onClick={() => setJoinOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-sm font-medium rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.98]"
          >
            <Users size={16} />
            Join a Room
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 pt-5 pb-3 flex-1 overflow-y-auto">
          <p className="px-3 mb-2.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest select-none">
            Browse
          </p>
          <div className="space-y-1">
            <button
              onClick={() => setTab('my')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === 'my'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <LayoutList size={16} className={tab === 'my' ? 'text-indigo-400' : 'text-zinc-600'} />
              <span>My Rooms</span>
              <span
                className={`ml-auto text-xs rounded-lg px-2 py-0.5 font-semibold tabular-nums ${
                  tab === 'my'
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {myRooms.length}
              </span>
            </button>

            <button
              onClick={() => setTab('public')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === 'public'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Compass size={16} className={tab === 'public' ? 'text-indigo-400' : 'text-zinc-600'} />
              <span>Discover</span>
              <span
                className={`ml-auto text-xs rounded-lg px-2 py-0.5 font-semibold tabular-nums ${
                  tab === 'public'
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {publicRooms.length}
              </span>
            </button>
          </div>
        </nav>

        {/* User profile + sign out — combined, one clean section */}
        <div className="border-t border-zinc-800/70 px-4 py-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 transition-colors group">
            <Avatar src={user?.avatar} name={user?.name ?? 'U'} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-200 truncate leading-snug">
                {user?.name}
              </p>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">

        {/* Header */}
        <header className="px-8 py-5 border-b border-zinc-800/70 shrink-0">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-lg font-bold text-zinc-100">
                {tab === 'my' ? 'My Rooms' : 'Discover Rooms'}
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                {tab === 'my'
                  ? "Rooms you've joined or created"
                  : 'Browse all public rooms'}
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rooms…"
                className="h-9 pl-9 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all w-60"
              />
            </div>
          </div>
        </header>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto p-8">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                {tab === 'my' ? (
                  <LayoutList size={24} className="text-zinc-600" />
                ) : (
                  <Compass size={24} className="text-zinc-600" />
                )}
              </div>
              <p className="text-sm font-semibold text-zinc-300">
                {tab === 'my' ? 'No rooms yet' : 'No public rooms found'}
              </p>
              <p className="text-xs text-zinc-600 mt-1.5 max-w-xs">
                {tab === 'my'
                  ? 'Create your first room or join one with an invite'
                  : 'Try a different search term'}
              </p>
              {tab === 'my' && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 hover:border-indigo-500/30 px-5 py-2.5 rounded-xl"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Create your first room
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-w-5xl">
              {filtered.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  onClick={() => navigate(`/room/${room._id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/room/${id}`)}
      />
      <JoinRoomModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(id) => navigate(`/room/${id}`)}
      />
    </div>
  );
};

export default HomePage;
