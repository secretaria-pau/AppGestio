import React, { useState, useEffect } from 'react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Checkbox } from "./ui";

// Helper functions for date conversion
const toInputFormat = (dateStr) => { // dd/mm/yyyy -> yyyy-mm-dd
  if (!dateStr || !dateStr.includes('/')) return dateStr; // Already in correct format or empty
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr; // Invalid format
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
};

const toSheetFormat = (dateStr) => { // yyyy-mm-dd -> dd/mm/yyyy
  if (!dateStr || dateStr.includes('/')) return dateStr; // Already in correct format or empty
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr; // Invalid format
  return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
};

const AddIncidentForm = ({ 
  incidentToEdit, 
  originalSheetRowIndex, 
  onSaveIncident, 
  onClose, 
  setError, 
  profile, 
  users, 
  incidentTypes 
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
    console.log("AddIncidentForm: useEffect triggered", { incidentToEdit, profile, incidentTypes, users });

    // Asegurarse de que todas las dependencias estén disponibles
    if (!profile || !users || users.length === 0 || !incidentTypes || incidentTypes.length === 0) {
        console.log("AddIncidentForm: useEffect waiting for dependencies...");
        return; // Salir temprano si las dependencias no están listas
    }

    if (incidentToEdit) {
      console.log("AddIncidentForm: Processing incidentToEdit data");
      console.log("AddIncidentForm: incidentToEdit content:", incidentToEdit);
      console.log("AddIncidentForm: incidentToEdit type:", typeof incidentToEdit);
      console.log("AddIncidentForm: incidentToEdit isArray:", Array.isArray(incidentToEdit));
      
      const mappedData = {
        'Usuari (Email)': (incidentToEdit[0] || '').trim(),
        'Data Inici': toInputFormat(incidentToEdit[1] || ''),
        'Hora Inici': incidentToEdit[2] || '',
        'Data Fi': toInputFormat(incidentToEdit[3] || ''),
        'Hora Fi': incidentToEdit[4] || '',
        'Duració': incidentToEdit[5] || '',
        'Exercici': incidentToEdit[6] || '',
        'Tipus': (incidentToEdit[7] || '').trim(),
        'Signatura Usuari': incidentToEdit[8] === 'TRUE',
        'Timestamp Signatura Usuari': incidentToEdit[9] || '',
        'Signatura Direcció': incidentToEdit[10] === 'TRUE',
        'Timestamp Signatura Direcció': incidentToEdit[11] || '',
        'Esborrat': incidentToEdit[12] === 'TRUE',
        'Observacions': incidentToEdit[13] || '',
      };
      
      console.log("AddIncidentForm: Editing incident, mapped data:", mappedData);
      console.log("AddIncidentForm: Usuari value:", mappedData['Usuari (Email)']);
      console.log("AddIncidentForm: Tipus value:", mappedData['Tipus']);
      
      setIncidentData(mappedData);
      const typeObj = incidentTypes.find(t => t.type === mappedData['Tipus']);
      if (typeObj) {
        setSelectedTypeUnit(typeObj.durationUnit);
      } else {
        setSelectedTypeUnit('H');
      }
    } else {
      const defaultUser = (profile.role === 'Usuari') ? profile.email : '';
      setIncidentData({
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
      });
    }
  }, [incidentToEdit, profile, users, incidentTypes]);

  const calculateDuration = (data) => {
    const typeObj = incidentTypes.find(t => t.type === data.Tipus);
    const unit = typeObj ? typeObj.durationUnit : 'H';

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

      if (name === 'Tipus') {
        const typeObj = incidentTypes.find(t => t.type === value);
        const newUnit = typeObj ? typeObj.durationUnit : 'H';
        setSelectedTypeUnit(newUnit);
        // Clear fields that are not relevant for the new type
        if (newUnit === 'H') {
          newData['Data Fi'] = '';
        } else if (newUnit === 'D') {
          newData['Hora Inici'] = '';
          newData['Hora Fi'] = '';
        }
      }

      if (name === 'Data Inici' && value) {
        newData['Exercici'] = new Date(value).getFullYear().toString();
      }

      newData['Duració'] = calculateDuration(newData);

      if (['Data Inici', 'Hora Inici', 'Data Fi', 'Hora Fi', 'Tipus'].includes(name)) {
        if (incidentToEdit && (incidentToEdit[8] === 'TRUE' || incidentToEdit[10] === 'TRUE')) {
          newData['Signatura Usuari'] = false;
          newData['Timestamp Signatura Usuari'] = '';
          newData['Signatura Direcció'] = false;
          newData['Timestamp Signatura Direcció'] = '';
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

    const dataToSend = [
      formattedData['Usuari (Email)'],
      formattedData['Data Inici'],
      formattedData['Hora Inici'],
      formattedData['Data Fi'],
      formattedData['Hora Fi'],
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
      console.error("Error saving incident:", err);
      setError("Error en guardar la incidència. (Detalls: " + err.message + ")");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      {console.log("AddIncidentForm: Rendering form with incidentData:", incidentData)}
      {console.log("AddIncidentForm: Available users:", users)}
      {console.log("AddIncidentForm: Available incidentTypes:", incidentTypes)}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">Usuari (Email)</label>
          {console.log("AddIncidentForm: User field value:", incidentData['Usuari (Email)'])}
          {console.log("AddIncidentForm: User field disabled:", profile?.role === 'Usuari')}
          {console.log("AddIncidentForm: Available users:", users)}
          {console.log("AddIncidentForm: Matching user found:", users.find(u => u.email === incidentData['Usuari (Email)']))}
          <Select
            key={`user-select-${incidentData['Usuari (Email)']}`}
            value={incidentData['Usuari (Email)']}
            onValueChange={(value) => handleChange({ target: { name: 'Usuari (Email)', value } })}
            disabled={profile?.role === 'Usuari'}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccioneu un usuari" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user, index) => (
                <SelectItem key={index} value={user.email}>{user.name} ({user.email})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Tipus</label>
          {console.log("AddIncidentForm: Type field value:", incidentData['Tipus'])}
          {console.log("AddIncidentForm: Available incidentTypes:", incidentTypes)}
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
              {incidentTypes.map((typeObj, index) => (
                <SelectItem key={index} value={typeObj.type}>{typeObj.type}</SelectItem>
              ))}
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
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel·lar
        </Button>
        <Button type="submit" className="bg-[#288185] hover:bg-[#1e686b] text-white">
          {incidentToEdit ? 'Guardar Canvis' : 'Afegir Incidència'}
        </Button>
      </div>
    </form>
  );
};

export default AddIncidentForm;