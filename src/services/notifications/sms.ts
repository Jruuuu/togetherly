import { sendNotification } from '../firebase/functions';

export interface SMSNotification {
  to: string;
  message: string;
  notificationType: 'signup' | 'approval' | 'rejection' | 'cancellation' | 'reminder';
}

export const sendSMS = async (notification: SMSNotification): Promise<void> => {
  try {
    await sendNotification({
      type: 'sms',
      to: notification.to,
      message: notification.message,
      notificationType: notification.notificationType,
    });
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw error;
  }
};

