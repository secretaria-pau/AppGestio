import React, { useState, useEffect, useCallback } from 'react';
import { getAvisos, toggleAvisoStatus, deleteAviso } from '../avisosService';
import AvisoForm from './AvisoForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { Trash2, ArrowLeft } from "lucide-react";

const AvisosView = ({ onBackClick, profile, accessToken }) => {
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false); // To control the form modal
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false); // To control the confirmation dialog
  const [avisoToDelete, setAvisoToDelete] = useState(null); // To store the aviso to be deleted

  const canManage = profile.role === 'Direcció';

  const fetchAllAvisos = useCallback(async () => {
    // Only fetch if we have an access token
    if (!accessToken) return;
    
    try {
      setLoading(true);
      const allAvisos = await getAvisos(accessToken, false); // Get all avisos
      setAvisos(allAvisos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAllAvisos();
  }, [accessToken, fetchAllAvisos]);

  const handleToggleStatus = async (id) => {
    try {
      await toggleAvisoStatus(id, profile, accessToken);
      // Refresh the list to show the new status
      fetchAllAvisos(); 
    } catch (err) {
      alert(`Error al canviar l'estat: ${err.message}`);
    }
  };



  const handleAvisoAdded = useCallback(() => {
    setIsFormOpen(false);
    fetchAllAvisos(); // Refresh list after adding a new aviso
  }, [fetchAllAvisos]);

  const handleDeleteClick = useCallback((avisoId) => {
    setAvisoToDelete(avisoId);
    setIsConfirmDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (avisoToDelete) {
      try {
        await deleteAviso(avisoToDelete, profile, accessToken);
        fetchAllAvisos(); // Refresh the list after deletion
      } catch (err) {
        alert(`Error al eliminar l\'avís: ${err.message}`);
      } finally {
        setIsConfirmDialogOpen(false);
        setAvisoToDelete(null);
      }
    }
  }, [avisoToDelete, profile, accessToken, fetchAllAvisos]);

  const handleCancelDelete = useCallback(() => {
    setIsConfirmDialogOpen(false);
    setAvisoToDelete(null);
  }, []);

  return (
    <div className="container mx-auto p-4">
      {/* Top Bar with Title and Profile */}
      <header className="flex justify-between items-center mb-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button onClick={onBackClick} className="bg-primary-light text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tornar
            </Button>
            <h1 className="text-2xl font-bold">Historial d'Avisos</h1>
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

      {canManage && (
        <div className="mb-3">
          <Button onClick={() => setIsFormOpen(true)} variant="default">+ Afegir Nou Avís</Button>
        </div>
      )}

      {isFormOpen && (
        <Card className="mt-6 p-4">
          <CardHeader>
            <CardTitle>Afegir Nou Avís</CardTitle>
            <CardDescription>Formulari per afegir un nou avís.</CardDescription>
          </CardHeader>
          <CardContent>
            <AvisoForm
              profile={profile}
              accessToken={accessToken}
              onClose={() => setIsFormOpen(false)}
              onAvisoAdded={handleAvisoAdded}
            />
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog for Deletion */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esteu segur?</AlertDialogTitle>
            <AlertDialogDescription>
              Aquesta acció no es pot desfer. Això eliminarà permanentment l'avís.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      



      {loading ? (
        <p>Carregant avisos...</p>
      ) : (
        <div className="rounded-md border overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-primary text-primary-foreground">
              <TableRow className="hover:bg-primary/90">
                <TableHead className="text-primary-foreground w-[200px]">Títol</TableHead>
                <TableHead className="text-primary-foreground">Contingut</TableHead>
                <TableHead className="text-primary-foreground w-[120px]">Estat</TableHead>
                <TableHead className="text-primary-foreground w-[180px]">Data</TableHead>
                <TableHead className="text-right text-primary-foreground w-24">Accions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {avisos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No s'han trobat avisos.
                  </TableCell>
                </TableRow>
              ) : (
                avisos.map(aviso => (
                  <TableRow key={aviso.ID} className="hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <TableCell className="font-medium">{aviso.Titol}</TableCell>
                    <TableCell dangerouslySetInnerHTML={{ __html: aviso.Contingut }} />
                    <TableCell>
                      {aviso.Actiu ?
                        <Badge className="bg-green-500 text-white">Actiu</Badge> :
                        <Badge className="bg-red-500 text-white">Inactiu</Badge>
                      }
                    </TableCell>
                    <TableCell>{new Date(aviso.Timestamp).toLocaleString('es-ES')}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            className={aviso.Actiu ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}
                            size="sm"
                            onClick={() => handleToggleStatus(aviso.ID)}
                          >
                            {aviso.Actiu ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(aviso.ID)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AvisosView;
