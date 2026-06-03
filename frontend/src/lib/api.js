import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("shopzy_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

export const fmtPrice = (price) => {
  return `₹${price}`;
};

export const formatErr = (err) => {
  return err?.response?.data?.detail || err.message || "Something went wrong";
};