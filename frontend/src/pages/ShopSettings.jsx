import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import shopService from "../services/shopService";

const ShopSettings = () => {
  const { user, shopDetails, setShopDetails } = useAuth();
  const [formData, setFormData] = useState({ shopName: "", address: "" });
  const [message, setMessage] = useState("");
  const [copyButtonText, setCopyButtonText] = useState("Copy");

  useEffect(() => {
    if (shopDetails) {
      setFormData({
        shopName: shopDetails.shopName,
        address: shopDetails.address || "",
      });
    }
  }, [shopDetails]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const updatedShop = await shopService.updateShopDetails(
        user.shopId,
        formData
      );
      setShopDetails(updatedShop); // Update the global state
      setMessage("Shop details updated successfully!");
    } catch (error) {
      setMessage("Failed to update shop details.");
    }
  };

  // Function to copy Shop ID to clipboard
  const copyShopId = () => {
    navigator.clipboard.writeText(user.shopId);
    setCopyButtonText("Copied!");
    setTimeout(() => setCopyButtonText("Copy"), 2000); // Reset button text after 2 seconds
  };

  if (!shopDetails) {
    return <div>Loading shop settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Shop Settings</h1>
      {message && <p className="text-center mb-4 text-green-600">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="shopName"
            className="block text-sm font-medium text-gray-700"
          >
            Shop Name
          </label>
          <input
            type="text"
            id="shopName"
            name="shopName"
            value={formData.shopName}
            onChange={handleChange}
            className="mt-1 w-full border rounded-md px-3 py-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700"
          >
            Shop Address
          </label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
            className="mt-1 w-full border rounded-md px-3 py-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Your Shop ID (for employees)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              readOnly
              value={user.shopId}
              className="flex-1 block w-full rounded-none rounded-l-md bg-gray-100 border-gray-300 px-3 py-2 text-gray-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={copyShopId}
              className="inline-flex items-center px-4 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {copyButtonText}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default ShopSettings;
