import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import { DateNight } from '../../types/dateNight';
import { Couple } from '../../types/user';
import { Volunteer, InvitationLink } from '../../types/volunteer';

// Helper to convert Firestore timestamps
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// Couples
export const createCouple = async (couple: Omit<Couple, 'id' | 'createdAt'>, userId?: string): Promise<string> => {
  // If userId is provided, use it as the document ID
  // Otherwise, let Firestore generate one
  if (userId) {
    const docRef = doc(db, 'couples', userId);
    await setDoc(docRef, {
      ...couple,
      createdAt: serverTimestamp(),
    });
    return userId;
  } else {
    const docRef = await addDoc(collection(db, 'couples'), {
      ...couple,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
};

export const getCouple = async (id: string): Promise<Couple | null> => {
  const docRef = doc(db, 'couples', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
    } as Couple;
  }
  return null;
};

export const getCoupleByEmail = async (email: string): Promise<Couple | null> => {
  // Add null/undefined check
  if (!email) {
    console.warn('getCoupleByEmail: email is required');
    return null;
  }

  try {
    const q = query(collection(db, 'couples'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
      } as Couple;
    }
    return null;
  } catch (error: any) {
    console.error('Error in getCoupleByEmail:', error);
    // If collection doesn't exist yet, that's okay - return null
    // The "Null value error" from emulator usually means collection is empty/doesn't exist
    if (error.code === 'failed-precondition' || 
        error.code === 'not-found' || 
        error.message?.includes('Null value') ||
        error.message?.includes('list')) {
      console.log('Collection may not exist yet, returning null');
      return null;
    }
    // Re-throw other errors
    throw error;
  }
};

// Date Nights
// Helper function to remove undefined values from an object
const removeUndefined = (obj: any): any => {
  // Handle arrays - preserve them as-is, but clean nested objects within
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === 'object' && item !== null && !(item instanceof Date) && !(item instanceof Timestamp) && !Array.isArray(item)) {
        return removeUndefined(item);
      }
      return item;
    });
  }
  
  // Handle objects
  if (typeof obj === 'object' && obj !== null && !(obj instanceof Date) && !(obj instanceof Timestamp)) {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Date) && !(obj[key] instanceof Timestamp)) {
          // Recursively clean nested objects or arrays
          const cleanedNested = removeUndefined(obj[key]);
          if (Array.isArray(cleanedNested) || (typeof cleanedNested === 'object' && Object.keys(cleanedNested).length > 0)) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = obj[key];
        }
      }
    }
    return cleaned;
  }
  
  // Return primitives as-is
  return obj;
};

