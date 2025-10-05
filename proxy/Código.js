// =================================================================
// PASO 1: Guardar los secretos
// =================================================================
function storeSecrets() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    "MAIN_SPREADSHEET_ID": "1VIrJbGlzQaesw0tpM-TW1Zkca9S-SWB1jeT2zotmDKk",
    "INCIDENCIES_SPREADSHEET_ID": "1VIrJbGlzQaesw0tpM-TW1Zkca9S-SWB1jeT2zotmDKk",
    "GRUPS_ALUMNES_SPREADSHEET_ID": "1dpb2AUnUKFOshd3iuaNBpl5hKYyHNLPIoi7I4F7mKWc",
    "SEGUIMENT_CSI_SHEET_ID": "1wlvnGyvwsIReC_1bSkB2wo4UecJPNpOTs2ksB2n8Iqc",
    "AVISOS_SHEET_ID": "1aE1OFQX1UxW1Z13zq_420aBW36YYZdl8Lyv4fakTooY",
    "TIC_SHEET_ID": "16zyQneOwbnWXj8h42CP-ABv75UCkYQOLIATiugFu9Aw",
    "MANTENIMENT_SHEET_ID": "1m4cG9LvB4fMc681lBbVC_MnhqqyI2Iyq_vo6MieYK5U",
  });
  Logger.log("Secretos guardados correctamente.");
}

// =================================================================
// PASO 2: Punto de entrada principal (doGet)
// =================================================================
function doGet(e) {
  const callback = e.parameter.callback;
  const action = e.parameter.action;
  const token = e.parameter.token;
  let response;

  try {
    // --- Verificación de Seguridad ---
    if (!token) throw new Error("No se ha proporcionado un token de acceso.");
    const tokenInfo = validateToken_(token);
    const userEmail = tokenInfo.email;
    if (!isUserAuthorized_(userEmail)) throw new Error("Acceso no autoritzat per a " + userEmail);

    // --- Enrutador de Acciones ---
    switch (action) {
      case "getUserProfile":
        response = getUserProfile_(userEmail);
        break;

      // --- Acciones Genéricas de Google Sheets ---
      case "fetchSheetData":
        response = fetchSheetData_(e.parameter.sheetName, e.parameter.range);
        break;
      case "appendSheetData":
        response = appendSheetData_(e.parameter.sheetName, e.parameter.values);
        break;
      case "updateSheetData":
        response = updateSheetData_(e.parameter.range, e.parameter.values);
        break;
      case "getUsers":
        response = getUsers_();
        break;
      case "getIncidentTypes":
        response = getIncidentTypes_();
        break;
      case "getConfig":
        response = getConfig_();
        break;
      case "updateConfig":
        response = updateConfig_(e.parameter.newConfig, userEmail);
        break;
      case "getSheetCellValue":
        response = getSheetCellValue_(e.parameter.range);
        break;
      case "getSheetData":
        // Determine the appropriate spreadsheet based on the sheet name
        if (["Llista Classrooms", "Llista Groups", "Llista Chats", "Professors", "Alumnes", "Configuració"].includes(e.parameter.sheetName)) {
          response = getSheetData_("GRUPS_ALUMNES_SPREADSHEET_ID", e.parameter.sheetName);
        } else {
          // Default to using the main spreadsheet for other sheet names
          response = getSheetData_("MAIN_SPREADSHEET_ID", e.parameter.sheetName);
        }
        break;

      // --- Acciones de Avisos ---
      case "getAllAvisos": response = getAvisos_(false); break;
      case "getActiveAvisos": response = getAvisos_(true); break;
      case "addAviso": response = addAviso_(e.parameter.payload, userEmail); break;
      case "toggleAvisoStatus": response = toggleAvisoStatus_(e.parameter.id, userEmail); break;
      case "deleteAviso": response = deleteAviso_(e.parameter.id, userEmail); break;

      // --- Acciones de Seguiment CSI ---
      case "csiFetchData": response = csiFetchData_(e.parameter.sheetName); break;
      case "csiPostData": response = csiPostData_(e.parameter.sheetName, e.parameter.payload); break;
      case "csiGenerateSummary": response = csiGenerateSummary_(e.parameter.prompt); break;

      // --- Acciones de Incidencias TIC ---
      case "getTICIncidents": response = getIncidents_("TIC_SHEET_ID", "Incidències TIC"); break;
      case "addTICIncident": response = addIncident_("TIC_SHEET_ID", "Incidències TIC", e.parameter.payload); break;
      case "updateTICIncident": response = updateIncident_("TIC_SHEET_ID", "Incidències TIC", e.parameter.payload); break;
      case "exportTICPendingIncidents": response = exportTICPendingIncidents_(userEmail); break;

      // --- Acciones de Manteniment ---
      case "getMantenimentIncidents": response = getIncidents_("MANTENIMENT_SHEET_ID", "Manteniment"); break;
      case "addMantenimentIncident": response = addIncident_("MANTENIMENT_SHEET_ID", "Manteniment", e.parameter.payload); break;
      case "updateMantenimentIncident": response = updateIncident_("MANTENIMENT_SHEET_ID", "Manteniment", e.parameter.payload); break;
      case "exportMantenimentPendingIncidents": response = exportMantenimentPendingIncidents_(userEmail); break;

      // --- Acciones de Grupos y Sincronización ---
      case "createStudentsSheet": response = createStudentsSheet_(e.parameter.courseName, e.parameter.studentsData, e.parameter.groupName, e.parameter.teacherNames, e.parameter.newOwnerEmail, userEmail); break;
      case "actualitzarLlistes": response = actualitzarLlistes_(userEmail, e.parameter.token); break;
      case "actualitzarAlumnes": response = actualitzarAlumnes_(userEmail, e.parameter.token); break;
      case "actualitzarProfessors": response = actualitzarProfessors_(userEmail, e.parameter.token); break;
      case "iniciarSincronitzacioMembresAsync": response = iniciarSincronitzacioMembresAsync_(userEmail); break;

      default:
        response = { status: "error", message: "Acción desconocida: " + action };
    }
  } catch (error) {
    // Check if the error is related to quota limits
    if (error.message.includes("quota") || error.message.includes("limit") || 
        error.message.includes("velocity") || error.message.includes("transfèrencia de dades")) {
      console.warn("Quota limit error detected: " + error.message);
    }
    response = { status: "error", message: `Error en el servidor: ${error.message}` };
  }
  
  Logger.log(`[doGet] Before createJsonResponse_. Response status: ${response.status}, Callback: ${callback}`);
  return createJsonResponse_(response, callback);
}

