import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

// Response interceptor for token expiry
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || "";
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/verify-otp") || url.includes("/auth/forgot-password") || url.includes("/auth/reset-password");
    // A 401 from the auth endpoints themselves just means "wrong credentials" —
    // show the error in place, don't force a page reload. Only an expired/invalid
    // token on an already-authenticated request should log the user out.
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("ae_token");
      localStorage.removeItem("ae_user");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default api;