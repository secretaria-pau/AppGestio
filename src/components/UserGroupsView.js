import React, { useState } from 'react';
import { callGASFunction } from '../googleServices';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui";
import { X, BookOpen, MessageSquare, Users } from "lucide-react";

const UserGroupsView = ({ classrooms, teachers, students, profile, accessToken }) => {
  const [selectedClassroom, setSelectedClassroom] = useState(null);

  const userClassrooms = classrooms.filter(classroom => {
    return teachers.some(teacher => teacher.email === profile.email && teacher.classroomName === classroom.name);
  });

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
    ? students.filter(student => student[0] === selectedClassroom.name).sort((a, b) => a[1].localeCompare(b[1]))
    : [];

  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom Classroom</TableHead>
            <TableHead>Enllaços</TableHead>
            <TableHead>Alumnes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userClassrooms.map((classroom, index) => (
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
                <Button size="sm" variant="default" onClick={() => handleExportStudents(classroom)}>
                  Exportar Alumnes
                </Button>
              </TableCell>
            </TableRow>
          ))}
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
              <Button className="bg-[#288185] hover:bg-[#1e686b] text-white" onClick={() => handleExportStudents(selectedClassroom)}>Exportar a Sheets</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserGroupsView;
