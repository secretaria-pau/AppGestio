import React, { useState, useEffect } from 'react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Checkbox } from "./ui";

// Helper functions for date conversion
const toInputFormat = (dateStr) => { // dd/mm/yyyy -> yyyy-mm-dd
  if (!dateStr) return '';
  if (typeof dateStr !== 'string') return '';
  
  // If it's already a time format (HH:MM), return empty string since this function is for dates only
  if (/^\\d{2}:\\d{2}$/.test(dateStr)) {
    return ''; 
  }
  
  // If it's an ISO date string like 1899-12-30T09:00:00.000Z, extract just the date part
  if (dateStr.includes('T') && dateStr.includes('Z')) {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        // This could be a time-only value, so we check if it's a special date indicating time
        if (dateStr.startsWith('1899-12-30')) {
          // This is definitely a time-only value, return empty for date input
          return '';
        }
        // Return the date portion for date inputs
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // Fall through to regular processing
    }
  }
  
  // If already in yyyy-mm-dd format (with no slashes)
  if (!dateStr.includes('/')) {
    // If it's an ISO format like 2025-09-01T... or malformed date, return only date part
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    return dateStr;
  }
  
  // If it's in dd/mm/yyyy format
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr; // Invalid format
  
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  
  return `${year}-${month}-${day}`;
};

