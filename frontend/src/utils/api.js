import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

// Response interceptor for token expiry
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("ae_token");
      localStorage.removeItem("ae_user");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default api;
