const SPREADSHEET_ID = process.env.REACT_APP_SPREADSHEET_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;

const handleGoogleApiError = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Google API Error:', errorData);
    const message = errorData.error?.message || response.statusText;
    throw new Error(`Error en la API de Google: ${message}`);
  }
};

export const getUserProfile = async (email, accessToken) => {
  try {
    const range = 'Usuaris!A:C';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    await handleGoogleApiError(response);

    const data = await response.json();
    const rows = data.values;

    if (rows && rows.length > 0) {
      const header = rows[0];
      const emailColumnIndex = header.findIndex(h => h.toLowerCase() === 'email');
      const nameColumnIndex = header.findIndex(h => h.toLowerCase() === 'nom');
      const roleColumnIndex = header.findIndex(h => h.toLowerCase() === 'rol');

      if (emailColumnIndex === -1 || roleColumnIndex === -1) {
        console.error("No se encontraron las columnas 'Email' o 'Rol' en la hoja.");
        return null;
      }

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const userEmail = row[emailColumnIndex];
        if (userEmail && userEmail.toLowerCase() === email.toLowerCase()) {
          return {
            name: row[nameColumnIndex] || '',
            email: userEmail,
            role: row[roleColumnIndex] || 'Usuari',
          };
        }
      }
    }
    return null; // User not found
  } catch (err) {
    console.error("Error fetching user profile from Google Sheets:", err);
    throw new Error('Error al contactar con la hoja de cálculo. Verifique la configuración y los permisos.');
  }
};

export const fetchSheetData = async (range, accessToken, spreadsheetId) => {
  const sheetId = spreadsheetId || SPREADSHEET_ID;
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    await handleGoogleApiError(response);
    const data = await response.json();
    return data.values || [];
  } catch (err) {
    console.error("Error fetching data from Google Sheets:", err);
    throw new Error('Error al contactar con la hoja de cálculo. Verifique la configuración y los permisos.');
  }
};

export const appendSheetData = async (range, values, accessToken, spreadsheetId) => {
  const sheetId = spreadsheetId || SPREADSHEET_ID;
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });
    await handleGoogleApiError(response);
    return await response.json();
  } catch (err) {
    console.error("Error appending data to Google Sheets:", err);
    throw new Error('Error al añadir datos a la hoja de cálculo. Verifique la configuración y los permisos.');
  }
}; 

export const updateSheetData = async (range, values, accessToken, spreadsheetId) => {
  const sheetId = spreadsheetId || SPREADSHEET_ID;
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });
    await handleGoogleApiError(response);
    return await response.json();
  } catch (err) {
    console.error("Error updating data in Google Sheets:", err);
    throw new Error('Error al actualizar datos en la hoja de cálculo. Verifique la configuración y los permisos.');
  }
};

export const getUsers = async (accessToken) => {
  try {
    const range = 'Usuaris!A:C'; // Fetch Nom, Email, and Rol
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    await handleGoogleApiError(response);
    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) return [];

    const header = rows[0];
    const nameColIndex = header.findIndex(h => h.toLowerCase() === 'nom');
    const emailColIndex = header.findIndex(h => h.toLowerCase() === 'email');
    const roleColIndex = header.findIndex(h => h.toLowerCase() === 'rol');

    if (nameColIndex === -1 || emailColIndex === -1 || roleColIndex === -1) {
      console.error("Missing 'Nom', 'Email', or 'Rol' columns in 'Usuaris' sheet.");
      return [];
    }

    const users = rows.slice(1).map(row => ({
      name: row[nameColIndex] ? row[nameColIndex].trim() : '',
      email: row[emailColIndex] ? row[emailColIndex].trim() : '',
      role: row[roleColIndex] ? row[roleColIndex].trim() : 'Usuari', // Default role
    }));

    // Sort users by role (e.g., Direcció, Gestor, Usuari)
    const roleOrder = { 'Direcció': 1, 'Gestor': 2, 'Usuari': 3 };
    users.sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99));

    return users;
  } catch (err) {
    console.error("Error fetching users:", err);
    throw new Error('Error al cargar la lista de usuarios.');
  }
};

export const getIncidentTypes = async (accessToken) => {
  try {
    const range = 'Tipus!A:C'; // Fetch Type, Duration Unit (H/D), and Description
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    await handleGoogleApiError(response);
    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) return [];

    const header = rows[0];
    const typeColIndex = header.findIndex(h => h.toLowerCase() === 'nomtipus');
    const durationUnitColIndex = header.findIndex(h => h.toLowerCase() === 'unitatdurada');
    const descriptionColIndex = header.findIndex(h => h.toLowerCase() === 'descripcio');

    if (typeColIndex === -1 || durationUnitColIndex === -1 || descriptionColIndex === -1) {
      console.error("Missing 'NomTipus', 'UnitatDurada', or 'Descripcio' columns in 'Tipus' sheet.");
      return [];
    }

    const incidentTypes = rows.slice(1).map(row => ({
      type: row[typeColIndex] || '',
      durationUnit: row[durationUnitColIndex] || '',
      description: row[descriptionColIndex] || '',
    }));

    return incidentTypes;
  } catch (err) {
    console.error("Error fetching incident types:", err);
    throw new Error('Error al cargar la lista de tipos de incidencia.');
  }
};
