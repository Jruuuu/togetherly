import React, { useState } from 'react';
import { DateNight } from '../../types/dateNight';
import { Volunteer } from '../../types/volunteer';
import { VolunteerCard } from './VolunteerCard';
import { Modal } from '../shared/Modal';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { useVolunteerApproval } from '../../hooks/useVolunteers';
import { useVolunteersByDateNight } from '../../hooks/useVolunteers';

interface ApprovalQueueProps {
  dateNight: DateNight;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ dateNight }) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [volunteerToReject, setVolunteerToReject] = useState<string | null>(null);
  const { approve, reject, isApproving, isRejecting } = useVolunteerApproval();
  const { volunteers, isLoading } = useVolunteersByDateNight(dateNight.id);

  const pendingVolunteers = dateNight.volunteers.filter((v) => v.status === 'pending');
  const approvedVolunteers = dateNight.volunteers.filter((v) => v.status === 'approved');
  const rejectedVolunteers = dateNight.volunteers.filter((v) => v.status === 'rejected');

  const handleApprove = (volunteerId: string, isBackup: boolean = false) => {
    approve({
      dateNightId: dateNight.id,
      volunteerId,
      isBackup,
    });
  };

  const handleRejectClick = (volunteerId: string) => {
    setVolunteerToReject(volunteerId);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (volunteerToReject) {
      reject({
        dateNightId: dateNight.id,
        volunteerId: volunteerToReject,
        reason: rejectReason || undefined,
      });
      setShowRejectModal(false);
      setRejectReason('');
      setVolunteerToReject(null);
    }
  };

  const getVolunteerData = (volunteerId: string): Volunteer | undefined => {
    return volunteers.find((v) => v.id === volunteerId);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading volunteers...</div>;
  }

  return (
    <div className="space-y-6">
      {pendingVolunteers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Pending Approval</h3>
          <div className="space-y-4">
            {pendingVolunteers.map((signup) => {
              const volunteer = getVolunteerData(signup.volunteerId);
              if (!volunteer) return null;
              return (
                <VolunteerCard
                  key={signup.volunteerId}
                  volunteer={volunteer}
                  signup={signup}
                  onApprove={() => handleApprove(signup.volunteerId, signup.isBackup)}
                  onReject={() => handleRejectClick(signup.volunteerId)}
                  isApproving={isApproving}
                  isRejecting={isRejecting}
                />
              );
            })}
          </div>
        </div>
      )}

      {approvedVolunteers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Approved Volunteers</h3>
          <div className="space-y-4">
            {approvedVolunteers.map((signup) => {
              const volunteer = getVolunteerData(signup.volunteerId);
              if (!volunteer) return null;
              return (
                <VolunteerCard
                  key={signup.volunteerId}
                  volunteer={volunteer}
                  signup={signup}
                  onApprove={() => {}}
                  onReject={() => {}}
                  showActions={false}
                />
              );
            })}
          </div>
        </div>
      )}

      {rejectedVolunteers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Rejected Volunteers</h3>
          <div className="space-y-4">
            {rejectedVolunteers.map((signup) => {
              const volunteer = getVolunteerData(signup.volunteerId);
              if (!volunteer) return null;
              return (
                <VolunteerCard
                  key={signup.volunteerId}
                  volunteer={volunteer}
                  signup={signup}
                  onApprove={() => {}}
                  onReject={() => {}}
                  showActions={false}
                />
              );
            })}
          </div>
        </div>
      )}

      {pendingVolunteers.length === 0 && approvedVolunteers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No volunteers have signed up yet.
        </div>
      )}

      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
          setVolunteerToReject(null);
        }}
        title="Reject Volunteer"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Please provide a reason for rejection (optional):
          </p>
          <Input
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Double booking before approval"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
                setVolunteerToReject(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRejectConfirm}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

