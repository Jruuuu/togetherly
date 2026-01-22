export interface ChildAge {
  value: number;
  unit: 'months' | 'years';
}

export interface DateNight {
  id: string;
  coupleId: string;
  date: Date;
  startTime: string;
  endTime: string;
  numberOfChildren: number;
  ages: ChildAge[]; // Always use {value, unit} format
  location: string;
  notes?: string;
  schedule?: string;
  volunteers: VolunteerSignup[];
  status: 'open' | 'filled' | 'cancelled';
  minNoticeHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  value: number;
  unit: 'weeks' | 'days' | 'hours';
}

export interface VolunteerSignup {
  volunteerId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  signedUpAt: Date;
  approvedAt?: Date;
  isBackup: boolean;
  reminders?: Reminder[]; // Up to 3 reminders
}

