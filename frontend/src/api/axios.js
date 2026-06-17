import axios from "axios";

const apiHost =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "localhost"
    : window.location.hostname;

const API = axios.create({
  baseURL: `http://${apiHost}:5000/api`,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
