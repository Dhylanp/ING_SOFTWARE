import axios from 'axios';

const api = axios.create({
  baseURL: 'https://ingsoftware-production-4899.up.railway.app',
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
