import { callProxy } from './proxyService';

/**
 * Obtiene datos de una hoja específica del módulo de Seguiment CSI.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {string} sheetName - El nombre de la hoja a leer (ej: "Grups", "Alumnes").
 */
export const csiFetchData = (accessToken, sheetName) => {
  return callProxy('csiFetchData', accessToken, { sheetName });
};

/**
 * Añade datos a una hoja específica del módulo de Seguiment CSI.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {string} sheetName - El nombre de la hoja donde añadir los datos.
 * @param {object | Array<object>} data - El objeto o array de objetos a añadir.
 */
export const csiPostData = (accessToken, sheetName, data) => {
  return callProxy('csiPostData', accessToken, { 
    sheetName, 
    payload: JSON.stringify(data) 
  });
};

/**
 * Llama a la función de IA de Gemini en el backend para generar un resumen.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {string} prompt - El prompt para enviar al modelo de IA.
 */
export const csiGenerateSummary = (accessToken, prompt) => {
  return callProxy('csiGenerateSummary', accessToken, { prompt });
};