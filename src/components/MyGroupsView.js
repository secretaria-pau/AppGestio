import React, { useState, useEffect } from 'react';
import { getConfig, getSheetData, updateConfig, callGASFunction } from '../googleServices';
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
    try {
      const [configData, classroomsData, teachersData, groupsData, chatsData, studentsData] = await Promise.all([
        getConfig(accessToken),
        getSheetData('Llista Classrooms', accessToken),
        getSheetData('Professors', accessToken),
        getSheetData('Llista Groups', accessToken),
        getSheetData('Llista Chats', accessToken),
        getSheetData('Alumnes', accessToken), // Fetch students
      ]);
      setConfig(configData);
      setChats(chatsData.map(row => ({ displayName: row[0], id: row[2] })));
      const groupEmails = groupsData.map(row => row[0]);
      setGroups(groupEmails);
      const groupUrlMap = new Map(groupsData.map(row => [row[0], row[1]]));

      setClassrooms(classroomsData.map(row => {
        const classroomId = row[2];
        const configEntry = configData.find(c => c[5] === classroomId);
        const groupEmail = configEntry ? configEntry[2] : '';
        return {
          name: row[0],
          alternateLink: row[1],
          id: classroomId,
          groupName: groupEmail,
          groupUrl: groupUrlMap.get(groupEmail) || '',
          chatName: configEntry ? configEntry[3] : '',
          chatId: configEntry ? chatsData.find(chatRow => chatRow[0] === configEntry[3])?.[2] : '',
        };
      }));

      setTeachers(teachersData.map(row => ({ name: row[1], email: row[2], classroomName: row[0] })));
      setStudents(studentsData); // Set students state

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  const handleUpdateConfig = async (newConfig) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await updateConfig(newConfig, accessToken);
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
      await callGASFunction('actualitzarLlistes', accessToken);
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
      await callGASFunction('actualitzarAlumnes', accessToken);
      alert(`Actualització d'alumnes iniciada. Revisa la teva fulla de càlcul per l'estat.`);
      loadData();
    } catch (err) {
      setError("Error en iniciar l'actualització d'alumnes. Revisa la consola per a més detalls.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      await callGASFunction('actualitzarProfessors', accessToken);
      alert(`Actualització de professors iniciada. Revisa la teva fulla de càlcul per l'estat.`);
      loadData();
    } catch (err) {
      setError("Error en iniciar l'actualització de professors. Revisa la consola per a més detalls.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      await callGASFunction('sincronitzarMembres', accessToken);
      alert(`Sincronització de membres iniciada. Revisa la teva fulla de càlcul per l'estat.`);
      loadData();
    } catch (err) {
      setError("Error en iniciar la sincronització de membres. Revisa la consola per a més detalls.");
      console.error(err);
    } finally {
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
