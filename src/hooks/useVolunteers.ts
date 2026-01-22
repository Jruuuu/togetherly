import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  signUpVolunteer,
  approveVolunteer,
  rejectVolunteer,
  getVolunteersByDateNightService,
} from '../services/api/volunteers';
import { Volunteer } from '../types/volunteer';
import { Reminder } from '../types/dateNight';
import { useQuery } from '@tanstack/react-query';

export const useVolunteerSignup = () => {
  const queryClient = useQueryClient();

  const signupMutation = useMutation({
    mutationFn: ({
      volunteerData,
      dateNightId,
      invitationLinkId,
      reminders,
    }: {
      volunteerData: Omit<Volunteer, 'id' | 'createdAt' | 'signups'>;
      dateNightId: string;
      invitationLinkId: string;
      reminders?: Reminder[];
    }) => signUpVolunteer(volunteerData, dateNightId, invitationLinkId, reminders),
    onSuccess: async (_, variables) => {
      // Invalidate the specific date night query
      queryClient.invalidateQueries({ queryKey: ['dateNight', variables.dateNightId] });
      
      // Get the date night to find the coupleId, then invalidate and refetch the couple's dateNights query
      const { getDateNight } = await import('../services/firebase/firestore');
      const dateNight = await getDateNight(variables.dateNightId);
      if (dateNight?.coupleId) {
        // Invalidate and immediately refetch
        await queryClient.invalidateQueries({ queryKey: ['dateNights', dateNight.coupleId], refetchType: 'active' });
      }
      
      // Also invalidate all dateNights queries as a fallback (prefix match)
      await queryClient.invalidateQueries({ queryKey: ['dateNights'], refetchType: 'active' });
    },
  });

  return {
    signUp: signupMutation.mutate,
    isSigningUp: signupMutation.isPending,
    error: signupMutation.error,
  };
};

export const useVolunteerApproval = () => {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: ({
      dateNightId,
      volunteerId,
      isBackup,
    }: {
      dateNightId: string;
      volunteerId: string;
      isBackup?: boolean;
    }) => approveVolunteer(dateNightId, volunteerId, isBackup),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dateNight', variables.dateNightId] });
      
      // Get the date night to find the coupleId, then invalidate and refetch the couple's dateNights query
      const { getDateNight } = await import('../services/firebase/firestore');
      const dateNight = await getDateNight(variables.dateNightId);
      if (dateNight?.coupleId) {
        await queryClient.invalidateQueries({ queryKey: ['dateNights', dateNight.coupleId], refetchType: 'active' });
      }
      
      // Also invalidate all dateNights queries as a fallback
      await queryClient.invalidateQueries({ queryKey: ['dateNights'], refetchType: 'active' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      dateNightId,
      volunteerId,
      reason,
    }: {
      dateNightId: string;
      volunteerId: string;
      reason?: string;
    }) => rejectVolunteer(dateNightId, volunteerId, reason),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dateNight', variables.dateNightId] });
      
      // Get the date night to find the coupleId, then invalidate and refetch the couple's dateNights query
      const { getDateNight } = await import('../services/firebase/firestore');
      const dateNight = await getDateNight(variables.dateNightId);
      if (dateNight?.coupleId) {
        await queryClient.invalidateQueries({ queryKey: ['dateNights', dateNight.coupleId], refetchType: 'active' });
      }
      
      // Also invalidate all dateNights queries as a fallback
      await queryClient.invalidateQueries({ queryKey: ['dateNights'], refetchType: 'active' });
    },
  });

  return {
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
};

export const useVolunteersByDateNight = (dateNightId: string | undefined) => {
  const { data: volunteers, isLoading, error } = useQuery({
    queryKey: ['volunteers', dateNightId],
    queryFn: () => getVolunteersByDateNightService(dateNightId!),
    enabled: !!dateNightId,
  });

  return { volunteers: volunteers || [], isLoading, error };
};

