import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVolunteerSignup } from '../../hooks/useVolunteers';
import { useNotifications } from '../../contexts/NotificationContext';
import { VolunteerSignupForm } from '../../components/forms/VolunteerSignupForm';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Button } from '../../components/shared/Button';
import { getInvitationLinkService, isLinkValid, logLinkAccess } from '../../services/api/invitationLinks';
import { getDateNightsByCoupleService } from '../../services/api/dateNights';
import { DateNight, Reminder } from '../../types/dateNight';
import { Volunteer } from '../../types/volunteer';
import { hasVolunteerSignedUpForDateNight } from '../../services/firebase/firestore';

const VolunteerSignupPage: React.FC = () => {
  const { coupleId, linkId } = useParams<{ coupleId: string; linkId: string }>();
  const navigate = useNavigate();
  const { signUp, isSigningUp } = useVolunteerSignup();
  const { addNotification } = useNotifications();
  const [availableDates, setAvailableDates] = useState<DateNight[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidLink, setIsValidLink] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signedUpDateIds, setSignedUpDateIds] = useState<string[]>([]);
  const [showAlreadySignedUpModal, setShowAlreadySignedUpModal] = useState(false);
  const [conflictingDateNight, setConflictingDateNight] = useState<DateNight | null>(null);
  const [volunteerInfo, setVolunteerInfo] = useState<{ email: string; phone: string } | null>(null);

  useEffect(() => {
    // Load stored volunteer info from localStorage
    const storedInfo = localStorage.getItem('volunteerInfo');
    if (storedInfo) {
      try {
        const info = JSON.parse(storedInfo);
        setVolunteerInfo(info);
      } catch (e) {
        // Invalid stored data, ignore
      }
    }

    const loadData = async () => {
      if (!linkId || !coupleId) {
        addNotification('Invalid invitation link', 'error');
        navigate('/');
        return;
      }

      try {
        const link = await getInvitationLinkService(linkId);
        if (!link) {
          addNotification('Invitation link not found', 'error');
          navigate('/');
          return;
        }

        if (!isLinkValid(link)) {
          addNotification('This invitation link has expired', 'error');
          navigate('/');
          return;
        }

        if (link.coupleId !== coupleId) {
          addNotification('Invalid invitation link', 'error');
          navigate('/');
          return;
        }

        setIsValidLink(true);
        await logLinkAccess(linkId);

        const dates = await getDateNightsByCoupleService(coupleId);
        const openDates = dates.filter(
          (d) => d.status === 'open' && new Date(d.date) >= new Date()
        );
        setAvailableDates(openDates);
      } catch (error: any) {
        addNotification(error.message || 'Failed to load dates', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [linkId, coupleId, navigate, addNotification]);

  const handleFormSubmit = async (data: { 
    name: string; 
    email: string; 
    phone: string;
    reminders?: Reminder[];
  }) => {
    if (selectedDates.length === 0) {
      addNotification('Please select at least one date', 'error');
      return;
    }

    if (!linkId) return;

    try {
      // Extract reminders from form data
      const { reminders, ...volunteerInfo } = data;
      
      // Check if volunteer has already signed up for any of the selected dates
      const alreadySignedUpDates: string[] = [];
      for (const dateNightId of selectedDates) {
        const alreadySignedUp = await hasVolunteerSignedUpForDateNight(
          dateNightId,
          volunteerInfo.email,
          volunteerInfo.phone
        );
        if (alreadySignedUp) {
          alreadySignedUpDates.push(dateNightId);
        }
      }

      if (alreadySignedUpDates.length > 0) {
        const dateNight = availableDates.find(d => alreadySignedUpDates.includes(d.id));
        if (dateNight) {
          setConflictingDateNight(dateNight);
          setShowAlreadySignedUpModal(true);
          setShowForm(false);
        }
        return;
      }
      
      // Create volunteer data object with invitationLinkId
      const volunteerData: Omit<Volunteer, 'id' | 'createdAt' | 'signups'> = {
        ...volunteerInfo,
        invitationLinkId: linkId,
      };

      const signedUpIds: string[] = [];
      for (const dateNightId of selectedDates) {
        await signUp({
          volunteerData,
          dateNightId,
          invitationLinkId: linkId,
          reminders,
        });
        signedUpIds.push(dateNightId);
      }
      setSignedUpDateIds(signedUpIds);
      setSignupSuccess(true);
      setShowForm(false);
      
      // Store volunteer info in localStorage for future checks
      localStorage.setItem('volunteerInfo', JSON.stringify({ email: data.email, phone: data.phone }));
      setVolunteerInfo({ email: data.email, phone: data.phone });
      
      addNotification('Successfully signed up!', 'success');
    } catch (error: any) {
      addNotification(error.message || 'Failed to sign up', 'error');
    }
  };

  const handleBackToDates = async () => {
    // Remove signed up dates from selected dates
    setSelectedDates([]);
    setSignupSuccess(false);
    setSignedUpDateIds([]);
    
    // Reload available dates to refresh the list
    if (coupleId) {
      try {
        const dates = await getDateNightsByCoupleService(coupleId);
        const openDates = dates.filter(
          (d) => d.status === 'open' && new Date(d.date) >= new Date()
        );
        setAvailableDates(openDates);
      } catch (error: any) {
        addNotification(error.message || 'Failed to reload dates', 'error');
      }
    }
  };

  const handleCloseWindow = () => {
    // Try to close the window
    // window.close() works if:
    // 1. Window was opened by JavaScript (window.open())
    // 2. It's the only tab in some browsers
    // 3. User interaction is required (which we have from button click)
    try {
      window.close();
      
      // If window.close() doesn't work immediately, try after a short delay
      // Some browsers need a moment to process the close
      setTimeout(() => {
        if (!document.hidden) {
          // If still visible, try alternative methods
          // Redirect to blank page as fallback
          window.location.href = 'about:blank';
        }
      }, 100);
    } catch (error) {
      // If window.close() throws an error, try redirecting
      window.location.href = 'about:blank';
    }
  };

  const toggleDateSelection = async (dateNightId: string) => {
    // Check if they've already signed up for this date in the current session
    if (signedUpDateIds.includes(dateNightId)) {
      const dateNight = availableDates.find(d => d.id === dateNightId);
      if (dateNight) {
        setConflictingDateNight(dateNight);
        setShowAlreadySignedUpModal(true);
      }
      return;
    }

    // Check database if we have volunteer info stored
    if (volunteerInfo) {
      try {
        const alreadySignedUp = await hasVolunteerSignedUpForDateNight(
          dateNightId,
          volunteerInfo.email,
          volunteerInfo.phone
        );
        
        if (alreadySignedUp) {
          const dateNight = availableDates.find(d => d.id === dateNightId);
          if (dateNight) {
            setConflictingDateNight(dateNight);
            setShowAlreadySignedUpModal(true);
          }
          return;
        }
      } catch (error) {
        console.error('Error checking signup status:', error);
      }
    }
    
    setSelectedDates((prev) =>
      prev.includes(dateNightId)
        ? prev.filter((id) => id !== dateNightId)
        : [...prev, dateNightId]
    );
  };

  const handleAlreadySignedUpClose = () => {
    setShowAlreadySignedUpModal(false);
    setConflictingDateNight(null);
    handleCloseWindow();
  };

  const handleAlreadySignedUpBack = () => {
    setShowAlreadySignedUpModal(false);
    setConflictingDateNight(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isValidLink) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Already Signed Up Modal */}
        {showAlreadySignedUpModal && conflictingDateNight && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                Already Signed Up
              </h2>
              <p className="text-gray-600 mb-4 text-center">
                You have already signed up for this date night:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="font-semibold text-gray-900">
                  {new Date(conflictingDateNight.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {conflictingDateNight.startTime} - {conflictingDateNight.endTime}
                </p>
              </div>
              <p className="text-gray-600 mb-6 text-center">
                Would you like to close the window or go back to sign up for another date?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleAlreadySignedUpBack} variant="secondary" className="flex-1">
                  Go Back to Sign Up
                </Button>
                <Button onClick={handleAlreadySignedUpClose} className="flex-1">
                  Close Window
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="card mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Volunteer Sign-Up
          </h1>
          <p className="text-gray-600">
            Select the date nights you'd like to volunteer for, then provide your information.
          </p>
        </div>

        {signupSuccess ? (
          <div className="card">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Successfully Signed Up!
              </h2>
              <p className="text-gray-600 mb-6">
                You've successfully signed up for {signedUpDateIds.length} date night{signedUpDateIds.length > 1 ? 's' : ''}. 
                The couple will review your request and notify you once it's approved.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleBackToDates} variant="secondary">
                  View Other Available Date Nights
                </Button>
                <Button onClick={handleCloseWindow}>
                  Close Window
                </Button>
              </div>
            </div>
          </div>
        ) : !showForm ? (
          <>
            <div className="card mb-6">
              <h2 className="text-lg font-semibold mb-4">Available Date Nights</h2>
              {availableDates.length === 0 ? (
                <p className="text-gray-500">No available date nights at this time.</p>
              ) : (
                <div className="space-y-3">
                  {availableDates.map((dateNight) => (
                    <div
                      key={dateNight.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedDates.includes(dateNight.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                      onClick={() => toggleDateSelection(dateNight.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {new Date(dateNight.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {dateNight.startTime} - {dateNight.endTime}
                          </p>
                          <p className="text-sm text-gray-600">
                            {dateNight.numberOfChildren} child{dateNight.numberOfChildren > 1 ? 'ren' : ''} (Ages: {Array.isArray(dateNight.ages) 
                              ? dateNight.ages.map((age) => `${age.value} ${age.unit}`).join(', ')
                              : 'N/A'})
                          </p>
                          <p className="text-sm text-gray-600">{dateNight.location}</p>
                          {dateNight.notes && (
                            <p className="text-sm text-gray-500 mt-2">{dateNight.notes}</p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedDates.includes(dateNight.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleDateSelection(dateNight.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedDates.length > 0 && (
              <div className="card">
                <div className="flex justify-between items-center">
                  <p className="text-gray-700">
                    {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    Continue to Sign Up
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <div className="mb-4">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                ← Back to Dates
              </Button>
            </div>
            <h2 className="text-lg font-semibold mb-4">Your Information</h2>
            <VolunteerSignupForm
              onSubmit={handleFormSubmit}
              isLoading={isSigningUp}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerSignupPage;

