import React, { useState, useEffect } from 'react';
import { callProxy } from '../proxyService';
import AdminView from './AdminView';
import UserGroupsView from './UserGroupsView';
import { Button, Alert, AlertDescription, AlertTitle, Card, CardContent } from "./ui";
import { ArrowLeft } from 'lucide-react';

const MyGroupsView = ({ onBackClick, accessToken, profile }) => {
  const [config, setConfig] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [chats, setChats] = useState([]);
  const [students, setStudents] = useState([]); // Add students state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    
    try {
      const getData = (response) => Array.isArray(response) ? response : (response && response.data ? response.data : []);

      // Load essential data first (config and classrooms)
      let configData = [];
      try {
        const configResponse = await callProxy('getConfig', accessToken);
        configData = getData(configResponse);
      } catch (configErr) {
        // console.error('Error loading full configuration data:', configErr);
        // If the full config fails (likely due to too many rows), try loading just the required range
        try {
          // Load only the first 6 columns that are needed
          const rangeResponse = await callProxy('getSheetRange', accessToken, { sheetName: 'Configuració', range: 'A:F' });
          configData = getData(rangeResponse);
        } catch (rangeErr) {
          // console.error('Error loading configuration data range:', rangeErr);
          setError('Error carregant configuració. Si us plau, revisa la pestanya Configuració de la fulla de càlcul.');
          configData = [];
        }
      }
      
      // Filter config data to only include rows where column B (Nom Classroom) has value and doesn't start with DEL
      const filteredConfig = Array.isArray(configData) 
        ? configData.filter(row => {
            const nomClassroom = row[1]; // Column B is index 1
            return nomClassroom && 
                   typeof nomClassroom === 'string' && 
                   nomClassroom.trim() !== '' && 
                   !nomClassroom.startsWith('DEL');
          })
        : [];
      setConfig(filteredConfig);
      
      const classroomsDataResponse = await callProxy('getSheetData', accessToken, { sheetName: 'Llista Classrooms' });
      const classroomsData = getData(classroomsDataResponse);
      
      // Process classrooms immediately so users see them quickly
      const processedClassrooms = classroomsData.map(classroom => {
        // classroom structure: [Nom Classroom, URL, ID Classroom]
        const classroomId = classroom[2]; // ID Classroom es el tercer campo
        const configEntry = configData.find(c => c && c.length > 5 && String(c[5]) === String(classroomId)); // Use configData here safely
        const groupEmail = configEntry ? configEntry[2] : ''; // c[2] es Google Group associat
        return {
          name: classroom[0], // Nom Classroom es el primer campo
          alternateLink: classroom[1], // URL es el segundo campo
          id: classroomId,
          groupName: groupEmail,
          chatName: configEntry ? configEntry[3] : '', // c[3] es Google Chat associat
        };
      });
      
      // Ordenar classrooms alfabéticamente por nombre
      const sortedClassrooms = processedClassrooms.sort((a, b) => a.name.localeCompare(b.name));
      
      setClassrooms(sortedClassrooms);
      
      // Load other data sequentially to avoid quota limits
      try {
        const teachersResponse = await callProxy('getSheetData', accessToken, { sheetName: 'Professors' });
        const teachersData = getData(teachersResponse);
        setTeachers(teachersData.map(teacher => ({ 
          name: teacher[1], // Nom Professor es el segundo campo
          email: teacher[2], // Email Professor es el tercer campo  
          classroomName: teacher[0] // Nom Curs es el primer campo
        })));
      } catch (teachersErr) {
        // console.error('Error loading teachers:', teachersErr);
      }

      try {
        const groupsResponse = await callProxy('getSheetData', accessToken, { sheetName: 'Llista Groups' });
        const groupsData = getData(groupsResponse);
        setGroups(groupsData.map(group => group[0])); // Nom Group es el primer campo
        const groupUrlMap = new Map(groupsData.map(group => [group[0], group[1]])); // [Nom Group, URL]
        
        // Update classrooms with group URLs after groups are loaded
        setClassrooms(prevClassrooms => 
          prevClassrooms.map(classroom => ({
            ...classroom,
            groupUrl: groupUrlMap.get(classroom.groupName) || ''
          }))
        );
      } catch (groupsErr) {
        // console.error('Error loading groups:', groupsErr);
      }

      try {
        const chatsResponse = await callProxy('getSheetData', accessToken, { sheetName: 'Llista Chats' });
        const chatsData = getData(chatsResponse);
        setChats(chatsData.map(chat => ({ displayName: chat[0], id: chat[2] || chat[1] }))); // Nom Chat es [0], ID es [2] o [1]
        
        // Update classrooms with chat IDs after chats are loaded
        setClassrooms(prevClassrooms => 
          prevClassrooms.map(classroom => ({
            ...classroom,
            chatId: chatsData.find(chat => chat[0] === classroom.chatName)?.[2] // Nom Chat es [0], ID es [2]
          }))
        );
      } catch (chatsErr) {
        // console.error('Error loading chats:', chatsErr);
      }

      try {
        const studentsResponse = await callProxy('getSheetData', accessToken, { sheetName: 'Alumnes' });
        const studentsData = getData(studentsResponse);
        setStudents(studentsData);
      } catch (studentsErr) {
        // console.error('Error loading students:', studentsErr);
        setError('Error carregant llista d\'alumnes: ' + studentsErr.message);
      }

    } catch (err) {
      // console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load data if we have an access token
    if (accessToken) {
        loadData();
    }
  }, [accessToken]);

  const handleUpdateConfig = async (newConfig) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await callProxy('updateConfig', accessToken, { newConfig: JSON.stringify(newConfig) });
      alert('Configuració actualitzada correctament!');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLists = async () => {
    setLoading(true);
    setError(null);
    try {
      await callProxy('actualitzarLlistes', accessToken);
      alert(`Sincronització de llistes iniciada. Revisa la teva fulla de càlcul per l'estat.`);
      loadData();
    } catch (err) {
      setError("Error en iniciar la sincronització de llistes. Revisa la consola per a més detalls.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      await callProxy('actualitzarAlumnes', accessToken);
      alert(`Actualització d'alumnes iniciada. Revisa la teva fulla de càlcul per l'estat.`);
      loadData();
    } catch (err) {
      setError("Error en iniciar l'actualització d'alumnes. Revisa la consola per a més detalls.");
      // console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      await callProxy('actualitzarProfessors', accessToken);
      alert(`Actualització de professors iniciada. Revisa la teva fulla de càlcul per l'estat.`);
      loadData();
    } catch (err) {
      setError("Error en iniciar l'actualització de professors. Revisa la consola per a més detalls.");
      // console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicia la sincronització de membres de forma asíncrona i fa polling per obtenir el resultat.
   */
  const handleSyncMembers = async () => {
    if (!accessToken) {
        setError("No s'ha trobat el token d'accés. Si us plau, torna a iniciar sessió.");
        return;
    }

    setLoading(true);
    setError(null);
    
    const RESULT_CELL_RANGE = 'Configuració!Z1001'; // Ha de coincidir amb el definit a LlibreIncidenciesGAS.js
    const POLLING_INTERVAL_MS = 10000; // Comprovar cada 10 segons
    const MAX_ATTEMPTS = 36; // 36 intents * 10 segons = 6 minuts màxim d'espera

    try {
      // 1. Iniciar la sincronització de forma asíncrona (deixa una senyal)
      // console.log("Iniciant sincronització de membres asíncronament...");
      const response = await callProxy('iniciarSincronitzacioMembresAsync', accessToken);
      
      if (response && response.success) {
        // console.log("Sincronització iniciada correctament. Començant polling...");
        alert(`Sincronització de membres iniciada. Comprovant l'estat cada ${POLLING_INTERVAL_MS/1000} segons.`);
      } else {
        throw new Error(response?.message || "Error desconegut en iniciar la sincronització.");
      }

      // 2. Iniciar polling per comprovar el resultat
      let attempts = 0;
      const pollForResult = async () => {
        attempts++;
        // console.log(`Intent de polling ${attempts}/${MAX_ATTEMPTS}...`);

        if (attempts > MAX_ATTEMPTS) {
          setError("Temps d'espera exhaurit. La sincronització pot estar encara en curs. Revisa la fulla de càlcul més tard.");
          setLoading(false);
          return;
        }

        try {
          // Esperar abans de fer la crida
          await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));

          // Obtenir el valor de la celda de resultats
          const resultCellValue = await callProxy('getSheetCellValue', accessToken, { range: RESULT_CELL_RANGE });
          // console.log(`Valor de la celda ${RESULT_CELL_RANGE}:`, resultCellValue);

          if (resultCellValue && typeof resultCellValue === 'string' && resultCellValue.trim() !== '') {
            // Hem trobat un resultat
            alert(`Sincronització finalitzada: ${resultCellValue}`);
            loadData(); // Recarregar les dades per veure els canvis
            setLoading(false);
          } else {
            // Encara no hi ha resultat, continuar polling
            pollForResult();
          }
        } catch (err) {
          console.error("Error durant el polling:", err);
          // Podem decidir si un error de polling ha de cancel·lar tot el procés o només aquest intent
          // Per ara, continuarem amb el polling
          pollForResult();
        }
      };

      // Començar el polling després d'un breu retard per assegurar que el GAS ha començat
      setTimeout(pollForResult, POLLING_INTERVAL_MS / 2); 

    } catch (err) {
      console.error("Error en handleSyncMembers:", err);
      setError(`Error en iniciar la sincronització de membres: ${err.message}`);
      setLoading(false);
    }
  };

  const renderViewByRole = () => {
    if (!profile) return null;

    switch (profile.role) {
      case 'Usuari':
        return <UserGroupsView classrooms={classrooms} teachers={teachers} students={students} profile={profile} accessToken={accessToken} />;
      case 'Gestor':
      case 'Direcció':
        return <AdminView
          config={config}
          classrooms={classrooms}
          teachers={teachers}
          groups={groups}
          chats={chats}
          students={students}
          onUpdateConfig={handleUpdateConfig}
          loading={loading}
          profile={profile}
          accessToken={accessToken}
          onSyncLists={handleSyncLists}
          onUpdateStudents={handleUpdateStudents}
          onUpdateTeachers={handleUpdateTeachers}
          onSyncMembers={handleSyncMembers}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button onClick={onBackClick} className="bg-primary-light text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tornar
            </Button>
            <h1 className="text-2xl font-bold">Grups d'alumnes</h1>
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
      {loading && <p className="text-center text-muted-foreground">Carregant...</p>}

      <Card>
        <CardContent className="p-6">
            {renderViewByRole()}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyGroupsView;
