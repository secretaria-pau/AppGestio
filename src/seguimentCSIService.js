import { isMobile } from './lib/isMobile';
import { fetchSheetData, appendSheetData } from './googleSheetsService';

// --- Configuration ---
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxwxgPgUDZhUa-U9wlK51_1tMxbwphh3olG4C8ObI55W3HoHpiKZMftEJF9_vXa2OCB/exec';
const SPREADSHEET_ID = '1wlvnGyvwsIReC_1bSkB2wo4UecJPNpOTs2ksB2n8Iqc';

// ====================================================================
// DESKTOP PATH: JSONP Implementation
// ====================================================================

const makeJsonpRequest = (params) => {
    return new Promise((resolve, reject) => {
        const callbackName = `jsonp_callback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        window[callbackName] = (response) => {
            delete window[callbackName];
            script.remove();
            if (response.error || response.success === false) {
                reject(new Error(response.error || 'Unknown GAS Error'));
            } else {
                resolve(response.data || response);
            }
        };

        const url = new URL(GAS_URL);
        url.searchParams.append('callback', callbackName);
        for (const key in params) {
            url.searchParams.append(key, params[key]);
        }

        const script = document.createElement('script');
        script.src = url.toString();
        script.onerror = () => reject(new Error(`Failed to load script for ${params.sheetName || 'GAS action'}`));
        document.head.appendChild(script);
    });
};

// ====================================================================
// MOBILE PATH: Sheets API Implementation
// ====================================================================

const fetchDataAPI = async (sheetName, accessToken) => {
    // For mobile, we need to know the full range. Assuming the sheets are simple lists.
    const range = `${sheetName}!A:Z`; // Fetch all possible columns
    const data = await fetchSheetData(range, accessToken, SPREADSHEET_ID);
    
    // Convert array of arrays to array of objects
    if (!data || data.length < 2) return [];
    const headers = data[0];
    const rows = data.slice(1);
    return rows.map(row => {
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = row[i];
        });
        return obj;
    });
};

const postDataAPI = async (sheetName, payload, accessToken) => {
    const dataArray = Array.isArray(payload) ? payload : [payload];
    if (dataArray.length === 0) return { success: true, message: "No data to add." };

    const headersRange = `${sheetName}!1:1`;
    const headersData = await fetchSheetData(headersRange, accessToken, SPREADSHEET_ID);
    if (!headersData || headersData.length === 0) throw new Error(`Could not fetch headers for sheet: ${sheetName}`);
    
    const headers = headersData[0];
    const valuesToAppend = dataArray.map(obj => headers.map(header => obj[header] || ""));

    const appendRange = `${sheetName}!A:Z`;
    return appendSheetData(appendRange, valuesToAppend, accessToken, SPREADSHEET_ID);
};


// ====================================================================
// Public Service Functions
// ====================================================================

export const csiFetchData = (sheetName, accessToken) => {
    if (isMobile()) {
        return fetchDataAPI(sheetName, accessToken);
    } else {
        return makeJsonpRequest({ sheetName });
    }
};

export const csiPostData = (sheetName, data, accessToken) => {
    if (isMobile()) {
        return postDataAPI(sheetName, data, accessToken);
    } else {
        return makeJsonpRequest({ sheetName, payload: JSON.stringify(data), method: 'POST' });
    }
};

export const csiGenerateSummary = (prompt, accessToken) => {
    // This action seems specific to GAS and involves AI, so we keep it on GAS for both platforms.
    return makeJsonpRequest({ action: 'generateGeminiContent', prompt });
};
