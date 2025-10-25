import api from "./api.js";

const login = async (email, password) => {
  const response = await api.post("/api/auth/login", { email, password });
  return response.data; // { token, user }
};

const register = async (userData) => {
  const response = await api.post("/api/auth/register", userData);
  return response.data;
};



const logout = async () => {
  // optional server-side logout endpoint
  try { await api.post("/api/auth/logout"); } catch (e) {}
  return { ok: true };
};

export default { login, register, logout };
