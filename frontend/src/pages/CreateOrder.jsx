import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import shopService from "../services/shopService";

const CreateOrder = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const fetchProducts = useCallback(async () => {
    if (!user?.shopId) return;
    try {
      const fetchedProducts = await shopService.getProducts(user.shopId);
      setProducts(fetchedProducts);
    } catch (err) {
      setError("Failed to fetch products.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const existingCategories = useMemo(() => {
    return ["All", ...new Set(products.map((p) => p.category))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let currentProducts = products;
    if (activeCategory !== "All") {
      currentProducts = currentProducts.filter(
        (p) => p.category === activeCategory
      );
    }
    if (searchTerm) {
      currentProducts = currentProducts.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return currentProducts;
  }, [products, activeCategory, searchTerm]);

  const handleAddToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item._id === product._id);
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          return prevCart.map((item) =>
            item._id === product._id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return prevCart;
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (productId) =>
    setCart(cart.filter((item) => item._id !== productId));

  const handleQuantityChange = (productId, newQuantity) => {
    const product = products.find((p) => p._id === productId);
    const numQuantity = parseInt(newQuantity, 10);
    if (numQuantity > 0 && numQuantity <= product.stock) {
      setCart(
        cart.map((item) =>
          item._id === productId ? { ...item, quantity: numQuantity } : item
        )
      );
    }
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setError("Cart is empty.");
      return;
    }
    setError(null);
    setSuccess(null);
    const orderData = {
      customerName,
      items: cart.map((item) => ({
        productId: item._id,
        quantity: item.quantity,
      })),
    };
    try {
      const result = await shopService.createOrder(user.shopId, orderData);
      setSuccess(`Order created! Invoice ID: ${result.invoice?._id || "N/A"}`);
      setCart([]);
      setCustomerName("Walk-in Customer");
      fetchProducts(); // <-- This re-fetches products for live stock update
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create order.");
    }
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-semibold">Available Products</h2>
        <input
          type="text"
          placeholder="Search product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        />
        <div className="flex flex-wrap gap-2">
          {existingCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1 text-sm rounded-full ${
                activeCategory === category
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[60vh] overflow-y-auto pr-2">
          {filteredProducts.map((product) => (
            <div
              key={product._id}
              className="border p-4 rounded-lg flex flex-col justify-between"
            >
              <div>
                <h3 className="font-bold">{product.name}</h3>
                <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                <p className="text-lg font-semibold">
                  ₹{(product.price || 0).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock === 0}
                className="mt-2 w-full bg-indigo-600 text-white py-1 rounded hover:bg-indigo-700 disabled:bg-gray-400"
              >
                Add to Cart
              </button>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <p className="text-gray-500 col-span-full text-center mt-8">
              No products match your search.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Current Order</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Customer Name
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div className="space-y-2 h-64 overflow-y-auto pr-2">
          {cart.map((item) => (
            <div key={item._id} className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-gray-500">
                  ₹{(item.price || 0).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleQuantityChange(item._id, e.target.value)
                  }
                  className="w-16 text-center border rounded"
                />
                <button
                  onClick={() => handleRemoveFromCart(item._id)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <p className="text-gray-400 text-center">Your cart is empty.</p>
          )}
        </div>
        <hr className="my-4" />
        <div className="flex justify-between font-bold text-xl">
          <span>Total:</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {success && (
          <p className="text-green-500 text-center mt-4">{success}</p>
        )}
        <button
          onClick={handleSubmitOrder}
          className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700"
        >
          Create Order & Invoice
        </button>
      </div>
    </div>
  );
};

export default CreateOrder;