// =================================================================
// Funciones de Lógica de Negocio (internas, con _)
// =================================================================

// --- Seguridad y Perfiles ---
function validateToken_(token) {
  try {
    // Google recomienda usar HTTPS y enviar el token como parámetro en la URL
    const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'AppGes.v6/1.0'
      }
    });
    
    if (response.getResponseCode() !== 200) {
      const errorContent = response.getContentText();
      console.error(`Error validando token: HTTP ${response.getResponseCode()}, Content: ${errorContent}`);
      throw new Error(`Error HTTP ${response.getResponseCode()} al validar token: ${errorContent}`);
    }
    
    const tokenInfo = JSON.parse(response.getContentText());
    if (tokenInfo.error_description) {
      throw new Error(`Token inválido: ${tokenInfo.error_description}`);
    }
    return tokenInfo;
  } catch (e) {
    console.error(`Excepción en validateToken_: ${e.message}`);
    throw new Error(`Fallo en la validación del token: ${e.message}`);
  }
}

function isUserAuthorized_(email) {
  const secrets = PropertiesService.getScriptProperties();
  const mainSpreadsheetId = secrets.getProperty("MAIN_SPREADSHEET_ID");
  const sheetName = "Usuaris";

  try {
    const sheet = SpreadsheetApp.openById(mainSpreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      console.error(`Sheet '${sheetName}' not found in spreadsheet ID '${mainSpreadsheetId}'`);
      return false;
    }
    const range = sheet.getRange("B:B").getValues(); // Gets values from column B
    const emailsInSheet = range.flat().map(e => String(e).toLowerCase().trim()); // Ensure string and trim
    
    const searchEmail = email.toLowerCase().trim();
    const isAuthorized = emailsInSheet.includes(searchEmail);
    return isAuthorized;
  } catch (e) {
    console.error(`Error accessing spreadsheet or sheet: ${e.message}`);
    return false;
  }
}

function getUserProfile_(email) {
    const secrets = PropertiesService.getScriptProperties();
    const sheet = SpreadsheetApp.openById(secrets.getProperty("MAIN_SPREADSHEET_ID")).getSheetByName("Usuaris");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf("Email");
    const nameCol = headers.indexOf("Nom");
    const roleCol = headers.indexOf("Rol");

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][emailCol]).toLowerCase().trim() === email.toLowerCase().trim()) {
            return {
                status: "success",
                data: {
                    name: data[i][nameCol],
                    email: data[i][emailCol],
                    role: data[i][roleCol]
                }
            };
        }
    }
    return { status: "error", message: "Usuario no encontrado." };
}

function checkAdminRole_(email) {
  const profile = getUserProfile_(email);
  if (profile.status !== 'success' || profile.data.role !== 'Direcció') {
    throw new Error("Acción no autorizada. Se requiere rol de 'Direcció'.");
  }
  return profile.data; // Devuelve el perfil completo si es admin
}

function checkGestorOrDirectorRole_(email) {
  const profile = getUserProfile_(email);
  if (profile.status !== 'success' || (profile.data.role !== 'Direcció' && profile.data.role !== 'Gestor')) {
    throw new Error("Acción no autorizada. Se requiere rol de 'Direcció' o 'Gestor'.");
  }
  return profile.data; // Devuelve el perfil completo si es gestor o director
}

// --- Lógica Genérica para Sheets ---
function fetchSheetData_(sheetName, range) {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("INCIDENCIES_SPREADSHEET_ID")).getSheetByName(sheetName);
  const data = sheet.getRange(range || sheet.getDataRange().getA1Notation()).getValues();
  return { status: "success", data: data };
}

