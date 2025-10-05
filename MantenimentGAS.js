const SHEET_ID = "1m4cG9LvB4fMc681lBbVC_MnhqqyI2Iyq_vo6MieYK5U";
const SHEET_NAME = "Manteniment";

function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'getIncidents':
        result = getIncidents();
        break;
      case 'addIncident':
        result = addIncident(JSON.parse(e.parameter.data));
        break;
      case 'updateIncident':
        result = updateIncident(JSON.parse(e.parameter.data));
        break;
      case 'exportPendingIncidents':
        result = exportPendingIncidents(e.parameter.accessToken);
        break;
      default:
        throw new Error("Acció no reconeguda.");
    }
    return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify({ status: 'success', data: result }) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (error) {
    return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify({ status: 'error', message: error.message }) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

function setupSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    const headers = [
      "ID", "Tipus", "Qui fa la incidencia?", "Espai", "Objecte avariat", 
      "Descripció", "Estat", "Data de comunicació", "Data de la darrera edició"
    ];
    sheet.appendRow(headers);
  }
}

function getIncidents() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  const incidents = data.map((row, index) => {
    let incident = {};
    headers.forEach((header, i) => {
      incident[header] = row[i];
    });
    incident.rowIndex = index + 2; // Per poder actualitzar la fila correctament
    return incident;
  });
  
  return incidents;
}

function addIncident(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const newId = sheet.getLastRow(); // ID simple basat en el número de fila
  const today = new Date();
  
  const newRow = [
    newId,
    data.Tipus,
    data["Qui fa la incidencia?"],
    data.Espai,
    data["Objecte avariat"],
    data["Descripció"],
    data.Estat,
    today,
    today
  ];
  
  sheet.appendRow(newRow);
  return { id: newId };
}

function updateIncident(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const rowIndex = data.rowIndex;
  
  const today = new Date();
  
  sheet.getRange(rowIndex, 2).setValue(data.Tipus);
  sheet.getRange(rowIndex, 3).setValue(data["Qui fa la incidencia?"]);
  sheet.getRange(rowIndex, 4).setValue(data.Espai);
  sheet.getRange(rowIndex, 5).setValue(data["Objecte avariat"]);
  sheet.getRange(rowIndex, 6).setValue(data["Descripció"]);
  sheet.getRange(rowIndex, 7).setValue(data.Estat);
  sheet.getRange(rowIndex, 9).setValue(today); // Actualitzar data d'edició

  return { id: data.ID };
}

function exportPendingIncidents(accessToken) {
  const sourceSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const incidents = getIncidents();
  
  const pendingIncidents = incidents.filter(inc => 
    inc.Estat === 'Comunicat' || inc.Estat === 'En reparació'
  );
  
  if (pendingIncidents.length === 0) {
    return "No hi ha incidències pendents per exportar.";
  }
  
  const userEmail = JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { 'Authorization': 'Bearer ' + accessToken } }).getContentText()).email;
  const newSheetName = `Tasques Pendents - ${new Date().toLocaleDateString('ca-ES')}`;
  
  const newSpreadsheet = SpreadsheetApp.create(newSheetName);
  newSpreadsheet.addEditor(userEmail);
  
  const newSheet = newSpreadsheet.getSheets()[0];
  
  const headers = Object.keys(pendingIncidents[0]);
  newSheet.appendRow(headers);
  
  pendingIncidents.forEach(incident => {
    const row = headers.map(header => incident[header]);
    newSheet.appendRow(row);
  });
  
  return newSpreadsheet.getUrl();
}