import {
  createDateNight,
  getDateNight,
  getDateNightsByCouple,
  updateDateNight,
  deleteDateNight,
} from '../firebase/firestore';
import { DateNight } from '../../types/dateNight';
import { sendEmail } from '../notifications/email';
import { sendSMS } from '../notifications/sms';
import { getVolunteersByDateNight } from '../firebase/firestore';
import { getCouple } from '../firebase/firestore';

export const createDateNightService = async (dateNight: Omit<DateNight, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return await createDateNight(dateNight);
};

export const getDateNightService = async (id: string): Promise<DateNight | null> => {
  return await getDateNight(id);
};

export const getDateNightsByCoupleService = async (coupleId: string): Promise<DateNight[]> => {
  return await getDateNightsByCouple(coupleId);
};

export const updateDateNightService = async (id: string, updates: Partial<DateNight>): Promise<void> => {
  await updateDateNight(id, updates);
  
  // Notify volunteers if cancelled
  if (updates.status === 'cancelled') {
    const dateNight = await getDateNight(id);
    if (dateNight) {
      const volunteers = await getVolunteersByDateNight(id);
      const couple = await getCouple(dateNight.coupleId);
      
      for (const volunteer of volunteers) {
        // Send email
        await sendEmail({
          to: volunteer.email,
          subject: 'Date Night Cancelled',
          body: `The date night on ${dateNight.date.toLocaleDateString()} has been cancelled.`,
          notificationType: 'cancellation',
        });
        
        // Send SMS if phone available
        if (volunteer.phone) {
          try {
            await sendSMS({
              to: volunteer.phone,
              message: `Date night on ${dateNight.date.toLocaleDateString()} has been cancelled.`,
              notificationType: 'cancellation',
            });
          } catch (smsError) {
            console.warn('⚠️ Failed to send SMS notification (non-critical):', smsError);
            // Don't throw - SMS failure shouldn't block cancellation notification
          }
        }
      }
    }
  }
};

export const cancelDateNightService = async (id: string, minNoticeHours: number): Promise<void> => {
  const dateNight = await getDateNight(id);
  if (!dateNight) {
    throw new Error('Date night not found');
  }
  
  // No minimum notice restriction - allow cancellation at any time
  await updateDateNightService(id, { status: 'cancelled' });
};

export const deleteDateNightService = async (id: string): Promise<void> => {
  await deleteDateNight(id);
};