function appendSheetData_(sheetName, valuesJSON) {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("INCIDENCIES_SPREADSHEET_ID")).getSheetByName(sheetName);
  const values = JSON.parse(valuesJSON);
  sheet.appendRow(values[0]); // Asume que values es un array de arrays, y solo añade la primera fila
  return { status: "success", message: "Fila añadida correctamente." };
}

function updateSheetData_(range, valuesJSON) {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("INCIDENCIES_SPREADSHEET_ID")).getSheetByName(range.split('!')[0]);
  const values = JSON.parse(valuesJSON);
  sheet.getRange(range).setValues(values);
  return { status: "success", message: "Datos actualizados correctamente." };
}

function getUsers_() {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("MAIN_SPREADSHEET_ID")).getSheetByName("Usuaris");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const users = data.map(row => headers.reduce((obj, header, i) => (obj[header] = row[i], obj), {}));
  return { status: "success", data: users };
}

function getIncidentTypes_() {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("INCIDENCIES_SPREADSHEET_ID")).getSheetByName("Tipus");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const types = data.map(row => headers.reduce((obj, header, i) => (obj[header] = row[i], obj), {}));
  return { status: "success", data: types };
}

function getConfig_() {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("GRUPS_ALUMNES_SPREADSHEET_ID")).getSheetByName("Configuració");
  const data = sheet.getDataRange().getValues();
  return { status: "success", data: data };
}

function updateConfig_(newConfigJSON, userEmail) {
  checkAdminRole_(userEmail);
  const newConfig = JSON.parse(newConfigJSON);
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("INCIDENCIES_SPREADSHEET_ID")).getSheetByName("Configuració");
  sheet.getDataRange().setValues(newConfig);
  return { status: "success", message: "Configuración actualizada." };
}

function getSheetCellValue_(range) {
  const secrets = PropertiesService.getScriptProperties();
  const sheetName = range.split('!')[0];
  const sheet = SpreadsheetApp.openById(secrets.getProperty("INCIDENCIES_SPREADSHEET_ID")).getSheetByName(sheetName);
  const value = sheet.getRange(range).getValue();
  return { status: "success", data: value };
}

