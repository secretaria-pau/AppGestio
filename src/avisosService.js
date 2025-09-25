import { isMobile } from './lib/isMobile';
import { fetchSheetData, appendSheetData, updateSheetData } from './googleSheetsService';

// --- Configuration ---
const AVISOS_GAS_URL = 'https://script.google.com/macros/s/AKfycbwDpnq_nRwb7DQi9r6KjHIp3NjPNKeJNtrxDeaL1oZREl3BD9oeRAWGzJ-FMTD9c6fFhg/exec';
const AVISOS_SHEET_ID = "1aE1OFQX1UxW1Z13zq_420aBW36YYZdl8Lyv4fakTooY";
const AVISOS_SHEET_NAME = 'Avisos';
const USUARIS_SHEET_NAME = 'Usuaris';

// ====================================================================
// DESKTOP PATH: Original JSONP Implementation
// ====================================================================

const makeJsonpRequest = (action, params = {}) => {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        
        window[callbackName] = (data) => {
            delete window[callbackName];
            document.body.removeChild(script);
            if (data.success) {
                resolve(data.data);
            } else {
                reject(new Error(data.message || 'Unknown error from GAS'));
            }
        };

        const url = new URL(AVISOS_GAS_URL);
        url.searchParams.append('action', action);
        url.searchParams.append('callback', callbackName);
        
        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                url.searchParams.append(key, params[key]);
            }
        }

        const script = document.createElement('script');
        script.src = url.toString();
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('Network error or script loading failed.'));
        };
        document.body.appendChild(script);
    });
};

// ====================================================================
// MOBILE PATH: Sheets API Implementation
// ====================================================================

const isUserAdmin_API = async (email, accessToken) => {
  const range = `${USUARIS_SHEET_NAME}!A:C`;
  const usersData = await fetchSheetData(range, accessToken, AVISOS_SHEET_ID);
  if (!usersData || usersData.length < 2) throw new Error("No s'han pogut verificar els permisos d'usuari.");
  const headers = usersData[0];
  const emailCol = headers.indexOf('Email');
  const rolCol = headers.indexOf('Rol');
  if (emailCol === -1 || rolCol === -1) throw new Error('La fulla d\'usuaris no té les columnes "Email" i "Rol".');
  const user = usersData.slice(1).find(row => row[emailCol]?.toLowerCase() === email.toLowerCase());
  return user && user[rolCol] === 'Direcció';
};

const dataToObjectArray_API = (data) => {
  if (!data || data.length < 2) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map((row, index) => {
    const obj = headers.reduce((acc, header, i) => { acc[header] = row[i]; return acc; }, {});
    obj.rowIndex = index + 2;
    return obj;
  }).filter(row => row['ID']);
};

// ====================================================================
// Public Service Functions (with mobile/desktop switch)
// ====================================================================

export const getAvisos = async (accessToken, activeOnly = false) => {
    if (isMobile()) {
        const range = `${AVISOS_SHEET_NAME}!A:E`;
        const data = await fetchSheetData(range, accessToken, AVISOS_SHEET_ID);
        let avisos = dataToObjectArray_API(data);
        if (activeOnly) {
            avisos = avisos.filter(aviso => aviso['Actiu'] === true || aviso['Actiu'] === 'TRUE');
        }
        avisos.sort((a, b) => new Date(b['Timestamp']) - new Date(a['Timestamp']));
        return avisos;
    } else {
        const action = activeOnly ? 'getActiveAvisos' : 'getAllAvisos';
        return makeJsonpRequest(action);
    }
};

export const getActiveAvisos = (accessToken) => {
    return getAvisos(accessToken, true);
};

export const getAllAvisos = (accessToken) => {
    return getAvisos(accessToken, false);
};

export const addAviso = async (payload, profile, accessToken) => {
    if (isMobile()) {
        const isAdmin = await isUserAdmin_API(profile.email, accessToken);
        if (!isAdmin) throw new Error('Accés no autoritzat.');
        const range = `${AVISOS_SHEET_NAME}!A:E`;
        const newId = 'ID-' + Date.now();
        const timestamp = new Date().toISOString();
        const newRow = [newId, timestamp, payload.Titol, payload.Contingut, true];
        await appendSheetData(range, [newRow], accessToken, AVISOS_SHEET_ID);
        return { ID: newId, Timestamp: timestamp, Titol: payload.Titol, Contingut: payload.Contingut, Actiu: true };
    } else {
        return makeJsonpRequest('addAviso', { data: JSON.stringify(payload), token: accessToken });
    }
};

export const toggleAvisoStatus = async (id, profile, accessToken) => {
    if (isMobile()) {
        const isAdmin = await isUserAdmin_API(profile.email, accessToken);
        if (!isAdmin) throw new Error('Accés no autoritzat.');
        const allAvisos = await getAllAvisos(accessToken);
        const avisoToToggle = allAvisos.find(a => a.ID === id);
        if (!avisoToToggle) throw new Error('No s\'ha trobat l\'avís amb aquest ID.');
        const range = `${AVISOS_SHEET_NAME}!E${avisoToToggle.rowIndex}`;
        const currentStatus = avisoToToggle['Actiu'] === true || avisoToToggle['Actiu'] === 'TRUE';
        await updateSheetData(range, [[!currentStatus]], accessToken, AVISOS_SHEET_ID);
        return `L\'estat de l\'avís ha canviat.`;
    } else {
        return makeJsonpRequest('toggleAvisoStatus', { id: id, token: accessToken });
    }
};

export const deleteAviso = async (id, profile, accessToken) => {
    if (isMobile()) {
        const isAdmin = await isUserAdmin_API(profile.email, accessToken);
        if (!isAdmin) throw new Error('Accés no autoritzat.');
        const allAvisos = await getAllAvisos(accessToken);
        const avisoToDelete = allAvisos.find(a => a.ID === id);
        if (!avisoToDelete) throw new Error('No s\'ha trobat l\'avís amb aquest ID.');
        const range = `${AVISOS_SHEET_NAME}!A${avisoToDelete.rowIndex}:E${avisoToDelete.rowIndex}`;
        await updateSheetData(range, [['', '', '', '', '']], accessToken, AVISOS_SHEET_ID);
        return `Avís eliminat.`;
    } else {
        return makeJsonpRequest('deleteAviso', { id: id, token: accessToken });
    }
};