import React from 'react';
import { Reply, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar } from '../ui/Avatar';
import type { Message, User } from '../../types';

interface Props {
  message: Message;
  currentUser: User;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  isGrouped?: boolean;
}

export const MessageItem: React.FC<Props> = ({
  message,
  currentUser,
  onReply,
  onDelete,
  isGrouped = false,
}) => {
  const isMine = message.sender._id === currentUser._id;

  if (message.isDeleted) {
    return (
      <div className={`flex items-center gap-3 px-4 ${isGrouped ? 'py-0.5' : 'pt-3 pb-1'}`}>
        <div className="w-10 shrink-0" />
        <span className="text-xs text-zinc-700 italic">This message was deleted</span>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start gap-3 px-4 ${isGrouped ? 'py-[3px]' : 'pt-3 pb-1'} ${
        isMine ? 'hover:bg-indigo-500/[0.04]' : 'hover:bg-zinc-900/50'
      } transition-colors`}
    >
      {/* Avatar / time gutter — always 40px wide */}
      <div className="w-10 shrink-0 flex justify-center pt-0.5">
        {!isGrouped ? (
          <Avatar src={message.sender.avatar} name={message.sender.name} size="sm" />
        ) : (
          <time className="text-[10px] text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity leading-none font-mono tabular-nums mt-1.5 select-none">
            {format(new Date(message.createdAt), 'HH:mm')}
          </time>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-sm font-bold leading-none ${isMine ? 'text-indigo-300' : 'text-zinc-100'}`}>
              {message.sender.name}
            </span>
            <time className="text-[11px] text-zinc-600 leading-none">
              {format(new Date(message.createdAt), 'h:mm a')}
            </time>
          </div>
        )}

        {message.replyTo && !message.replyTo.isDeleted && (
          <div className="flex items-start gap-2 mb-2 max-w-lg">
            <div className="w-0.5 self-stretch rounded-full bg-zinc-600/60 shrink-0" />
            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
              <span className="font-semibold text-zinc-400 mr-1">{message.replyTo.sender.name}</span>
              {message.replyTo.content}
            </p>
          </div>
        )}

        <p className="text-[15px] text-zinc-100 leading-relaxed break-words whitespace-pre-wrap">
          {message.content}
        </p>
      </div>

      {/* Hover actions */}
      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 self-start pt-0.5">
        <button
          onClick={() => onReply(message)}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
          title="Reply"
        >
          <Reply size={13} />
        </button>
        {isMine && (
          <button
            onClick={() => onDelete(message._id)}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-all"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