function getSheetData_(spreadsheetIdKey, sheetName) {
  const secrets = PropertiesService.getScriptProperties();
  const spreadsheetId = secrets.getProperty(spreadsheetIdKey);

  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found in spreadsheet identified by '${spreadsheetIdKey}'.`);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Special processing for Configuració sheet to handle boolean values properly
  if (sheetName === 'Configuració') {
    // Convert boolean values 'true'/'false' to 'TRUE'/'FALSE' strings
    return { 
      status: "success", 
      data: data.map(row => 
        row.map(cell => {
          if (typeof cell === 'boolean') {
            return cell ? 'TRUE' : 'FALSE';
          }
          return cell;
        })
      ) 
    };
  }
  
  return { status: "success", data: data };
}

// --- Lógica para Avisos ---
function getAvisos_(activeOnly) {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("AVISOS_SHEET_ID")).getSheetByName("Avisos");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  let avisos = data.map(row => {
    const aviso = {};
    headers.forEach((header, i) => aviso[header] = row[i]);
    return aviso;
  }).filter(aviso => aviso.ID); // Filtrar filas vacías

  if (activeOnly) {
    avisos = avisos.filter(aviso => aviso["Actiu"] === true || aviso["Actiu"] === "TRUE");
  }
  
  return { status: "success", data: avisos.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)) };
}

function addAviso_(payloadJSON, userEmail) {
  checkAdminRole_(userEmail);
  const payload = JSON.parse(payloadJSON);
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("AVISOS_SHEET_ID")).getSheetByName("Avisos");
  
  const newId = 'ID-' + Date.now();
  const timestamp = new Date();
  
  sheet.appendRow([newId, timestamp, payload.Titol, payload.Contingut, true]);
  
  return { status: "success", data: { ID: newId, Timestamp: timestamp, Titol: payload.Titol, Contingut: payload.Contingut, Actiu: true } };
}

function toggleAvisoStatus_(id, userEmail) {
  checkAdminRole_(userEmail);
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("AVISOS_SHEET_ID")).getSheetByName("Avisos");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ID");
  const activeCol = headers.indexOf("Actiu");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      const currentStatus = data[i][activeCol];
      sheet.getRange(i + 1, activeCol + 1).setValue(!currentStatus);
      return { status: "success", message: "Estado del aviso cambiado." };
    }
  }
  throw new Error("No se encontró el aviso con el ID proporcionado.");
}

function deleteAviso_(id, userEmail) {
  checkAdminRole_(userEmail);
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("AVISOS_SHEET_ID")).getSheetByName("Avisos");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ID");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Aviso eliminado." };
    }
  }
  throw new Error("No se encontró el aviso con el ID proporcionado.");
}


// --- Lógica para Seguiment CSI ---
function csiFetchData_(sheetName) {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("SEGUIMENT_CSI_SHEET_ID")).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data.map(row => headers.reduce((obj, header, i) => (obj[header] = row[i], obj), {}));
  return { status: "success", data: result };
}

function csiPostData_(sheetName, payloadJSON) {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("SEGUIMENT_CSI_SHEET_ID")).getSheetByName(sheetName);
  const payload = JSON.parse(payloadJSON);
  const dataArray = Array.isArray(payload) ? payload : [payload];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const valuesToAppend = dataArray.map(obj => headers.map(header => obj[header] || ""));
  sheet.getRange(sheet.getLastRow() + 1, 1, valuesToAppend.length, valuesToAppend[0].length).setValues(valuesToAppend);
  return { status: "success", data: { message: `${dataArray.length} fila(s) añadida(s) a ${sheetName}.` } };
}

function csiGenerateSummary_(prompt) {
  // La lógica de Gemini puede ser compleja, por ahora devolvemos un placeholder
  // Aquí iría la llamada a la API de Gemini si la tienes configurada
  const summary = `Resumen generado por IA para el prompt: "${prompt.substring(0, 100)}..."`;
  return { status: "success", data: summary };
}

// --- Lógica Reutilizable para Incidencias (TIC y Manteniment) ---
function getIncidents_(sheetIdKey, sheetName) {
  Logger.log(`[getIncidents_] Starting for sheetIdKey: ${sheetIdKey}, sheetName: ${sheetName}`);
  const secrets = PropertiesService.getScriptProperties();
  Logger.log(`[getIncidents_] Retrieved secrets.`);
  const spreadsheetId = secrets.getProperty(sheetIdKey);
  Logger.log(`[getIncidents_] Spreadsheet ID: ${spreadsheetId}`);

  if (!spreadsheetId) {
    Logger.log(`[getIncidents_] Error: Spreadsheet ID not found for key: ${sheetIdKey}`);
    throw new Error(`Spreadsheet ID not found for key: ${sheetIdKey}`);
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  Logger.log(`[getIncidents_] Opened spreadsheet: ${spreadsheet.getName()}`);

  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`[getIncidents_] Error: Sheet '${sheetName}' not found in spreadsheet ID: ${spreadsheetId}`);
    throw new Error(`Sheet '${sheetName}' not found.`);
  }
  Logger.log(`[getIncidents_] Opened sheet: ${sheet.getName()}`);

  const dataRange = sheet.getDataRange();
  Logger.log(`[getIncidents_] Data range A1 notation: ${dataRange.getA1Notation()}`);

  const data = dataRange.getValues();
  Logger.log(`[getIncidents_] Raw data fetched. Number of rows: ${data.length}`);

  if (data.length === 0) {
    Logger.log(`[getIncidents_] No data found in sheet '${sheetName}'.`);
    return { status: "success", data: [] }; // Return empty array if no data
  }

  const headers = data.shift(); // Remove headers from data
  Logger.log(`[getIncidents_] Headers: ${JSON.stringify(headers)}`);
  Logger.log(`[getIncidents_] Data after shifting headers. Number of rows: ${data.length}`);

  const result = data.map((row, index) => {
    const obj = headers.reduce((acc, header, i) => {
      acc[header] = row[i];
      return acc;
    }, {});
    obj.rowIndex = index + 2; // Add rowIndex (accounting for header row and 0-based index)
    return obj;
  });
  Logger.log(`[getIncidents_] Processed ${result.length} incidents.`);
  return { status: "success", data: result };
}

function addIncident_(sheetIdKey, sheetName, payloadJSON) {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty(sheetIdKey)).getSheetByName(sheetName);
  const incidentData = JSON.parse(payloadJSON);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const now = new Date();

  const newRow = headers.map(header => {
      if (header === "Data de comunicació" || header === "Data de la darrera edició") {
        return now;
      }
      return incidentData[header] || "";
  });

  sheet.appendRow(newRow);
  return { status: "success", data: { message: `Incidencia añadida a ${sheetName}.` } };
}

function updateIncident_(sheetIdKey, sheetName, payloadJSON) {
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty(sheetIdKey)).getSheetByName(sheetName);
  const incidentData = JSON.parse(payloadJSON);
  
  const rowIndex = incidentData.rowIndex;
  if (!rowIndex) throw new Error("rowIndex es necesario para actualizar una incidencia.");

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const updatedRow = headers.map(header => {
      if (header === "Data de la darrera edició") {
        return new Date();
      }
      // For all other headers, use the value from the payload.
      // This assumes the client sends the full object, including unchanged values.
      return incidentData[header] || ""; 
  });

  sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
  return { status: "success", data: { message: `Incidencia actualizada en ${sheetName}.` } };
}

function createStudentsSheet_(courseName, studentsDataJSON, groupName, teacherNamesJSON, newOwnerEmail, userEmail) {
  checkGestorOrDirectorRole_(userEmail);
  const studentsData = JSON.parse(studentsDataJSON);
  const teacherNames = JSON.parse(teacherNamesJSON);

  const ss = SpreadsheetApp.create(`Alumnes ${courseName}`);
  const sheet = ss.getActiveSheet();
  sheet.setName("Alumnes");

  // Headers
  sheet.appendRow(["Nom Alumne", "Email Alumne"]);

  // Data
  studentsData.forEach(student => sheet.appendRow(student));

  // Add metadata
  sheet.appendRow([]); // Empty row for separation
  sheet.appendRow(["Curs:", courseName]);
  sheet.appendRow(["Grup:", groupName]);
  sheet.appendRow(["Professors:", teacherNames.join(", ")]);

  // Share the spreadsheet
  ss.addEditor(newOwnerEmail);
  ss.addEditor(userEmail);

  return { status: "success", url: ss.getUrl(), message: "Full de càlcul creat correctament." };
}

function exportTICPendingIncidents_(userEmail) {
  checkGestorOrDirectorRole_(userEmail);
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("TIC_SHEET_ID")).getSheetByName("Incidències TIC");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const pendingIncidents = data.filter(row => row[headers.indexOf("Estat")] !== "Solucionat");

  if (pendingIncidents.length === 0) {
    return { status: "success", data: "No hi ha incidències TIC pendents." };
  }

  const ss = SpreadsheetApp.create("Incidències TIC Pendents");
  const newSheet = ss.getActiveSheet();
  newSheet.appendRow(headers);
  pendingIncidents.forEach(incident => newSheet.appendRow(incident));

  ss.addEditor(userEmail);

  return { status: "success", data: ss.getUrl(), message: "Full de càlcul d'incidències TIC pendents creat." };
}

function exportMantenimentPendingIncidents_(userEmail) {
  checkGestorOrDirectorRole_(userEmail);
  const secrets = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(secrets.getProperty("MANTENIMENT_SHEET_ID")).getSheetByName("Manteniment");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const pendingIncidents = data.filter(row => row[headers.indexOf("Estat")] !== "Solucionat");

  if (pendingIncidents.length === 0) {
    return { status: "success", data: "No hi ha incidències de manteniment pendents." };
  }

  const ss = SpreadsheetApp.create("Incidències Manteniment Pendents");
  const newSheet = ss.getActiveSheet();
  newSheet.appendRow(headers);
  pendingIncidents.forEach(incident => newSheet.appendRow(incident));

  ss.addEditor(userEmail);

  return { status: "success", data: ss.getUrl(), message: "Full de càlcul d'incidències de manteniment pendents creat." };
}

function actualitzarLlistes_(userEmail, token) {
  checkAdminRole_(userEmail);
  const secrets = PropertiesService.getScriptProperties();
  const grupsAlumnesSpreadsheetId = secrets.getProperty("GRUPS_ALUMNES_SPREADSHEET_ID");
  const ss = SpreadsheetApp.openById(grupsAlumnesSpreadsheetId);
  
  if (!token) throw new Error("No s'ha proporcionat un token per a l'actualització de llistes.");
  
  const headers = {
    'Authorization': `Bearer ${token}`,
  };
  
  // Fetch classrooms
  const classroomsUrl = 'https://classroom.googleapis.com/v1/courses';
  const classroomsResponse = UrlFetchApp.fetch(classroomsUrl, {
    headers: headers,
    muteHttpExceptions: true
  });
  
  if (classroomsResponse.getResponseCode() !== 200) {
    throw new Error(`Failed to fetch classrooms: ${classroomsResponse.getContentText()}`);
  }
  
  const classroomsData = JSON.parse(classroomsResponse.getContentText()).courses || [];
  
  // Update Llista Classrooms sheet
  let classroomsSheet = ss.getSheetByName("Llista Classrooms");
  if (!classroomsSheet) {
    classroomsSheet = ss.insertSheet("Llista Classrooms");
  }
  classroomsSheet.clear();
  
  // Add headers
  const classroomsHeaders = ["ID Classroom", "Nom Classroom", "URL"];
  classroomsSheet.appendRow(classroomsHeaders);
  
  // Add data
  classroomsData.forEach(course => {
    classroomsSheet.appendRow([course.id, course.name, course.alternateLink]);
  });
  
  // Fetch Google Groups (requires admin.directory scope - need to use ScriptApp token for this)
  // Note: This may require domain-wide delegation depending on the setup
  const adminToken = ScriptApp.getOAuthToken();
  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
  };
  
  const groupsUrl = 'https://www.googleapis.com/admin/directory/v1/groups';
  const groupsResponse = UrlFetchApp.fetch(groupsUrl, {
    headers: adminHeaders,
    muteHttpExceptions: true
  });
  
  if (groupsResponse.getResponseCode() !== 200) {
    // Continue execution even if groups fetch fails
  } else {
    const groupsData = JSON.parse(groupsResponse.getContentText()).groups || [];
    
    // Update Llista Groups sheet
    let groupsSheet = ss.getSheetByName("Llista Groups");
    if (!groupsSheet) {
      groupsSheet = ss.insertSheet("Llista Groups");
    }
    groupsSheet.clear();
    
    // Add headers
    const groupsHeaders = ["Nom Group", "URL"];
    groupsSheet.appendRow(groupsHeaders);
    
    // Add data
    groupsData.forEach(group => {
      groupsSheet.appendRow([group.email, group.description || group.name]);
    });
  }
  
  // For Google Chat, use the user's token
  const chatHeaders = {
    'Authorization': `Bearer ${token}`,
  };
  
  const chatUrl = 'https://chat.googleapis.com/v1/spaces';
  const chatResponse = UrlFetchApp.fetch(chatUrl, {
    headers: chatHeaders,
    muteHttpExceptions: true
  });
  
  // Note: Google Chat API requires specific permissions and setup
  let chatSpaces = [];
  if (chatResponse.getResponseCode() === 200) {
    chatSpaces = JSON.parse(chatResponse.getContentText()).spaces || [];
  }
  
  // Update Llista Chats sheet
  let chatsSheet = ss.getSheetByName("Llista Chats");
  if (!chatsSheet) {
    chatsSheet = ss.insertSheet("Llista Chats");
  }
  chatsSheet.clear();
  
  // Add headers
  const chatsHeaders = ["ID Chat", "Nom Chat", "Tipus"];
  chatsSheet.appendRow(chatsHeaders);
  
  // Add data
  chatSpaces.forEach(space => {
    chatsSheet.appendRow([space.name, space.displayName || space.name, space.type || '']);
  });
  
  return { status: "success", message: "Llistes actualitzades correctament." };
}

function actualitzarAlumnes_(userEmail, token) {
  checkAdminRole_(userEmail);
  const secrets = PropertiesService.getScriptProperties();
  const grupsAlumnesSpreadsheetId = secrets.getProperty("GRUPS_ALUMNES_SPREADSHEET_ID");
  const ss = SpreadsheetApp.openById(grupsAlumnesSpreadsheetId);
  
  if (!token) throw new Error("No s'ha proporcionat un token per a l'actualització d'alumnes.");
  
  const headers = {
    'Authorization': `Bearer ${token}`,
  };
  
  // Update Alumnes sheet
  let alumnesSheet = ss.getSheetByName("Alumnes");
  if (!alumnesSheet) {
    alumnesSheet = ss.insertSheet("Alumnes");
  }
  alumnesSheet.clear();
  
  // Add headers
  const alumnesHeaders = ["Nom Curs", "Nom Alumne", "Email Alumne"];
  alumnesSheet.appendRow(alumnesHeaders);
  
  // Get classrooms to fetch students
  const classroomsSheet = ss.getSheetByName("Llista Classrooms");
  if (!classroomsSheet) {
    throw new Error("No s'ha trobat la fulla 'Llista Classrooms'. Executeu primer 'actualitzarLlistes'.");
  }
  
  const classroomData = classroomsSheet.getDataRange().getValues();
  if (classroomData.length <= 1) {
    // No need to continue if there are no classrooms
    return { status: "success", message: "No hi ha cap classroom per extreure alumnes." };
  }
  
  // Skip header row
  for (let i = 1; i < classroomData.length; i++) {
    const classroomId = classroomData[i][0]; // First column is ID
    const classroomName = classroomData[i][1]; // Second column is name
    
    // Fetch students for this classroom
    try {
      const studentsUrl = `https://classroom.googleapis.com/v1/courses/${classroomId}/students`;
      
      const studentsResponse = UrlFetchApp.fetch(studentsUrl, {
        headers: headers,
        muteHttpExceptions: true
      });
      
      if (studentsResponse.getResponseCode() !== 200) {
        continue; // Skip to next classroom
      }
      
      const studentsData = JSON.parse(studentsResponse.getContentText()).students || [];
      
      // Add students to the alumnes sheet
      studentsData.forEach(student => {
        alumnesSheet.appendRow([
          classroomName, 
          student.profile.name.fullName, 
          student.profile.emailAddress
        ]);
      });
    } catch (e) {
      continue; // Continue to next classroom
    }
  }
  
  return { status: "success", message: "Alumnes actualitzats correctament." };
}

