import React from "react";
import { useAuth } from "../hooks/useAuth";

const SalaryInfo = () => {
  const { user } = useAuth();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Salary Information
      </h1>
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-lg font-medium text-gray-600">Current Salary:</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(user?.salary?.amount)}
            </p>
          </div>
          <div className="flex justify-between items-center border-t pt-4">
            <p className="text-lg font-medium text-gray-600">Payment Status:</p>
            <span
              className={`px-4 py-1 text-sm font-semibold rounded-full ${
                user?.salary?.status === "paid"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {user?.salary?.status === "paid" ? "Paid" : "Due"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryInfo;
