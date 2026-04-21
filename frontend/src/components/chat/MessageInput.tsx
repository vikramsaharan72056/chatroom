import React, { useState, useRef, useCallback } from 'react';
import { SendHorizonal, X, CornerDownLeft } from 'lucide-react';
import type { Message } from '../../types';

interface Props {
  onSend: (content: string, replyToId?: string) => void;
  onTyping: (isTyping: boolean) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export const MessageInput: React.FC<Props> = ({ onSend, onTyping, replyTo, onCancelReply }) => {
  const [content, setContent] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    if (!isTyping.current) {
      isTyping.current = true;
      onTyping(true);
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      onTyping(false);
    }, 1500);
  };

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed, replyTo?._id);
    setContent('');
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      onTyping(false);
    }
  }, [content, replyTo, onSend, onTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = content.trim().length > 0;

  return (
    <div className="px-4 pb-4 pt-2 shrink-0 border-t border-zinc-800/60">
      {replyTo && (
        <div className="mb-2.5 flex items-start gap-2.5 px-3 py-2.5 bg-zinc-900 rounded-xl border border-zinc-800 border-l-2 border-l-indigo-500/60">
          <CornerDownLeft size={12} className="text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-indigo-400 block mb-0.5">
              Replying to {replyTo.sender.name}
            </span>
            <span className="text-xs text-zinc-500 truncate block">{replyTo.content}</span>
          </div>
          <button
            onClick={onCancelReply}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5 rounded shrink-0 mt-0.5"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-700 transition-colors">
        <textarea
          value={content}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…"
          rows={1}
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none max-h-36 overflow-auto py-0.5 leading-relaxed"
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = `${t.scrollHeight}px`;
          }}
        />
        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          <span className="text-[10px] text-zinc-700 hidden sm:block select-none">⏎ send</span>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              canSend
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <SendHorizonal size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
