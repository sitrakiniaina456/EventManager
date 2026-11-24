
import axios from "axios";

const apiBaseURL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/";

const api = axios.create({
  baseURL: apiBaseURL,
});

let refreshRequest;

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Laisser le navigateur définir Content-Type pour FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (config.data !== undefined) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const isTokenRequest = /(^|\/)token(\/|$)/.test(originalRequest?.url || "");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isTokenRequest
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        refreshRequest ??= axios
          .post(`${apiBaseURL}token/refresh/`, { refresh: refreshToken })
          .then((response) => {
            localStorage.setItem("access_token", response.data.access);
            return response.data.access;
          })
          .finally(() => {
            refreshRequest = null;
          });

        return refreshRequest
          .then((accessToken) => {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          })
          .catch((refreshError) => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("username");

            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }

            return Promise.reject(refreshError);
          });
      }

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("username");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
