import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDateNights } from '../../hooks/useDateNights';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../../components/shared/Button';
import { Modal } from '../../components/shared/Modal';
import { DateNightForm } from '../../components/forms/DateNightForm';
import { ApprovalQueue } from '../../components/volunteers/ApprovalQueue';
import { DateNight } from '../../types/dateNight';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { createInvitationLinkService } from '../../services/api/invitationLinks';

const CoupleDashboard: React.FC = () => {
  const { couple, logout } = useAuth();
  const { dateNights, isLoading, createDateNight, updateDateNight, cancelDateNight, isCreating, isUpdating, isCancelling } = useDateNights(couple?.id);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedDateNight, setSelectedDateNight] = useState<DateNight | null>(null);
  const [invitationLink, setInvitationLink] = useState<string>('');
  const [showLinkRequirementModal, setShowLinkRequirementModal] = useState(false);

  // Sync selectedDateNight with updated dateNights when query refetches
  React.useEffect(() => {
    if (selectedDateNight && dateNights.length > 0) {
      const updated = dateNights.find(dn => dn.id === selectedDateNight.id);
      console.log("THIS IS THE UPDATED DATE NIGHT OBJECT")
      console.log(updated)
      console.log("THIS IS THE SELECTED DATE NIGHT OBJECT")
      console.log(selectedDateNight)
      if (updated) {
        console.log('🔄 Syncing selectedDateNight with refetched data:', updated);
        console.log('📋 Ages in refetched data:', updated.ages);
        setSelectedDateNight(updated);
      }
    }
  }, [dateNights, selectedDateNight?.id]);

  // Debug: Log date nights and volunteers
  React.useEffect(() => {
    console.log('📊 Dashboard - All date nights:', dateNights);
    console.log('📊 Total date nights count:', dateNights.length);
    
    dateNights.forEach((dn) => {
      const volunteers = Array.isArray(dn.volunteers) ? dn.volunteers : [];
      const pendingVolunteers = volunteers.filter((v) => v.status === 'pending');
      if (volunteers.length > 0) {
        console.log('👥 Date night volunteers:', {
          id: dn.id,
          date: dn.date,
          totalVolunteers: volunteers.length,
          pendingCount: pendingVolunteers.length,
          volunteers: volunteers,
        });
      }
    });
  }, [dateNights]);

  const handleCreateDateNight = async (data: Omit<DateNight, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!couple) return;
    
    try {
      await createDateNight({
        ...data,
        coupleId: couple.id,
      });
      addNotification('Date night created successfully!', 'success');
      setShowCreateModal(false);
    } catch (error: any) {
      addNotification(error.message || 'Failed to create date night', 'error');
    }
  };

  // Check if there are any upcoming date nights or pending approvals
  const canGenerateLink = React.useMemo(() => {
    const now = new Date();
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const upcomingDateNights = dateNights.filter((dn) => {
      const dateNightDate = dn.date instanceof Date ? dn.date : new Date(dn.date);
      const dateOnly = new Date(dateNightDate.getFullYear(), dateNightDate.getMonth(), dateNightDate.getDate());
      return dateOnly >= nowDateOnly && dn.status !== 'cancelled';
    });
    
    const hasPendingApprovals = dateNights.some((dn) => {
      return dn.volunteers && dn.volunteers.some((v) => v.status === 'pending');
    });
    
    return upcomingDateNights.length > 0 || hasPendingApprovals;
  }, [dateNights]);

  const handleGenerateLink = async () => {
    if (!couple) return;
    
    if (!canGenerateLink) {
      setShowLinkRequirementModal(true);
      return;
    }
    
    try {
      const { fullUrl } = await createInvitationLinkService(couple.id);
      setInvitationLink(fullUrl);
      addNotification('Invitation link generated!', 'success');
    } catch (error: any) {
      addNotification(error.message || 'Failed to generate link', 'error');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationLink);
    addNotification('Link copied to clipboard!', 'success');
  };

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
          // Note: selectedDateNight will be synced by useEffect when dateNights refetches
          
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
    
    const minNoticeHours = selectedDateNight.minNoticeHours || 24;
    
    cancelDateNight(
      {
        id: selectedDateNight.id,
        minNoticeHours,
      },
      {
        onSuccess: () => {
          console.log('✅ Date night cancelled successfully');
          addNotification('Date night cancelled successfully!', 'success');
          setShowCancelConfirm(false);
          setSelectedDateNight(null);
        },
        onError: (error: any) => {
          console.error('❌ Error cancelling date night:', error);
          addNotification(error?.message || 'Failed to cancel date night', 'error');
          setShowCancelConfirm(false);
        },
      }
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Togetherly</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[120px] sm:max-w-none">
                {couple?.email}
              </span>
              <Button 
                variant="secondary" 
                onClick={handleLogout}
                className="text-xs sm:text-sm px-2 py-1 sm:px-4 sm:py-2"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handleGenerateLink}
              className={`text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2 w-full sm:w-auto rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                !canGenerateLink 
                  ? 'bg-blue-200 text-blue-700 cursor-pointer hover:bg-blue-300' 
                  : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
              }`}
            >
              <span className="hidden sm:inline">Generate Volunteer Invitation Link</span>
              <span className="sm:hidden">Generate Volunteer Link</span>
            </button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2 w-full sm:w-auto"
            >
              Create Date Night
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/calendar')}
              className="text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2 w-full sm:w-auto"
            >
              <span className="hidden sm:inline">View Calendar</span>
              <span className="sm:hidden">Calendar</span>
            </Button>
          </div>
        </div>

        {invitationLink && (
          <div className="mb-6 card">
            <h3 className="text-lg font-semibold mb-2">Invitation Link</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={invitationLink}
                readOnly
                className="input-field flex-1 text-sm"
              />
              <Button 
                onClick={handleCopyLink}
                className="text-sm px-3 py-1.5 sm:px-4 sm:py-2 w-full sm:w-auto"
              >
                Copy
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ============================================
              SECTION: Upcoming Date Nights
              Opens: Date Night Detail Modal
              ============================================ */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Upcoming Date Nights</h3>
            <div className="space-y-4">
              {dateNights.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming date nights</p>
              ) : (
                dateNights
                  .filter((dn) => {
                    const dateNightDate = dn.date instanceof Date ? dn.date : new Date(dn.date);
                    const now = new Date();
                    // Reset time to midnight for date-only comparison
                    const dateOnly = new Date(dateNightDate.getFullYear(), dateNightDate.getMonth(), dateNightDate.getDate());
                    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const isUpcoming = dateOnly >= nowDateOnly;
                    
                    // Exclude date nights with pending volunteers (they should be in Pending Approvals)
                    const volunteers = Array.isArray(dn.volunteers) ? dn.volunteers : [];
                    const hasPendingVolunteers = volunteers.some((v) => v.status === 'pending');
                    
                    // Debug log
                    if (hasPendingVolunteers) {
                      console.log('🔍 Date night with pending volunteers (should be in Pending Approvals):', {
                        id: dn.id,
                        date: dn.date,
                        volunteers: volunteers,
                        pendingCount: volunteers.filter((v) => v.status === 'pending').length,
                      });
                    }
                    
                    return isUpcoming && !hasPendingVolunteers && dn.status !== 'cancelled';
                  })
                  .slice(0, 5)
                  .map((dateNight) => (
                  <div
                    key={dateNight.id}
                    className="card cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedDateNight(dateNight)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">
                          {new Date(dateNight.date).toLocaleDateString()}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {dateNight.startTime} - {dateNight.endTime}
                        </p>
                        <p className="text-sm text-gray-600">{dateNight.location}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          dateNight.status === 'filled'
                            ? 'bg-green-100 text-green-800'
                            : dateNight.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {dateNight.status}
                      </span>
                    </div>
                  </div>
                  ))
              )}
            </div>
          </div>

          {/* ============================================
              SECTION: Pending Approvals
              Opens: Date Night Detail Modal (same as Upcoming)
              ============================================ */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Pending Approvals</h3>
            <div className="space-y-4">
              {(() => {
                const pendingDateNights = dateNights.filter((dn) => {
                  const volunteers = Array.isArray(dn.volunteers) ? dn.volunteers : [];
                  const hasPending = volunteers.some((v) => v.status === 'pending');
                  
                  // Debug log
                  if (hasPending) {
                    console.log('✅ Date night in Pending Approvals:', {
                      id: dn.id,
                      date: dn.date,
                      volunteers: volunteers,
                      pendingCount: volunteers.filter((v) => v.status === 'pending').length,
                    });
                  }
                  
                  return hasPending;
                });
                
                if (pendingDateNights.length === 0) {
                  return <p className="text-gray-500 text-sm">No pending approvals</p>;
                }
                
                return pendingDateNights.slice(0, 5).map((dateNight) => (
                  <div
                    key={dateNight.id}
                    className="card cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedDateNight(dateNight)}
                  >
                    <h4 className="font-semibold">
                      {new Date(dateNight.date).toLocaleDateString()}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {(() => {
                        const volunteers = Array.isArray(dateNight.volunteers) ? dateNight.volunteers : [];
                        const pendingCount = volunteers.filter((v) => v.status === 'pending').length;
                        return `${pendingCount} pending volunteer${pendingCount !== 1 ? 's' : ''}`;
                      })()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {dateNight.startTime} - {dateNight.endTime} • {dateNight.location}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* ============================================
            MODAL: Create Date Night
            Triggered by: "Create Date Night" button
            ============================================ */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Date Night"
          size="lg"
        >
          <DateNightForm
            onSubmit={handleCreateDateNight}
            onCancel={() => setShowCreateModal(false)}
            isLoading={isCreating}
          />
        </Modal>

        {/* ============================================
            MODAL: Date Night Detail View
            Used by: Both "Upcoming Date Nights" and "Pending Approvals" sections
            Triggered by: Clicking on a date night card
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
            MODAL: Edit Date Night
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
            MODAL: Cancel Date Night Confirmation
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

        {/* ============================================
            MODAL: Link Requirement Notice
            Triggered by: Clicking disabled "Generate Invitation Link" button
            ============================================ */}
        <Modal
          isOpen={showLinkRequirementModal}
          onClose={() => setShowLinkRequirementModal(false)}
          title="Link Generation Requirement"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              You need at least one upcoming date night or pending approval to generate an invitation link.
            </p>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowLinkRequirementModal(false)}
              >
                OK
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
};

export default CoupleDashboard;

