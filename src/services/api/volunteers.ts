import {
  createVolunteer,
  getVolunteer,
  getVolunteersByDateNight,
} from '../firebase/firestore';
import { updateDateNight } from '../firebase/firestore';
import { Volunteer } from '../../types/volunteer';
import { Reminder } from '../../types/dateNight';
import { sendEmail } from '../notifications/email';
import { sendSMS } from '../notifications/sms';
import { getDateNight } from '../firebase/firestore';
import { getCouple } from '../firebase/firestore';

export const signUpVolunteer = async (
  volunteerData: Omit<Volunteer, 'id' | 'createdAt' | 'signups'>,
  dateNightId: string,
  invitationLinkId: string,
  reminders?: Reminder[]
): Promise<string> => {
  console.log('🚀 ========== START signUpVolunteer ==========');
  console.log('📥 Input parameters:', {
    volunteerData,
    dateNightId,
    invitationLinkId,
  });
  
  // Check if volunteer already exists with this email
  // For MVP, we'll create a new volunteer entry each time
  // In production, you might want to check for existing volunteers
  
  console.log('📝 Step 1: Creating volunteer document...');
  const volunteerId = await createVolunteer({
    ...volunteerData,
    signups: [dateNightId],
    invitationLinkId,
  });
  console.log('✅ Step 1: Volunteer created with ID:', volunteerId);
  
  // Add volunteer signup to date night
  console.log('📝 Step 2: Fetching date night with ID:', dateNightId);
  const dateNight = await getDateNight(dateNightId);
  console.log('📋 Step 2: Date night fetched:', {
    id: dateNight?.id,
    hasDateNight: !!dateNight,
    currentVolunteers: dateNight?.volunteers,
    volunteersType: typeof dateNight?.volunteers,
    volunteersIsArray: Array.isArray(dateNight?.volunteers),
    volunteersCount: Array.isArray(dateNight?.volunteers) ? dateNight?.volunteers.length : 'N/A',
    volunteersStringified: JSON.stringify(dateNight?.volunteers),
  });
  
  if (dateNight) {
    const newSignup = {
      volunteerId,
      status: 'pending' as const,
      signedUpAt: new Date(),
      isBackup: false,
      ...(reminders && reminders.length > 0 && { reminders }),
    };
    
    console.log('📝 Step 3: Created new signup object:', {
      newSignup,
      signedUpAtType: typeof newSignup.signedUpAt,
      signedUpAtIsDate: newSignup.signedUpAt instanceof Date,
    });
    
    // Ensure volunteers is an array
    const currentVolunteers = Array.isArray(dateNight.volunteers) ? dateNight.volunteers : [];
    console.log('📋 Step 3: Current volunteers array:', {
      isArray: Array.isArray(dateNight.volunteers),
      currentVolunteers,
      currentCount: currentVolunteers.length,
      currentVolunteersStringified: JSON.stringify(currentVolunteers),
    });
    
    const updatedVolunteers = [...currentVolunteers, newSignup];
    
    console.log('📝 Step 4: Updated volunteers array:', {
      dateNightId,
      volunteerId,
      currentVolunteersCount: currentVolunteers.length,
      newSignup,
      updatedVolunteersCount: updatedVolunteers.length,
      updatedVolunteers,
      updatedVolunteersStringified: JSON.stringify(updatedVolunteers),
    });
    
    console.log('📝 Step 5: Calling updateDateNight with:', {
      dateNightId,
      volunteers: updatedVolunteers,
      volunteersStringified: JSON.stringify(updatedVolunteers),
    });
    
    await updateDateNight(dateNightId, {
      volunteers: updatedVolunteers,
    });
    
    console.log('✅ Step 5: updateDateNight call completed');
    
    // Verify by reading back immediately
    console.log('📝 Step 6: Verifying by reading date night back...');
    const verifyDateNight = await getDateNight(dateNightId);
    if (verifyDateNight) {
      console.log('✅ Step 6: Verification - Date night after update:', {
        id: verifyDateNight.id,
        volunteersCount: Array.isArray(verifyDateNight.volunteers) ? verifyDateNight.volunteers.length : 0,
        volunteers: verifyDateNight.volunteers,
        volunteersStringified: JSON.stringify(verifyDateNight.volunteers),
      });
    } else {
      console.error('❌ Step 6: Failed to read date night back after update!');
    }
    
    // Notify couple
    console.log('📝 Step 7: Sending notifications...');
    const couple = await getCouple(dateNight.coupleId);
    if (couple) {
      await sendEmail({
        to: couple.email,
        subject: 'New Volunteer Sign-up',
        body: `${volunteerData.name} has signed up for your date night on ${dateNight.date.toLocaleDateString()}.`,
        notificationType: 'signup',
      });
      
      if (couple.phone) {
        try {
          await sendSMS({
            to: couple.phone,
            message: `New volunteer sign-up: ${volunteerData.name} for ${dateNight.date.toLocaleDateString()}.`,
            notificationType: 'signup',
          });
        } catch (smsError) {
          console.warn('⚠️ Failed to send SMS notification (non-critical):', smsError);
          // Don't throw - SMS failure shouldn't block signup
        }
      }
      console.log('✅ Step 7: Notifications sent');
    }
  } else {
    console.error('❌ Date night not found!', dateNightId);
  }
  
  console.log('🏁 ========== END signUpVolunteer ==========');
  return volunteerId;
};

