// =================================================================
//        SCRIPT PARA LA GESTIÓN DE AVISOS
// =================================================================

// --- Nombres de las Hojas de Cálculo ---
const AVISOS_SHEET_NAME = 'Avisos';
const USUARIS_SHEET_NAME = 'Usuaris'; // Se asume que esta pestaña existe en el mismo documento

// =================================================================
//        CONFIGURACIÓN DEL MENÚ
// =================================================================

/**
 * Se ejecuta cuando se abre la hoja de cálculo.
 * Crea un menú personalizado para facilitar la configuración inicial.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Gestió Avisos')
    .addItem('1. Crear pestanya d'Avisos', 'crearPestanyaAvisos')
    .addToUi();
}

/**
 * Crea la hoja 'Avisos' con los encabezados necesarios si no existe.
 */
function crearPestanyaAvisos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(AVISOS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(AVISOS_SHEET_NAME);
    const headers = ['ID', 'Timestamp', 'Titol', 'Contingut', 'Actiu'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
    SpreadsheetApp.getUi().alert('Pestanya "Avisos" creada correctament.');
  } else {
    SpreadsheetApp.getUi().alert('La pestanya "Avisos" ja existeix.');
  }
}

// =================================================================
//        LÓGICA DE LA API WEB (doGet y doPost)
// =================================================================

/**
 * Se ejecuta para peticiones GET. Usado para LEER datos.
 */
function doGet(e) {
  const action = e.parameter.action;
  let data;
  let response; // Declarar response aquí

  try {
    switch (action) {
      case 'getActiveAvisos':
        data = getAvisos(true);
        break;
      case 'getAllAvisos':
        data = getAvisos(false);
        break;
      default:
        throw new Error('Acció no vàlida.');
    }
    response = ContentService.createTextOutput(JSON.stringify({ success: true, data: data }));
  } catch (error) {
    response = ContentService.createTextOutput(JSON.stringify({ success: false, message: error.message }));
  }

  response.setMimeType(ContentService.MimeType.JSON);
  response.setHeader('Access-Control-Allow-Origin', '*'); // <-- AÑADIDO DIRECTAMENTE AQUÍ
  return response;
}

/**
 * Se ejecuta para peticiones POST. Usado para ESCRIBIR o MODIFICAR datos.
 */
function doPost(e) {
  let response; // Declarar response aquí
  try {
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!isUserAdmin(userEmail)) {
      throw new Error('Accés no autoritzat. Només els usuaris amb rol de "Direcció" poden realitzar aquesta acció.');
    }

    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    let result;

    switch (action) {
      case 'addAviso':
        result = addAviso(requestData.payload);
        break;
      case 'toggleAvisoStatus':
        result = toggleAvisoStatus(requestData.payload.id);
        break;
      default:
        throw new Error('Acció no vàlida.');
    }
    response = ContentService.createTextOutput(JSON.stringify({ success: true, data: result }));
  } catch (error) {
    response = ContentService.createTextOutput(JSON.stringify({ success: false, message: `Error en l'operació: ${error.message}` }));
  }

  response.setMimeType(ContentService.MimeType.JSON);
  response.setHeader('Access-Control-Allow-Origin', '*'); // <-- AÑADIDO DIRECTAMENTE AQUÍ
  return response;
}

// =================================================================
//        FUNCIONES AUXILIARES
// =================================================================

/**
 * Comprueba si un usuario tiene rol de 'Direcció'.
 * @param {string} email - El email del usuario a comprobar.
 * @returns {boolean} - True si el usuario es administrador.
 */
function isUserAdmin(email) {
  const usuarisSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USUARIS_SHEET_NAME);
  if (!usuarisSheet) {
    throw new Error(`No s'ha trobat la pestanya "${USUARIS_SHEET_NAME}".`);
  }
  const data = usuarisSheet.getDataRange().getValues();
  const headers = data.shift();
  const emailCol = headers.indexOf('Email');
  const rolCol = headers.indexOf('Rol');

  if (emailCol === -1 || rolCol === -1) {
    throw new Error(`La pestanya "${USUARIS_SHEET_NAME}" ha de contenir les columnes "Email" i "Rol".`);
  }

  for (let i = 0; i < data.length; i++) {
    if (data[i][emailCol].toLowerCase() === email.toLowerCase()) {
      return data[i][rolCol] === 'Direcció';
    }
  }
  return false;
}

/**
 * Obtiene los avisos de la hoja de cálculo.
 * @param {boolean} activeOnly - Si es true, devuelve solo los avisos activos.
 * @returns {Array} - Un array de objetos, cada uno representando un aviso.
 */
function getAvisos(activeOnly) {
  const avisosSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AVISOS_SHEET_NAME);
  if (!avisosSheet) return [];
  
  const dataRange = avisosSheet.getDataRange();
  const values = dataRange.getValues();
  if (values.length <= 1) return [];

  const headers = values.shift();
  const activeCol = headers.indexOf('Actiu');

  let results = values.map((row, index) => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    obj.rowIndex = index + 2;
    return obj;
  }).filter(row => row['ID']);

  if (activeOnly) {
    results = results.filter(aviso => aviso['Actiu'] === true);
  }

  results.sort((a, b) => new Date(b['Timestamp']) - new Date(a['Timestamp']));
  return results;
}

/**
 * Añade un nuevo aviso a la hoja.
 * @param {Object} payload - Objeto con 'Titol' y 'Contingut'.
 * @returns {Object} - El aviso creado.
 */
function addAviso(payload) {
  if (!payload.Titol || !payload.Contingut) {
    throw new Error('El títol i el contingut són obligatoris.');
  }
  const avisosSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AVISOS_SHEET_NAME);
  const newId = Utilities.getUuid();
  const timestamp = new Date();
  const newRow = [newId, timestamp, payload.Titol, payload.Contingut, true];
  
  avisosSheet.appendRow(newRow);
  return { ID: newId, Timestamp: timestamp, Titol: payload.Titol, Contingut: payload.Contingut, Actiu: true };
}

/**
 * Cambia el estado Actiu/Inactiu de un aviso.
 * @param {string} id - El ID del aviso.
 * @returns {string} - Mensaje de confirmación.
 */
function toggleAvisoStatus(id) {
  const avisosSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AVISOS_SHEET_NAME);
  const data = getAvisos(false);
  const aviso = data.find(a => a.ID === id);

  if (!aviso) throw new Error('No s'ha trobat l'avís amb aquest ID.');

  const activeColIndex = avisosSheet.getRange(1, 1, 1, avisosSheet.getLastColumn()).getValues()[0].indexOf('Actiu') + 1;
  const currentStatus = avisosSheet.getRange(aviso.rowIndex, activeColIndex).getValue();
  avisosSheet.getRange(aviso.rowIndex, activeColIndex).setValue(!currentStatus);

  return `L'estat de l'avís "${aviso.Titol}" ha canviat a ${!currentStatus ? 'Actiu' : 'Inactiu'}.`;
}

/**
 * Maneja las peticiones OPTIONS para CORS (Cross-Origin Resource Sharing).
 */
function doOptions() {
  const response = ContentService.createTextOutput('');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}