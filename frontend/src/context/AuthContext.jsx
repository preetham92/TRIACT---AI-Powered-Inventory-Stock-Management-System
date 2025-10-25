import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { jwtDecode } from "jwt-decode";
import { setAuthToken } from "../services/api.js";
import authService from "../services/authService.js";
import shopService from "../services/shopService.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [shopDetails, setShopDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDataFromToken = useCallback(async (authToken) => {
    try {
      const decodedUser = jwtDecode(authToken);
      const currentTime = Date.now() / 1000;
      if (decodedUser.exp > currentTime) {
        setAuthToken(authToken);
        setUser(decodedUser);
        if (decodedUser.shopId) {
          const details = await shopService.getShopDetails(decodedUser.shopId);
          setShopDetails(details);
        }
      } else {
        localStorage.removeItem("token");
        setToken(null);
      }
    } catch (error) {
      localStorage.removeItem("token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadDataFromToken(token);
    } else {
      setLoading(false);
    }
  }, [token, loadDataFromToken]);

  const login = async (email, password) => {
    const { token: newToken } = await authService.login(email, password);
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setShopDetails(null);
    setAuthToken(null);
  };

  const authContextValue = useMemo(
    () => ({
      user,
      token,
      shopDetails,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      setShopDetails,
    }),
    [user, token, shopDetails, loading]
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