const toSheetFormat = (dateStr) => { // yyyy-mm-dd -> dd/mm/yyyy
  if (!dateStr) return '';
  if (typeof dateStr !== 'string') return '';
  
  // Handle time format HH:MM
  if (/^\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr; // Already in correct format for time
  }
  
  if (dateStr.includes('/')) {
    // Already in dd/mm/yyyy format, but check if it's malformed like in your example
    if (dateStr.includes('T') && dateStr.includes('Z')) {
      // This is a malformed date string like '31T22:00:00.000Z/08/2025'
      // Extract the actual date parts
      const match = dateStr.match(/(\d{1,2})T\d{2}:\d{2}:\d{2}\.\d{3}Z\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
    return dateStr; // Already dd/mm/yyyy
  }
  
  // Handle ISO format like 2025-09-01 or 2025-09-01T10:00:00.000Z
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr; // Invalid format
  
  let day, month, year;
  
  if (parts.length === 3) {
    // Standard yyyy-mm-dd format
    const datePart = parts[2].split('T')[0]; // Extract date part if ISO string
    day = datePart;
    month = parts[1];
    year = parts[0];
  } else {
    return dateStr; // Invalid format
  }
  
  // Ensure proper padding
  day = day.padStart(2, '0');
  month = month.padStart(2, '0');
  year = year;
  
  return `${day}/${month}/${year}`;
};

// Additional function to safely parse dates that might be in different formats
const safeParseDate = (dateStr) => {
  if (!dateStr) return null;
  
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    // Format dd/mm/yyyy
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS
      const year = parseInt(parts[2], 10);
      
      const date = new Date(year, month, day);
      
      if (date.getFullYear() === year && 
          date.getMonth() === month && 
          date.getDate() === day) {
        return date;
      }
    }
  } else if (typeof dateStr === 'string' && dateStr.includes('-')) {
    // Format yyyy-mm-dd
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
};

// Function to format time values properly for input fields
const formatTimeForInput = (timeStr) => {
  if (!timeStr) return '';
  
  // If it's already in HH:MM format, return as is
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  // If it's an ISO date string representing time (like 1899-12-30T09:00:00.000Z)
  if (timeStr.includes('T') && timeStr.includes('Z')) {
    try {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    } catch (e) {
      // Return empty if we can't parse it
      return '';
    }
  }
  
  return timeStr; // Fallback
};

const AddIncidentForm = ({
  incidentToEdit,
  originalSheetRowIndex,
  onSaveIncident,
  onClose,
  setError,
  profile,
  users,
  incidentTypes,
  isSaving
}) => {
  const [incidentData, setIncidentData] = useState({
    'Usuari (Email)': '',
    'Data Inici': '',
    'Hora Inici': '',
    'Data Fi': '',
    'Hora Fi': '',
    'Duració': '',
    'Exercici': '',
    'Tipus': '',
    'Signatura Usuari': false,
    'Timestamp Signatura Usuari': '',
    'Signatura Direcció': false,
    'Timestamp Signatura Direcció': '',
    'Esborrat': false,
    'Observacions': '',
  });
  const [selectedTypeUnit, setSelectedTypeUnit] = useState('H'); // Default to Hours

  useEffect(() => {
    if (incidentToEdit) {
      const mappedData = {
        'Usuari (Email)': (incidentToEdit[0] || '').trim(),
        'Data Inici': toInputFormat(incidentToEdit[1] || ''),
        'Hora Inici': formatTimeForInput(incidentToEdit[2] || ''),
        'Data Fi': toInputFormat(incidentToEdit[3] || ''),
        'Hora Fi': formatTimeForInput(incidentToEdit[4] || ''),
        'Duració': incidentToEdit[5] || '',
        'Exercici': incidentToEdit[6] || '',
        'Tipus': (incidentToEdit[7] || '').trim(),
        'Signatura Usuari': incidentToEdit[8] === 'TRUE' || incidentToEdit[8] === true || incidentToEdit[8] === 'true' || incidentToEdit[8] === 1,
        'Timestamp Signatura Usuari': incidentToEdit[9] || '',
        'Signatura Direcció': incidentToEdit[10] === 'TRUE' || incidentToEdit[10] === true || incidentToEdit[10] === 'true' || incidentToEdit[10] === 1,
        'Timestamp Signatura Direcció': incidentToEdit[11] || '',
        'Esborrat': incidentToEdit[12] === 'TRUE',
        'Observacions': incidentToEdit[13] || '',
      };
      
      setIncidentData(mappedData);
    } else if (profile) {
      const defaultUser = (profile.role === 'Usuari') ? profile.email : '';
      setIncidentData(prevData => ({
        ...prevData,
        'Usuari (Email)': defaultUser,
        'Data Inici': '',
        'Hora Inici': '',
        'Data Fi': '',
        'Hora Fi': '',
        'Duració': '',
        'Exercici': '',
        'Tipus': '',
        'Signatura Usuari': false,
        'Timestamp Signatura Usuari': '',
        'Signatura Direcció': false,
        'Timestamp Signatura Direcció': '',
        'Esborrat': false,
        'Observacions': '',
      }));
    }
  }, [incidentToEdit, profile]);

  // Efecto separado para manejar cambios en tipos de incidencia
  useEffect(() => {
    if (incidentTypes && incidentTypes.length > 0 && incidentData['Tipus']) {
      const typeObj = incidentTypes.find(t => t.NomTipus === incidentData['Tipus']);
      if (typeObj) {
        setSelectedTypeUnit(typeObj.UnitatDurada);
      }
    } else if (incidentToEdit && incidentToEdit[7] && incidentTypes && incidentTypes.length > 0) {
      // Si estamos editando y los tipos están disponibles, pero aún no se ha establecido la unidad
      const typeObj = incidentTypes.find(t => t.NomTipus === incidentToEdit[7]);
      if (typeObj) {
        setSelectedTypeUnit(typeObj.UnitatDurada);
      }
    }
  }, [incidentTypes, incidentData['Tipus'], incidentToEdit]);

  const calculateDuration = (data) => {
    const typeObj = incidentTypes.find(t => t.NomTipus === data.Tipus);
    const unit = typeObj ? typeObj.UnitatDurada : 'H';

    const startDate = data['Data Inici'];
    const endDate = data['Data Fi'];

    if (unit === 'D') {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end >= start) {
          const diffTime = end.getTime() - start.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
          return `${diffDays} dies`;
        }
        return 'Error: Data Fi anterior a Inici';
      }
    } else { // unit === 'H'
      const finalEndDate = endDate || startDate;
      const startTime = data['Hora Inici'];
      const endTime = data['Hora Fi'];

      if (startDate && startTime && finalEndDate && endTime) {
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${finalEndDate}T${endTime}`);

        if (endDateTime >= startDateTime) {
          const durationMs = endDateTime - startDateTime;
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
          return `${hours}h ${minutes}m`;
        }
        return 'Error: Data/Hora Fi anterior a Inici';
      }
    }
    return '';
  };

    const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIncidentData(prevData => {
      const newData = {
        ...prevData,
        [name]: type === 'checkbox' ? checked : value
      };

      // Special handling for dates and times to ensure proper formatting
      if (name === 'Data Inici' || name === 'Data Fi') {
        // Ensure date is in correct format for input (yyyy-mm-dd)
        newData[name] = toInputFormat(value);
      } else if (name === 'Hora Inici' || name === 'Hora Fi') {
        // Ensure time is in correct format (HH:MM)
        if (value && !/^\d{2}:\d{2}$/.test(value)) {
          // If it's in format like "9:00" (single digit hour), pad with zero
          if (/^\d:\d{2}$/.test(value)) {
            newData[name] = '0' + value;
          } else {
            // Leave as is for other cases
            newData[name] = value;
          }
        } else {
          newData[name] = value;
        }
      }

      // Calculate duration when relevant fields change
      if (['Data Inici', 'Hora Inici', 'Data Fi', 'Hora Fi', 'Tipus'].includes(name)) {
        newData['Duració'] = calculateDuration(newData);
      }

      // Auto-clear signatures if dates/times are modified after signing
      if (['Data Inici', 'Hora Inici', 'Data Fi', 'Hora Fi', 'Tipus'].includes(name)) {
        if (prevData['Signatura Usuari'] || prevData['Signatura Direcció']) {
          newData['Signatura Usuari'] = false;
          newData['Timestamp Signatura Usuari'] = '';
          newData['Signatura Direcció'] = false;
          newData['Timestamp Signatura Direcció'] = '';
        }
      }

      // Auto-set exercise year when start date changes
      if (name === 'Data Inici' && value) {
        // Parse date to get year
        let year;
        if (value.includes('-')) {
          // Format yyyy-mm-dd
          year = value.split('-')[0];
        } else if (value.includes('/')) {
          // Format dd/mm/yyyy
          year = value.split('/')[2];
        } else {
          // Try to parse as date
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            year = date.getFullYear().toString();
          }
        }
        
        if (year) {
          newData['Exercici'] = year;
        }
      }

      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!incidentData['Usuari (Email)'].trim() || !incidentData['Data Inici'].trim() || !incidentData.Tipus.trim()) {
      setError("L'email de l'usuari, la data d'inici i el tipus són obligatoris.");
      return;
    }

    // Create a copy to format for the sheet
    const formattedData = { ...incidentData };
    formattedData['Data Inici'] = toSheetFormat(formattedData['Data Inici']);
    formattedData['Data Fi'] = toSheetFormat(formattedData['Data Fi']);
    
    // Ensure time formats are correct (HH:MM)
    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      // If it's already in HH:MM format, return as is
      if (/^\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
      }
      // If it's an ISO date string representing time, convert it
      if (typeof timeStr === 'string' && timeStr.includes('T') && timeStr.includes('Z')) {
        try {
          const date = new Date(timeStr);
          if (!isNaN(date.getTime())) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          }
        } catch (e) {
          // Fall through to return original
        }
      }
      return timeStr; // fallback
    };

    const dataToSend = [
      formattedData['Usuari (Email)'],
      formattedData['Data Inici'],
      formatTime(formattedData['Hora Inici']),
      formattedData['Data Fi'],
      formatTime(formattedData['Hora Fi']),
      formattedData['Duració'],
      formattedData['Exercici'],
      formattedData['Tipus'],
      formattedData['Signatura Usuari'] ? 'TRUE' : 'FALSE',
      formattedData['Timestamp Signatura Usuari'],
      formattedData['Signatura Direcció'] ? 'TRUE' : 'FALSE',
      formattedData['Timestamp Signatura Direcció'],
      formattedData['Esborrat'] ? 'TRUE' : 'FALSE',
      formattedData['Observacions'],
    ];

    try {
      await onSaveIncident(dataToSend, originalSheetRowIndex);
      onClose();
    } catch (err) {
      // console.error("Error saving incident:", err);
      setError("Error en guardar la incidència. (Detalls: " + err.message + ")");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      {/* console.log("AddIncidentForm: Rendering form with incidentData:", incidentData) */}
      {/* console.log("AddIncidentForm: Available users:", users) */}
      {/* console.log("AddIncidentForm: Available incidentTypes:", incidentTypes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">Usuari (Email)</label>
          <Select
            key={`user-select-${incidentData['Usuari (Email)']}`}
            value={incidentData['Usuari (Email)']}
            onValueChange={(value) => handleChange({ target: { name: 'Usuari (Email)', value } })}
            disabled={profile?.role === 'Usuari'}
          >
            <SelectTrigger className="w-full">
              <div className="flex-1 truncate text-left">
                <SelectValue placeholder="Seleccioneu un usuari" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {users && users.length > 0 ? (
                users.map((user, index) => (
                  <SelectItem key={user.Email || index} value={user.Email || user.email || index}>{user.Nom || user.name || `Usuari ${index}`} ({user.Email || user.email || `email-${index}`})</SelectItem>
                ))
              ) : (
                <SelectItem key="no-users" value="" disabled>No hi ha usuaris disponibles</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Tipus</label>
          <Select
            key={`type-select-${incidentData['Tipus']}`}
            value={incidentData['Tipus']}
            onValueChange={(value) => handleChange({ target: { name: 'Tipus', value } })}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccioneu un tipus" />
            </SelectTrigger>
            <SelectContent>
              {incidentTypes && incidentTypes.length > 0 ? (
                incidentTypes.map((typeObj, index) => (
                  <SelectItem key={index} value={typeObj.NomTipus || typeObj.type || typeObj.Tipus || index}>{typeObj.NomTipus || typeObj.type || typeObj.Tipus || `Tipus ${index}`}</SelectItem>
                ))
              ) : (
                <SelectItem key="no-types" value="" disabled>No hi ha tipus disponibles</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Data Inici</label>
          <Input
            type="date"
            id="startDate"
            name="Data Inici"
            value={incidentData['Data Inici']}
            onChange={handleChange}
            required
          />
        </div>
        
        {selectedTypeUnit === 'D' && (
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Data Fi</label>
            <Input
              type="date"
              id="endDate"
              name="Data Fi"
              value={incidentData['Data Fi']}
              onChange={handleChange}
            />
          </div>
        )}

        {selectedTypeUnit === 'H' && (
          <>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Hora Inici</label>
              <Input
                type="time"
                id="startTime"
                name="Hora Inici"
                value={incidentData['Hora Inici']}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">Hora Fi</label>
              <Input
                type="time"
                id="endTime"
                name="Hora Fi"
                value={incidentData['Hora Fi']}
                onChange={handleChange}
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duració</label>
          <Input
            type="text"
            id="duration"
            name="Duració"
            value={incidentData['Duració']}
            readOnly
          />
        </div>
        <div>
          <label htmlFor="exercise" className="block text-sm font-medium text-gray-700 mb-1">Exercici</label>
          <Input
            type="text"
            id="exercise"
            name="Exercici"
            value={incidentData['Exercici']}
            readOnly
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="observacions" className="block text-sm font-medium text-gray-700 mb-1">Observacions</label>
        <Textarea
          id="observacions"
          name="Observacions"
          rows="3"
          value={incidentData['Observacions']}
          onChange={handleChange}
        ></Textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="userSignature"
            name="Signatura Usuari"
            checked={incidentData['Signatura Usuari']}
            disabled
            onCheckedChange={(checked) => handleChange({ target: { name: 'Signatura Usuari', type: 'checkbox', checked } })}
          />
          <label htmlFor="userSignature" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Signatura Usuari</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="directorSignature"
            name="Signatura Direcció"
            checked={incidentData['Signatura Direcció']}
            disabled
            onCheckedChange={(checked) => handleChange({ target: { name: 'Signatura Direcció', type: 'checkbox', checked } })}
          />
          <label htmlFor="directorSignature" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Signatura Direcció</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="deleted"
            name="Esborrat"
            checked={incidentData['Esborrat']}
            disabled
            onCheckedChange={(checked) => handleChange({ target: { name: 'Esborrat', type: 'checkbox', checked } })}
          />
          <label htmlFor="deleted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Esborrat</label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel·lar
        </Button>
        <Button type="submit" className="bg-[#288185] hover:bg-[#1e686b] text-white" disabled={isSaving}>
          {isSaving ? (incidentToEdit ? 'Guardant...' : 'Afegint...') : (incidentToEdit ? 'Guardar Canvis' : 'Afegir Incidència')}
        </Button>
      </div>
    </form>
  );
};

export default AddIncidentForm;