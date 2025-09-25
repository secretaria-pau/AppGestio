import React, { useState } from 'react';
import { updateConfig, callGASFunction } from '../googleServices';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { X, ArrowLeft, BookOpen, MessageSquare, Users } from "lucide-react";

const DirectorView = ({ config, classrooms, teachers, onSyncLists, onUpdateStudents, onUpdateTeachers, onSyncMembers, loading, accessToken, loadData, profile, onBackClick }) => {
  // Log classrooms prop on initial render and updates
  useEffect(() => {
    // console.log('DirectorView - classrooms prop:', classrooms);
  }, [classrooms]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [editingClassroom, setEditingClassroom] = useState(null);

  const filteredClassrooms = (() => {
    // console.log('Filtering with selectedTeacher (inside filteredClassrooms):', selectedTeacher);
    let result;
    if (selectedTeacher === '') {
      result = classrooms;
    } else {
      result = classrooms.filter(classroom => {
        return teachers.some(teacher => teacher.email === selectedTeacher && teacher.classroomName === classroom.name);
      });
    }
    // console.log('filteredClassrooms result:', result);
    return result;
  })();

  const handleEditClick = (classroom) => {
    setEditingClassroom(classroom);
  };

  const handleCloseModal = () => {
    setEditingClassroom(null);
  };

  const handleSaveChanges = async () => {
    if (!editingClassroom) return;

    const newGroup = document.getElementById('group-input').value;
    const newChat = document.getElementById('chat-input').value;

    const newConfig = config.map(row => {
      if (row[5] === editingClassroom.id) {
        return [row[0], row[1], newGroup, newChat, row[4], row[5]];
      }
      return row;
    });

    try {
      await updateConfig(newConfig, accessToken);
      alert('Configuració actualitzada correctament!');
      loadData();
      handleCloseModal();
    } catch (err) {
      alert("Error a l'actualitzar la configuració.");
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button onClick={onBackClick} className="bg-primary-light text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tornar
            </Button>
            <h1 className="text-2xl font-bold">Vista de Direcció</h1>
          </div>
          <div className="text-right">
            <div className="font-semibold">{profile.name} ({profile.role})</div>
            <div className="text-xs text-muted-foreground">{profile.email}</div>
          </div>
        </header>
      <div className="mb-4">
        <Button onClick={onSyncLists} disabled={loading} className="mr-2">
          {loading ? 'Sincronitzant...' : 'Sincronitza Llistes'}
        </Button>
        <Button onClick={onUpdateStudents} disabled={loading} className="mr-2">
          {loading ? 'Actualitzant...' : 'Actualitza Alumnes'}
        </Button>
        <Button onClick={onUpdateTeachers} disabled={loading} className="mr-2">
          {loading ? 'Actualitzant...' : 'Actualitza Professors'}
        </Button>
        <Button onClick={onSyncMembers} disabled={loading}>
          {loading ? 'Sincronitzant...' : 'Sincronitza Membres'}
        </Button>
      </div>

      <div className="mb-3">
        <label htmlFor="teacher-select" className="block text-sm font-medium text-gray-700 mb-1">Selecciona un professor:</label>
        

        <Select value={selectedTeacher} onValueChange={(value) => {
          // console.log('Selected Teacher (onValueChange):', value);
          setSelectedTeacher(value);
        }}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Selecciona un professor" value={selectedTeacher || "Selecciona un professor"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tots</SelectItem>
            {teachers.map((teacher, index) => (
              <SelectItem key={index} value={teacher.email}>{teacher.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-primary text-primary-foreground">
            <TableRow className="hover:bg-primary/90">
              <TableHead className="text-primary-foreground">Actiu</TableHead>
              <TableHead className="text-primary-foreground">Nom Classroom</TableHead>
              <TableHead className="text-primary-foreground">Google Group associat</TableHead>
              <TableHead className="text-primary-foreground">Google Chat associat</TableHead>
              <TableHead className="text-primary-foreground">Estat Sincronització</TableHead>
              <TableHead className="text-primary-foreground">Accions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClassrooms.map((classroom, index) => {
              const classroomConfig = config.find(c => c[5] === classroom.id) || [];
              return (
                <TableRow key={index} className="hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <TableCell><input type="checkbox" checked={classroomConfig[0] === 'TRUE'} /></TableCell>
                  <TableCell className="font-medium">{classroom.name}</TableCell>
                  <TableCell>
                    {classroom.groupUrl ? (
                      <Button variant="link" size="sm" onClick={() => window.open(classroom.groupUrl, '_blank')}>
                        <Users className="h-4 w-4 mr-1" />
                        Grup
                      </Button>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {classroom.chatId ? (
                      <Button variant="link" size="sm" onClick={() => window.open(`https://chat.google.com/room/${classroom.chatId.split('/').pop()}`, '_blank')}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>{classroomConfig[4]}</TableCell>
                  <TableCell><Button size="sm" onClick={() => handleEditClick(classroom)}>Editar</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editingClassroom && (
        <Dialog open={editingClassroom !== null} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Classroom: {editingClassroom.name}</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="group-input" className="text-right">Google Group associat</label>
                  <Input id="group-input" className="col-span-3" defaultValue={config.find(c => c[5] === editingClassroom.id)[2]} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="chat-input" className="text-right">Google Chat associat</label>
                  <Input id="chat-input" className="col-span-3" defaultValue={config.find(c => c[5] === editingClassroom.id)[3]} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Tancar</Button>
              <Button type="button" onClick={handleSaveChanges}>Guardar Canvis</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DirectorView;
