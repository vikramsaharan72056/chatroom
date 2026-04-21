import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Copy, Hash, Lock, PanelRightClose, PanelRightOpen, MessageSquare } from 'lucide-react';
import { format, isToday, isYesterday, differenceInMinutes, isSameDay } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchRoom } from '../../features/room/roomSlice';
import { useSocket } from '../../hooks/useSocket';
import { MessageItem } from '../../components/chat/MessageItem';
import { MessageInput } from '../../components/chat/MessageInput';
import { Avatar } from '../../components/ui/Avatar';
import type { Message } from '../../types';
import api from '../../services/api';
import toast from 'react-hot-toast';

function formatDateSep(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

function shouldGroup(curr: Message, prev: Message | undefined): boolean {
  if (!prev) return false;
  if (curr.sender._id !== prev.sender._id) return false;
  if (!isSameDay(new Date(curr.createdAt), new Date(prev.createdAt))) return false;
  return differenceInMinutes(new Date(curr.createdAt), new Date(prev.createdAt)) < 5;
}

function shouldShowDateSep(curr: Message, prev: Message | undefined): boolean {
  if (!prev) return true;
  return !isSameDay(new Date(curr.createdAt), new Date(prev.createdAt));
}

interface DateSeparatorProps {
  date: Date;
}

function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 select-none">
      <div className="flex-1 h-px bg-zinc-800/60" />
      <span className="text-[11px] font-medium text-zinc-500 shrink-0">{formatDateSep(date)}</span>
      <div className="flex-1 h-px bg-zinc-800/60" />
    </div>
  );
}

function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { joinRoom, leaveRoom, sendMessage, sendTyping } = useSocket();

  const user = useAppSelector((s) => s.auth.user);
  const room = useAppSelector((s) => s.room.activeRoom);
  const messages = useAppSelector((s) => s.messages.byRoom[roomId!] ?? []);
  const typingUsers = useAppSelector((s) => s.messages.typingUsers[roomId!] ?? {});
  const onlineMembers = useAppSelector((s) => s.presence.onlineByRoom[roomId!] ?? []);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    dispatch(fetchRoom(roomId));
    joinRoom(roomId);
    return () => { leaveRoom(roomId); };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = useCallback(
    (content: string, replyToId?: string) => {
      if (!roomId) return;
      sendMessage(roomId, content, replyToId);
      setReplyTo(null);
    },
    [roomId, sendMessage],
  );

  const handleDelete = async (messageId: string) => {
    try {
      await api.delete(`/messages/${messageId}`);
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId!);
    toast.success('Room ID copied');
  };

  const typingNames = Object.values(typingUsers).filter((n) => n !== user?.name);

  const onlineSet = new Set(onlineMembers);
  const sortedMembers = room?.members
    .slice()
    .sort((a, b) => {
      const aOn = onlineSet.has(a._id) ? 0 : 1;
      const bOn = onlineSet.has(b._id) ? 0 : 1;
      return aOn - bOn;
    }) ?? [];
  const onlineList = sortedMembers.filter((m) => onlineSet.has(m._id));
  const offlineList = sortedMembers.filter((m) => !onlineSet.has(m._id));

  if (!user) return null;

  return (
    <div className="h-screen flex bg-zinc-950 overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/80 bg-zinc-950 shrink-0">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all shrink-0"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="w-px h-5 bg-zinc-800 shrink-0" />

          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              {room?.type === 'private'
                ? <Lock size={13} className="text-indigo-400" />
                : <Hash size={13} className="text-indigo-400" />
              }
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-zinc-100 text-sm truncate leading-tight">
                {room?.name ?? 'Loading…'}
              </h1>
              <button
                onClick={copyRoomId}
                className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors group/copy"
              >
                <span className="truncate font-mono max-w-[180px]">{roomId}</span>
                <Copy size={9} className="shrink-0 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0" />
              <span>{onlineMembers.length} online</span>
            </div>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all shrink-0"
              title={sidebarOpen ? 'Hide members' : 'Show members'}
            >
              {sidebarOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                <MessageSquare size={24} className="text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">No messages yet</p>
              <p className="text-xs text-zinc-600 mt-1.5 max-w-xs">
                Be the first to say something in <span className="text-zinc-400">{room?.name}</span>
              </p>
            </div>
          ) : (
            <div className="pb-2 pt-1">
              {messages.map((msg, i) => {
                const prev = i > 0 ? messages[i - 1] : undefined;
                const grouped = shouldGroup(msg, prev);
                const showSep = shouldShowDateSep(msg, prev);
                return (
                  <div key={msg._id}>
                    {showSep && <DateSeparator date={new Date(msg.createdAt)} />}
                    <MessageItem
                      message={msg}
                      currentUser={user}
                      onReply={setReplyTo}
                      onDelete={handleDelete}
                      isGrouped={grouped}
                    />
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="px-4 py-2 text-xs text-zinc-500 italic shrink-0 border-t border-zinc-800/50 bg-zinc-950/50">
            <span className="inline-flex items-center gap-2">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing
            </span>
          </div>
        )}

        {/* Input */}
        <MessageInput
          onSend={handleSend}
          onTyping={(isTyping) => roomId && sendTyping(roomId, isTyping)}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      {/* Members sidebar */}
      {sidebarOpen && (
        <aside className="w-60 shrink-0 border-l border-zinc-800/80 flex flex-col bg-zinc-950">
          <div className="px-4 py-3.5 border-b border-zinc-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <Users size={12} />
              <span>Members</span>
              <span className="ml-auto text-zinc-600 normal-case tracking-normal font-normal tabular-nums">
                {room?.members.length ?? 0}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {/* Online */}
            {onlineList.length > 0 && (
              <div>
                <p className="px-2 pb-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest select-none">
                  Online — {onlineList.length}
                </p>
                <div className="space-y-0.5">
                  {onlineList.map((member) => {
                    const isMe = member._id === user._id;
                    return (
                      <div
                        key={member._id}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-900/60 transition-colors"
                      >
                        <Avatar src={member.avatar} name={member.name} size="sm" online />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-zinc-200 truncate leading-tight">
                            {member.name}
                            {isMe && <span className="ml-1.5 text-[10px] text-indigo-500 font-normal">you</span>}
                          </p>
                          <p className="text-[10px] text-emerald-500 leading-tight">Online</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Offline */}
            {offlineList.length > 0 && (
              <div>
                <p className="px-2 pb-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest select-none">
                  Offline — {offlineList.length}
                </p>
                <div className="space-y-0.5">
                  {offlineList.map((member) => {
                    const isMe = member._id === user._id;
                    return (
                      <div
                        key={member._id}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-900/60 transition-colors"
                      >
                        <Avatar src={member.avatar} name={member.name} size="sm" online={false} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-zinc-500 truncate leading-tight">
                            {member.name}
                            {isMe && <span className="ml-1.5 text-[10px] text-zinc-600 font-normal">you</span>}
                          </p>
                          <p className="text-[10px] text-zinc-600 leading-tight">Offline</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

export default RoomPage;
