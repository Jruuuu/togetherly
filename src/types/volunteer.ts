export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  signups: string[]; // dateNightIds
  invitationLinkId: string;
  createdAt: Date;
}

export interface InvitationLink {
  id: string;
  coupleId: string;
  linkId: string; // unique identifier for the link
  expiresAt: Date;
  accessLog: LinkAccess[];
  createdAt: Date;
}

export interface LinkAccess {
  timestamp: Date;
  volunteerId?: string;
  ipAddress?: string;
}

