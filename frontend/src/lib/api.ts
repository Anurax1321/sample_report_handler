import axios from "axios";
import { getToken, logout } from "./auth";

// Point to backend; during dev it's http://localhost:8000
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

// Attach Authorization header to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle error responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = "/vijayrekha/login";
    }
    return Promise.reject(error);
  },
);

export default api;
