import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { 
  fetchSheetData, 
  appendSheetData, 
  updateSheetData, 
  getUserProfile, 
  getUsers, 
  getIncidentTypes 
} from './googleSheetsService';
import AddIncidentForm from './components/AddIncidentForm';
import SignatureConfirmPopup from './components/SignatureConfirmPopup';
import AnnualSummaryView from './components/AnnualSummaryView';
import DocumentationView from './components/DocumentationView';
import LoginView from './components/LoginView';
import HomeView from './components/HomeView';
import MyGroupsView from './components/MyGroupsView';
import CalendarMainView from './components/calendar/CalendarMainView';
import TICIncidentsView from './components/TICIncidentsView';
import MantenimentView from './components/MantenimentView';
import AvisosView from './components/AvisosView';
import ErrorBoundary from './components/ErrorBoundary';
import SeguimentCSIView from './components/SeguimentCSIView';

import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Alert, AlertDescription, AlertTitle, Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Info, X, ArrowLeft } from "lucide-react";


// Helper function to format dates for display
const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '';
  
  // Check if it's just a time in ISO format like 1899-12-30T09:00:00.000Z
  // This happens when hours are stored as dates in Google Sheets
  if (typeof dateStr === 'string' && dateStr.includes('T') && dateStr.includes('Z')) {
    // Extract time part from ISO string that represents just time
    if (dateStr.startsWith('1899-12-30')) {
      // This is a date that represents just time in Google Sheets
      const timePart = dateStr.split('T')[1]; // Get time part after 'T'
      if (timePart) {
        const time = timePart.split('.')[0]; // Remove milliseconds
        return time; // Return just the time part like '09:00:00'
      }
    }
    
    // For regular dates with time, return just the date in dd/mm/yyyy format
    const [datePart] = dateStr.split('T');
    if (datePart && datePart.includes('-')) {
      const parts = datePart.split('-');
      const day = parts[2].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[0];
      return `${day}/${month}/${year}`;
    }
  }
  
  // Check if already in dd/mm/yyyy format
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    // Handle case where dateStr might be '31T22:00:00.000Z/08/2025' or similar malformed format
    if (dateStr.length > 10 && dateStr.includes('T') && dateStr.includes('Z')) {
      // This suggests an error in date parsing, try to extract the proper date
      const cleanDate = dateStr.replace(/T.*Z/, '').split('/').reverse().join('-');
      if (cleanDate.split('-').length === 3) {
        const parts = cleanDate.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr; // Already dd/mm/yyyy
  }
  
  // Is in ISO format (yyyy-mm-dd) or similar
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      // Take only the date part (yyyy-mm-dd), ignoring time if present
      const datePart = parts[2].split('T')[0];
      const day = datePart.padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[0];
      return `${day}/${month}/${year}`;
    }
  }
  
  return dateStr; // Fallback
};

// Helper function to format time for display, handling ISO format dates that represent times
const formatTimeForDisplay = (timeStr) => {
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
  
  // Handle malformed time strings
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const hours = parts[0].padStart(2, '0');
      const minutes = parts[1].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }
  
  return timeStr; // fallback;
};

