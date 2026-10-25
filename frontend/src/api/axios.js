// src/api/axios.js
import axios from 'axios';

// La URL del backend se puede cambiar con VITE_API_URL (archivo .env) sin tocar el código.
export const API_URL =
  import.meta.env?.VITE_API_URL ||
  'https://ingsoftware-production-4899.up.railway.app';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
