import React from 'react';
import { CalendarView } from './CalendarView';
import { DateNight } from '../../types/dateNight';

interface MonthViewProps {
  dateNights: DateNight[];
  onSelectDateNight?: (dateNight: DateNight) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  dateNights,
  onSelectDateNight,
}) => {
  return (
    <CalendarView
      dateNights={dateNights}
      onSelectDateNight={onSelectDateNight}
      view="month"
    />
  );
};

