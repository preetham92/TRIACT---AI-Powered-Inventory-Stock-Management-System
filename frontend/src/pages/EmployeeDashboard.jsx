import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [showLowStock, setShowLowStock] = useState(false);
  const LOW_STOCK_THRESHOLD = 10;

  const fetchProducts = useCallback(async () => {
    if (!user?.shopId) return;
    try {
      const response = await api.get(`/api/shops/${user.shopId}/products`);
      setProducts(response.data.products || []);
    } catch (err) {
      setError("Failed to fetch product data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const existingCategories = useMemo(() => {
    return [
      "All Categories",
      ...new Set(products.map((p) => p.category)),
    ].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter((p) =>
        searchTerm
          ? p.name.toLowerCase().includes(searchTerm.toLowerCase())
          : true
      )
      .filter((p) =>
        selectedCategory !== "All Categories"
          ? p.category === selectedCategory
          : true
      )
      .filter((p) => (showLowStock ? p.stock < LOW_STOCK_THRESHOLD : true));
  }, [products, searchTerm, selectedCategory, showLowStock]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">
        Welcome, {user?.name}!
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Product Availability
        </h2>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border rounded-md px-4 py-2"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded-md px-4 py-2"
          >
            {existingCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`px-4 py-2 rounded-md ${
              showLowStock
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            {showLowStock ? "Showing Low Stock" : "Show Low Stock"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(filteredProducts || []).map((product) => (
                <tr key={product._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(product.price)}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                      product.stock <= (product.lowStockThreshold || 10)
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {product.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <p className="text-center text-gray-500 mt-4">
              No products match your filters.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
