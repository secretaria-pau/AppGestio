import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getTICIncidents, addTICIncident, updateTICIncident, exportTICPendingIncidents } from '../googleServices';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { ArrowLeft, Plus, Upload, Search, Info, Edit, Download } from 'lucide-react';

const TICIncidentsView = ({ onBackClick, profile, accessToken, users }) => {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [editingIncident, setEditingIncident] = useState(null); // Used for the modal
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTICIncidents(accessToken);
      if (response.status === 'success') {
        setIncidents(response.data);
        setFilteredIncidents(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const filteredIncidentsMemo = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    return incidents.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(lowercasedFilter)
      )
    );
  }, [searchTerm, incidents]);

  const handleAddNewIncident = () => {
    setEditingIncident({
      "Qui fa la incidencia?": profile.email,
      "Estat": "Comunicat",
      "Tipus": "",
      "Espai": "",
      "Dispositiu afectat": "",
      "Descripció": ""
    });
  };

  const handleEditIncident = (incident) => {
    setEditingIncident(incident);
  };

  const handleSaveIncident = async () => {
    if (!editingIncident) return;
    setLoading(true);
    setError(null);
    try {
      let response;
      if (editingIncident.ID) {
        response = await updateTICIncident(editingIncident, accessToken);
      } else {
                response = await addTICIncident(editingIncident, accessToken);
      }

      if (response.status === 'success') {
        fetchIncidents();
        setEditingIncident(null); // Close modal on success
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await exportTICPendingIncidents(accessToken);
      if (response.status === 'success') {
        alert(`S'ha creat la fulla de càlcul: ${response.data}`);
        window.open(response.data, '_blank');
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Solucionat': return 'bg-green-100 border-green-200 text-green-800';
      case 'En reparació': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'Avariat': return 'bg-red-100 border-red-200 text-red-800';
      case 'Comunicat':
      default: return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };

  const statuses = ['Comunicat', 'En reparació', 'Solucionat', 'Avariat'];

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button onClick={onBackClick} className="bg-primary-light text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tornar
            </Button>
            <h1 className="text-2xl font-bold">Incidències TIC</h1>
          </div>
          <div className="text-right">
            <div className="font-semibold">{profile.name} ({profile.role})</div>
            <div className="text-xs text-muted-foreground">{profile.email}</div>
          </div>
        </header>

        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtres i Accions</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text"
                placeholder="Cerca en totes les dades..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleAddNewIncident}><Plus className="mr-2 h-4 w-4"/>Nova Incidència</Button>
            {(profile.role === 'Gestor' || profile.role === 'Direcció') && (
              <Button onClick={handleExport} variant="outline"><Download className="mr-2 h-4 w-4"/>Tasques pendents</Button>
            )}
          </CardContent>
        </Card>

        {editingIncident && (
          <Card className="mt-6 p-4"> {/* Using Card for consistent styling */}
            <CardHeader>
              <CardTitle>{editingIncident.ID ? 'Editar Incidència' : 'Nova Incidència'}</CardTitle>
              <CardDescription>Formulari per editar o afegir una nova incidència TIC.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tipus" className="text-right">Tipus</Label>
                  <Select value={editingIncident.Tipus || ''} onValueChange={(value) => setEditingIncident({...editingIncident, Tipus: value})}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecciona un tipus" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dispositiu portàtil">Dispositiu portàtil</SelectItem>
                      <SelectItem value="Ordinador de sobretaula">Ordinador de sobretaula</SelectItem>
                      <SelectItem value="Impressió">Impressió</SelectItem>
                      <SelectItem value="Projector o monitor">Projector o monitor</SelectItem>
                      <SelectItem value="Equip de so">Equip de so</SelectItem>
                      <SelectItem value="Maleta audiovisual">Maleta audiovisual</SelectItem>
                      <SelectItem value="Altres">Altres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user" className="text-right">Qui informa?</Label>
                    <Input id="user" value={editingIncident["Qui fa la incidencia?"] || ''} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="espai" className="text-right">Espai</Label>
                  <Select value={editingIncident.Espai || ''} onValueChange={(value) => setEditingIncident({...editingIncident, Espai: value})}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecciona un espai" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Aula 4.1 informàtica">Aula 4.1 informàtica</SelectItem>
                        <SelectItem value="Aula 4.2">Aula 4.2</SelectItem>
                        <SelectItem value="Aula 4.3">Aula 4.3</SelectItem>
                        <SelectItem value="Aula 4.4">Aula 4.4</SelectItem>
                        <SelectItem value="Aula 4.5 informàtica 2">Aula 4.5 informàtica 2</SelectItem>
                        <SelectItem value="Sala de professors">Sala de professors</SelectItem>
                        <SelectItem value="Direcció, administració i recepció">Direcció, administració i recepció</SelectItem>
                        <SelectItem value="Aula 5.1">Aula 5.1</SelectItem>
                        <SelectItem value="Aula 5.2">Aula 5.2</SelectItem>
                        <SelectItem value="Aula 5.3">Aula 5.3</SelectItem>
                        <SelectItem value="Aula 5.4">Aula 5.4</SelectItem>
                        <SelectItem value="Sala polivalent, menjador i altres">Sala polivalent, menjador i altres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dispositiu" className="text-right">Dispositiu</Label>
                  <Textarea id="dispositiu" value={editingIncident["Dispositiu afectat"] || ''} onChange={(e) => setEditingIncident({...editingIncident, "Dispositiu afectat": e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="descripcio" className="text-right">Descripció</Label>
                  <Textarea id="descripcio" value={editingIncident.Descripció || ''} onChange={(e) => setEditingIncident({...editingIncident, Descripció: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="estat" className="text-right">Estat</Label>
                  <Select value={editingIncident.Estat || ''} onValueChange={(value) => setEditingIncident({...editingIncident, Estat: value})} disabled={!editingIncident.ID}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecciona un estat" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comunicat">Comunicat</SelectItem>
                      <SelectItem value="En reparació">En reparació</SelectItem>
                      <SelectItem value="Solucionat">Solucionat</SelectItem>
                      <SelectItem value="Avariat">Avariat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4"> {/* Replaced DialogFooter */}
                <Button type="button" variant="secondary" onClick={() => setEditingIncident(null)}>Cancel·lar</Button> {/* Replaced DialogClose */}
                <Button type="button" onClick={handleSaveIncident}>Guardar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && !incidents.length ? (
          <p className="text-center text-muted-foreground">Carregant incidències...</p>
        ) : (
          <div className="rounded-md border overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-primary text-primary-foreground">
                <TableRow className="hover:bg-primary/90">
                  
                  <TableHead className="text-primary-foreground w-[180px]">Qui informa?</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">Tipus</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">Espai</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">Dispositiu afectat</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">Comunicat</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">Última edició</TableHead>
                  <TableHead className="text-primary-foreground w-[400px]">Descripció</TableHead>
                  <TableHead className="text-right text-primary-foreground w-24">Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidentsMemo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No s'han trobat incidències.
                    </TableCell>
                  </TableRow>
                ) : (
                  // Sort incidents by status order
                  (() => {
                    const sortedIncidents = [...filteredIncidentsMemo].sort((a, b) => 
                      statuses.indexOf(a.Estat) - statuses.indexOf(b.Estat)
                    );
                    
                    return sortedIncidents.map((incident, index, array) => {
                      const showStatusHeader = index === 0 || incident.Estat !== array[index - 1].Estat;
                      return (
                        <React.Fragment key={incident.ID}>
                          {showStatusHeader && (
                            <TableRow className={`bg-muted/30 ${getStatusColor(incident.Estat)}`}>
                              <TableCell colSpan={9} className="font-semibold text-lg py-2">
                                {incident.Estat}
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow className="hover:bg-muted/50 data-[state=selected]:bg-muted">
                            
                            <TableCell>{incident["Qui fa la incidencia?"]}</TableCell>
                            <TableCell>{incident.Tipus}</TableCell>
                            <TableCell>{incident.Espai}</TableCell>
                            <TableCell>{incident["Dispositiu afectat"]}</TableCell>
                            <TableCell>{new Date(incident["Data de comunicació"]).toLocaleDateString('ca-ES')}</TableCell>
                            <TableCell>{new Date(incident["Data de la darrera edició"]).toLocaleDateString('ca-ES')}</TableCell>
                            <TableCell className="w-[400px]">{incident.Descripció}</TableCell>
                            <TableCell className="text-right">
                              {(profile.role === 'Gestor' || profile.role === 'Direcció') && (
                                <Button variant="ghost" size="icon" onClick={() => handleEditIncident(incident)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </TableBody>
            </Table>
          </div>
        )}

        
      </div>
    </TooltipProvider>
  );
};

export default TICIncidentsView;
