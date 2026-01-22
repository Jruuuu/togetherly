import React from 'react';
import { Volunteer } from '../../types/volunteer';
import { VolunteerSignup } from '../../types/dateNight';
import { Button } from '../shared/Button';

interface VolunteerCardProps {
  volunteer: Volunteer;
  signup: VolunteerSignup;
  onApprove: () => void;
  onReject: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  showActions?: boolean;
}

export const VolunteerCard: React.FC<VolunteerCardProps> = ({
  volunteer,
  signup,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  showActions = true,
}) => {
  const getStatusBadge = () => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[signup.status]}`}
      >
        {signup.status.charAt(0).toUpperCase() + signup.status.slice(1)}
      </span>
    );
  };

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{volunteer.name}</h3>
          <p className="text-sm text-gray-600">{volunteer.email}</p>
          <p className="text-sm text-gray-600">{volunteer.phone}</p>
        </div>
        {getStatusBadge()}
      </div>

      {signup.isBackup && (
        <div className="mb-2">
          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
            Backup Volunteer
          </span>
        </div>
      )}

      {signup.rejectionReason && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            <strong>Rejection Reason:</strong> {signup.rejectionReason}
          </p>
        </div>
      )}

      <div className="text-sm text-gray-600 mb-4">
        <p>Signed up: {new Date(signup.signedUpAt).toLocaleString()}</p>
        {signup.approvedAt && (
          <p>Approved: {new Date(signup.approvedAt).toLocaleString()}</p>
        )}
      </div>

      {showActions && signup.status === 'pending' && (
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={onApprove}
            disabled={isApproving || isRejecting}
            className="flex-1"
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
          <Button
            variant="danger"
            onClick={onReject}
            disabled={isApproving || isRejecting}
            className="flex-1"
          >
            {isRejecting ? 'Rejecting...' : 'Reject'}
          </Button>
        </div>
      )}
    </div>
  );
};