const formatTimestampForDisplay = (timestampStr) => {
  if (!timestampStr) return '';
  try {
    const date = new Date(timestampStr);
    if (isNaN(date.getTime())) {
        if (timestampStr.includes(',')) {
            const parts = timestampStr.split(',');
            const datePart = parts[0];
            const timePart = parts[1];
            if (datePart && timePart) {
                const [day, month, year] = datePart.trim().split('/');
                const [hour, minute] = timePart.trim().split(':');
                return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
            }
        }
        return timestampStr;
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return timestampStr;
  }
};

function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // login, home, incidents, groups
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [masterIncidents, setMasterIncidents] = useState([]); // Holds all incidents from the sheet
  const [incidents, setIncidents] = useState([]); // Holds filtered incidents for display
  const [modifiedIncidents, setModifiedIncidents] = useState([]); // Holds incidents modified after signing
  const [users, setUsers] = useState([]);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [editingIncident, setEditingIncident] = useState(null);
  const [isSignaturePopupOpen, setIsSignaturePopupOpen] = useState(false);
  const [incidentToSign, setIncidentToSign] = useState(null);
  const [signatureType, setSignatureType] = useState('');
  const [currentView, setCurrentView] = useState('list');
  const [accessToken, setAccessToken] = useState(null); // Start with null, don't load from localStorage immediately
  const [isAuthenticatedSession, setIsAuthenticatedSession] = useState(false); // New state to track if login process was completed in this session
  const [isSaving, setIsSaving] = useState(false); // Loading state for save button

  // On initial load, check if we have a stored token and validate it via the proxy
  useEffect(() => {
    const storedToken = localStorage.getItem('googleAccessToken');
    if (storedToken) {
      const checkSession = async () => {
        try {
          // The proxy will validate the token and return the user profile
          const userProfile = await getUserProfile(storedToken);
          if (userProfile) {
            setAccessToken(storedToken);
            setIsAuthenticatedSession(true);
            setProfile(userProfile);
            setCurrentScreen('home');
          } else {
            // This case is unlikely if the proxy correctly throws an error on failure
            localStorage.removeItem('googleAccessToken');
          }
        } catch (err) {
          console.error("Session check failed:", err);
          localStorage.removeItem('googleAccessToken');
        }
      };
      checkSession();
    }
  }, []); // Run only once on component mount

  const handleSignClick = (incidentData, originalSheetRowIndex, type) => {
    if (!isValidSignDate(incidentData)) {
      setError("No es pot signar una incidència abans de la seva data de finalització (o d'inici si no té data de fi).");
      return;
    }

    setIncidentToSign({ data: incidentData, originalSheetRowIndex: originalSheetRowIndex });
    setSignatureType(type);
    setIsSignaturePopupOpen(true);
  };

  const handleConfirmSignature = async () => {
    if (!incidentToSign || !profile) return;

    const { data, originalSheetRowIndex } = incidentToSign;
    const updatedIncidentData = [...data];

    const now = new Date().toLocaleString('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });

    if (signatureType === 'user') {
      updatedIncidentData[8] = 'TRUE';
      updatedIncidentData[9] = now;
    } else if (signatureType === 'director') {
      updatedIncidentData[10] = 'TRUE';
      updatedIncidentData[11] = now;
    }

    try {
      await updateSheetData(accessToken, `Incidències!A${originalSheetRowIndex}:N${originalSheetRowIndex}`, [updatedIncidentData]);
      fetchIncidents(); // Refetch all data after a change
      setIsSignaturePopupOpen(false);
      setIncidentToSign(null);
      setSignatureType('');
    } catch (err) {
      console.error("Error signing incident:", err);
      setError("Error al signar la incidència. (Detalls: " + err.message + ")");
      setIsSignaturePopupOpen(false);
    }
  };

  const isValidSignDate = (incidentData) => {
    const headers = masterIncidents.length > 0 ? masterIncidents[0] : [];
    const dataIniciIndex = headers.indexOf('Data Inici');
    const dataFiIndex = headers.indexOf('Data Fi');

    const dataIniciStr = incidentData[dataIniciIndex] ? incidentData[dataIniciIndex].trim() : '';
    const dataFiStr = incidentData[dataFiIndex] ? incidentData[dataFiIndex].trim() : '';

    const targetDateStr = dataFiStr || dataIniciStr;

    if (!targetDateStr) {
      return false; // No date to check against
    }

    let targetDate;
    if (targetDateStr.includes('/')) {
      // Handle dd/mm/yyyy format
      const parts = targetDateStr.split('/');
      if (parts.length === 3) {
        targetDate = new Date(parts[2], parts[1] - 1, parts[0]); // year, month-1, day
      } else {
        return false;
      }
    } else if (targetDateStr.includes('-')) {
      // Handle yyyy-mm-dd format
      const parts = targetDateStr.split('-');
      if (parts.length >= 3) {
        // Handle ISO format like 2025-01-15T... (take only the date part)
        const datePart = parts[2].split('T')[0];
        targetDate = new Date(parts[0], parts[1] - 1, datePart);
      } else {
        return false;
      }
    } else {
      // Try to parse as a date string in other formats
      targetDate = new Date(targetDateStr);
      if (isNaN(targetDate.getTime())) {
        return false; // Invalid date
      }
    }

    // Check if the parsed date is valid
    if (isNaN(targetDate.getTime())) {
      return false;
    }

    const today = new Date();
    // Set time to 00:00:00 for both dates to compare only the date parts
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return today >= targetDate; // True if today is on or after targetDate (today or past)
  };

  const handleCancelSignature = () => {
    setIsSignaturePopupOpen(false);
    setIncidentToSign(null);
    setSignatureType('');
  };

  const handleEditClick = (incidentData, originalSheetRowIndex) => {
    // console.log("App.js: handleEditClick called with:", { incidentData, originalSheetRowIndex });
    setEditingIncident({ data: incidentData, originalSheetRowIndex: originalSheetRowIndex });
  };

  const handleCloseForm = () => {
    setEditingIncident(null);
  };

  const handleSaveIncident = async (incidentData, originalSheetRowIndex) => {
    console.log("handleSaveIncident: incidentData before saving:", incidentData);
    console.log("handleSaveIncident: originalSheetRowIndex before saving:", originalSheetRowIndex);
    setIsSaving(true);
    try {
      const isEdit = originalSheetRowIndex !== null;

      if (!isEdit) {
        // It's a new incident, just append it
        await appendSheetData(accessToken, 'Incidències', [incidentData]);
      } else {
        const originalIncident = editingIncident.data;
        const isUserSigned = originalIncident[8] === 'TRUE';
        const isDirectorSigned = originalIncident[10] === 'TRUE';

        if (isUserSigned || isDirectorSigned) {
          // Signed incident: mark old as deleted and create a new one

          // 1. Mark original as deleted
          const deletedIncidentData = [...originalIncident];
          deletedIncidentData[12] = 'TRUE'; // Set 'Esborrat' to TRUE
          await updateSheetData(accessToken, `Incidències!A${originalSheetRowIndex}:N${originalSheetRowIndex}`, [deletedIncidentData]);

          // 2. Create new incident with the changes
          // The incidentData from the form already has signatures cleared
          await appendSheetData(accessToken, 'Incidències', [incidentData]);

        } else {
          // Not signed, just update it
          await updateSheetData(accessToken, `Incidències!A${originalSheetRowIndex}:N${originalSheetRowIndex}`, [incidentData]);
        }
      }

      fetchIncidents(); // Refetch all data after a change
      setEditingIncident(null);
    } catch (err) {
      console.error("Error saving incident:", err);
      setError("Error en guardar la incidència. Verifiqueu la configuració y els permisos. (Detalles: " + err.message + ")");
    } finally {
      setIsSaving(false);
    }
  };

  // Initial data fetch
  const fetchIncidents = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await fetchSheetData(accessToken, 'Incidències', 'A:N');
      setMasterIncidents(data);
    } catch (err) {
      console.error("Error fetching incidents:", err);
      setError("Error en carregar les incidències. Verifiqueu la configuració y els permisos.");
    }
  }, [accessToken]);

    useEffect(() => {
    if ((currentScreen === 'incidents' || currentScreen === 'tic-incidents' || currentScreen === 'manteniment-incidents') && isAuthenticatedSession) {
      fetchIncidents();      
    }
  }, [accessToken, currentScreen, isAuthenticatedSession]);

  // Load form dependencies when accessing incidents or related screens for immediate access
  useEffect(() => {
    if ((currentScreen === 'incidents' || currentScreen === 'tic-incidents' || currentScreen === 'manteniment-incidents') && accessToken) {
      const loadFormDependencies = async () => {
        try {
          const [usersData, typesData] = await Promise.all([
            getUsers(accessToken),
            getIncidentTypes(accessToken)
          ]);
          console.log("Loaded usersData:", usersData);
          console.log("Loaded typesData:", typesData);
          // Ensure we're setting arrays
          setUsers(Array.isArray(usersData) ? usersData : []);
          setIncidentTypes(Array.isArray(typesData) ? typesData : []);
        } catch (err) {
          console.error("Error loading form dependencies:", err);
          setError("Error en carregar les dades per als formularis (usuaris/tipus).");
          // Set empty arrays on error to prevent undefined issues
          setUsers([]);
          setIncidentTypes([]);
        }
      };
      loadFormDependencies();
    }
  }, [accessToken, currentScreen]);

  // Load form dependencies if they haven't been loaded yet when entering incidents screen
  useEffect(() => {
    if (currentScreen === 'incidents' && accessToken && (users.length === 0 || incidentTypes.length === 0)) {
      const loadFormDependencies = async () => {
        try {
          const [usersData, typesData] = await Promise.all([
            getUsers(accessToken),
            getIncidentTypes(accessToken)
          ]);
          console.log("Loaded usersData (fallback):", usersData);
          console.log("Loaded typesData (fallback):", typesData);
          // Ensure we're setting arrays
          setUsers(Array.isArray(usersData) ? usersData : []);
          setIncidentTypes(Array.isArray(typesData) ? typesData : []);
        } catch (err) {
          console.error("Error loading form dependencies:", err);
          setError("Error en carregar les dades per als formularis (usuaris/tipus).");
          // Set empty arrays on error to prevent undefined issues
          setUsers([]);
          setIncidentTypes([]);
        }
      };
      loadFormDependencies();
    }
  }, [currentScreen, accessToken, users.length, incidentTypes.length]);

  // Filtering logic
  const filteredIncidentsData = useMemo(() => {
    if (masterIncidents.length === 0) {
        return { incidents: [], modifiedIncidents: [] };
    }

    const headers = masterIncidents[0];
    const dataIniciIndex = headers.indexOf('Data Inici');
    const userEmailIndex = headers.indexOf('Usuari (Email)');
    const exerciseIndex = headers.indexOf('Exercici');
    const deletedIndex = headers.indexOf('Esborrat');

    // Helper function to parse date string to Date object for sorting
    const parseDateForSorting = (dateStr) => {
      if (!dateStr) return new Date(0); // Return epoch for empty dates
      if (typeof dateStr !== 'string') return new Date(0);
      
      // Handle dd/mm/yyyy format
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return new Date(parts[2], parts[1] - 1, parts[0]);
        }
      }
      // Handle yyyy-mm-dd format
      if (dateStr.includes('-')) {
        return new Date(dateStr);
      }
      return new Date(0);
    };

    // 1. Map and pre-filter rows that are empty
    let allRows = masterIncidents.slice(1).map((row, index) => ({
        data: row,
        originalSheetRowIndex: index + 2
    })).filter(item => item.data[dataIniciIndex] && item.data[dataIniciIndex].trim() !== '');

    // Separate deleted and active incidents
    const activeRows = allRows.filter(item => item.data[deletedIndex] !== 'TRUE');
    const deletedRows = allRows.filter(item => item.data[deletedIndex] === 'TRUE');

    // Sort by date (most recent first)
    activeRows.sort((a, b) => {
      const dateA = parseDateForSorting(a.data[dataIniciIndex]);
      const dateB = parseDateForSorting(b.data[dataIniciIndex]);
      return dateB - dateA; // Descending order (most recent first)
    });

    deletedRows.sort((a, b) => {
      const dateA = parseDateForSorting(a.data[dataIniciIndex]);
      const dateB = parseDateForSorting(b.data[dataIniciIndex]);
      return dateB - dateA; // Descending order (most recent first)
    });

    let filteredActiveRows = activeRows;
    let filteredDeletedRows = deletedRows;

    // 2. Apply user filter
    if (filterUser) {
        filteredActiveRows = filteredActiveRows.filter(item =>
            item.data[userEmailIndex] && item.data[userEmailIndex].toLowerCase().includes(filterUser.toLowerCase())
        );
        filteredDeletedRows = filteredDeletedRows.filter(item =>
            item.data[userEmailIndex] && item.data[userEmailIndex].toLowerCase().includes(filterUser.toLowerCase())
        );
    }

    // 3. Apply year filter
    if (filterYear) {
        filteredActiveRows = filteredActiveRows.filter(item => {
            const year = item.data[exerciseIndex];
            return year && year.toString() === filterYear;
        });
        filteredDeletedRows = filteredDeletedRows.filter(item => {
            const year = item.data[exerciseIndex];
            return year && year.toString() === filterYear;
        });
    }

    // 4. Set the final filtered incidents for display
    return {
      incidents: [headers, ...filteredActiveRows],
      modifiedIncidents: [headers, ...filteredDeletedRows]
    };
  }, [masterIncidents, filterUser, filterYear]);

  // Set the user filter automatically when the profile is loaded
  useEffect(() => {
    if (profile && profile.role === 'Usuari') {
      setFilterUser(profile.email);
    }
  }, [profile]);

  // Update incidents and modifiedIncidents when filtered data changes
  useEffect(() => {
    setIncidents(filteredIncidentsData.incidents);
    setModifiedIncidents(filteredIncidentsData.modifiedIncidents);
  }, [filteredIncidentsData]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userProfile = await getUserProfile(tokenResponse.access_token);

        if (userProfile) {
          setAccessToken(tokenResponse.access_token);
          localStorage.setItem('googleAccessToken', tokenResponse.access_token);
          setIsAuthenticatedSession(true);
          setProfile(userProfile);
          setCurrentScreen('home');
        } else {
          setError("Accés no autoritzat. L'usuari no s'ha trobat o no té permisos.");
        }
      } catch (err) {
        console.error(err);
        setError(`ERROR DETALLADO: ${err.message}`);
      }
    },
    onError: () => {
      setError("Error d'inici de sessió. Si us plau, torneu a intentar-ho.");
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/chat.spaces.readonly https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/classroom.rosters.readonly https://www.googleapis.com/auth/chat.memberships https://www.googleapis.com/auth/admin.directory.group.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
  });

  const handleLogout = () => {
    setProfile(null);
    setAccessToken(null);
    setIsAuthenticatedSession(false); // Reset session authentication flag
    setUsers([]);
    setIncidentTypes([]);
    setMasterIncidents([]);
    localStorage.removeItem('googleAccessToken');
    setCurrentScreen('login');
  };
  
  const IncidentsView = ({ onBackClick }) => {
    const exerciseIndex = masterIncidents.length > 0 ? masterIncidents[0].indexOf('Exercici') : -1;
    const availableYears = exerciseIndex === -1 ? [] : [...new Set(masterIncidents.slice(1).map(item => String(item[exerciseIndex]).trim()))].filter(Boolean).sort((a, b) => b - a);

    const columnHeaders = incidents.length > 0 ? incidents[0] : [];
    const signaturaUsuariIndex = columnHeaders.indexOf('Signatura Usuari');
    const timestampSignaturaUsuariIndex = columnHeaders.indexOf('Timestamp Signatura Usuari');
    const signaturaDireccioIndex = columnHeaders.indexOf('Signatura Direcció');
    const timestampSignaturaDireccioIndex = columnHeaders.indexOf('Timestamp Signatura Direcció');
    const userEmailIndex = columnHeaders.indexOf('Usuari (Email)');
    const duracioIndex = columnHeaders.indexOf('Duració');
    const tipusIndex = columnHeaders.indexOf('Tipus');
    const esborratIndex = columnHeaders.indexOf('Esborrat');
    const observacionsIndex = columnHeaders.indexOf('Observacions');
    const dataIniciIndex = columnHeaders.indexOf('Data Inici');
    const horaIniciIndex = columnHeaders.indexOf('Hora Inici');
    const dataFiIndex = columnHeaders.indexOf('Data Fi');
    const horaFiIndex = columnHeaders.indexOf('Hora Fi');

    return (
      <TooltipProvider>
        <div className="p-4 sm:p-6 lg:p-8">
          <header className="flex justify-between items-center mb-6 pb-4 border-b">
            <div className="flex items-center gap-4">
              <Button onClick={onBackClick} className="bg-primary-light text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tornar
              </Button>
              <h1 className="text-2xl font-bold">Incidències de personal</h1>
            </div>
            <div className="text-right">
              <div className="font-semibold">{profile.name} ({profile.role})</div>
              <div className="text-xs text-muted-foreground">{profile.email}</div>
            </div>
          </header>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {profile && (
            <Tabs defaultValue="list" value={currentView} onValueChange={setCurrentView} className="mt-4">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <TabsTrigger value="list">Incidències de personal</TabsTrigger>
                <TabsTrigger value="modified">Incidències modificades</TabsTrigger>
                <TabsTrigger value="summary">Resum Anual</TabsTrigger>
                <TabsTrigger value="documentation">Documentació</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <Card className="my-4">
                  <CardHeader>
                    <CardTitle>Filtres</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      { (profile?.role === 'Gestor' || profile?.role === 'Direcció') ? (
                        <div>
                          <label htmlFor="filterUser" className="block text-sm font-medium text-gray-700 mb-1">Filtrar per Usuari</label>
                          <Select value={filterUser} onValueChange={(value) => setFilterUser(value === 'all' ? '' : value)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Tots els usuaris" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tots els usuaris</SelectItem>
                              {users.filter(user => user && user.Email && user.Email.trim() !== '').map(user => (
                                <SelectItem key={user.Email} value={user.Email}>{user.Nom}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="filterUser" className="block text-sm font-medium text-gray-700 mb-1">Les meves Incidències</label>
                          <Input
                            type="text"
                            id="filterUser"
                            value={profile.email}
                            readOnly
                          />
                        </div>
                      )}
                      <div>
                        <label htmlFor="filterYear" className="block text-sm font-medium text-gray-700 mb-1">Filtrar per Any</label>
                        <Select value={filterYear} onValueChange={(value) => setFilterYear(value === 'all' ? '' : value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Tots els anys" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tots els anys</SelectItem>
                            {availableYears.filter(year => year && year.toString().trim() !== '').map(year => (
                              <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between items-center my-4">
                  <h3 className="text-xl font-semibold">Llistat d'Incidències</h3>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setEditingIncident({ data: null, originalSheetRowIndex: null })}
                  >
                    Afegir Nova Incidència
                  </Button>
                </div>

                {incidents.length > 1 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {incidents.slice(1).map((item, rowIndex) => {
                      const isUserSigned = item.data[signaturaUsuariIndex] === 'TRUE' || item.data[signaturaUsuariIndex] === true || item.data[signaturaUsuariIndex] === 'true' || item.data[signaturaUsuariIndex] === 1;
                      const isDirectorSigned = item.data[signaturaDireccioIndex] === 'TRUE' || item.data[signaturaDireccioIndex] === true || item.data[signaturaDireccioIndex] === 'true' || item.data[signaturaDireccioIndex] === 1;
                      const canSign = isValidSignDate(item.data);
                      const canUserSign = profile?.role === 'Usuari' && !isUserSigned && !isDirectorSigned && canSign;
                      const canDirectorSign = profile?.role === 'Direcció' && !isDirectorSigned && canSign;
                      const canEdit = !isDirectorSigned || (isDirectorSigned && profile.role === 'Direcció');
                      const observacions = item.data[observacionsIndex];

                      return (
                        <Card key={item.originalSheetRowIndex} className="shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
                          <CardContent className="p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                              <div className="truncate"><strong>Usuari:</strong> {item.data[userEmailIndex]}</div>
                              <div className="truncate"><strong>Tipus:</strong> {item.data[tipusIndex]}</div>
                              <div className="truncate"><strong>Duració:</strong> {item.data[duracioIndex]}</div>
                              <div className="truncate"><strong>Inici:</strong> {formatDateForDisplay(item.data[dataIniciIndex])} {formatTimeForDisplay(item.data[horaIniciIndex])}</div>
                              <div className="truncate"><strong>Fi:</strong> {item.data[dataFiIndex] && item.data[dataFiIndex].trim() !== '' ?
                                `${formatDateForDisplay(item.data[dataFiIndex])} ${formatTimeForDisplay(item.data[horaFiIndex])}` :
                                (item.data[horaFiIndex] && item.data[horaFiIndex].trim() !== '' ?
                                  `${formatTimeForDisplay(item.data[horaFiIndex])}` :
                                  'No especificada')}</div>
                              <div className="truncate flex items-center">
                                <strong>Observacions:</strong>
                                {observacions && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="info-icon ml-1 cursor-pointer">
                                        <Info className="h-4 w-4 text-gray-500" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{observacions}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="truncate"><strong>Signatura Usuari:</strong> <input type="checkbox" checked={isUserSigned} readOnly />
                                {isUserSigned && <span className="block text-xs text-gray-500">{formatTimestampForDisplay(item.data[timestampSignaturaUsuariIndex])}</span>}
                              </div>
                              <div className="truncate"><strong>Signatura Direcció:</strong> <input type="checkbox" checked={isDirectorSigned} readOnly />
                                {isDirectorSigned && <span className="block text-xs text-gray-500">{formatTimestampForDisplay(item.data[timestampSignaturaDireccioIndex])}</span>}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {canEdit && <Button
                                size="sm"
                                className="bg-[#288185] hover:bg-[#1e686b] text-white h-8 px-3 text-xs"
                                onClick={() => handleEditClick(item.data, item.originalSheetRowIndex)}
                              >
                                Editar
                              </Button>}
                              {canUserSign && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"
                                  onClick={() => handleSignClick(item.data, item.originalSheetRowIndex, 'user')}
                                >
                                  Signar (Usuari)
                                </Button>
                              )}
                              {canDirectorSign && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs"
                                  onClick={() => handleSignClick(item.data, item.originalSheetRowIndex, 'director')}
                                >
                                  Signar (Direcció)
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p>No hi ha incidències per mostrar.</p>
                )}
              </TabsContent>

              <TabsContent value="summary">
                <AnnualSummaryView incidents={incidents} incidentTypes={incidentTypes} profile={profile} />
              </TabsContent>

              <TabsContent value="modified">
                <h3 className="text-xl font-semibold mb-3">Incidències modificades després de signar</h3>
                {modifiedIncidents.length > 1 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {modifiedIncidents.slice(1).map((item, rowIndex) => {
                      const isUserSigned = item.data[signaturaUsuariIndex] === 'TRUE' || item.data[signaturaUsuariIndex] === true || item.data[signaturaUsuariIndex] === 'true' || item.data[signaturaUsuariIndex] === 1;
                      const isDirectorSigned = item.data[signaturaDireccioIndex] === 'TRUE' || item.data[signaturaDireccioIndex] === true || item.data[signaturaDireccioIndex] === 'true' || item.data[signaturaDireccioIndex] === 1;

                      return (
                        <Card key={item.originalSheetRowIndex} className="shadow-sm rounded-lg">
                          <CardContent className="p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                              <div className="truncate"><strong>Usuari:</strong> {item.data[userEmailIndex]}</div>
                              <div className="truncate"><strong>Inici:</strong> {formatDateForDisplay(item.data[dataIniciIndex])} {formatTimeForDisplay(item.data[horaIniciIndex])}</div>
                              <div className="truncate"><strong>Fi:</strong> {item.data[dataFiIndex] && item.data[dataFiIndex].trim() !== '' ?
                                `${formatDateForDisplay(item.data[dataFiIndex])} ${formatTimeForDisplay(item.data[horaFiIndex])}` :
                                (item.data[horaFiIndex] && item.data[horaFiIndex].trim() !== '' ?
                                  `${formatTimeForDisplay(item.data[horaFiIndex])}` :
                                  'No especificada')}</div>
                              <div className="truncate"><strong>Duració:</strong> {item.data[duracioIndex]}</div>
                              <div className="truncate"><strong>Tipus:</strong> {item.data[tipusIndex]}</div>
                              <div className="truncate">
                                <strong>Signatura Usuari:</strong> <input type="checkbox" checked={isUserSigned} readOnly />
                                {isUserSigned && <span className="block text-xs text-gray-500">{item.data[timestampSignaturaUsuariIndex]}</span>}
                              </div>
                              <div className="truncate">
                                <strong>Signatura Direcció:</strong> <input type="checkbox" checked={isDirectorSigned} readOnly />
                                {isDirectorSigned && <span className="block text-xs text-gray-500">{item.data[timestampSignaturaDireccioIndex]}</span>}
                              </div>
                              <div className="truncate">
                                <strong>Esborrat:</strong> <input type="checkbox" checked={item.data[esborratIndex] === 'TRUE'} readOnly />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p>No hi ha incidències modificades per mostrar.</p>
                )}
              </TabsContent>

              <TabsContent value="documentation">
                <DocumentationView accessToken={accessToken} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </TooltipProvider>
    );
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginView onLogin={login} error={error} />;
      case 'home':
        return <HomeView onIncidentsClick={() => setCurrentScreen('incidents')} onCalendarClick={() => setCurrentScreen('calendar')} onGroupsClick={() => setCurrentScreen('groups')} onTICIncidentsClick={() => setCurrentScreen('tic-incidents')} onMantenimentClick={() => setCurrentScreen('manteniment-incidents')} onAvisosClick={() => setCurrentScreen('avisos')} onSeguimentCSIClick={() => setCurrentScreen('seguiment-csi')} accessToken={accessToken} profile={profile} onLogout={handleLogout} setProfile={setProfile} setError={setError} setCurrentScreen={setCurrentScreen} />;
      case 'incidents':
        return <ErrorBoundary><IncidentsView onBackClick={() => setCurrentScreen('home')} /></ErrorBoundary>;
      case 'calendar':
        return <CalendarMainView onBackClick={() => setCurrentScreen('home')} accessToken={accessToken} profile={profile} />;
      case 'groups':
        return <MyGroupsView onBackClick={() => setCurrentScreen('home')} accessToken={accessToken} profile={profile} />;
      case 'avisos':
        return <AvisosView onBackClick={() => setCurrentScreen('home')} profile={profile} accessToken={accessToken} />;
      case 'tic-incidents':
        return <TICIncidentsView onBackClick={() => setCurrentScreen('home')} profile={profile} accessToken={accessToken} users={users} />;
      case 'manteniment-incidents':
        return <MantenimentView onBackClick={() => setCurrentScreen('home')} profile={profile} accessToken={accessToken} users={users} />;
      case 'seguiment-csi':
        return <SeguimentCSIView onBackClick={() => setCurrentScreen('home')} accessToken={accessToken} profile={profile} />;
      
      default:
        return <LoginView onLogin={login} error={error} />;
    }
  };

  return (
      <div className="App">
        {renderScreen()}
        {editingIncident !== null && (
      (() => {
        // Only render the form if all necessary data is available
        const isDataReady = users && incidentTypes && 
                          (profile?.role !== 'Usuari' || users.length > 0) && 
                          incidentTypes.length > 0 &&
                          Array.isArray(users) && Array.isArray(incidentTypes);
                      
        if (!isDataReady) {
          return (
            <Dialog open={editingIncident !== null} onOpenChange={handleCloseForm}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Carregant dades...</DialogTitle>
                </DialogHeader>
                <div className="p-4 text-center">
                  <p>Carregant dades del formulari...</p>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Estats actuals:</p>
                    <p>- Usuaris: {users ? (Array.isArray(users) ? `Array(${users.length})` : `Tipus: ${typeof users}`) : 'null/undefined'}</p>
                    <p>- Tipus d'incidències: {incidentTypes ? (Array.isArray(incidentTypes) ? `Array(${incidentTypes.length})` : `Tipus: ${typeof incidentTypes}`) : 'null/undefined'}</p>
                    <p>- Rol d'usuari: {profile?.role || 'sense perfil'}</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        }
        
        return (
          <Dialog open={editingIncident !== null} onOpenChange={handleCloseForm}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingIncident.data ? 'Editar Incidència' : 'Afegir Nova Incidència'}</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                Formulari per {editingIncident.data ? 'editar' : 'afegir'} una incidència de personal.
              </DialogDescription>
              <AddIncidentForm
                incidentToEdit={editingIncident.data}
                originalSheetRowIndex={editingIncident.originalSheetRowIndex}
                onSaveIncident={handleSaveIncident}
                onClose={handleCloseForm}
                setError={setError}
                profile={profile}
                users={users}
                incidentTypes={incidentTypes}
                isSaving={isSaving}
              />
            </DialogContent>
          </Dialog>
        );
      })()
    )}
    <SignatureConfirmPopup
      isOpen={isSignaturePopupOpen}
      onConfirm={handleConfirmSignature}
      onCancel={handleCancelSignature}
      message={`Esteu segur que voleu signar aquesta incidència com a ${signatureType === 'user' ? 'Usuari' : 'Direcció'}?`}
    />
      </div>
  );
}

function AppWrapper() {
  // console.log("REACT_APP_GOOGLE_CLIENT_ID en AppWrapper:", process.env.REACT_APP_GOOGLE_CLIENT_ID);
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  );
}

export default AppWrapper;
