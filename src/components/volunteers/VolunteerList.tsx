import React from 'react';
import { Volunteer } from '../../types/volunteer';

interface VolunteerListProps {
  volunteers: Volunteer[];
}

export const VolunteerList: React.FC<VolunteerListProps> = ({ volunteers }) => {
  if (volunteers.length === 0) {
    return <div className="text-center py-4 text-gray-500">No volunteers found.</div>;
  }

  return (
    <div className="space-y-2">
      {volunteers.map((volunteer) => (
        <div key={volunteer.id} className="card">
          <h3 className="font-semibold">{volunteer.name}</h3>
          <p className="text-sm text-gray-600">{volunteer.email}</p>
          <p className="text-sm text-gray-600">{volunteer.phone}</p>
        </div>
      ))}
    </div>
  );
};

