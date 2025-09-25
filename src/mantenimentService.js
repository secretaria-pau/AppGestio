import { isMobile } from './lib/isMobile';
import { fetchSheetData, appendSheetData, updateSheetData } from './googleSheetsService';
import { MANTENIMENT_GAS_WEB_APP_URL } from './googleServices';

const MANTENIMENT_SHEET_ID = "1m4cG9LvB4fMc681lBbVC_MnhqqyI2Iyq_vo6MieYK5U";
const MANTENIMENT_SHEET_NAME = "Manteniment";

// Helper to convert array of arrays to array of objects
const dataToObjectArray = (data) => {
  if (!data || data.length < 2) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map((row, index) => {
    const obj = headers.reduce((acc, header, i) => {
      acc[header] = row[i];
      return acc;
    }, {});
    obj.rowIndex = index + 2; // Add rowIndex for updates
    return obj;
  });
};

// --- Service Functions ---

export const getIncidents = async (accessToken) => {
  if (isMobile()) {
    // Mobile: Use Google Sheets API with specific ID
    const range = `${MANTENIMENT_SHEET_NAME}!A:I`;
    const data = await fetchSheetData(range, accessToken, MANTENIMENT_SHEET_ID);
    if (data && data.length > 1) {
      return dataToObjectArray(data);
    }
    return [];
  } else {
    // Desktop: Use GAS Web App
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        if (data.status === 'success') {
          resolve(data.data);
        } else {
          reject(new Error(data.message || "Error fetching incidents from GAS."));
        }
      };
      const script = document.createElement('script');
      script.src = `${MANTENIMENT_GAS_WEB_APP_URL}?action=getIncidents&callback=${callbackName}&token=${accessToken}`;
      script.onerror = () => reject(new Error('Error loading GAS script.'));
      document.body.appendChild(script);
    });
  }
};

export const addIncident = async (incidentData, accessToken) => {
  if (isMobile()) {
    // Mobile: Use Google Sheets API with specific ID
    const range = `${MANTENIMENT_SHEET_NAME}!A:I`;
    const headers = await fetchSheetData(`${MANTENIMENT_SHEET_NAME}!A1:I1`, accessToken, MANTENIMENT_SHEET_ID);
    const newRow = headers[0].map(header => {
        if (header === "Data de comunicació" || header === "Data de la darrera edició") return new Date().toISOString();
        return incidentData[header] || "";
    });
    const idIndex = headers[0].indexOf("ID");
    if(idIndex !== -1) newRow[idIndex] = "";
    return await appendSheetData(range, [newRow], accessToken, MANTENIMENT_SHEET_ID);
  } else {
    // Desktop: Use GAS Web App
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        if (data.status === 'success') resolve(data.data);
        else reject(new Error(data.message || "Error adding incident via GAS."));
      };
      const script = document.createElement('script');
      script.src = `${MANTENIMENT_GAS_WEB_APP_URL}?action=addIncident&data=${encodeURIComponent(JSON.stringify(incidentData))}&callback=${callbackName}&token=${accessToken}`;
      script.onerror = () => reject(new Error('Error loading GAS script.'));
      document.body.appendChild(script);
    });
  }
};

export const updateIncident = async (incidentData, accessToken) => {
    if (isMobile()) {
        // Mobile: Use Google Sheets API with specific ID
        const rowIndex = incidentData.rowIndex;
        if (!rowIndex) throw new Error("rowIndex is required for updating.");
        const range = `${MANTENIMENT_SHEET_NAME}!A${rowIndex}:I${rowIndex}`;
        const headers = await fetchSheetData(`${MANTENIMENT_SHEET_NAME}!A1:I1`, accessToken, MANTENIMENT_SHEET_ID);
        const updatedRow = headers[0].map(header => {
            if (header === "Data de la darrera edició") return new Date().toISOString();
            return incidentData[header] || "";
        });
        return await updateSheetData(range, [updatedRow], accessToken, MANTENIMENT_SHEET_ID);
    } else {
        // Desktop: Use GAS Web App
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            window[callbackName] = (data) => {
                delete window[callbackName];
                document.body.removeChild(script);
                if (data.status === 'success') resolve(data.data);
                else reject(new Error(data.message || "Error updating incident via GAS."));
            };
            const script = document.createElement('script');
            script.src = `${MANTENIMENT_GAS_WEB_APP_URL}?action=updateIncident&data=${encodeURIComponent(JSON.stringify(incidentData))}&callback=${callbackName}&token=${accessToken}`;
            script.onerror = () => reject(new Error('Error loading GAS script.'));
            document.body.appendChild(script);
        });
    }
};