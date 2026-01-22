import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z.string().regex(
  /^\+?[\d\s\-()]+$/,
  'Invalid phone number format'
);

export const dateNightSchema = z.object({
  date: z.date({ required_error: 'Date is required' }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  numberOfChildren: z.number().min(1, 'At least one child is required'),
  ages: z.array(z.number().min(0).max(18)).min(1, 'At least one age is required'),
  location: z.string().min(1, 'Location is required'),
  notes: z.string().optional(),
  schedule: z.string().optional(),
  minNoticeHours: z.number().min(1).default(24),
});

const reminderSchema = z.object({
  value: z.number().min(1, 'Value must be at least 1'),
  unit: z.enum(['weeks', 'days', 'hours'], {
    required_error: 'Unit is required',
  }),
});

export const volunteerSignupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: emailSchema,
  phone: phoneSchema,
  reminders: z.array(reminderSchema).max(3, 'Maximum 3 reminders allowed').optional(),
});