export const createDateNight = async (dateNight: Omit<DateNight, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  console.log('📅 Saving date night to Firebase:', {
    coupleId: dateNight.coupleId,
    date: dateNight.date,
    startTime: dateNight.startTime,
    endTime: dateNight.endTime,
    numberOfChildren: dateNight.numberOfChildren,
    ages: dateNight.ages,
    location: dateNight.location,
    status: dateNight.status,
    minNoticeHours: dateNight.minNoticeHours,
  });

  try {
    // Prepare the document data, converting date and removing undefined values
    const docData = removeUndefined({
      ...dateNight,
      date: Timestamp.fromDate(dateNight.date),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('📝 Prepared document data (undefined values removed):', docData);

    const docRef = await addDoc(collection(db, 'dateNights'), docData);

    console.log('✅ Date night saved successfully to Firebase with ID:', docRef.id);
    
    // Verify the document was saved by fetching it back
    try {
      const savedDoc = await getDoc(docRef);
      if (savedDoc.exists()) {
        console.log('✅ Verified: Date night document exists in Firestore:', {
          id: savedDoc.id,
          data: savedDoc.data(),
        });
      } else {
        console.warn('⚠️ Warning: Document ID was returned but document does not exist yet');
      }
    } catch (verifyError) {
      console.error('❌ Error verifying saved document:', verifyError);
    }
    
    return docRef.id;
  } catch (error: any) {
    console.error('❌ Error saving date night to Firebase:', {
      error,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    throw error;
  }
};

export const getDateNight = async (id: string): Promise<DateNight | null> => {
  const docRef = doc(db, 'dateNights', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    
    // Destructure ages and recurringPattern out to avoid spreading raw data
    const { ages: rawAges, date: rawDate, volunteers: rawVolunteers, createdAt: rawCreatedAt, updatedAt: rawUpdatedAt, recurringPattern: rawRecurringPattern, ...restOfData } = data;
    
    console.log('🔍 getDateNight - Raw ages from Firestore:', {
      id: docSnap.id,
      rawAges,
      isArray: Array.isArray(rawAges),
      type: typeof rawAges,
    });
    
    // If ages is already a valid array, use it directly (Firestore preserves arrays)
    // Only convert if it's in an unexpected format
    let convertedAges: Array<{ value: number; unit: 'months' | 'years' }> = [];
    
    if (Array.isArray(rawAges)) {
      // Check if it's already in the correct format
      const isValidFormat = rawAges.every((age: any) => 
        typeof age === 'object' && 
        age !== null && 
        'value' in age && 
        'unit' in age &&
        (age.unit === 'months' || age.unit === 'years')
      );
      
      if (isValidFormat) {
        // Already correct format - use it directly
        console.log('✅ Ages already in correct format, using directly');
        convertedAges = rawAges as Array<{ value: number; unit: 'months' | 'years' }>;
      } else {
        // Need to validate/convert each item
        console.log('⚠️ Ages array needs validation/conversion');
        convertedAges = rawAges.map((age: any, index: number) => {
          if (typeof age === 'object' && age !== null && 'value' in age && 'unit' in age) {
            return {
              value: typeof age.value === 'number' ? Math.max(1, age.value) : Math.max(1, Number(age.value) || 1),
              unit: (age.unit === 'months' || age.unit === 'years') ? age.unit : 'years',
            };
          }
          console.warn('⚠️ Invalid age format, defaulting to 1 year:', age);
          return { value: 1, unit: 'years' as const };
        });
      }
    } else if (typeof rawAges === 'object' && rawAges !== null) {
      // Fallback: handle object format (shouldn't happen if saved correctly)
      console.warn('⚠️ rawAges is an object, not an array. Converting:', rawAges);
      const ageEntries = Object.entries(rawAges);
      convertedAges = ageEntries.map(([key, age]: [string, any]) => {
        if (typeof age === 'object' && age !== null && 'value' in age && 'unit' in age) {
          return {
            value: typeof age.value === 'number' ? Math.max(1, age.value) : Math.max(1, Number(age.value) || 1),
            unit: (age.unit === 'months' || age.unit === 'years') ? age.unit : 'years',
          };
        }
        return { value: 1, unit: 'years' as const };
      });
    } else {
      console.warn('⚠️ rawAges is not an array or object:', rawAges);
      convertedAges = [];
    }
    
    console.log('✅ Final ages array:', convertedAges);
    
    return {
      id: docSnap.id,
      ...restOfData,
      date: convertTimestamp(rawDate),
      ages: convertedAges,
      volunteers: Array.isArray(rawVolunteers) 
        ? rawVolunteers.map((v: any) => ({
            ...v,
            signedUpAt: convertTimestamp(v.signedUpAt),
            approvedAt: v.approvedAt ? convertTimestamp(v.approvedAt) : undefined,
          }))
        : [],
      createdAt: convertTimestamp(rawCreatedAt),
      updatedAt: convertTimestamp(rawUpdatedAt),
    } as DateNight;
  }
  return null;
};

export const getDateNightsByCouple = async (coupleId: string): Promise<DateNight[]> => {
  console.log('🔍 Fetching date nights for coupleId:', coupleId);
  const q = query(
    collection(db, 'dateNights'),
    where('coupleId', '==', coupleId),
    orderBy('date', 'asc')
  );
  const querySnapshot = await getDocs(q);
  console.log('📋 Query returned', querySnapshot.docs.length, 'documents');
  
  const dateNights = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
    const data = doc.data();
    
    // Destructure ages and recurringPattern out to avoid spreading raw data
    const { ages: rawAges, date: rawDate, volunteers: rawVolunteers, createdAt: rawCreatedAt, updatedAt: rawUpdatedAt, recurringPattern: rawRecurringPattern, ...restOfData } = data;
    
    const convertedDate = convertTimestamp(rawDate);
    console.log('📅 Converting date night:', {
      id: doc.id,
      rawDate: rawDate,
      convertedDate: convertedDate,
      dateType: typeof convertedDate,
      isDate: convertedDate instanceof Date,
    });
    
    console.log('🔍 Converting ages in getDateNightsByCouple:', {
      id: doc.id,
      rawAges,
      isArray: Array.isArray(rawAges),
      type: typeof rawAges,
    });
    
    // If ages is already a valid array, use it directly (Firestore preserves arrays)
    // Only convert if it's in an unexpected format
    let convertedAges: Array<{ value: number; unit: 'months' | 'years' }> = [];
    
    if (Array.isArray(rawAges)) {
      // Check if it's already in the correct format
      const isValidFormat = rawAges.every((age: any) => 
        typeof age === 'object' && 
        age !== null && 
        'value' in age && 
        'unit' in age &&
        (age.unit === 'months' || age.unit === 'years')
      );
      
      if (isValidFormat) {
        // Already correct format - use it directly
        console.log('✅ Ages already in correct format, using directly');
        convertedAges = rawAges as Array<{ value: number; unit: 'months' | 'years' }>;
      } else {
        // Need to validate/convert each item
        console.log('⚠️ Ages array needs validation/conversion');
        convertedAges = rawAges.map((age: any, index: number) => {
          if (typeof age === 'object' && age !== null && 'value' in age && 'unit' in age) {
            return {
              value: typeof age.value === 'number' ? Math.max(1, age.value) : Math.max(1, Number(age.value) || 1),
              unit: (age.unit === 'months' || age.unit === 'years') ? age.unit : 'years',
            };
          }
          console.warn('⚠️ Invalid age format, defaulting to 1 year:', age);
          return { value: 1, unit: 'years' as const };
        });
      }
    } else if (typeof rawAges === 'object' && rawAges !== null) {
      // Fallback: handle object format (shouldn't happen if saved correctly)
      console.warn('⚠️ rawAges is an object, not an array. Converting:', rawAges);
      const ageEntries = Object.entries(rawAges);
      convertedAges = ageEntries.map(([key, age]: [string, any]) => {
        if (typeof age === 'object' && age !== null && 'value' in age && 'unit' in age) {
          return {
            value: typeof age.value === 'number' ? Math.max(1, age.value) : Math.max(1, Number(age.value) || 1),
            unit: (age.unit === 'months' || age.unit === 'years') ? age.unit : 'years',
          };
        }
        return { value: 1, unit: 'years' as const };
      });
    } else {
      console.warn('⚠️ rawAges is not an array or object:', rawAges);
      convertedAges = [];
    }
    
    console.log('✅ Final ages array:', convertedAges);
    
    const result = {
      id: doc.id,
      ...restOfData,
      date: convertedDate,
      ages: convertedAges,
      volunteers: Array.isArray(rawVolunteers) 
        ? rawVolunteers.map((v: any) => ({
            ...v,
            signedUpAt: convertTimestamp(v.signedUpAt),
            approvedAt: v.approvedAt ? convertTimestamp(v.approvedAt) : undefined,
          }))
        : [],
      createdAt: convertTimestamp(rawCreatedAt),
      updatedAt: convertTimestamp(rawUpdatedAt),
    } as DateNight;
    
    console.log('✅ Final date night object:', {
      id: result.id,
      numberOfChildren: result.numberOfChildren,
      ages: result.ages,
      agesLength: result.ages.length,
    });
    
    return result;
  });
  
  console.log('✅ Returning', dateNights.length, 'date nights:', dateNights);
  return dateNights;
};

export const updateDateNight = async (id: string, updates: Partial<DateNight>): Promise<void> => {
  console.log('🔄 updateDateNight START:', { id, updates });
  
  const docRef = doc(db, 'dateNights', id);
  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  if (updates.date) {
    updateData.date = Timestamp.fromDate(updates.date);
  }
  
  // Convert volunteers array dates to Timestamps if present
  if (updates.volunteers) {
    console.log('👥 Converting volunteers array dates to Timestamps:', {
      volunteersBefore: updates.volunteers,
      volunteersCount: Array.isArray(updates.volunteers) ? updates.volunteers.length : 'N/A',
    });
    
    updateData.volunteers = updates.volunteers.map((v: any) => {
      const converted = {
        ...v,
        signedUpAt: v.signedUpAt instanceof Date ? Timestamp.fromDate(v.signedUpAt) : v.signedUpAt,
        approvedAt: v.approvedAt instanceof Date ? Timestamp.fromDate(v.approvedAt) : v.approvedAt,
      };
      console.log('👤 Converted volunteer:', {
        original: v,
        converted,
      });
      return converted;
    });
    
    console.log('👥 Volunteers after conversion:', {
      volunteers: updateData.volunteers,
      count: updateData.volunteers.length,
    });
  }
  
  console.log('📝 Raw update data before cleaning:', { 
    id, 
    updateData,
    hasVolunteers: !!updateData.volunteers,
    volunteersType: typeof updateData.volunteers,
    volunteersIsArray: Array.isArray(updateData.volunteers),
    volunteersCount: Array.isArray(updateData.volunteers) ? updateData.volunteers.length : 'N/A',
  });
  
  // Remove undefined values before updating (Firestore doesn't allow undefined)
  console.log('🧹 Calling removeUndefined...');
  const cleanedUpdateData = removeUndefined(updateData);
  
  // CRITICAL FIX: removeUndefined doesn't handle arrays properly, so restore volunteers if lost
  if (updates.volunteers && !cleanedUpdateData.volunteers) {
    console.warn('⚠️ WARNING: Volunteers array was lost in removeUndefined! Restoring it...');
    cleanedUpdateData.volunteers = updateData.volunteers;
  }
  
  console.log('🧹 After removeUndefined:', {
    cleanedUpdateData,
    hasVolunteers: !!cleanedUpdateData.volunteers,
    volunteersType: typeof cleanedUpdateData.volunteers,
    volunteersIsArray: Array.isArray(cleanedUpdateData.volunteers),
    volunteersCount: Array.isArray(cleanedUpdateData.volunteers) ? cleanedUpdateData.volunteers.length : 'N/A',
    volunteersStringified: JSON.stringify(cleanedUpdateData.volunteers),
    allKeys: Object.keys(cleanedUpdateData),
  });
  console.log('👥 Volunteers being saved:', cleanedUpdateData.volunteers);
  
  console.log('🔄 Calling updateDoc with cleaned data...');
  await updateDoc(docRef, cleanedUpdateData);
  
  console.log('✅ updateDoc call completed');
  
  // Verify the update by reading the document back
  try {
    console.log('📖 Reading document back to verify...');
    const updatedDoc = await getDoc(docRef);
    if (updatedDoc.exists()) {
      const data = updatedDoc.data();
      console.log('✅ Verified: Updated document in Firestore:', {
        id: updatedDoc.id,
        volunteers: data.volunteers,
        volunteersType: typeof data.volunteers,
        volunteersIsArray: Array.isArray(data.volunteers),
        volunteersCount: Array.isArray(data.volunteers) ? data.volunteers.length : 'N/A',
        volunteersStringified: JSON.stringify(data.volunteers),
        allKeys: Object.keys(data),
        fullData: data,
      });
    } else {
      console.error('❌ Document does not exist after update!');
    }
  } catch (verifyError) {
    console.error('❌ Error verifying updated document:', verifyError);
  }
  
  console.log('🏁 updateDateNight END');
};

export const deleteDateNight = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'dateNights', id));
};

