import React, { useState, useEffect } from 'react';

const AddMantenimentIncidentForm = ({
  incidentToEdit,
  originalSheetRowIndex,
  onSaveIncident,
  onClose,
  setError,
  profile,
  users,
}) => {
  const [incidentData, setIncidentData] = useState({
    'ID': '',
    'Tipus': '',
    'Qui fa la incidencia?': '',
    'Espai': '',
    'Objecte avariat': '',
    'Descripció': '',
    'Estat': 'Comunicat', // Default status
    'Data de comunicació': '',
    'Data de la darrera edició': '',
  });

  useEffect(() => {
    if (incidentToEdit) {
      // Map incidentToEdit array to incidentData state based on MantenimentGAS.js headers
      const mappedData = {
        'ID': incidentToEdit[0] || '',
        'Tipus': incidentToEdit[1] || '',
        'Qui fa la incidencia?': incidentToEdit[2] || '',
        'Espai': incidentToEdit[3] || '',
        'Objecte avariat': incidentToEdit[4] || '',
        'Descripció': incidentToEdit[5] || '',
        'Estat': incidentToEdit[6] || 'Comunicat',
        'Data de comunicació': incidentToEdit[7] || '',
        'Data de la darrera edició': incidentToEdit[8] || '',
      };
      setIncidentData(mappedData);
    } else {
      // For new incidents, set default values
      setIncidentData({
        'ID': '',
        'Tipus': '',
        'Qui fa la incidencia?': profile.email, // Default to current user's email
        'Espai': '',
        'Objecte avariat': '',
        'Descripció': '',
        'Estat': 'Comunicat',
        'Data de comunicació': '',
        'Data de la darrera edició': '',
      });
    }
  }, [incidentToEdit, profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setIncidentData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Basic validation
    if (!incidentData['Tipus'].trim() || !incidentData['Qui fa la incidencia?'].trim() || !incidentData['Espai'].trim() || !incidentData['Objecte avariat'].trim() || !incidentData['Descripció'].trim()) {
      setError("Tots els camps són obligatoris.");
      return;
    }

    // Data to send to GAS (order matters)
    const dataToSend = {
      'ID': incidentData['ID'],
      'Tipus': incidentData['Tipus'],
      'Qui fa la incidencia?': incidentData['Qui fa la incidencia?'],
      'Espai': incidentData['Espai'],
      'Objecte avariat': incidentData['Objecte avariat'],
      'Descripció': incidentData['Descripció'],
      'Estat': incidentData['Estat'],
      'Data de comunicació': incidentData['Data de comunicació'], // GAS will set this for new incidents
      'Data de la darrera edició': incidentData['Data de la darrera edició'], // GAS will set this for new/updated incidents
      'rowIndex': originalSheetRowIndex // Pass rowIndex for updates
    };

    try {
      await onSaveIncident(dataToSend, originalSheetRowIndex);
      onClose();
    } catch (err) {
      // console.error("Error saving incident:", err);
      setError("Error en guardar la incidència. (Detalls: " + err.message + ")");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="row mb-3">
        <div className="col-md-6">
          <label htmlFor="quiFaLaIncidencia" className="form-label">Qui fa la incidencia?</label>
          <select
            className="form-control"
            id="quiFaLaIncidencia"
            name="Qui fa la incidencia?"
            value={incidentData['Qui fa la incidencia?']}
            onChange={handleChange}
            required
            disabled={profile?.role === 'Usuari' && !incidentToEdit} // Disable for new incidents if user role
          >
            <option value="">Seleccioneu un usuari</option>
            {users.map((user, index) => (
              <option key={index} value={user.Email}>{user.Nom} ({user.Email})</option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label htmlFor="tipus" className="form-label">Tipus</label>
          <select
            className="form-control"
            id="tipus"
            name="Tipus"
            value={incidentData['Tipus']}
            onChange={handleChange}
            required
          >
            <option value="">Seleccioneu un tipus</option>
            <option value="Mobiliari">Mobiliari</option>
            <option value="Lavabos i aigua">Lavabos i aigua</option>
            <option value="Finestres">Finestres</option>
            <option value="Terra i parets">Terra i parets</option>
            <option value="Portes i tancaments">Portes i tancaments</option>
            <option value="Altres">Altres</option>
          </select>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <label htmlFor="espai" className="form-label">Espai</label>
          <select
            className="form-control"
            id="espai"
            name="Espai"
            value={incidentData['Espai']}
            onChange={handleChange}
            required
          >
            <option value="">Seleccioneu un espai</option>
            <option value="Aula 4.1 informàtica">Aula 4.1 informàtica</option>
            <option value="Aula 4.2">Aula 4.2</option>
            <option value="Aula 4.3">Aula 4.3</option>
            <option value="Aula 4.4">Aula 4.4</option>
            <option value="Aula 4.5 informàtica 2">Aula 4.5 informàtica 2</option>
            <option value="Distribució planta 4">Distribució planta 4</option>
            <option value="Sala de professors">Sala de professors</option>
            <option value="Direcció, administració i recepció">Direcció, administració i recepció</option>
            <option value="Aula 5.1">Aula 5.1</option>
            <option value="Aula 5.2">Aula 5.2</option>
            <option value="Aula 5.3">Aula 5.3</option>
            <option value="Aula 5.4">Aula 5.4</option>
            <option value="Distribució planta 5">Distribució planta 5</option>
            <option value="Altres">Altres</option>
          </select>
        </div>
        <div className="col-md-6">
          <label htmlFor="objecteAvariat" className="form-label">Objecte avariat</label>
          <input
            type="text"
            className="form-control"
            id="objecteAvariat"
            name="Objecte avariat"
            value={incidentData['Objecte avariat']}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-12">
          <label htmlFor="descripcio" className="form-label">Descripció</label>
          <textarea
            className="form-control"
            id="descripcio"
            name="Descripció"
            rows="3"
            value={incidentData['Descripció']}
            onChange={handleChange}
            required
          ></textarea>
        </div>
      </div>

      {incidentToEdit && ( // Only show status and dates for existing incidents
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="estat" className="form-label">Estat</label>
            <select
              className="form-control"
              id="estat"
              name="Estat"
              value={incidentData['Estat']}
              onChange={handleChange}
              required
            >
              <option value="Comunicat">Comunicat</option>
              <option value="En reparació">En reparació</option>
              <option value="Solucionat">Solucionat</option>
              <option value="Avariat">Avariat</option>
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="dataComunicacio" className="form-label">Data de comunicació</label>
            <input
              type="text"
              className="form-control"
              id="dataComunicacio"
              name="Data de comunicació"
              value={incidentData['Data de comunicació']}
              readOnly
            />
          </div>
        </div>
      )}

      {incidentToEdit && (
        <div className="row mb-3">
          <div className="col-md-12">
            <label htmlFor="dataDarreraEdicio" className="form-label">Data de la darrera edició</label>
            <input
              type="text"
              className="form-control"
              id="dataDarreraEdicio"
              name="Data de la darrera edició"
              value={incidentData['Data de la darrera edició']}
              readOnly
            />
          </div>
        </div>
      )}

      <button type="submit" className="btn btn-primary">
        {incidentToEdit ? 'Guardar Canvis' : 'Afegir Incidència'}
      </button>
      <button type="button" className="btn btn-secondary ms-2" onClick={onClose}>
        Cancel·lar
      </button>
    </form>
  );
};

export default AddMantenimentIncidentForm;