import {
  createInvitationLink,
  getInvitationLink,
  updateInvitationLink,
} from '../firebase/firestore';
import { InvitationLink, LinkAccess } from '../../types/volunteer';
import { DEFAULT_LINK_EXPIRATION_DAYS } from '../../utils/constants';
import { addDays } from 'date-fns';

export const generateLinkId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const createInvitationLinkService = async (
  coupleId: string,
  expirationDays: number = DEFAULT_LINK_EXPIRATION_DAYS
): Promise<{ linkId: string; fullUrl: string }> => {
  const linkId = generateLinkId();
  const expiresAt = addDays(new Date(), expirationDays);
  
  await createInvitationLink({
    coupleId,
    linkId,
    expiresAt,
    accessLog: [],
  });
  
  const fullUrl = `${window.location.origin}/invite/${coupleId}/${linkId}`;
  
  return { linkId, fullUrl };
};

export const getInvitationLinkService = async (linkId: string): Promise<InvitationLink | null> => {
  return await getInvitationLink(linkId);
};

export const logLinkAccess = async (
  linkId: string,
  volunteerId?: string
): Promise<void> => {
  const link = await getInvitationLink(linkId);
  if (!link) {
    throw new Error('Invitation link not found');
  }
  
  const newAccess: LinkAccess = {
    timestamp: new Date(),
    volunteerId,
  };
  
  // Ensure accessLog is an array before spreading
  const currentAccessLog = Array.isArray(link.accessLog) ? link.accessLog : [];
  
  await updateInvitationLink(link.id, {
    accessLog: [...currentAccessLog, newAccess],
  });
};

export const isLinkValid = (link: InvitationLink): boolean => {
  return new Date() < link.expiresAt;
};

