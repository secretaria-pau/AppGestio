import { callProxy } from './proxyService';

/**
 * Obtiene todos los avisos.
 * @param {string} accessToken - El token de acceso del usuario.
 */
export const getAllAvisos = async (accessToken) => {
  const response = await callProxy('getAllAvisos', accessToken);
  return response; // callProxy already returns the data array
};

/**
 * Obtiene solo los avisos activos.
 * @param {string} accessToken - El token de acceso del usuario.
 */
export const getActiveAvisos = async (accessToken) => {
  const response = await callProxy('getActiveAvisos', accessToken);
  return response; // callProxy already returns the data array
};

/**
 * Añade un nuevo aviso.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {object} payload - El contenido del aviso ({ Titol, Contingut }).
 */
export const addAviso = (accessToken, payload) => {
  return callProxy('addAviso', accessToken, { payload: JSON.stringify(payload) });
};

/**
 * Cambia el estado (activo/inactivo) de un aviso.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {string} id - El ID del aviso a modificar.
 */
export const toggleAvisoStatus = (accessToken, id) => {
  return callProxy('toggleAvisoStatus', accessToken, { id });
};

/**
 * Elimina un aviso.
 * @param {string} accessToken - El token de acceso del usuario.
 * @param {string} id - El ID del aviso a eliminar.
 */
export const deleteAviso = (accessToken, id) => {
  return callProxy('deleteAviso', accessToken, { id });
};