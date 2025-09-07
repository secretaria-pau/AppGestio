import React, { useState, useEffect } from 'react';
import { callGASFunction } from '../googleServices';
import { Button, Alert, AlertDescription, AlertTitle, Tabs, TabsContent, TabsList, TabsTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Checkbox, Card, CardHeader, CardTitle, CardContent } from "./ui";
import { X, BookOpen, MessageSquare, Users } from "lucide-react";

const AdminView = ({ config, classrooms, teachers, groups, chats, students, onUpdateConfig, loading, profile, accessToken, onSyncLists, onUpdateStudents, onUpdateTeachers, onSyncMembers }) => {
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [editableConfig, setEditableConfig] = useState(config || []);

  useEffect(() => {
    setEditableConfig(config);
  }, [config]);

  const [selectedClassroom, setSelectedClassroom] = useState(null);

  const filteredClassrooms = (() => {
    let result;
    if (selectedTeacher === '') { // If selectedTeacher is empty string (from 'all' option)
      result = classrooms;
    } else {
      result = classrooms.filter(classroom => {
        return teachers.some(teacher => teacher.email === selectedTeacher && teacher.classroomName === classroom.name);
      });
    }
    return result;
  })();

  const activeClassrooms = filteredClassrooms.filter(classroom => {
    const classroomConfig = config.find(c => c[5] === classroom.id) || [];
    const isActive = classroomConfig[0] === 'TRUE';
    return isActive;
  });

  const handleConfigChange = (value, index, field) => {
    const newConfig = [...editableConfig];
    newConfig[index][field] = value;
    setEditableConfig(newConfig);
  };

  const handleSaveChanges = () => {
    onUpdateConfig(editableConfig);
  };

  const handleViewStudents = (classroom) => {
    setSelectedClassroom(classroom);
  };

  const handleCloseStudentsModal = () => {
    setSelectedClassroom(null);
  };

  const handleExportStudents = async (classroom) => {
    const courseName = classroom.name;
    const studentsList = students.filter(student => student[0] === courseName.replace('DEL - ', '')).sort((a, b) => a[1].localeCompare(b[1]));
    const groupName = classroom.groupName || 'N/A';
    const teachersForClassroom = teachers.filter(teacher => teacher.classroomName === courseName);
    const teacherNames = teachersForClassroom.map(teacher => teacher.name);
    
    try {
      const dataToExport = studentsList.map(student => [student[1], student[2]]);
      const response = await callGASFunction('createStudentsSheet', accessToken, {
        courseName: courseName,
        studentsData: JSON.stringify(dataToExport),
        groupName: groupName,
        teacherNames: JSON.stringify(teacherNames),
        newOwnerEmail: profile.email || ''
      });
      
      if (response.success) {
        if (response.url) {
          window.open(response.url, '_blank');
          alert(`Full de càlcul creat i obert en una nova pestanya: ${response.url}`);
        } else {
          alert(response.message);
        }
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error) {
      alert(`Error al exportar: ${error.message}`);
      console.error('Error exporting students to Sheets:', error);
    }
  };

 const classroomStudents = selectedClassroom
    ? students.filter(student => student[0] === selectedClassroom.name.replace('DEL - ', '')).sort((a, b) => a[1].localeCompare(b[1]))
    : [];

  const uniqueTeachers = Array.from(new Map(teachers.map(teacher => [teacher.email, teacher])).values());
  uniqueTeachers.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Accions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button onClick={onSyncLists} className="bg-[#288185] hover:bg-[#1e686b] text-white" disabled={loading}>
                {loading ? 'Sincronitzant...' : 'Sincronitza Llistes'}
                </Button>
                <Button onClick={onUpdateStudents} className="bg-[#288185] hover:bg-[#1e686b] text-white" disabled={loading}>
                {loading ? 'Actualitzant...' : 'Actualitza Alumnes'}
                </Button>
                <Button onClick={onUpdateTeachers} className="bg-[#288185] hover:bg-[#1e686b] text-white" disabled={loading}>
                {loading ? 'Actualitzant...' : 'Actualitza Professors'}
                </Button>
                <Button onClick={onSyncMembers} className="bg-green-600 hover:bg-green-700 text-white" disabled={loading}>
                {loading ? 'Sincronitzant...' : 'Sincronitza Membres'}
                </Button>
            </CardContent>
        </Card>

      <Tabs defaultValue="groups" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="groups">Llistat de grups</TabsTrigger>
          {profile.role === 'Direcció' && (
            <TabsTrigger value="config">Configuració</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="groups" className="mt-3">
          <div className="mb-3">
            <label htmlFor="teacher-select" className="block text-sm font-medium text-gray-700 mb-1">Selecciona un professor:</label>
            <Select value={selectedTeacher} onValueChange={(value) => {
              setSelectedTeacher(value === 'all' ? '' : value);
            }}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Tots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots</SelectItem> {/* Added "Tots" option with value "all" */}
                {uniqueTeachers.map((teacher, index) => (
                  <SelectItem key={index} value={teacher.email}>{teacher.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom Classroom</TableHead>
                <TableHead>Enllaços</TableHead>
                <TableHead>Alumnes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeClassrooms.map((classroom, index) => {
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{classroom.name}</TableCell>
                    <TableCell className="space-x-2">
                        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => window.open(classroom.alternateLink, '_blank')}>
                            <BookOpen className="h-4 w-4 mr-1" />
                            Classroom
                        </Button>
                      {classroom.chatId ? (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => window.open(`https://chat.google.com/room/${classroom.chatId.split('/').pop()}`, '_blank')}>
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Chat
                        </Button>
                      ) : (
                        <Button size="sm" disabled>N/A</Button>
                      )}
                      {classroom.groupUrl ? (
                        <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600" onClick={() => window.open(classroom.groupUrl, '_blank')}>
                            <Users className="h-4 w-4 mr-1" />
                            Grup
                        </Button>
                      ) : (
                        <Button size="sm" disabled>N/A</Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="mr-2" onClick={() => handleViewStudents(classroom)}>
                        Alumnes
                      </Button>
                      <Button size="sm" className="bg-[#288185] hover:bg-[#1e686b] text-white" onClick={() => handleExportStudents(classroom)}>
                        Exportar Alumnes
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {selectedClassroom && (
            <Dialog open={selectedClassroom !== null} onOpenChange={handleCloseStudentsModal}>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Alumnes de {selectedClassroom.name}</DialogTitle>
                  <DialogDescription>
                    Llista d'alumnes de la classe seleccionada.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-4">
                  {classroomStudents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom Alumne</TableHead>
                          <TableHead>Email Alumne</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classroomStudents.map((student, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{student[1]}</TableCell>
                            <TableCell>{student[2]}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p>No hi ha alumnes per a aquesta classe.</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseStudentsModal}>Tancar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {activeTab === 'config' && profile.role === 'Direcció' && (
          <TabsContent value="config" className="mt-3">
            <Button onClick={handleSaveChanges} className="bg-[#288185] hover:bg-[#1e686b] text-white mb-3" disabled={loading}>
              {loading ? 'Guardant...' : 'Guardar Canvis'}
            </Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actiu</TableHead>
                  <TableHead>Nom Classroom</TableHead>
                  <TableHead>Google Group associat</TableHead>
                  <TableHead>Google Chat associat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableConfig.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Checkbox
                        checked={row[0] === 'TRUE'}
                        onCheckedChange={(checked) => handleConfigChange(checked ? 'TRUE' : 'FALSE', index, 0)}
                      />
                    </TableCell>
                    <TableCell>{row[1]}</TableCell>
                    <TableCell>
                      <Select value={row[2] || "none"} onValueChange={(value) => handleConfigChange(value === "none" ? "" : value, index, 2)}>
                        <SelectTrigger>
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {groups.map((group, i) => <SelectItem key={i} value={group}>{group}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={row[3] || "none"} onValueChange={(value) => handleConfigChange(value === "none" ? "" : value, index, 3)}>
                        <SelectTrigger>
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {chats.map((chat, i) => <SelectItem key={i} value={chat.displayName}>{chat.displayName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AdminView;