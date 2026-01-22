import { sendNotification } from '../firebase/functions';

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  notificationType: 'signup' | 'approval' | 'rejection' | 'cancellation' | 'reminder';
}

export const sendEmail = async (notification: EmailNotification): Promise<void> => {
  try {
    await sendNotification({
      type: 'email',
      to: notification.to,
      subject: notification.subject,
      body: notification.body,
      notificationType: notification.notificationType,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

