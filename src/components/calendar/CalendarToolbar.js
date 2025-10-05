import React from 'react';
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

const CalendarToolbar = ({ calendars, activeCalendar, setActiveCalendar, currentView, setCurrentView, profile, onAddEventClick, onNavigate, date }) => {
  
  const canEdit = profile && (profile.role === 'Gestor' || profile.role === 'Direcció');
  const isIncidentsCalendar = activeCalendar === 'incidents';

  const navigate = (action) => {
    const currentDate = new Date(date);
    let newDate;
    
    switch (action) {
      case 'TODAY':
        newDate = new Date();
        break;
      case 'PREV':
        if (currentView === 'month') {
          newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        } else if (currentView === 'week') {
          newDate = new Date(currentDate);
          newDate.setDate(currentDate.getDate() - 7);
        } else if (currentView === 'day') {
          newDate = new Date(currentDate);
          newDate.setDate(currentDate.getDate() - 1);
        } else {
          newDate = new Date(currentDate);
        }
        break;
      case 'NEXT':
        if (currentView === 'month') {
          newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        } else if (currentView === 'week') {
          newDate = new Date(currentDate);
          newDate.setDate(currentDate.getDate() + 7);
        } else if (currentView === 'day') {
          newDate = new Date(currentDate);
          newDate.setDate(currentDate.getDate() + 1);
        } else {
          newDate = new Date(currentDate);
        }
        break;
      default:
        return;
    }
    
    onNavigate(newDate);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls del Calendari</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex space-x-2" role="group" aria-label="Calendar Selector">
            {Object.values(calendars).map(calendar => (
              <Button 
                key={calendar.id} 
                type="button" 
                variant={activeCalendar === calendar.id ? 'default' : 'outline'}
                onClick={() => setActiveCalendar(calendar.id)}
              >
                {calendar.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex space-x-1" role="group" aria-label="Navigation">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('PREV')}
              >
                &lt;
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('TODAY')}
              >
                Avui
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('NEXT')}
              >
                &gt;
              </Button>
            </div>
            
            {canEdit && !isIncidentsCalendar && (
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={onAddEventClick}
              >
                Afegir Esdeveniment
              </Button>
            )}
            
            <div className="flex space-x-1" role="group" aria-label="View Selector">
              <Button 
                type="button" 
                variant={currentView === 'month' ? 'default' : 'outline'}
                onClick={() => setCurrentView('month')}
              >
                Mes
              </Button>
              <Button 
                type="button" 
                variant={currentView === 'week' ? 'default' : 'outline'}
                onClick={() => setCurrentView('week')}
              >
                Setmana
              </Button>
              <Button 
                type="button" 
                variant={currentView === 'day' ? 'default' : 'outline'}
                onClick={() => setCurrentView('day')}
              >
                Dia
              </Button>
              <Button 
                type="button" 
                variant={currentView === 'agenda' ? 'default' : 'outline'}
                onClick={() => setCurrentView('agenda')}
              >
                Llista
              </Button>
            </div>
            
            <div className="text-sm font-medium px-3 py-2 bg-muted rounded">
              {date.toLocaleString('ca-ES', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarToolbar;