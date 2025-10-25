import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import shopService from "../services/shopService";
import Modal from "../components/Modal.jsx";

const ManageEmployees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [modalError, setModalError] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    salary: { amount: "" },
  });

  const fetchEmployees = useCallback(async () => {
    if (!user?.shopId) return;
    try {
      setLoading(true);
      const data = await shopService.getEmployees(user.shopId);
      setEmployees(data);
    } catch (err) {
      setPageError("Failed to fetch employees.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "amount") {
      setFormData((prev) => ({
        ...prev,
        salary: { ...prev.salary, amount: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setModalError("");
    try {
      await shopService.addEmployee(user.shopId, {
        ...formData,
        salary: { amount: parseFloat(formData.salary.amount) },
      });
      setIsAddModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setModalError(
        err.response?.data?.message || "An unknown error occurred."
      );
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    setModalError("");
    try {
      // --- THIS IS THE UPDATED LOGIC ---
      // When the salary amount is changed, we also reset the status to "pending" (Due)
      const updatedSalary = {
        amount: parseFloat(formData.salary.amount),
        status: "pending",
      };
      await shopService.updateEmployee(user.shopId, selectedEmployee._id, {
        salary: updatedSalary,
      });
      setIsEditModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to update salary.");
    }
  };

  const handleRemoveEmployee = async (employeeId) => {
    if (window.confirm("Are you sure you want to remove this employee?")) {
      try {
        await shopService.removeEmployee(user.shopId, employeeId);
        fetchEmployees();
      } catch (err) {
        setPageError("Failed to remove employee.");
      }
    }
  };

  const handlePaySalary = async (employee) => {
    try {
      await shopService.updateEmployee(user.shopId, employee._id, {
        salary: { status: "paid" },
      });
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetAllSalaries = async () => {
    if (
      window.confirm(
        'Are you sure you want to reset all employee salaries to "Due"?'
      )
    ) {
      try {
        const updatePromises = employees.map((emp) =>
          shopService.updateEmployee(user.shopId, emp._id, {
            salary: { status: "pending" },
          })
        );
        await Promise.all(updatePromises);
        fetchEmployees();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openEditModal = (employee) => {
    setModalError("");
    setSelectedEmployee(employee);
    setFormData({ salary: { amount: employee.salary.amount } });
    setIsEditModalOpen(true);
  };

  const openAddModal = () => {
    setModalError("");
    setFormData({ name: "", email: "", password: "", salary: { amount: "" } });
    setIsAddModalOpen(true);
  };

  if (loading) return <div>Loading employee data...</div>;
  if (pageError) return <div className="text-red-500">{pageError}</div>;

  return (
    <>
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
      >
        <form onSubmit={handleAddEmployee} className="space-y-4">
          {modalError && (
            <p className="text-red-500 text-sm bg-red-50 p-2 rounded-md">
              {modalError}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleFormChange}
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Salary (₹)
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              value={formData.salary.amount}
              onChange={handleFormChange}
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
          >
            Add Employee
          </button>
        </form>
      </Modal>
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Salary for ${selectedEmployee?.name}`}
      >
        <form onSubmit={handleEditEmployee} className="space-y-4">
          {modalError && (
            <p className="text-red-500 text-sm bg-red-50 p-2 rounded-md">
              {modalError}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Salary (₹)
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              value={formData.salary.amount}
              onChange={handleFormChange}
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
          >
            Save Changes
          </button>
        </form>
      </Modal>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Manage Employees</h1>
          <div className="space-x-2">
            <button
              onClick={handleResetAllSalaries}
              className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 text-sm"
            >
              Reset All to Due
            </button>
            <button
              onClick={openAddModal}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              + Add New Employee
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee._id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {employee.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    ₹{(employee.salary.amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {employee.salary.status === "paid" ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Paid
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Due
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-4 text-sm font-medium">
                    {employee.salary.status === "pending" && (
                      <button
                        onClick={() => handlePaySalary(employee)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Pay Salary
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(employee)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveEmployee(employee._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ManageEmployees;
