import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { getUsers } from '../../googleSheetsService';
import { createEvent, updateEvent } from '../../googleCalendarService';
import { Button, Input, Textarea, Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox, Alert, AlertDescription, AlertTitle, DialogFooter } from "../ui";
import { X } from "lucide-react";

const CATEGORIES = ['Coordinador', 'Entrevista', 'Activitats', 'Reunions', 'JAV', 'Calendari', 'CSI', 'EIB', 'FB', 'Proves'];
const LA_PAU_CALENDAR_ID = 'c_classroom39c07066@group.calendar.google.com';

const EventForm = ({ isOpen, onClose, accessToken, calendarId, calendarName, onEventCreated, eventToEdit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allUsers, setAllUsers] = useState([]);
  const [invitedGuests, setInvitedGuests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditMode = eventToEdit !== null;
  const isLaPauCalendar = calendarId === LA_PAU_CALENDAR_ID;

  const filteredCategories = useMemo(() => {
    return isLaPauCalendar
      ? CATEGORIES.filter(cat => cat === 'Calendari' || cat === 'Activitats')
      : CATEGORIES;
  }, [isLaPauCalendar]);

  useEffect(() => {
    if (isOpen) {
      // Fetch users, but not for La Pau calendar
      if (!isLaPauCalendar) {
        const fetchUsers = async () => {
          try {
            const usersData = await getUsers(accessToken);
            setAllUsers(usersData.map(u => ({ value: u.email, label: `${u.name} (${u.email})` })));
          } catch (err) {
            setError('No s\'ha pogut carregar la llista d\'usuaris.');
          }
        };
        fetchUsers();
      }

      // Pre-fill form if in edit mode
      if (isEditMode) {
        let eventTitle = eventToEdit.title;
        let eventCategory = filteredCategories[0]; // Default category

        if (eventToEdit.title.includes(': ')) {
            const parts = eventToEdit.title.split(': ');
            const potentialCategory = parts[0];
            if (filteredCategories.includes(potentialCategory)) {
                eventCategory = potentialCategory;
                eventTitle = parts.slice(1).join(': ');
            }
        }

        setTitle(eventTitle);
        setCategory(eventCategory);
        setDescription(eventToEdit.resource.description || '');
        setIsAllDay(!!eventToEdit.resource.start.date);
        
        const start = new Date(eventToEdit.resource.start.dateTime || eventToEdit.resource.start.date);
        const end = new Date(eventToEdit.resource.end.dateTime || eventToEdit.resource.end.date);

        setStartDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().slice(0, 5));
        setEndDate(end.toISOString().split('T')[0]);
        setEndTime(end.toTimeString().slice(0, 5));

        if (eventToEdit.resource.attendees) {
          setInvitedGuests(eventToEdit.resource.attendees.map(att => ({ value: att.email, label: att.email })));
        }

      } else {
        // Reset form for new event
        setTitle('');
        setDescription('');
        setCategory(filteredCategories[0]);
        setIsAllDay(false);
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(''); // Optional end date
        setStartTime('09:00');
        setEndTime('10:00');
        setInvitedGuests([]);
        setError('');
      }
    }
  }, [isOpen, isEditMode, eventToEdit, accessToken, isLaPauCalendar, filteredCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let eventData = {
      summary: `${category}: ${title}`,
      description,
      attendees: isLaPauCalendar ? [] : invitedGuests.map(guest => ({ email: guest.value })),
    };

    if (isAllDay) {
      const finalEndDate = new Date(endDate || startDate);
      finalEndDate.setDate(finalEndDate.getDate() + 1);
      eventData.start = { date: startDate };
      eventData.end = { date: finalEndDate.toISOString().split('T')[0] };
    } else {
      const finalEndDateStr = endDate || startDate;
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${finalEndDateStr}T${endTime}`);

      if (endDateTime <= startDateTime) {
        setError('La hora de fi ha de ser posterior a la hora d\'inici.');
        setLoading(false);
        return;
      }

      eventData.start = { dateTime: startDateTime.toISOString(), timeZone: 'Europe/Madrid' };
      eventData.end = { dateTime: endDateTime.toISOString(), timeZone: 'Europe/Madrid' };
    }

    try {
      if (isEditMode) {
        await updateEvent(calendarId, eventToEdit.resource.id, eventData, accessToken);
      } else {
        await createEvent(calendarId, eventData, accessToken);
      }
      onEventCreated();
      onClose();
    } catch (err) {
      setError(err.message || `Error en ${isEditMode ? 'actualitzar' : 'crear'} l\'esdeveniment.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h5 className="text-lg font-semibold">{isEditMode ? 'Editar Esdeveniment' : `Afegir Esdeveniment a: ${calendarName}`}</h5>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="modal-body">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <ShadcnSelect value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una categoria" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </ShadcnSelect>
          </div>
          <div className="mb-3">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Títol</label>
            <Input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descripció</label>
            <Textarea id="description" rows="3" value={description} onChange={e => setDescription(e.target.value)}></Textarea>
          </div>

          <div className="flex items-center space-x-2 mb-3">
            <Checkbox id="allDayCheck" checked={isAllDay} onCheckedChange={setIsAllDay} />
            <label htmlFor="allDayCheck" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tot el dia
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Data d'inici</label>
              <Input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Data de fi (opcional)</label>
              <Input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Hora d'inici</label>
                <Input type="time" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">Hora de fi</label>
                <Input type="time" id="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
            </div>
          )}

          {!isLaPauCalendar && (
            <div className="mb-3">
              <label htmlFor="guests" className="block text-sm font-medium text-gray-700 mb-1">Convidats</label>
              <div className="border rounded-md p-2 min-h-[40px]">
                {invitedGuests.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {invitedGuests.map(guest => (
                      <span key={guest.value} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {guest.label}
                        <button
                          type="button"
                          className="ml-1 inline-flex items-center rounded-full bg-blue-200 text-blue-800 hover:bg-blue-300 focus:outline-none"
                          onClick={() => setInvitedGuests(invitedGuests.filter(g => g.value !== guest.value))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">Selecciona convidats...</span>
                )}
                <div className="mt-2">
                  <ShadcnSelect onValueChange={(value) => {
                    const user = allUsers.find(u => u.value === value);
                    if (user && !invitedGuests.some(g => g.value === user.value)) {
                      setInvitedGuests([...invitedGuests, user]);
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Afegeix un convidat..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers
                        .filter(user => !invitedGuests.some(g => g.value === user.value))
                        .map(user => (
                          <SelectItem key={user.value} value={user.value}>
                            {user.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </ShadcnSelect>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
            <Button type="submit" className="bg-[#288185] hover:bg-[#1e686b] text-white" disabled={loading}>
              {loading ? (isEditMode ? 'Actualitzant...' : 'Creant...') : (isEditMode ? 'Actualitzar Esdeveniment' : 'Crear Esdeveniment')}
            </Button>
          </DialogFooter>
        </form>
      </div>
    </div>
  );
};

export default EventForm;