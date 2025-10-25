import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import shopService from "../services/shopService";
import Modal from "../components/Modal.jsx";

const ManageStock = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [modalError, setModalError] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    cost: "",
    stock: "",
  });
  const [editFormData, setEditFormData] = useState({
    price: "",
    cost: "",
    stock: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [showLowStock, setShowLowStock] = useState(false);
  const LOW_STOCK_THRESHOLD = 10;

  const existingCategories = useMemo(() => {
    return [
      "All Categories",
      ...new Set(products.map((p) => p.category)),
    ].sort();
  }, [products]);

  const fetchProducts = useCallback(async () => {
    if (!user?.shopId) return;
    try {
      setLoading(true);
      const data = await shopService.getProducts(user.shopId);
      setProducts(data);
    } catch (err) {
      setPageError("Failed to fetch products.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setModalError("");
    try {
      await shopService.addProduct(user.shopId, {
        ...newProduct,
        price: parseFloat(newProduct.price),
        cost: parseFloat(newProduct.cost),
        stock: parseInt(newProduct.stock, 10),
      });
      setIsAddModalOpen(false);
      setNewProduct({ name: "", category: "", price: "", cost: "", stock: "" });
      fetchProducts();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to add product.");
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setModalError("");
    const payload = { stock: parseInt(editFormData.stock, 10) };
    if (user.role === "owner") {
      payload.price = parseFloat(editFormData.price);
      payload.cost = parseFloat(editFormData.cost);
    }
    try {
      await shopService.updateProduct(
        user.shopId,
        selectedProduct._id,
        payload
      );
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to update product.");
    }
  };

  const openEditModal = (product) => {
    setModalError("");
    setSelectedProduct(product);
    setEditFormData({
      price: product.price,
      cost: product.cost,
      stock: product.stock,
    });
    setIsEditModalOpen(true);
  };

  const openAddModal = () => {
    setModalError("");
    setNewProduct({ name: "", category: "", price: "", cost: "", stock: "" });
    setIsAddModalOpen(true);
  };

  const filteredProducts = useMemo(() => {
    return products
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

  if (loading) return <div>Loading stock information...</div>;
  if (pageError) return <div className="text-red-500">{pageError}</div>;

  return (
    <>
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          {modalError && (
            <p className="text-red-500 text-sm bg-red-50 p-2 rounded-md">
              {modalError}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium">Product Name</label>
            <input
              type="text"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({ ...newProduct, name: e.target.value })
              }
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Category</label>
            <input
              type="text"
              list="categories"
              value={newProduct.category}
              onChange={(e) =>
                setNewProduct({ ...newProduct, category: e.target.value })
              }
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
            <datalist id="categories">
              {existingCategories.slice(1).map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium">Price (₹)</label>
            <input
              type="number"
              step="0.01"
              value={newProduct.price}
              onChange={(e) =>
                setNewProduct({ ...newProduct, price: e.target.value })
              }
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Cost (Purchase Price)
            </label>
            <input
              type="number"
              step="0.01"
              value={newProduct.cost}
              onChange={(e) =>
                setNewProduct({ ...newProduct, cost: e.target.value })
              }
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Stock Quantity</label>
            <input
              type="number"
              value={newProduct.stock}
              onChange={(e) =>
                setNewProduct({ ...newProduct, stock: e.target.value })
              }
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
          >
            Add Product
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit: ${selectedProduct?.name}`}
      >
        <form onSubmit={handleEditProduct} className="space-y-4">
          {modalError && (
            <p className="text-red-500 text-sm bg-red-50 p-2 rounded-md">
              {modalError}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium">Price (₹)</label>
            <input
              type="number"
              step="0.01"
              value={editFormData.price}
              onChange={(e) =>
                setEditFormData({ ...editFormData, price: e.target.value })
              }
              required
              disabled={user.role !== "owner"}
              className="mt-1 w-full border rounded-md px-3 py-2 disabled:bg-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Cost (Purchase Price)
            </label>
            <input
              type="number"
              step="0.01"
              value={editFormData.cost}
              onChange={(e) =>
                setEditFormData({ ...editFormData, cost: e.target.value })
              }
              required
              disabled={user.role !== "owner"}
              className="mt-1 w-full border rounded-md px-3 py-2 disabled:bg-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Stock Quantity</label>
            <input
              type="number"
              value={editFormData.stock}
              onChange={(e) =>
                setEditFormData({ ...editFormData, stock: e.target.value })
              }
              required
              min="0"
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
          <h1 className="text-2xl font-bold">Manage Stock</h1>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            + Add New Product
          </button>
        </div>
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
            {existingCategories.map((category) => (
              <option key={category} value={category}>
                {category}
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
            {showLowStock ? "Showing Low Stock" : "Show All Stock"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr
                  key={product._id}
                  className={
                    product.stock < LOW_STOCK_THRESHOLD ? "bg-red-50/50" : ""
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    ₹{(product.price || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    ₹{(product.cost || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold">
                    {product.stock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => openEditModal(product)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <p className="text-center text-gray-500 mt-4">
            No products match your current filters.
          </p>
        )}
      </div>
    </>
  );
};
export default ManageStock;
