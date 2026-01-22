import { httpsCallable } from 'firebase/functions';
import { functions } from './config';

export const sendNotification = httpsCallable(functions, 'sendNotification');
export const sendReminder = httpsCallable(functions, 'sendReminder');
export const processRecurringDates = httpsCallable(functions, 'processRecurringDates');

// Expose to window for console testing in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).testFunctions = {
    sendNotification,
    sendReminder,
    processRecurringDates,
  };
  console.log('💡 Test functions available at window.testFunctions');
}

