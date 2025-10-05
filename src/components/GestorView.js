import React from 'react';

const GestorView = ({ classrooms, teachers, onSyncLists, onUpdateStudents, onUpdateTeachers, onSyncMembers, loading }) => {
  return (
    <div>
      <div className="mb-4">
        <button onClick={onSyncLists} className="btn btn-primary me-2" disabled={loading}>
          {loading ? 'Sincronitzant...' : 'Sincronitza Llistes'}
        </button>
        <button onClick={onUpdateStudents} className="btn btn-primary me-2" disabled={loading}>
          {loading ? 'Actualitzant...' : 'Actualitza Alumnes'}
        </button>
        <button onClick={onUpdateTeachers} className="btn btn-primary me-2" disabled={loading}>
          {loading ? 'Actualitzant...' : 'Actualitza Professors'}
        </button>
        <button onClick={onSyncMembers} className="btn btn-success" disabled={loading}>
          {loading ? 'Sincronitzant...' : 'Sincronitza Membres'}
        </button>
      </div>

      <div className="mb-3">
        <label htmlFor="teacher-select" className="form-label">Selecciona un professor:</label>
        <select id="teacher-select" className="form-select">
          <option value="">Tots</option>
          {teachers.map((teacher, index) => (
            <option key={index} value={teacher.email}>{teacher.name}</option>
          ))}
        </select>
      </div>

      <table className="table table-striped">
        <thead>
          <tr>
            <th>Nom Classroom</th>
            <th>Enllaços</th>
          </tr>
        </thead>
        <tbody>
          {classrooms.map((classroom, index) => (
            <tr key={index}>
              <td>{classroom.name}</td>
              <td>
                <a href={classroom.alternateLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary me-2">Classroom</a>
                <a href={`https://chat.google.com/room/${classroom.chatId}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-success me-2">Chat</a>
                <a href={`https://groups.google.com/g/${classroom.groupName}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-warning">Grup</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GestorView;
