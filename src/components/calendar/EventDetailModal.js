import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from "../ui";
import { X } from "lucide-react";

const EventDetailModal = ({ event, onClose, calendarName, profile, onDelete, onEdit }) => {
  if (!event) return null;

  const { title, start, end, allDay, resource } = event;
  const description = resource?.description;
  const attendees = resource?.attendees || [];
  const canEdit = profile && (profile.role === 'Gestor' || profile.role === 'Direcció');

  const handleDelete = () => {
    if (window.confirm(`Esteu segur que voleu esborrar l'esdeveniment "${title}"?`)) {
      onDelete(resource.id);
    }
  };

  const formatDateTime = (date, isAllDayEvent) => {
    if (!date) return '';
    const options = {
      dateStyle: 'full',
    };
    if (!isAllDayEvent) {
      options.timeStyle = 'short';
    }
    return new Date(date).toLocaleString('es-ES', options);
  }

  // For all-day events, Google's API sets the end date to the morning of the next day.
  // For display, we should show the actual last day of the event.
  const displayEnd = allDay ? new Date(end.getTime() - (24 * 60 * 60 * 1000)) : end;

  return (
    <Dialog open={!!event} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">Calendari: {calendarName}</DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <p className="mb-1"><strong>Inici:</strong> {formatDateTime(start, allDay)}</p>
          <p className="mb-3"><strong>Fi:</strong> {formatDateTime(displayEnd, allDay)}</p>
          {description && (
            <div className="mb-3">
              <h6 className="font-semibold">Descripció:</h6>
              <p>{description}</p>
            </div>
          )}
          {attendees.length > 0 && (
            <div className="mb-3">
              <h6 className="font-semibold">Convidats:</h6>
              <ul className="list-disc list-inside">
                {attendees.map(att => <li key={att.email}>{att.email}</li>)}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-between items-center">
          <div>
            {canEdit && (
              <>
                <Button className="bg-[#288185] hover:bg-[#1e686b] text-white mr-2" onClick={onEdit}>Editar</Button>
                <Button variant="destructive" onClick={handleDelete}>Esborrar</Button>
              </>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>Tancar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailModal;