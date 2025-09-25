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

import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Alert, AlertDescription, AlertTitle, Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Info, X, ArrowLeft } from "lucide-react";


// Helper function to format dates for display
const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr; // Already dd/mm/yyyy
  if (dateStr.includes('-')) { // Is yyyy-mm-dd
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr; // Fallback
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

  // On initial load, check if we have a stored token and validate it
  useEffect(() => {
    const storedToken = localStorage.getItem('googleAccessToken');
    if (storedToken) {
      // Attempt to validate the token by fetching user info
      const validateToken = async () => {
        try {
          const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${storedToken}` },
          });
          if (response.ok) {
            // Token seems valid, set it and proceed to check user profile
            setAccessToken(storedToken);
            setIsAuthenticatedSession(true); // Mark session as authenticated
            const googleProfile = await response.json();
            
            // Now check if the user is in our sheets database
            const userProfile = await getUserProfile(googleProfile.email, storedToken);
            if (userProfile) {
              setProfile(userProfile);
              setCurrentScreen('home');
            } else {
              // Valid Google token, but not authorized user
              setError("Accés no autoritzat. El vostre correu electrònic no es troba a la llista d'usuaris permesos.");
              setAccessToken(null);
              localStorage.removeItem('googleAccessToken');
            }
          } else {
            // Token is invalid/expired
            localStorage.removeItem('googleAccessToken');
          }
        } catch (err) {
          console.error("Error validating stored access token:", err);
          // If validation fails, remove the stored token
          localStorage.removeItem('googleAccessToken');
        }
      };
      validateToken();
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
      await updateSheetData(`Incidències!A${originalSheetRowIndex}:N${originalSheetRowIndex}`, [updatedIncidentData], accessToken);
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
      const parts = targetDateStr.split('/');
      targetDate = new Date(parts[2], parts[1] - 1, parts[0]);
    } else if (targetDateStr.includes('-')) {
      const parts = targetDateStr.split('-');
      targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      return false; // Invalid date format
    }

    const today = new Date();
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return today >= targetDate; // True if today is on or after targetDate
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
    try {
      const isEdit = originalSheetRowIndex !== null;

      if (!isEdit) {
        // It's a new incident, just append it
        await appendSheetData('Incidències!A:N', [incidentData], accessToken);
      } else {
        const originalIncident = editingIncident.data;
        const isUserSigned = originalIncident[8] === 'TRUE';
        const isDirectorSigned = originalIncident[10] === 'TRUE';

        if (isUserSigned || isDirectorSigned) {
          // Signed incident: mark old as deleted and create a new one
          
          // 1. Mark original as deleted
          const deletedIncidentData = [...originalIncident];
          deletedIncidentData[12] = 'TRUE'; // Set 'Esborrat' to TRUE
          await updateSheetData(`Incidències!A${originalSheetRowIndex}:N${originalSheetRowIndex}`, [deletedIncidentData], accessToken);

          // 2. Create new incident with the changes
          // The incidentData from the form already has signatures cleared
          await appendSheetData('Incidències!A:N', [incidentData], accessToken);

        } else {
          // Not signed, just update it
          await updateSheetData(`Incidències!A${originalSheetRowIndex}:N${originalSheetRowIndex}`, [incidentData], accessToken);
        }
      }

      fetchIncidents(); // Refetch all data after a change
      setEditingIncident(null);
    } catch (err) {
      console.error("Error saving incident:", err);
      setError("Error en guardar la incidència. Verifiqueu la configuració y els permisos. (Detalles: " + err.message + ")");
    }
  };

  // Initial data fetch
  const fetchIncidents = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await fetchSheetData('Incidències!A:N', accessToken);
      setMasterIncidents(data);
    } catch (err) {
      console.error("Error fetching incidents:", err);
      setError("Error en carregar les incidències. Verifiqueu la configuració y els permisos.");
    }
  }, [accessToken]);

  useEffect(() => {
    if ((currentScreen === 'incidents' || currentScreen === 'tic-incidents' || currentScreen === 'manteniment-incidents') && isAuthenticatedSession) {
      fetchIncidents();
      
      // Load form dependencies only if we have a valid session
      const loadFormDependencies = async () => {
        try {
          const [usersData, typesData] = await Promise.all([
            getUsers(accessToken),
            getIncidentTypes(accessToken)
          ]);
          setUsers(usersData); 
          setIncidentTypes(typesData);
        } catch (err) {
          console.error("Error loading form dependencies:", err);
          setError("Error en carregar les dades per als formularis (usuaris/tipus).");
        }
      };
      loadFormDependencies();
    }
  }, [accessToken, currentScreen, isAuthenticatedSession]);

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

    // 1. Map and pre-filter rows that are empty
    let allRows = masterIncidents.slice(1).map((row, index) => ({
        data: row,
        originalSheetRowIndex: index + 2
    })).filter(item => item.data[dataIniciIndex] && item.data[dataIniciIndex].trim() !== '');

    // Separate deleted and active incidents
    const activeRows = allRows.filter(item => item.data[deletedIndex] !== 'TRUE');
    const deletedRows = allRows.filter(item => item.data[deletedIndex] === 'TRUE');

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
        const googleProfile = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` },
        }).then(res => res.json());

        const userProfile = await getUserProfile(googleProfile.email, tokenResponse.access_token);

        if (userProfile) {
          setAccessToken(tokenResponse.access_token);
          localStorage.setItem('googleAccessToken', tokenResponse.access_token);
          setIsAuthenticatedSession(true); // Mark session as authenticated after successful login
          setProfile(userProfile);
          setCurrentScreen('home');
        } else {
          setError("Accés no autoritzat. El vostre correu electrònic no es troba a la llista d'usuaris permesos.");
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Ha ocorregut un error durant l'inici de sessió.");
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
    const availableYears = exerciseIndex === -1 ? [] : [...new Set(masterIncidents.slice(1).map(item => item[exerciseIndex]))].filter(Boolean).sort((a, b) => b - a);

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
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
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
                              {users.filter(user => user && user.email && user.email.trim() !== '').map(user => (
                                <SelectItem key={user.email} value={user.email}>{user.name}</SelectItem>
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
                  <div className="grid grid-cols-1 gap-4">
                    {incidents.slice(1).map((item, rowIndex) => {
                      const isUserSigned = item.data[signaturaUsuariIndex] === 'TRUE';
                      const isDirectorSigned = item.data[signaturaDireccioIndex] === 'TRUE';
                      const canSign = isValidSignDate(item.data);
                      const canUserSign = profile?.role === 'Usuari' && !isUserSigned && !isDirectorSigned && canSign;
                      const canDirectorSign = profile?.role === 'Direcció' && !isDirectorSigned && canSign;
                      const canEdit = !isDirectorSigned || (isDirectorSigned && profile.role === 'Direcció');
                      const observacions = item.data[observacionsIndex];

                      return (
                        <Card key={rowIndex} className="shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                              <div><strong>Usuari:</strong> {item.data[userEmailIndex]}</div>
                              <div><strong>Tipus:</strong> {item.data[tipusIndex]}</div>
                              <div><strong>Duració:</strong> {item.data[duracioIndex]}</div>
                              <div><strong>Inici:</strong> {formatDateForDisplay(item.data[dataIniciIndex])} {item.data[horaIniciIndex]}</div>
                              <div><strong>Fi:</strong> {formatDateForDisplay(item.data[dataFiIndex])} {item.data[horaFiIndex]}</div>
                              <div className="flex items-center">
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
                              <div>
                                <strong>Signatura Usuari:</strong> <input type="checkbox" checked={isUserSigned} readOnly />
                                {isUserSigned && <span className="block text-xs text-gray-500">{item.data[timestampSignaturaUsuariIndex]}</span>}
                              </div>
                              <div>
                                <strong>Signatura Direcció:</strong> <input type="checkbox" checked={isDirectorSigned} readOnly />
                                {isDirectorSigned && <span className="block text-xs text-gray-500">{item.data[timestampSignaturaDireccioIndex]}</span>}
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {canEdit && <Button
                                size="sm"
                                className="bg-[#288185] hover:bg-[#1e686b] text-white"
                                onClick={() => handleEditClick(item.data, item.originalSheetRowIndex)}
                              >
                                Editar
                              </Button>}
                              {canUserSign && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleSignClick(item.data, item.originalSheetRowIndex, 'user')}
                                >
                                  Signar (Usuari)
                                </Button>
                              )}
                              {canDirectorSign && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
                <AnnualSummaryView incidents={incidents} profile={profile} />
              </TabsContent>

              <TabsContent value="modified">
                <h3 className="text-xl font-semibold mb-3">Incidències modificades després de signar</h3>
                {modifiedIncidents.length > 1 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {modifiedIncidents.slice(1).map((item, rowIndex) => {
                      const isUserSigned = item.data[signaturaUsuariIndex] === 'TRUE';
                      const isDirectorSigned = item.data[signaturaDireccioIndex] === 'TRUE';

                      return (
                        <Card key={rowIndex} className="shadow-sm rounded-lg">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                              <div><strong>Usuari:</strong> {item.data[userEmailIndex]}</div>
                              <div><strong>Inici:</strong> {formatDateForDisplay(item.data[dataIniciIndex])} {item.data[horaIniciIndex]}</div>
                              <div><strong>Fi:</strong> {formatDateForDisplay(item.data[dataFiIndex])} {item.data[horaFiIndex]}</div>
                              <div><strong>Duració:</strong> {item.data[duracioIndex]}</div>
                              <div><strong>Tipus:</strong> {item.data[tipusIndex]}</div>
                              <div>
                                <strong>Signatura Usuari:</strong> <input type="checkbox" checked={isUserSigned} readOnly />
                                {isUserSigned && <span className="block text-xs text-gray-500">{item.data[timestampSignaturaUsuariIndex]}</span>}
                              </div>
                              <div>
                                <strong>Signatura Direcció:</strong> <input type="checkbox" checked={isDirectorSigned} readOnly />
                                {isDirectorSigned && <span className="block text-xs text-gray-500">{item.data[timestampSignaturaDireccioIndex]}</span>}
                              </div>
                              <div>
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

          {editingIncident !== null && (
            (() => {
              // console.log("App.js: Rendering AddIncidentForm with editingIncident:", editingIncident);
              // console.log("App.js: editingIncident.data:", editingIncident.data);
              // console.log("App.js: editingIncident.data type:", typeof editingIncident.data);
              // console.log("App.js: editingIncident.data isArray:", Array.isArray(editingIncident.data));
              // if (Array.isArray(editingIncident.data)) {
              //   console.log("App.js: editingIncident.data length:", editingIncident.data.length);
              //   console.log("App.js: editingIncident.data content:", editingIncident.data);
              // }
              return (
                <Dialog open={editingIncident !== null} onOpenChange={handleCloseForm}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>{editingIncident.data ? 'Editar Incidència' : 'Afegir Nova Incidència'}</DialogTitle>
                    </DialogHeader>
                    <AddIncidentForm
                      incidentToEdit={editingIncident.data}
                      originalSheetRowIndex={editingIncident.originalSheetRowIndex}
                      onSaveIncident={handleSaveIncident}
                      onClose={handleCloseForm}
                      setError={setError}
                      profile={profile}
                      users={users}
                      incidentTypes={incidentTypes}
                    />
                  </DialogContent>
                </Dialog>
              );
            })()
          )}
          )}
          )}

          <SignatureConfirmPopup
            isOpen={isSignaturePopupOpen}
            onConfirm={handleConfirmSignature}
            onCancel={handleCancelSignature}
            message={`Esteu segur que voleu signar aquesta incidència com a ${signatureType === 'user' ? 'Usuari' : 'Direcció'}?`}
          />

          
        </div>
      </TooltipProvider>
    );
  }

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
      </div>
  );
}

function AppWrapper() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  );
}

export default AppWrapper;