import React from 'react';
import { CalendarView } from './CalendarView';
import { DateNight } from '../../types/dateNight';

interface WeekViewProps {
  dateNights: DateNight[];
  onSelectDateNight?: (dateNight: DateNight) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  dateNights,
  onSelectDateNight,
}) => {
  return (
    <CalendarView
      dateNights={dateNights}
      onSelectDateNight={onSelectDateNight}
      view="week"
    />
  );
};

