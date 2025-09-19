import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CalendarToolbar from './CalendarToolbar';
import CalendarDisplay from './CalendarDisplay';
import EventForm from './EventForm';
import EventDetailModal from './EventDetailModal';
import { getEvents, deleteEvent, updateEvent } from '../../googleCalendarService';
import { fetchSheetData } from '../../googleSheetsService'; // To get incidents
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { Button, Alert, AlertDescription, AlertTitle, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Card, CardContent, CardHeader, CardTitle } from "../ui";
import { X, ArrowLeft } from "lucide-react";
import moment from 'moment';

const CALENDARS = {
  laPau: {
    id: 'c_classroom39c07066@group.calendar.google.com',
    name: 'Agenda del CFA La Pau'
  },
  docents: {
    id: 'c_5f59155c69967ab59b0214a1c9c0c44ae76cee4293190f7e948516ead7da7715@group.calendar.google.com',
    name: 'Calendari docents'
  },
  incidents: {
    id: 'incidents',
    name: 'Incidències'
  }
};

// Function to transform sheet data into calendar events
const transformIncidentsToEvents = (sheetData, profile) => {
  if (!sheetData || sheetData.length < 2) return [];
  const headers = sheetData[0];
  const data = sheetData.slice(1);

  const dateIniciIndex = headers.indexOf('Data Inici');
  const timeIniciIndex = headers.indexOf('Hora Inici');
  const dateFiIndex = headers.indexOf('Data Fi');
  const timeFiIndex = headers.indexOf('Hora Fi');
  const typeIndex = headers.indexOf('Tipus');
  const userIndex = headers.indexOf('Usuari (Email)');
  const deletedIndex = headers.indexOf('Esborrat');


  if (dateIniciIndex === -1 || typeIndex === -1 || userIndex === -1) {
    throw new Error("No s'han trobat les columnes necessàries ('Data Inici', 'Tipus', 'Usuari (Email)') a la fulla d'incidències.");
  }

  return data
    .filter(row => row[deletedIndex] !== 'TRUE' && row[dateIniciIndex]) // Filter out deleted and empty incidents
    .map(row => {
      const parseDateTime = (dateStr, timeStr) => {
        let dateParts;
        if (dateStr.includes('/')) { // dd/mm/yyyy
          dateParts = dateStr.split('/').map(p => parseInt(p));
          dateParts = [dateParts[2], dateParts[1] - 1, dateParts[0]]; // y, m-1, d
        } else if (dateStr.includes('-')) { // yyyy-mm-dd
          dateParts = dateStr.split('-').map(p => parseInt(p));
          dateParts = [dateParts[0], dateParts[1] - 1, dateParts[2]]; // y, m-1, d
        } else {
          return null;
        }
        
        const timeParts = timeStr ? String(timeStr).split(':').map(p => parseInt(p)) : [0, 0];
        return new Date(dateParts[0], dateParts[1], dateParts[2], timeParts[0] || 0, timeParts[1] || 0);
      };

      const startDate = parseDateTime(row[dateIniciIndex], row[timeIniciIndex]);
      if (!startDate) return null;

      const isAllDay = !row[timeIniciIndex];
      
      let endDate;
      // Use end date/time if available, otherwise use start date/time
      const endDateStr = row[dateFiIndex] || row[dateIniciIndex];
      const endTimeStr = row[timeFiIndex] || row[timeIniciIndex];
      endDate = parseDateTime(endDateStr, endTimeStr);

      if (!endDate || endDate < startDate) {
          endDate = new Date(startDate);
          if (!isAllDay) {
              endDate.setHours(startDate.getHours() + 1); // Default to 1 hour if end is invalid or missing for timed events
          }
      }
      
      const userEmail = row[userIndex];
      let eventTitle = '';
      let incidentType = '';

      if (profile.role === 'Gestor' || profile.role === 'Direcció') {
        eventTitle = `${row[typeIndex]} (${userEmail})`;
      } else { // Role is 'Usuari'
        eventTitle = `Incidència de ${userEmail}`;
        if (profile.email === userEmail) {
          incidentType = 'own';
        } else {
          incidentType = 'other';
        }
      }
      
      return {
        title: eventTitle,
        start: startDate,
        end: endDate,
        allDay: isAllDay,
        incidentType: incidentType,
        isIncident: true,
        rawData: row,
        headers: headers,
      };
  }).filter(Boolean); // Filter out null entries
};