// Volunteers
export const createVolunteer = async (volunteer: Omit<Volunteer, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'volunteers'), {
    ...volunteer,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getVolunteer = async (id: string): Promise<Volunteer | null> => {
  const docRef = doc(db, 'volunteers', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
    } as Volunteer;
  }
  return null;
};

export const getVolunteersByDateNight = async (dateNightId: string): Promise<Volunteer[]> => {
  const q = query(collection(db, 'volunteers'), where('signups', 'array-contains', dateNightId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
    } as Volunteer;
  });
};

export const getVolunteerByEmail = async (email: string): Promise<Volunteer | null> => {
  if (!email) {
    return null;
  }
  
  try {
    const q = query(collection(db, 'volunteers'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
      } as Volunteer;
    }
    return null;
  } catch (error: any) {
    console.error('Error in getVolunteerByEmail:', error);
    return null;
  }
};

export const hasVolunteerSignedUpForDateNight = async (
  dateNightId: string,
  email: string,
  phone: string
): Promise<boolean> => {
  try {
    // Get the date night to check its volunteers array
    const dateNight = await getDateNight(dateNightId);
    if (!dateNight || !Array.isArray(dateNight.volunteers)) {
      return false;
    }

    // Get all volunteers for this date night
    const volunteers = await getVolunteersByDateNight(dateNightId);
    
    // Check if any volunteer has matching email or phone
    return volunteers.some(
      (volunteer) => volunteer.email.toLowerCase() === email.toLowerCase() || volunteer.phone === phone
    );
  } catch (error) {
    console.error('Error checking if volunteer signed up:', error);
    return false;
  }
};

