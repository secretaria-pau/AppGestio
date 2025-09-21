const SPREADSHEET_ID = "1wlvnGyvwsIReC_1bSkB2wo4UecJPNpOTs2ksB2n8Iqc";

function doGet(e) {
  const action = e.parameter.action;

  // Router based on action
  if (action === "generateGeminiContent") {
    return handleGeminiContent(e);
  }
  
  // Default action: get sheet data
  return handleGetSheetData(e);
}

function handleGetSheetData(e) {
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
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    const result = data.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return createJsonResponse({ data: result }, callback);
    
  } catch (error) {
    Logger.log("Error en doGet: " + error.toString());
    return createJsonResponse({ error: "S'ha produït un error en el servidor: " + error.toString() }, callback);
  }
}

function doPost(e) {
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
        Logger.log("Error en doPost: " + error.toString());
        return createJsonResponse({ success: false, error: "S'ha produït un error en el servidor en desar les dades: " + error.toString() }, callback);
    }
}


function createJsonResponse(data, callback) {
  const json = JSON.stringify(data);
  const jsonp = `${callback}(${json})`;
  return ContentService.createTextOutput(jsonp).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function handleGeminiContent(e) {
  const callback = e.parameter.callback;
  const prompt = e.parameter.prompt;

  if (!prompt) {
    return createJsonResponse({ error: "El paràmetre 'prompt' és obligatori." }, callback);
  }

  try {
    const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!API_KEY) {
      return createJsonResponse({ error: "La API Key de Gemini no està configurada a les propietats del script." }, callback);
    }

    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + API_KEY;

    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(API_URL, options);
    const responseData = JSON.parse(response.getContentText());
    
    const text = responseData.candidates[0].content.parts[0].text;

    return createJsonResponse({ text: text }, callback);

  } catch (error) {
    Logger.log("Error en handleGeminiContent: " + error.toString());
    return createJsonResponse({ error: "S'ha produït un error al contactar amb l'API de Gemini: " + error.toString() }, callback);
  }
}


// Funció de Test per comprovar la lectura des de l'editor de GAS
function testDoGet() {
  const e = {
    parameter: {
      callback: "console.log",
      sheetName: "Grups" 
    }
  };
  const result = doGet(e);
  Logger.log(result.getContent());
}

// Funció de Test per comprovar l'escriptura des de l'editor de GAS
function testDoPost() {
    const e = {
        parameter: {
            callback: "console.log",
            sheetName: "Anotacions",
            payload: JSON.stringify({
                "Ensenyament": "SMX2",
                "Alumne": "Joan Petit",
                "Data": new Date().toISOString(),
                "Tipus": "Test",
                "Anotació": "Això és una prova des de GAS."
            })
        }
    };
    const result = doPost(e);
    Logger.log(result.getContent());
}