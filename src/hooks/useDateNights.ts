import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDateNightsByCoupleService,
  createDateNightService,
  updateDateNightService,
  cancelDateNightService,
  deleteDateNightService,
  getDateNightService,
} from '../services/api/dateNights';
import { DateNight } from '../types/dateNight';

export const useDateNights = (coupleId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: dateNights, isLoading, error, refetch } = useQuery({
    queryKey: ['dateNights', coupleId],
    queryFn: () => getDateNightsByCoupleService(coupleId!),
    enabled: !!coupleId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const createMutation = useMutation({
    mutationFn: (dateNight: Omit<DateNight, 'id' | 'createdAt' | 'updatedAt'>) =>
      createDateNightService(dateNight),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateNights', coupleId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DateNight> }) =>
      updateDateNightService(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateNights', coupleId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, minNoticeHours }: { id: string; minNoticeHours: number }) =>
      cancelDateNightService(id, minNoticeHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateNights', coupleId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDateNightService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateNights', coupleId] });
    },
  });

  return {
    dateNights: dateNights || [],
    isLoading,
    error,
    createDateNight: createMutation.mutate,
    updateDateNight: updateMutation.mutate,
    cancelDateNight: cancelMutation.mutate,
    deleteDateNight: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useDateNight = (id: string | undefined) => {
  const { data: dateNight, isLoading, error } = useQuery({
    queryKey: ['dateNight', id],
    queryFn: () => getDateNightService(id!),
    enabled: !!id,
  });

  return { dateNight, isLoading, error };
};

