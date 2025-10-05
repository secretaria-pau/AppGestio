import { callProxy } from './proxyService';
import { isMobile } from './lib/isMobile';

const SCRIPT_ID = 'AKfycbz_Bf2_y_Y_R_Q_C_A_S_D_F_G_H_J_K_L_Z_X_C_V_B_N_M'; // This SCRIPT_ID is likely for the GAS web app URL

export const getIncidents = async (accessToken) => {
  console.log(`Fetching incidents for ${isMobile() ? 'mobile' : 'PC'} using GAS proxy`);
  try {
    // callProxy already handles the response structure and returns the data or throws an error
    const data = await callProxy('getTICIncidents', accessToken);
    return data;
  } catch (error) {
    console.error('Error in getIncidents (GAS):', error);
    throw error;
  }
};

export const addIncident = async (incidentData, accessToken) => {
  console.log(`Adding incident for ${isMobile() ? 'mobile' : 'PC'} using GAS proxy`);
  try {
    // callProxy already handles the response structure and returns the data or throws an error
    const data = await callProxy('addTICIncident', accessToken, { payload: JSON.stringify(incidentData) });
    return data;
  } catch (error) {
    console.error('Error in addIncident (GAS):', error);
    throw error;
  }
};

export const updateIncident = async (incidentData, accessToken) => {
  console.log(`Updating incident for ${isMobile() ? 'mobile' : 'PC'} using GAS proxy`);
  try {
    // callProxy already handles the response structure and returns the data or throws an error
    const data = await callProxy('updateTICIncident', accessToken, { payload: JSON.stringify(incidentData) });
    return data;
  } catch (error) {
    console.error('Error in updateIncident (GAS):', error);
    throw error;
  }
};