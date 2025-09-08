export const getEvents = async (calendarId, accessToken, timeMin, timeMax) => {
  try {
    let url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

    const params = new URLSearchParams();
    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);
    // You can add other parameters like singleEvents=true if needed
    params.append('singleEvents', 'true');
    params.append('orderBy', 'startTime');

    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error fetching events from Google Calendar: ${errorData.error.message}`);
    }

    const data = await response.json();
    
    const formattedEvents = data.items.map(event => {
      const isAllDay = !!event.start.date;
      const start = new Date(event.start.dateTime || event.start.date);
      const end = new Date(event.end.dateTime || event.end.date);

      // For all-day events, react-big-calendar expects the end date to be the *last day* of the event.
      // Google's API provides the end date as the *morning of the next day*.
      // So, we subtract one day from the end date for all-day events.
      if (isAllDay && start.getTime() < end.getTime()) {
        end.setDate(end.getDate() - 1);
      }

      return {
        title: event.summary,
        start,
        end,
        allDay: isAllDay,
        resource: event, // Keep original event data if needed later
      };
    });

    return formattedEvents;

  } catch (error) {
    console.error("Error in getEvents:", error);
    throw error; // Re-throw the error to be caught by the component
  }
};

export const createEvent = async (calendarId, eventData, accessToken) => {
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error creating event: ${errorData.error.message}`);
    }

    return await response.json();

  } catch (error) {
    console.error("Error in createEvent:", error);
    throw error;
  }
};

export const deleteEvent = async (calendarId, eventId, accessToken) => {
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status !== 204) { // 204 No Content is the success status for DELETE
      const errorData = await response.json();
      throw new Error(`Error deleting event: ${errorData.error.message}`);
    }

    return true; // Return true on success

  } catch (error) {
    console.error("Error in deleteEvent:", error);
    throw error;
  }
};

export const updateEvent = async (calendarId, eventId, eventData, accessToken) => {
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}?sendUpdates=all`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error updating event: ${errorData.error.message}`);
    }

    return await response.json();

  } catch (error) {
    console.error("Error in updateEvent:", error);
    throw error;
  }
};