function actualitzarProfessors_(userEmail, token) {
  checkAdminRole_(userEmail);
  const secrets = PropertiesService.getScriptProperties();
  const grupsAlumnesSpreadsheetId = secrets.getProperty("GRUPS_ALUMNES_SPREADSHEET_ID");
  const ss = SpreadsheetApp.openById(grupsAlumnesSpreadsheetId);
  
  if (!token) throw new Error("No s'ha proporcionat un token per a l'actualització de professors.");
  
  const headers = {
    'Authorization': `Bearer ${token}`,
  };
  
  // Update Professors sheet
  let professorsSheet = ss.getSheetByName("Professors");
  if (!professorsSheet) {
    professorsSheet = ss.insertSheet("Professors");
  }
  professorsSheet.clear();
  
  // Add headers
  const professorsHeaders = ["Nom Curs", "Nom Professor", "Email Professor"];
  professorsSheet.appendRow(professorsHeaders);
  
  // Get classrooms to fetch teachers
  const classroomsSheet = ss.getSheetByName("Llista Classrooms");
  if (!classroomsSheet) {
    throw new Error("No s'ha trobat la fulla 'Llista Classrooms'. Executeu primer 'actualitzarLlistes'.");
  }
  
  const classroomData = classroomsSheet.getDataRange().getValues();
  if (classroomData.length <= 1) {
    // No need to continue if there are no classrooms
    return { status: "success", message: "No hi ha cap classroom per extreure professors." };
  }
  
  // Skip header row
  for (let i = 1; i < classroomData.length; i++) {
    const classroomId = classroomData[i][0]; // First column is ID
    const classroomName = classroomData[i][1]; // Second column is name
    
    // Fetch teachers for this classroom
    try {
      const teachersUrl = `https://classroom.googleapis.com/v1/courses/${classroomId}/teachers`;
      
      const teachersResponse = UrlFetchApp.fetch(teachersUrl, {
        headers: headers,
        muteHttpExceptions: true
      });
      
      if (teachersResponse.getResponseCode() !== 200) {
        continue; // Skip to next classroom
      }
      
      const teachersData = JSON.parse(teachersResponse.getContentText()).teachers || [];
      
      // Add teachers to the professors sheet
      teachersData.forEach(teacher => {
        professorsSheet.appendRow([
          classroomName, 
          teacher.profile.name.fullName, 
          teacher.profile.emailAddress
        ]);
      });
    } catch (e) {
      continue; // Continue to next classroom
    }
  }
  
  return { status: "success", message: "Professors actualitzats correctament." };
}

