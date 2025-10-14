// services/axiosLogger.ts
import axios from 'axios';

export function setupAxiosLogger() {
  axios.interceptors.request.use(
    (config) => {
      try {
        console.log('➡️ AXIOS REQUEST', {
          url: config.url,
          method: config.method,
          headers: config.headers,
          timeout: config.timeout,
          data: config.data ? JSON.parse(JSON.stringify(config.data)) : undefined,
        });
      } catch (e) {
        console.log('➡️ AXIOS REQUEST (stringified)', config);
      }
      return config;
    },
    (err) => {
      console.error('❌ AXIOS REQUEST ERROR', err);
      return Promise.reject(err);
    }
  );

  axios.interceptors.response.use(
    (resp) => {
      try {
        console.log('✅ AXIOS RESPONSE', {
          url: resp.config?.url,
          status: resp.status,
          data: resp.data,
          headers: resp.headers,
        });
      } catch (e) {
        console.log('✅ AXIOS RESPONSE (raw)', resp);
      }
      return resp;
    },
    (err) => {
      if (err.response) {
        console.error('❌ AXIOS RESPONSE ERROR', {
          url: err.config?.url,
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers,
        });
      } else if (err.request) {
        console.error('❌ AXIOS NO RESPONSE (request):', err.request);
      } else {
        console.error('❌ AXIOS ERROR MESSAGE:', err.message);
      }
      return Promise.reject(err);
    }
  );
}
