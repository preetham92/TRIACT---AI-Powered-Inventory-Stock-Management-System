import axios from "axios";

const api = axios.create({
  baseURL: "/", // Requests will now go to the proxy, e.g., /api/auth/login
  headers: {
    "Content-Type": "application/json",
  },
});

// Function to set the JWT token in the headers for all subsequent requests
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export default api;
