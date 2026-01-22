export interface Couple {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: Date;
  isVolunteer?: boolean;
}

export interface UserRole {
  isCouple: boolean;
  isVolunteer: boolean;
}

