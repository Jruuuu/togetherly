import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { View } from 'react-big-calendar';
import { useAuth } from '../../hooks/useAuth';
import { useDateNights } from '../../hooks/useDateNights';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../../components/shared/Button';
import { CalendarView } from '../../components/calendar/CalendarView';
import { DateNight } from '../../types/dateNight';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Modal } from '../../components/shared/Modal';
import { ApprovalQueue } from '../../components/volunteers/ApprovalQueue';
import { DateNightForm } from '../../components/forms/DateNightForm';

const CalendarPage: React.FC = () => {
  const { couple } = useAuth();
  const { dateNights, isLoading, updateDateNight, cancelDateNight, isUpdating, isCancelling } = useDateNights(couple?.id);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<View>('month');
  const [selectedDateNight, setSelectedDateNight] = useState<DateNight | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Sync selectedDateNight with updated dateNights when query refetches
  React.useEffect(() => {
    if (selectedDateNight && dateNights.length > 0) {
      const updated = dateNights.find(dn => dn.id === selectedDateNight.id);
      if (updated) {
        console.log('🔄 Syncing selectedDateNight with refetched data:', updated);
        console.log('📋 Ages in refetched data:', updated.ages);
        setSelectedDateNight(updated);
      }
    }
  }, [dateNights, selectedDateNight?.id]);

  const handleUpdateDateNight = async (data: Omit<DateNight, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedDateNight || !couple) return;
    
    console.log('🔄 Updating date night - Form Data:', { 
      id: selectedDateNight.id, 
      ages: data.ages,
      numberOfChildren: data.numberOfChildren,
      date: data.date,
      location: data.location,
      fullData: data 
    });
    
    updateDateNight(
      {
        id: selectedDateNight.id,
        updates: {
          ...data,
          coupleId: couple.id,
        },
      },
      {
        onSuccess: () => {
          console.log('✅ Date night updated successfully in Firestore');
          console.log('📋 Updated ages:', data.ages);
          
          // Update the selectedDateNight state with the new data immediately
          const updatedDateNight: DateNight = {
            ...selectedDateNight,
            ...data,
            coupleId: couple.id,
            updatedAt: new Date(),
          };
          setSelectedDateNight(updatedDateNight);
          console.log('🔄 Updated selectedDateNight state:', updatedDateNight);
          console.log('📋 Updated ages in state:', updatedDateNight.ages);
          
          addNotification('Date night updated successfully!', 'success');
          setShowEditModal(false);
        },
        onError: (error: any) => {
          console.error('❌ Error updating date night:', error);
          addNotification(error?.message || 'Failed to update date night', 'error');
        },
      }
    );
  };

  const handleCancelConfirm = async () => {
    if (!selectedDateNight) return;
    
    try {
      const minNoticeHours = selectedDateNight.minNoticeHours || 24;
      cancelDateNight({
        id: selectedDateNight.id,
        minNoticeHours,
      });
      addNotification('Date night cancelled successfully!', 'success');
      setShowCancelConfirm(false);
      setSelectedDateNight(null);
    } catch (error: any) {
      addNotification(error.message || 'Failed to cancel date night', 'error');
      setShowCancelConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={currentView === 'month' ? 'primary' : 'secondary'}
              onClick={() => setCurrentView('month')}
            >
              Month
            </Button>
            <Button
              variant={currentView === 'week' ? 'primary' : 'secondary'}
              onClick={() => setCurrentView('week')}
            >
              Week
            </Button>
          </div>
          <div className="flex gap-4 flex-wrap items-center">
            <span className="text-sm font-medium text-gray-700">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <span className="text-sm text-gray-600">Open</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Filled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Cancelled</span>
            </div>
          </div>
        </div>

        <div className="card">
          <CalendarView
            dateNights={dateNights}
            onSelectDateNight={setSelectedDateNight}
            view={currentView}
            onViewChange={setCurrentView}
          />
        </div>

        {/* ============================================
            MODAL: Date Night Detail View (Calendar)
            Triggered by: Clicking on a date night event in the calendar
            ============================================ */}
        {selectedDateNight && !showEditModal && (
          <Modal
            isOpen={!!selectedDateNight && !showEditModal}
            onClose={() => setSelectedDateNight(null)}
            title={`Date Night - ${new Date(selectedDateNight.date).toLocaleDateString()}`}
            size="xl"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Details</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Time:</strong> {selectedDateNight.startTime} -{' '}
                    {selectedDateNight.endTime}
                  </p>
                  <div>
                    <strong>Children:</strong> {selectedDateNight.numberOfChildren}
                    {selectedDateNight.ages ? (
                      <ul className="mt-1 ml-4 list-disc">
                        {selectedDateNight.ages.map((age, index) => (
                          <li key={index}>
                            Child {index + 1}: {age.value} {age.unit}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="ml-2 text-gray-500">(Ages not specified)</span>
                    )}
                  </div>
                  <p>
                    <strong>Location:</strong> {selectedDateNight.location}
                  </p>
                  <p>
                    <strong>Status:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedDateNight.status === 'filled'
                        ? 'bg-green-100 text-green-800'
                        : selectedDateNight.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>{selectedDateNight.status}</span>
                  </p>
                  {selectedDateNight.notes && (
                    <p>
                      <strong>Notes:</strong> {selectedDateNight.notes}
                    </p>
                  )}
                </div>
              </div>
              
              {selectedDateNight.status !== 'cancelled' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => setShowEditModal(true)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setShowCancelConfirm(true)}
                    variant="danger"
                    disabled={isCancelling}
                    className="flex-1"
                  >
                    Cancel Date Night
                  </Button>
                </div>
              )}

              <ApprovalQueue dateNight={selectedDateNight} />
            </div>
          </Modal>
        )}

        {/* ============================================
            MODAL: Edit Date Night (Calendar)
            Triggered by: "Edit" button in Date Night Detail modal
            ============================================ */}
        {showEditModal && selectedDateNight && (
          <Modal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
            }}
            title="Edit Date Night"
            size="lg"
          >
            <DateNightForm
              onSubmit={handleUpdateDateNight}
              onCancel={() => {
                setShowEditModal(false);
              }}
              initialData={selectedDateNight}
              isLoading={isUpdating}
            />
          </Modal>
        )}

        {/* ============================================
            MODAL: Cancel Date Night Confirmation (Calendar)
            Triggered by: "Cancel Date Night" button in Date Night Detail modal
            ============================================ */}
        <Modal
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          title="Cancel Date Night"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to cancel this date night? This action cannot be undone and all volunteers will be notified.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
              >
                No, Keep It
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelConfirm}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel It'}
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
};

export default CalendarPage;