function iniciarSincronitzacioMembresAsync_(userEmail) {
  checkAdminRole_(userEmail);
  
  // Using the ScriptApp's triggers to run the sync operation asynchronously
  const functionName = 'processSincronitzacioMembres_';
  const trigger = ScriptApp.newTrigger(functionName)
    .timeBased()
    .at(new Date(Date.now() + 1000)) // Run in 1 second
    .create();
  
  // Store the userEmail and trigger ID for use in the async function
  const properties = PropertiesService.getUserProperties();
  properties.setProperty('sync_members_user_email', userEmail);
  properties.setProperty('pending_sync_trigger_id', trigger.getUniqueId());
  
  // Set initial status
  const secrets = PropertiesService.getScriptProperties();
  const grupsAlumnesSpreadsheetId = secrets.getProperty("GRUPS_ALUMNES_SPREADSHEET_ID");
  const ss = SpreadsheetApp.openById(grupsAlumnesSpreadsheetId);
  
  const configSheet = ss.getSheetByName("Configuració");
  if (!configSheet) {
    throw new Error("No s'ha trobat la fulla 'Configuració'.");
  }
  
  // Write status that sync has started
  configSheet.getRange('Z1001').setValue('Iniciant sincronització...');
  
  return { status: "success", message: "Sincronització de membres iniciada de forma asíncrona." };
}

