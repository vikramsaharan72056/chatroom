import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Hash, Lock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { createRoom } from '../../features/room/roomSlice';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  type: z.enum(['public', 'private']),
  password: z.string().min(4).max(32).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}

export const CreateRoomModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((s) => s.room.loading);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'public' },
  });

  const isPrivate = watch('type') === 'private';

  const onSubmit = async (data: FormData) => {
    const result = await dispatch(createRoom(data));
    if (createRoom.fulfilled.match(result)) {
      toast.success(`"${data.name}" created!`);
      reset();
      onClose();
      onCreated(result.payload._id);
    } else {
      toast.error(result.payload as string);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a room">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Room name"
          placeholder="e.g. design-review"
          {...register('name')}
          error={errors.name?.message}
        />
        <Input
          label="Description (optional)"
          placeholder="What's this room about?"
          {...register('description')}
          error={errors.description?.message}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 tracking-wide">Room visibility</label>
          <div className="grid grid-cols-2 gap-2">
            {(['public', 'private'] as const).map((t) => {
              const isSelected = watch('type') === t;
              return (
                <label
                  key={t}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500/50 bg-indigo-500/10 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <input type="radio" value={t} {...register('type')} className="sr-only" />
                  {t === 'public' ? (
                    <Hash size={14} className={isSelected ? 'text-indigo-400' : 'text-zinc-600'} />
                  ) : (
                    <Lock size={14} className={isSelected ? 'text-indigo-400' : 'text-zinc-600'} />
                  )}
                  <span className="text-sm font-medium capitalize">{t}</span>
                </label>
              );
            })}
          </div>
        </div>

        {isPrivate && (
          <Input
            label="Password (optional)"
            type="password"
            placeholder="Leave blank for invite-link only"
            {...register('password')}
            error={errors.password?.message}
          />
        )}

        <div className="flex gap-2.5 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            Create room
          </Button>
        </div>
      </form>
    </Modal>
  );
};