// Invitation Links
export const createInvitationLink = async (link: Omit<InvitationLink, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'invitationLinks'), {
    ...link,
    expiresAt: Timestamp.fromDate(link.expiresAt),
    accessLog: Array.isArray(link.accessLog) 
      ? link.accessLog.map((access) => ({
          ...access,
          timestamp: Timestamp.fromDate(access.timestamp),
        }))
      : [],
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getInvitationLink = async (linkId: string): Promise<InvitationLink | null> => {
  const q = query(collection(db, 'invitationLinks'), where('linkId', '==', linkId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      expiresAt: convertTimestamp(data.expiresAt),
      accessLog: Array.isArray(data.accessLog) 
        ? data.accessLog.map((access: any) => ({
            ...access,
            timestamp: convertTimestamp(access.timestamp),
          }))
        : [],
      createdAt: convertTimestamp(data.createdAt),
    } as InvitationLink;
  }
  return null;
};

export const updateInvitationLink = async (id: string, updates: Partial<InvitationLink>): Promise<void> => {
  const docRef = doc(db, 'invitationLinks', id);
  const updateData: any = { ...updates };
  if (updates.expiresAt) {
    updateData.expiresAt = Timestamp.fromDate(updates.expiresAt);
  }
  if (updates.accessLog) {
    // Ensure accessLog is an array before mapping
    if (Array.isArray(updates.accessLog)) {
      // Clean each access log entry to remove undefined fields
      updateData.accessLog = updates.accessLog.map((access) => {
        const cleanedAccess = removeUndefined({
          ...access,
          timestamp: Timestamp.fromDate(access.timestamp),
        });
        return cleanedAccess;
      });
    } else {
      // If accessLog is not an array, set it to an empty array
      updateData.accessLog = [];
    }
  }
  // Remove undefined values before updating (Firestore doesn't allow undefined)
  const cleanedUpdateData = removeUndefined(updateData);
  await updateDoc(docRef, cleanedUpdateData);
};

