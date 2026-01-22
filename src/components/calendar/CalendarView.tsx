import React, { useState } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { DateNight } from '../../types/dateNight';

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  dateNights: DateNight[];
  onSelectDateNight?: (dateNight: DateNight) => void;
  view?: View;
  onViewChange?: (view: View) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  dateNights,
  onSelectDateNight,
  view = 'month',
  onViewChange,
}) => {
  const [currentView, setCurrentView] = useState<View>(view);

  const events = dateNights.map((dateNight) => {
    const start = new Date(dateNight.date);
    const [startHour, startMinute] = dateNight.startTime.split(':').map(Number);
    start.setHours(startHour, startMinute);

    const end = new Date(dateNight.date);
    const [endHour, endMinute] = dateNight.endTime.split(':').map(Number);
    end.setHours(endHour, endMinute);

    const hasVolunteer = dateNight.volunteers.some((v) => v.status === 'approved');
    const isCancelled = dateNight.status === 'cancelled';

    return {
      id: dateNight.id,
      title: `${dateNight.numberOfChildren} child${dateNight.numberOfChildren > 1 ? 'ren' : ''} - ${dateNight.location}`,
      start,
      end,
      resource: dateNight,
      status: dateNight.status,
      hasVolunteer,
      isCancelled,
    };
  });

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#0ea5e9'; // primary-500
    let borderColor = '#0284c7'; // primary-600

    if (event.isCancelled) {
      backgroundColor = '#ef4444'; // red-500
      borderColor = '#dc2626'; // red-600
    } else if (event.hasVolunteer) {
      backgroundColor = '#10b981'; // green-500
      borderColor = '#059669'; // green-600
    } else if (event.status === 'open') {
      backgroundColor = '#f59e0b'; // amber-500
      borderColor = '#d97706'; // amber-600
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '2px',
        borderRadius: '4px',
        color: 'white',
        padding: '4px',
      },
    };
  };

  const handleSelectEvent = (event: any) => {
    if (onSelectDateNight) {
      onSelectDateNight(event.resource);
    }
  };

  const handleViewChange = (newView: View) => {
    setCurrentView(newView);
    if (onViewChange) {
      onViewChange(newView);
    }
  };

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={currentView}
        onView={handleViewChange}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={['month', 'week']}
        popup
        className="bg-white"
      />
    </div>
  );
};

