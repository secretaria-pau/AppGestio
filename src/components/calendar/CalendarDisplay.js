import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ca'; // Import Catalan locale for moment
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-theme.css'; // Import custom CSS for theming

moment.locale('ca'); // Set moment to use Catalan
const localizer = momentLocalizer(moment);

const messages = {
  allDay: 'Tot el dia',
  previous: 'Anterior',
  next: 'Següent',
  today: 'Avui',
  month: 'Mes',
  week: 'Setmana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Esdeveniment',
  list: 'Llista', 
  showMore: total => `+ Veure'n més (${total})`
};

const CalendarDisplay = ({ events, view, date, onView, onNavigate, onSelectEvent, eventPropGetter, min, max }) => {
  return (
    <div className="h-[70vh] border rounded-lg overflow-hidden">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        className="h-full"
        view={view}
        date={date}
        onView={onView}
        onNavigate={onNavigate}
        onSelectEvent={onSelectEvent}
        messages={messages}
        eventPropGetter={eventPropGetter}
        min={min}
        max={max}
        popup
        toolbar={false} // We're handling the toolbar separately
        showMultiDayTimes
        step={60}
        timeslots={1}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default CalendarDisplay;