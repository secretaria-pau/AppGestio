const PROXY_URL = process.env.REACT_APP_PROXY_GAS_URL;

export const callProxy = (action, accessToken, params = {}) => {
  return new Promise((resolve, reject) => {
    if (!PROXY_URL || PROXY_URL.includes("PON_AQUI_LA_URL")) {
      return reject(new Error("La URL del proxy no está configurada en el fichero .env."));
    }
    if (!accessToken) {
      return reject(new Error("El token de acceso (accessToken) es necesario para llamar al proxy."));
    }

    const callbackName = `jsonp_callback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let script;

    console.log(`Calling proxy action: ${action} with params:`, params);

    window[callbackName] = (response) => {
      delete window[callbackName];
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }

      console.log(`Proxy response for action ${action}:`, response);

      if (response.status === "success") {
        resolve(response.data);
      } else {
        // console.error("Error devuelto por el proxy GAS:", response);
        reject(new Error(response.message || "Error desconocido en el proxy de GAS."));
      }
    };

    const url = new URL(PROXY_URL);
    url.searchParams.append('action', action);
    url.searchParams.append('callback', callbackName);
    url.searchParams.append('token', accessToken); // Pasar el token al proxy

    for (const key in params) {
      url.searchParams.append(key, params[key]);
    }

    script = document.createElement('script');
    script.src = url.toString();
    script.onerror = () => {
      delete window[callbackName];
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(new Error(`Error de red o al cargar el script del proxy para la acción: ${action}`));
    };

    document.head.appendChild(script);
  });
};

// Versión especializada que devuelve la respuesta completa en lugar de solo response.data
export const callProxyFullResponse = (action, accessToken, params = {}) => {
  return new Promise((resolve, reject) => {
    if (!PROXY_URL || PROXY_URL.includes("PON_AQUI_LA_URL")) {
      return reject(new Error("La URL del proxy no está configurada en el fichero .env."));
    }
    if (!accessToken) {
      return reject(new Error("El token de acceso (accessToken) es necesario para llamar al proxy."));
    }

    const callbackName = `jsonp_callback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let script;

    console.log(`Calling proxy action: ${action} with params:`, params);

    window[callbackName] = (response) => {
      delete window[callbackName];
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }

      console.log(`Proxy response for action ${action}:`, response);

      if (response.status === "success") {
        resolve(response); // Devuelve toda la respuesta, no solo response.data
      } else {
        // console.error("Error devuelto por el proxy GAS:", response);
        reject(new Error(response.message || "Error desconocido en el proxy de GAS."));
      }
    };

    const url = new URL(PROXY_URL);
    url.searchParams.append('action', action);
    url.searchParams.append('callback', callbackName);
    url.searchParams.append('token', accessToken); // Pasar el token al proxy

    for (const key in params) {
      url.searchParams.append(key, params[key]);
    }

    script = document.createElement('script');
    script.src = url.toString();
    script.onerror = () => {
      delete window[callbackName];
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(new Error(`Error de red o al cargar el script del proxy para la acción: ${action}`));
    };

    document.head.appendChild(script);
  });
};