function processSincronitzacioMembres_() {
  try {
    const secrets = PropertiesService.getScriptProperties();
    const grupsAlumnesSpreadsheetId = secrets.getProperty("GRUPS_ALUMNES_SPREADSHEET_ID");
    const ss = SpreadsheetApp.openById(grupsAlumnesSpreadsheetId);
    
    const configSheet = ss.getSheetByName("Configuració");
    if (!configSheet) {
      throw new Error("No s'ha trobat la fulla 'Configuració'.");
    }
    
    // Update the status that processing has started
    configSheet.getRange('Z1001').setValue('Processant...');
    
    // Get the config data to determine which classrooms to sync
    const configData = configSheet.getDataRange().getValues();
    if (configData.length <= 1) {
      configSheet.getRange('Z1001').setValue('No hi ha configuració per processar.');
      return;
    }
    
    // Get the classroom list sheet
    const classroomsSheet = ss.getSheetByName("Llista Classrooms");
    if (!classroomsSheet) {
      throw new Error("No s'ha trobat la fulla 'Llista Classrooms'.");
    }
    
    const classroomData = classroomsSheet.getDataRange().getValues();
    if (classroomData.length <= 1) {
      configSheet.getRange('Z1001').setValue('No hi ha classrooms per sincronitzar.');
      return;
    }
    
    // Get the groups list sheet
    const groupsSheet = ss.getSheetByName("Llista Groups");
    if (!groupsSheet) {
      throw new Error("No s'ha trobat la fulla 'Llista Groups'.");
    }
    
    const groupData = groupsSheet.getDataRange().getValues();
    if (groupData.length <= 1) {
      configSheet.getRange('Z1001').setValue('No hi ha grups per sincronitzar.');
      return;
    }
    
    // For Google Groups operations, we need to use ScriptApp token (may require domain-wide delegation)
    const adminToken = ScriptApp.getOAuthToken();
    const adminHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    
    // For Classroom operations, we can read from stored properties
    // In a real implementation, you'd need to store the user token or re-authenticate
    // For now, assuming that we have the necessary permissions
    
    for (let i = 1; i < configData.length; i++) {
      const isActive = configData[i][0]; // First column is "Actiu"
      const classroomName = configData[i][1]; // Second column is "Nom Classroom"
      const groupName = configData[i][2]; // Third column is "Group Associat"
      
      if (isActive !== 'TRUE') continue; // Only process active classrooms
      
      if (!groupName) continue; // Skip if no group is associated
      
      // Find the classroom ID
      let classroomId = null;
      for (let j = 1; j < classroomData.length; j++) {
        if (classroomData[j][1] === classroomName) { // Compare by name (second column)
          classroomId = classroomData[j][0]; // ID is first column
          break;
        }
      }
      
      if (!classroomId) {
        continue;
      }
      
      // Find the group email
      let groupEmail = null;
      for (let k = 1; k < groupData.length; k++) {
        if (groupData[k][0] === groupName) { // Compare by name/email (first column)
          groupEmail = groupData[k][0]; // Email is first column
          break;
        }
      }
      
      if (!groupEmail) {
        continue;
      }
      
      // Get the students from this classroom - using ScriptApp token (may need domain-wide delegation)
      const classroomHeaders = {
        'Authorization': `Bearer ${adminToken}`,
      };
      const studentsUrl = `https://classroom.googleapis.com/v1/courses/${classroomId}/students`;
      const studentsResponse = UrlFetchApp.fetch(studentsUrl, {
        headers: classroomHeaders,
        muteHttpExceptions: true
      });
      
      if (studentsResponse.getResponseCode() !== 200) {
        continue;
      }
      
      const studentsData = JSON.parse(studentsResponse.getContentText()).students || [];
      
      // Get current members of the Google Group
      const membersUrl = `https://www.googleapis.com/admin/directory/v1/groups/${groupEmail}/members`;
      const membersResponse = UrlFetchApp.fetch(membersUrl, {
        headers: adminHeaders,
        muteHttpExceptions: true
      });
      
      if (membersResponse.getResponseCode() !== 200) {
        continue;
      }
      
      let groupMembers = [];
      try {
        groupMembers = JSON.parse(membersResponse.getContentText()).members || [];
      } catch(e) {
        // Continue with empty groupMembers list
      }
      
      // Prepare lists of members to add and remove
      const currentGroupEmails = groupMembers.map(member => member.email);
      const classroomStudentEmails = studentsData.map(student => student.profile.emailAddress);
      
      // Add students who are in the classroom but not in the group
      for (const studentEmail of classroomStudentEmails) {
        if (!currentGroupEmails.includes(studentEmail)) {
          try {
            const addMemberUrl = `https://www.googleapis.com/admin/directory/v1/groups/${groupEmail}/members`;
            const addMemberPayload = {
              "email": studentEmail,
              "role": "MEMBER"
            };
            
            const addResponse = UrlFetchApp.fetch(addMemberUrl, {
              method: 'POST',
              headers: adminHeaders,
              payload: JSON.stringify(addMemberPayload),
              muteHttpExceptions: true
            });
          } catch(e) {
            // Continue to next student
          }
        }
      }
      
      // Remove members who are in the group but not in the classroom
      for (const memberEmail of currentGroupEmails) {
        if (!classroomStudentEmails.includes(memberEmail)) {
          try {
            const removeMemberUrl = `https://www.googleapis.com/admin/directory/v1/groups/${groupEmail}/members/${memberEmail}`;
            const removeResponse = UrlFetchApp.fetch(removeMemberUrl, {
              method: 'DELETE',
              headers: adminHeaders,
              muteHttpExceptions: true
            });
          } catch(e) {
            // Continue to next member
          }
        }
      }
    }
    
    configSheet.getRange('Z1001').setValue('Sincronització completada correctament.');
    
  } catch (error) {
    const secrets = PropertiesService.getScriptProperties();
    const grupsAlumnesSpreadsheetId = secrets.getProperty("GRUPS_ALUMNES_SPREADSHEET_ID");
    const ss = SpreadsheetApp.openById(grupsAlumnesSpreadsheetId);
    
    const configSheet = ss.getSheetByName("Configuració");
    if (configSheet) {
      configSheet.getRange('Z1001').setValue(`Error: ${error.message}`);
    }
  } finally {
    // Clean up the trigger
    try {
      const properties = PropertiesService.getUserProperties();
      const triggerId = properties.getProperty('pending_sync_trigger_id');
      if (triggerId) {
        const triggers = ScriptApp.getScriptTriggers();
        for (const trigger of triggers) {
          if (trigger.getUniqueId() === triggerId) {
            ScriptApp.deleteTrigger(trigger);
            break;
          }
        }
        properties.deleteProperty('pending_sync_trigger_id');
        properties.deleteProperty('sync_members_user_email');
      }
    } catch (cleanupError) {
      // Error in cleanup doesn't affect main functionality
    }
  }
}

// =================================================================
// Función de Utilidad para devolver JSONP (interna, con _)
// =================================================================
function createJsonResponse_(data, callback) {
  const json = JSON.stringify(data);
  const jsonp = `${callback}(${json})`;
  return ContentService.createTextOutput(jsonp).setMimeType(ContentService.MimeType.JAVASCRIPT);
}