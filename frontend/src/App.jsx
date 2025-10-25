import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import PrivateRoute from "./components/PrivateRoute.jsx";
import NavBar from "./components/NavBar.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import OwnerDashboard from "./pages/OwnerDashboard.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import InvoiceScan from "./pages/InvoiceScan.jsx";
import CreateOrder from "./pages/CreateOrder.jsx";
import ManageStock from "./pages/ManageStock.jsx";
import ManageEmployees from "./pages/ManageEmployees.jsx";
import ShopSettings from "./pages/ShopSettings.jsx";
import SalaryInfo from "./pages/SalaryInfo.jsx";

const Dashboard = () => {
  const { user } = useAuth();
  if (user?.role === "owner") return <OwnerDashboard />;
  if (user?.role === "employee") return <EmployeeDashboard />;
  return <Navigate to="/login" />;
};

function App() {
  const { shopDetails } = useAuth();

  useEffect(() => {
    document.title = shopDetails?.shopName
      ? `TRIACT - ${shopDetails.shopName}`
      : "TRIACT";
  }, [shopDetails]);

  return (
    <div className="bg-gray-100 min-h-screen">
      <NavBar />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/scan-invoice"
            element={
              <PrivateRoute>
                <InvoiceScan />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-order"
            element={
              <PrivateRoute>
                <CreateOrder />
              </PrivateRoute>
            }
          />
          <Route
            path="/manage-stock"
            element={
              <PrivateRoute>
                <ManageStock />
              </PrivateRoute>
            }
          />
          <Route
            path="/manage-employees"
            element={
              <PrivateRoute>
                <ManageEmployees />
              </PrivateRoute>
            }
          />
          <Route
            path="/shop-settings"
            element={
              <PrivateRoute>
                <ShopSettings />
              </PrivateRoute>
            }
          />
          <Route
            path="/salary-info"
            element={
              <PrivateRoute>
                <SalaryInfo />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
