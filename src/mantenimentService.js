
import { callProxy } from './proxyService';

/**
 * Obtiene todas las incidencias de mantenimiento.
 * @param {string} accessToken - El token de acceso del usuario.
 */
export const getIncidents = (accessToken) => {
  return callProxy('getMantenimentIncidents', accessToken);
};

/**
 * Añade una nueva incidencia de mantenimiento.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {object} incidentData - El objeto con los datos de la incidencia.
 */
export const addIncident = async (accessToken, incidentData) => {
  try {
    // callProxy already handles the response structure and returns the data or throws an error
    const data = await callProxy('addMantenimentIncident', accessToken, { payload: JSON.stringify(incidentData) });
    return data;
  } catch (error) {
    console.error('Error in addIncident (Manteniment):', error);
    throw error;
  }
};

/**
 * Actualiza una incidencia de mantenimiento existente.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {object} incidentData - El objeto con los datos de la incidencia, debe incluir un `rowIndex`.
 */
export const updateIncident = async (accessToken, incidentData) => {
  try {
    // callProxy already handles the response structure and returns the data or throws an error
    const data = await callProxy('updateMantenimentIncident', accessToken, { payload: JSON.stringify(incidentData) });
    return data;
  } catch (error) {
    console.error('Error in updateIncident (Manteniment):', error);
    throw error;
  }
};
