import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { joinRoom } from '../../features/room/roomSlice';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

const schema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  password: z.string().optional(),
  inviteToken: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onJoined: (roomId: string) => void;
  prefillToken?: string;
  prefillRoomId?: string;
}

export const JoinRoomModal: React.FC<Props> = ({
  open,
  onClose,
  onJoined,
  prefillToken,
  prefillRoomId,
}) => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((s) => s.room.loading);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roomId: prefillRoomId ?? '', inviteToken: prefillToken ?? '' },
  });

  const onSubmit = async (data: FormData) => {
    const result = await dispatch(joinRoom(data));
    if (joinRoom.fulfilled.match(result)) {
      toast.success(`Joined "${result.payload.name}"!`);
      onClose();
      onJoined(result.payload._id);
    } else {
      toast.error(result.payload as string);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Join a room">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Room ID"
          placeholder="Paste the room ID here"
          {...register('roomId')}
          error={errors.roomId?.message}
        />
        <Input
          label="Password (if private)"
          type="password"
          placeholder="Optional"
          {...register('password')}
        />
        <Input
          label="Invite token (if private)"
          placeholder="Paste your invite token"
          {...register('inviteToken')}
        />

        <div className="flex gap-2.5 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            Join room
          </Button>
        </div>
      </form>
    </Modal>
  );
};
