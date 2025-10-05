const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID = '1dpb2AUnUKFOshd3iuaNBpl5hKYyHNLPIoi7I4F7mKWc';
// IMPORTANT: Replace with your deployed Google Apps Script Web App URL
export const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzCy0orDCIST9J_weub449IdKwWPRKcdn30178M_DI1iEHh_veopShgQUNAodGv2MpEqQ/exec'; 
export const TIC_GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyxFK9BoacQwt-UjM2VoB5UUrjrcKzZogQvBQqG09APRGIjqPshxLiULrHZArB5JEuN/exec';
export const MANTENIMENT_GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyRTzEMRIqD-yEZDg4vPlryNbBaskG9GZBgheIJBaF0heEWIcF1N1LbcoiuuYtMvsf4/exec';

async function fetchGoogleAPI(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Authorization': `Bearer ${accessToken}`, ...options.headers },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
  }
  return response.json();
}

export async function getConfig(accessToken) {
  try {
    console.log('Fetching config...');
    const url = `${BASE_URL}/${SPREADSHEET_ID}/values/Configuració!A2:F`;
    const data = await fetchGoogleAPI(url, accessToken);
    console.log('Config fetched:', data);
    return Array.isArray(data.values) ? data.values : [];
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
}

export async function callGASFunction(action, accessToken, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonpCallback' + Date.now();
    const script = document.createElement('script');

    window[callbackName] = (data) => {
      clearTimeout(timeoutId); // Clear the timeout
      delete window[callbackName]; // Clean up the global callback
      document.head.removeChild(script); // Remove the script tag
      resolve(data);
    };

    script.onerror = (error) => {
      clearTimeout(timeoutId); // Clear the timeout
      delete window[callbackName]; // Clean up the global callback
      document.head.removeChild(script); // Remove the script tag
      reject(new Error(`JSONP request failed: ${error.message || 'Network error'}`));
    };

    // Set a timeout for the request
    const timeoutId = setTimeout(() => {
      delete window[callbackName]; // Clean up the global callback
      document.head.removeChild(script); // Remove the script tag
      reject(new Error('JSONP request timed out.'));
    }, 90000); // 90 seconds timeout (increased from 60s)

    // Construct query string from params
    const queryString = new URLSearchParams(params).toString();
    script.src = `${GAS_WEB_APP_URL}?action=${action}&callback=${callbackName}&${queryString}`;
    document.head.appendChild(script);
  });
}

/**
 * Llama a una acción del GAS que se ejecuta de forma asíncrona.
 * Esta función inicia la acción y devuelve inmediatamente.
 * Se puede usar un polling posterior para comprobar el resultado.
 * @param {string} action - La acción a iniciar en el GAS.
 * @param {string} accessToken - El token de acceso de Google.
 * @param {Object} params - Parámetros adicionales para la acción.
 * @returns {Promise<Object>} - Promesa que se resuelve con la respuesta del GAS.
 */
export async function callGASFunctionAsync(action, accessToken, params = {}) {
  // Esta función usa el mismo timeout que la original, ya que la llamada es rápida (solo deja una señal)
  return callGASFunction(action, accessToken, params); 
}

async function callTICGASFunction(action, accessToken, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonpCallback' + Date.now();
    const script = document.createElement('script');

    window[callbackName] = (data) => {
      clearTimeout(timeoutId); // Clear the timeout
      delete window[callbackName]; // Clean up the global callback
      document.head.removeChild(script);
      resolve(data);
    };

    script.onerror = (error) => {
      clearTimeout(timeoutId); // Clear the timeout
      delete window[callbackName]; // Clean up the global callback
      document.head.removeChild(script);
      reject(new Error(`JSONP request failed: ${error.message || 'Network error'}`));
    };

    // Set a timeout for the request
    const timeoutId = setTimeout(() => {
      delete window[callbackName]; // Clean up the global callback
      document.head.removeChild(script);
      reject(new Error('JSONP request timed out.'));
    }, 15000); // 15 seconds timeout

    params.accessToken = accessToken;
    const queryString = new URLSearchParams(params).toString();
    script.src = `${TIC_GAS_WEB_APP_URL}?action=${action}&callback=${callbackName}&${queryString}`;
    document.head.appendChild(script);
  });
}

export async function getTICIncidents(accessToken) {
    return callTICGASFunction('getIncidents', accessToken);
}

