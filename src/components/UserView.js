import React from 'react';

const UserView = ({ classrooms, teachers, profile }) => {
  const userClassrooms = classrooms.filter(classroom => {
    return teachers.some(teacher => teacher.email === profile.email && teacher.classroomName === classroom.name);
  });

  return (
    <table className="table table-striped">
      <thead>
        <tr>
          <th>Nom Classroom</th>
          <th>Enllaç Classroom</th>
          <th>Enllaç Xat</th>
          <th>Enllaç Grup</th>
        </tr>
      </thead>
      <tbody>
        {userClassrooms.map((classroom, index) => (
          <tr key={index}>
            <td>{classroom.name}</td>
            <td><a href={classroom.alternateLink} target="_blank" rel="noopener noreferrer">Obrir</a></td>
            <td><a href={`https://chat.google.com/room/${classroom.chatId}`} target="_blank" rel="noopener noreferrer">Obrir</a></td>
            <td><a href={`https://groups.google.com/g/${classroom.groupName}`} target="_blank" rel="noopener noreferrer">Obrir</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserView;
