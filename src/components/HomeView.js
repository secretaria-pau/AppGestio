import React, { useState, useEffect } from 'react';
import { getActiveAvisos } from '../avisosService';
import { getUserProfile } from '../googleSheetsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, Button } from "./ui";
import { Info, Users, Calendar, AlertTriangle, Wrench, LogOut, Bell } from "lucide-react";

const HomeView = ({ onIncidentsClick, onCalendarClick, onGroupsClick, onTICIncidentsClick, onMantenimentClick, onAvisosClick, profile, onLogout, accessToken, setProfile, setError, setCurrentScreen }) => {
  const [avisos, setAvisos] = useState([]);
  const [loadingAvisos, setLoadingAvisos] = useState(true);

  useEffect(() => {
    const fetchAvisos = async () => {
      if (!accessToken) return;
      try {
        setLoadingAvisos(true);
        const activeAvisos = await getActiveAvisos(accessToken);
        setAvisos(activeAvisos);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        // Optionally set an error state here to show in the UI
      } finally {
        setLoadingAvisos(false);
      }
    };

    const loadProfile = async () => {
      if (accessToken && !profile) {
        try {
          const googleProfile = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }).then(res => res.json());

          const userProfile = await getUserProfile(googleProfile.email, accessToken);

          if (userProfile) {
            setProfile(userProfile);
          } else {
            setError("Accés no autoritzat. El vostre correu electrònic no es troba a la llista d'usuaris permesos.");
            setCurrentScreen('login');
          }
        } catch (err) {
          console.error(err);
          setError(err.message || "Ha ocorregut un error durant la càrrega del perfil.");
          setCurrentScreen('login');
        }
      }
    };

    loadProfile();
    fetchAvisos();
  }, [accessToken, setProfile, setError, setCurrentScreen]);

  if (!profile) {
    return <div className="flex h-screen items-center justify-center">Carregant perfil...</div>; // Or a loading spinner
  }

  const menuItems = [
    { title: "Incidències de personal", onClick: onIncidentsClick, icon: AlertTriangle, roles: ['all'] },
    { title: "Calendaris del centre", onClick: onCalendarClick, icon: Calendar, roles: ['all'] },
    { title: "Grups d'alumnes", onClick: onGroupsClick, icon: Users, roles: ['all'] },
    { title: "Incidències TIC", onClick: onTICIncidentsClick, icon: AlertTriangle, roles: ['all'] },
    { title: "Incidències Manteniment", onClick: onMantenimentClick, icon: Wrench, roles: ['Gestor', 'Direcció'] },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">App Gestió CFA LA PAU</h1>
          <div className="flex items-center">
            <div className="text-right mr-4">
              <div className="font-semibold">{profile.name}</div>
              <div className="text-sm text-gray-500">{profile.role}</div>
            </div>
            <Button onClick={onLogout} variant="outline" size="icon">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {menuItems.map((item, index) => (
            (item.roles.includes('all') || item.roles.includes(profile.role)) && (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer border border-primary" onClick={item.onClick}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">{item.title}</CardTitle>
                  <item.icon className="h-8 w-8 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Accedir a la secció</p>
                </CardContent>
              </Card>
            )
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center"><Bell className="h-5 w-5 mr-2" />Avisos</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              {loadingAvisos ? (
                <p>Carregant avisos...</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  <li className="py-2">
                    <a href="https://sites.google.com/cfalapau.cat/documents-docents" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Documents per als docents (enllaç permanent)
                    </a>
                  </li>
                  {avisos.map(aviso => (
                    <li key={aviso.ID} className="py-2">
                      <h6 className="font-semibold mb-1">{aviso.Titol}</h6>
                      <div dangerouslySetInnerHTML={{ __html: aviso.Contingut }} className="text-sm text-gray-700" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={onAvisosClick} className="w-full bg-primary-light text-white">Tots els Avisos</Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HomeView;
