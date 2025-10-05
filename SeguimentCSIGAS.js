const SPREADSHEET_ID = "1wlvnGyvwsIReC_1bSkB2wo4UecJPNpOTs2ksB2n8Iqc";

function doGet(e) {
  const callback = e.parameter.callback;
  const action = e.parameter.action;

  if (!callback) {
    return ContentService.createTextOutput("El paràmetre 'callback' és obligatori.");
  }

  if (action === "post") {
    return handlePost(e);
  } else {
    return handleGet(e);
  }
}

function handleGet(e) {
  const callback = e.parameter.callback;
  const sheetName = e.parameter.sheetName;
  
  if (!sheetName) {
    return createJsonResponse({ error: "El paràmetre 'sheetName' és obligatori." }, callback);
  }

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) {
      return createJsonResponse({ error: `La pestanya '${sheetName}' no existeix.` }, callback);
    }
    
    const dataRange = sheet.getDataRange();
    // Check if the sheet is empty
    if (dataRange.getNumRows() === 0) {
        return createJsonResponse({ data: [] }, callback);
    }

    const values = dataRange.getValues();
    const headers = values.shift();
    
    const result = values.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return createJsonResponse({ data: result }, callback);
    
  } catch (error) {
    Logger.log("Error en handleGet: " + error.toString());
    return createJsonResponse({ error: "S'ha produït un error en el servidor: " + error.toString() }, callback);
  }
}

function handlePost(e) {
    const callback = e.parameter.callback;
    const sheetName = e.parameter.sheetName;
    const payload = e.parameter.payload;

    if (!sheetName || !payload) {
        return createJsonResponse({ success: false, error: "Falten paràmetres 'sheetName' o 'payload'." }, callback);
    }

    try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
        if (!sheet) {
            return createJsonResponse({ success: false, error: `La pestanya '${sheetName}' no existeix.` }, callback);
        }

        const data = JSON.parse(payload);
        const dataArray = Array.isArray(data) ? data : [data];

        if (dataArray.length === 0) {
            return createJsonResponse({ success: true, message: "No hi havia dades per afegir." }, callback);
        }

        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        const valuesToAppend = dataArray.map(obj => {
            return headers.map(header => obj[header] || "");
        });

        sheet.getRange(sheet.getLastRow() + 1, 1, valuesToAppend.length, valuesToAppend[0].length).setValues(valuesToAppend);

        return createJsonResponse({ success: true, updates: valuesToAppend.length }, callback);

    } catch (error) {
        Logger.log("Error en handlePost: " + error.toString());
        return createJsonResponse({ success: false, error: "S'ha produït un error en el servidor en desar les dades: " + error.toString() }, callback);
    }
}

function createJsonResponse(data, callback) {
  const json = JSON.stringify(data);
  const jsonp = `${callback}(${json})`;
  return ContentService.createTextOutput(jsonp).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// --- TEST FUNCTIONS ---
function testGet() {
  const e = {
    parameter: {
      callback: "console.log",
      sheetName: "Grups" 
    }
  };
  const result = doGet(e);
  Logger.log(result.getContent());
}

function testPost() {
    const e = {
        parameter: {
            action: "post",
            callback: "console.log",
            sheetName: "Anotacions",
            payload: JSON.stringify({
                "Ensenyament": "SMX2-TEST",
                "Alumne": "Alumne de Prova",
                "Data": new Date().toISOString(),
                "Tipus": "Test",
                "Anotació": "Això és una prova de POST des de GAS."
            })
        }
    };
    const result = doGet(e);
    Logger.log(result.getContent());
}