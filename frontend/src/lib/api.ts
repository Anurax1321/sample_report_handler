import axios from "axios";

// Point to backend; during dev it’s http://localhost:8000
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

export default api;
