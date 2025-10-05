
import { callProxy } from './proxyService';

/**
 * Obtiene el perfil del usuario logueado desde el proxy de GAS.
 * @param {string} accessToken - El token de acceso del usuario.
 */
export const getUserProfile = async (accessToken) => {
  return callProxy('getUserProfile', accessToken);
};

/**
 * Obtiene los datos de una hoja de cálculo a través del proxy.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {string} sheetName - El nombre de la hoja a leer (ej: "Incidències", "Avisos").
 * @param {string} [range] - Opcional. El rango A1 a leer. Si no se especifica, se lee toda la hoja.
 */
export const fetchSheetData = async (accessToken, sheetName, range) => {
  return callProxy('fetchSheetData', accessToken, { sheetName, range });
};

/**
 * Añade filas a una hoja de cálculo a través del proxy.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {string} sheetName - El nombre de la hoja donde añadir los datos.
 * @param {Array<Array<any>>} values - Un array de filas para añadir.
 */
export const appendSheetData = async (accessToken, sheetName, values) => {
  return callProxy('appendSheetData', accessToken, { sheetName, values: JSON.stringify(values) });
};

/**
 * Actualiza un rango en una hoja de cálculo a través del proxy.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {string} range - El rango A1 a actualizar (ej: "Incidències!A2:N2").
 * @param {Array<Array<any>>} values - Un array de filas con los nuevos valores.
 */
export const updateSheetData = async (accessToken, range, values) => {
  return callProxy('updateSheetData', accessToken, { range, values: JSON.stringify(values) });
};

/**
 * Obtiene la lista de usuarios autorizados.
 * @param {string} accessToken - El token de acceso del usuario.
 */
export const getUsers = async (accessToken) => {
  console.log("Calling getUsers with accessToken:", accessToken ? "[TOKEN]" : "null");
  try {
    const result = await callProxy('getUsers', accessToken);
    console.log("getUsers result:", result);
    return result;
  } catch (error) {
    console.error("getUsers error:", error);
    throw error;
  }
};

/**
 * Obtiene los tipos de incidencia definidos.
 * @param {string} accessToken - El token de acceso del usuario.
 */
export const getIncidentTypes = async (accessToken) => {
  console.log("Calling getIncidentTypes with accessToken:", accessToken ? "[TOKEN]" : "null");
  try {
    const result = await callProxy('getIncidentTypes', accessToken);
    console.log("getIncidentTypes result:", result);
    return result;
  } catch (error) {
    console.error("getIncidentTypes error:", error);
    throw error;
  }
};
