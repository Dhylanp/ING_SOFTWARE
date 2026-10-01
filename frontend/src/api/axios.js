import axios from 'axios';

const api = axios.create({
  baseURL: 'https://21jfmx87-8000.brs.devtunnels.ms',
  headers: {
    'Content-Type': 'application/json',
    'X-Tunnel-Skip-Anti-Phishing-Page': 'true'
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