export async function addTICIncident(incidentData, accessToken) {
    return callTICGASFunction('addIncident', accessToken, { data: JSON.stringify(incidentData) });
}

export async function updateTICIncident(incidentData, accessToken) {
    return callTICGASFunction('updateIncident', accessToken, { data: JSON.stringify(incidentData) });
}

export async function exportTICPendingIncidents(accessToken) {
    return callTICGASFunction('exportPendingIncidents', accessToken);
}


async function callMantenimentGASFunction(action, accessToken, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonpCallback' + Date.now();
    const script = document.createElement('script');

    window[callbackName] = (data) => {
      clearTimeout(timeoutId); // Clear the timeout
      delete window[callbackName]; // Clean up the global callback
      document.head.removeChild(script);
      resolve(data);
    };

    script.onerror = (error) => {
      clearTimeout(timeoutId); // Clear the timeout
      delete window[callbackName]; // Clean up the global callback
      document.head.removeChild(script);
      reject(new Error(`JSONP request failed: ${error.message || 'Network error'}`));
    };

    // Set a timeout for the request
    const timeoutId = setTimeout(() => {
      delete window[callbackName]; // Clean up the global callback
      document.head.removeChild(script);
      reject(new Error('JSONP request timed out.'));
    }, 15000); // 15 seconds timeout

    params.accessToken = accessToken;
    const queryString = new URLSearchParams(params).toString();
    script.src = `${MANTENIMENT_GAS_WEB_APP_URL}?action=${action}&callback=${callbackName}&${queryString}`;
    document.head.appendChild(script);
  });
}

export async function getMantenimentIncidents(accessToken) {
    return callMantenimentGASFunction('getIncidents', accessToken);
}

export async function addMantenimentIncident(incidentData, accessToken) {
    return callMantenimentGASFunction('addIncident', accessToken, { data: JSON.stringify(incidentData) });
}

export async function updateMantenimentIncident(incidentData, accessToken) {
    return callMantenimentGASFunction('updateIncident', accessToken, { data: JSON.stringify(incidentData) });
}

export async function exportMantenimentPendingIncidents(accessToken) {
    return callMantenimentGASFunction('exportPendingIncidents', accessToken);
}


export async function getSheetData(sheetName, accessToken) {
  try {
    console.log(`Fetching data for sheet: ${sheetName}...`);
    const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${sheetName}!A2:C`;
    const data = await fetchGoogleAPI(url, accessToken);
    console.log(`${sheetName} data fetched:`, data);
    return Array.isArray(data.values) ? data.values : [];
  } catch (error) {
    console.error(`Error fetching ${sheetName} data:`, error);
    throw error;
  }
}

/**
 * Obtiene el valor de una celda o rango específico de la hoja de cálculo.
 * @param {string} range - El rango a leer, por ejemplo, 'Configuració!Z1001'.
 * @param {string} accessToken - El token de acceso de Google.
 * @returns {Promise<string|Array|null>} - El valor de la celda o un array de valores.
 */
export async function getSheetCellValue(range, accessToken) {
  try {
    const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${range}`;
    const response = await fetchGoogleAPI(url, accessToken);
    const values = response.values;
    if (!values || values.length === 0) {
      return null; // Celda vacía
    }
    // Si es una sola celda, devuelve el valor directamente
    if (values.length === 1 && values[0].length === 1) {
      return values[0][0];
    }
    // Si es un rango, devuelve el array
    return values;
  } catch (error) {
    // Si el error es porque el rango no existe o está vacío, lo tratamos como null
    if (error.message && (error.message.includes('Unable to parse range') || error.message.includes('No values'))) {
        return null;
    }
    console.error(`Error fetching cell value for range ${range}:`, error);
    throw error; // Relanzar otros errores
  }
}

export async function updateSheetData(range, values, accessToken) {
  try {
    console.log(`Updating sheet data for range: ${range} with values:`, values);
    const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }
    console.log(`Sheet data updated for range: ${range}`);
    return response.json();
  } catch (error) {
    console.error(`Error updating sheet data for range ${range}:`, error);
    throw error;
  }
}

export async function updateConfig(config, accessToken) {
  try {
    console.log('Starting updateConfig...');
    const url = `${BASE_URL}/${SPREADSHEET_ID}/values/Configuració!A2:F?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: config }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }
        // console.log('Config updated successfully.');
    return response.json();
  } catch (error) {
    console.error('Error in updateConfig:', error);
    throw error;
  }
}