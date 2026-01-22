import { format, addDays, addWeeks, addMonths, isBefore } from 'date-fns';

export const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const formatDateTime = (date: Date): string => {
  return format(date, 'yyyy-MM-dd HH:mm');
};

export const isWithinNoticePeriod = (date: Date, minNoticeHours: number): boolean => {
  const now = new Date();
  const noticeDeadline = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);
  return isBefore(date, noticeDeadline);
};

export const calculateNextRecurringDate = (
  baseDate: Date,
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: number
): Date => {
  switch (frequency) {
    case 'daily':
      return addDays(baseDate, interval);
    case 'weekly':
      return addWeeks(baseDate, interval);
    case 'monthly':
      return addMonths(baseDate, interval);
    default:
      return baseDate;
  }
};

