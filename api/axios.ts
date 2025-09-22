import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = process.env.API_BASE || 'https://api.yourdomain.com';

// create instance
export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// attach auth token from AsyncStorage on each request
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('evenup:token'); // adjust key
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // swallow error — request will proceed without token
    console.warn('[apiClient] failed reading token', e);
  }
  return config;
});

// simple response error handling
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    // centralize e.g., 401 handling, logging, toast
    // You can dispatch a logout if 401, etc.
    return Promise.reject(error);
  }
);

// minimal helpers wrapping axios to keep generics consistent
export const api = {
  get: async <T = any>(url: string, params?: object) =>
    (await apiClient.get<T>(url, { params })).data,
  post: async <T = any>(url: string, body?: any) => (await apiClient.post<T>(url, body)).data,
  put: async <T = any>(url: string, body?: any) => (await apiClient.put<T>(url, body)).data,
  del: async <T = any>(url: string) => (await apiClient.delete<T>(url)).data,
};