const CATEGORY_COLORS = {
  'Coordinador': '#FF8C00',
  'Entrevista': '#9932CC',
  'Activitats': '#20B2AA',
  'Reunions': '#4682B4',
  'JAV': '#32CD32',
  'Calendari': '#FFD700',
  'CSI': '#DC143C',
  'EIB': '#00BFFF',
  'FB': '#6A5ACD',
  'Proves': '#F08080',
};

const LIGHT_CATEGORY_COLORS = {
  'Coordinador': '#FFDAB9',
  'Entrevista': '#E6E6FA',
  'Activitats': '#E0FFFF',
  'Reunions': '#ADD8E6',
  'JAV': '#90EE90',
  'Calendari': '#FFFACD',
  'CSI': '#FFB6C1',
  'EIB': '#B0E0E6',
  'FB': '#DDA0DD',
  'Proves': '#FFC0CB',
};

const INCIDENT_COLORS = {
  'own': '#28a745',
  'other': '#0d6efd',
};

const LIGHT_INCIDENT_COLORS = {
  'own': '#D4EDDA',
  'other': '#CCE5FF',
};

function CalendarMainView({ onBackClick, accessToken, profile }) {
  const [activeCalendar, setActiveCalendar] = useState(CALENDARS.laPau.id);
  const [currentView, setCurrentView] = useState('month');
  const [calendarDate, setCalendarDate] = useState(new Date()); // For navigation
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); // For event details/editing
  const [selectedIncident, setSelectedIncident] = useState(null); // For incident details popup
  const [eventToEdit, setEventToEdit] = useState(null); // To pass to the form
  const [isFormOpen, setIsFormOpen] = useState(false); // Controls the event form modal
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const minTime = new Date();
  minTime.setHours(8, 0, 0);

  const maxTime = new Date();
  maxTime.setHours(22, 0, 0);

  const handleRefreshEvents = () => {
    fetchCalendarData();
  };

  const handleSelectEvent = (event) => {
    if (event.isIncident) {
      setSelectedIncident(event);
    } else {
      setSelectedEvent(event);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(activeCalendar, eventId, accessToken);
      setSelectedEvent(null);
      handleRefreshEvents();
    } catch (err) {
      setError(err.message || 'Error en esborrar l\'esdeveniment.');
    }
  };

  const handleOpenCreateForm = () => {
    setEventToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = () => {
    setEventToEdit(selectedEvent);
    setSelectedEvent(null);
    setIsFormOpen(true);
  };

  const fetchCalendarData = useCallback(async () => {
    if (!accessToken || !profile) return;
    setLoading(true);
    setError(null);
    try {
      let fetchedEvents = [];
      if (activeCalendar === CALENDARS.incidents.id) {
        // Incidents are fetched all at once, not by date range
        const incidentData = await fetchSheetData('Incidències!A:N', accessToken);
        fetchedEvents = transformIncidentsToEvents(incidentData, profile);
      } else {
        const momentDate = moment(calendarDate);
        // For month, week, day views, get the start and end of the period
        const view = currentView === 'agenda' ? 'month' : currentView; // Treat agenda like month for range
        const timeMin = momentDate.clone().startOf(view).toISOString();
        const timeMax = momentDate.clone().endOf(view).toISOString();

        fetchedEvents = await getEvents(activeCalendar, accessToken, timeMin, timeMax);
      }
      setEvents(fetchedEvents);
    } catch (err) {
      console.error("Error fetching calendar data:", err);
      setError(err.message || 'Error en carregar les dades del calendari.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, profile, activeCalendar, calendarDate, currentView]);

  useEffect(() => {
    // Only fetch calendar data if we have an access token and a profile
    if (accessToken && profile) {
        fetchCalendarData();
    }
  }, [accessToken, profile, activeCalendar, calendarDate, currentView, fetchCalendarData]);

  const eventPropGetter = useCallback((view) => (event, start, end, isSelected) => {
    let backgroundColor = '';

    if (event.incidentType) {
      // Incident events
      backgroundColor = view === 'agenda' ? LIGHT_INCIDENT_COLORS[event.incidentType] : INCIDENT_COLORS[event.incidentType];
    } else {
      // GCal events
      const title = event.title || '';
      const category = title.split(':')[0].trim();
      backgroundColor = view === 'agenda' ? LIGHT_CATEGORY_COLORS[category] : CATEGORY_COLORS[category];
      if (!backgroundColor) {
        backgroundColor = view === 'agenda' ? '#E0E0E0' : '#808080'; // Default gray
      }
    }

    return { style: { backgroundColor } };
  }, []);

  const activeCalendarName = Object.values(CALENDARS).find(c => c.id === activeCalendar)?.name || '';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6 pb-4 border-b">
        <div className="flex items-center gap-4">
          <Button onClick={onBackClick} className="bg-primary-light text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tornar
          </Button>
          <h1 className="text-2xl font-bold">Calendaris del centre</h1>
        </div>
        <div className="text-right">
          <div className="font-semibold">{profile.name} ({profile.role})</div>
          <div className="text-xs text-muted-foreground">{profile.email}</div>
        </div>
      </header>

      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="my-4">
        <CardHeader>
          <CardTitle>Controls del Calendari</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarToolbar 
            calendars={CALENDARS}
            activeCalendar={activeCalendar}
            setActiveCalendar={setActiveCalendar}
            currentView={currentView}
            setCurrentView={setCurrentView}
            profile={profile}
            onAddEventClick={handleOpenCreateForm}
          />
        </CardContent>
      </Card>

      <EventForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        accessToken={accessToken}
        calendarId={activeCalendar}
        calendarName={activeCalendarName}
        onEventCreated={handleRefreshEvents}
        eventToEdit={eventToEdit}
      />

      <EventDetailModal 
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        calendarName={activeCalendarName}
        profile={profile}
        onDelete={handleDeleteEvent}
        onEdit={handleOpenEditForm}
      />

      {selectedIncident && (
        <Dialog open={selectedIncident !== null} onOpenChange={() => setSelectedIncident(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detall de la Incidència</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <h4 className="text-lg font-semibold mb-2">{selectedIncident.title}</h4>
              <hr className="mb-2" />
              <p className="mb-1"><strong>Inici:</strong> {selectedIncident.start.toLocaleString('es-ES')}</p>
              <p className="mb-1"><strong>Fi:</strong> {selectedIncident.end.toLocaleString('es-ES')}</p>
              {(profile.role === 'Gestor' || profile.role === 'Direcció') && (
                <div className="mt-4">
                  <h5 className="text-md font-semibold mb-2">Detalls complets (visible per a Gestor/Direcció)</h5>
                  {selectedIncident.headers.map((header, index) => {
                    if (header === 'Esborrat') return null; // Don't show the deleted flag
                    let content = selectedIncident.rawData[index];
                    if (content === 'TRUE') content = 'Sí';
                    if (content === 'FALSE' || content === '') content = 'No';
                    return <p key={header} className="mb-1"><strong>{header}:</strong> {content}</p>;
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedIncident(null)}>Tancar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {loading ? (
        <p className="text-center mt-3">Cargando esdeveniments...</p>
      ) : (
        <Card>
          <CardContent className="p-2">
            <CalendarDisplay 
              events={events} 
              view={currentView} 
              date={calendarDate}
              onView={setCurrentView}
              onNavigate={setCalendarDate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventPropGetter(currentView)}
              min={minTime}
              max={maxTime}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}


export default CalendarMainView;