export const approveVolunteer = async (
  dateNightId: string,
  volunteerId: string,
  isBackup: boolean = false
): Promise<void> => {
  const dateNight = await getDateNight(dateNightId);
  if (!dateNight) {
    throw new Error('Date night not found');
  }
  
  const volunteer = await getVolunteer(volunteerId);
  if (!volunteer) {
    throw new Error('Volunteer not found');
  }
  
  // Update volunteer status
  const updatedVolunteers = dateNight.volunteers.map((v) =>
    v.volunteerId === volunteerId
      ? { ...v, status: 'approved' as const, approvedAt: new Date(), isBackup }
      : v
  );
  
  // Update date night status if primary volunteer approved
  const status = !isBackup && updatedVolunteers.some(v => v.status === 'approved' && !v.isBackup)
    ? 'filled'
    : dateNight.status;
  
  await updateDateNight(dateNightId, {
    volunteers: updatedVolunteers,
    status,
  });
  
  // Notify volunteer
  await sendEmail({
    to: volunteer.email,
    subject: 'Volunteer Request Approved',
    body: `Your volunteer request for ${dateNight.date.toLocaleDateString()} has been approved!`,
    notificationType: 'approval',
  });
  
  if (volunteer.phone) {
    try {
      await sendSMS({
        to: volunteer.phone,
        message: `Your volunteer request for ${dateNight.date.toLocaleDateString()} has been approved!`,
        notificationType: 'approval',
      });
    } catch (smsError) {
      console.warn('⚠️ Failed to send SMS notification (non-critical):', smsError);
      // Don't throw - SMS failure shouldn't block approval
    }
  }
};

export const rejectVolunteer = async (
  dateNightId: string,
  volunteerId: string,
  reason?: string
): Promise<void> => {
  const dateNight = await getDateNight(dateNightId);
  if (!dateNight) {
    throw new Error('Date night not found');
  }
  
  const volunteer = await getVolunteer(volunteerId);
  if (!volunteer) {
    throw new Error('Volunteer not found');
  }
  
  // Update volunteer status
  const updatedVolunteers = dateNight.volunteers.map((v) =>
    v.volunteerId === volunteerId
      ? { ...v, status: 'rejected' as const, rejectionReason: reason }
      : v
  );
  
  await updateDateNight(dateNightId, {
    volunteers: updatedVolunteers,
  });
  
  // Notify volunteer
  await sendEmail({
    to: volunteer.email,
    subject: 'Volunteer Request Update',
    body: `Your volunteer request for ${dateNight.date.toLocaleDateString()} was not approved.${reason ? ` Reason: ${reason}` : ''}`,
    notificationType: 'rejection',
  });
  
  if (volunteer.phone) {
    try {
      await sendSMS({
        to: volunteer.phone,
        message: `Your volunteer request for ${dateNight.date.toLocaleDateString()} was not approved.${reason ? ` Reason: ${reason}` : ''}`,
        notificationType: 'rejection',
      });
    } catch (smsError) {
      console.warn('⚠️ Failed to send SMS notification (non-critical):', smsError);
      // Don't throw - SMS failure shouldn't block rejection
    }
  }
};

export const getVolunteersByDateNightService = async (dateNightId: string): Promise<Volunteer[]> => {
  return await getVolunteersByDateNight(dateNightId);
};

