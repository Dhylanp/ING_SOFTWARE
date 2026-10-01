// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://ingsoftware-production-4899.up.railway.app',
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