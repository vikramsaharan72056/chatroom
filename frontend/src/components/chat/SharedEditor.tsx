import { useEffect, useRef, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setEditorContent } from '../../features/editor/editorSlice';
import { emitEditorUpdate } from '../../services/socket';

interface Props {
  roomId: string;
}

export function SharedEditor({ roomId }: Props) {
  const dispatch = useAppDispatch();
  const content = useAppSelector((s) => s.editor.contentByRoom[roomId] ?? '');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep textarea in sync when remote updates arrive
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Only overwrite if the user is not actively focused (avoid cursor jump)
    if (document.activeElement !== el) {
      el.value = content;
    }
  }, [content]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      // Update local Redux state immediately for own cursor
      dispatch(setEditorContent({ roomId, content: value }));
      // Debounce the network emit — 300 ms avoids flooding the socket
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        emitEditorUpdate(roomId, value);
      }, 300);
    },
    [roomId, dispatch],
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60 shrink-0">
        <FileText size={13} className="text-indigo-400" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Shared Editor
        </span>
        <span className="ml-auto text-[10px] text-zinc-600">
          Changes sync live · last-write wins
        </span>
      </div>

      {/* Editor body */}
      <textarea
        ref={textareaRef}
        defaultValue={content}
        onChange={handleChange}
        placeholder="Start typing… all members in this room see changes in real time."
        spellCheck={false}
        className="flex-1 w-full bg-transparent resize-none px-5 py-4 text-sm text-zinc-200 placeholder-zinc-600 outline-none font-mono leading-relaxed"
      />
    </div>
  );
}
