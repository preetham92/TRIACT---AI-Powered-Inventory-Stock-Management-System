import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import shopService from "../services/shopService";
import { useClickOutside } from "../hooks/useClickOutside.js";

const Dropdown = ({
  buttonContent,
  children,
  widthClass = "w-56",
  onOpen = () => {},
  onClose = () => {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const closeDropdown = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      onClose();
    }
  }, [isOpen, onClose]);

  useClickOutside(dropdownRef, closeDropdown);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      onOpen();
    } else {
      onClose();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="text-gray-600 hover:text-indigo-600 focus:outline-none flex items-center"
      >
        {buttonContent}
      </button>
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 ${widthClass} bg-white rounded-md shadow-lg z-20 border py-1`}
        >
          <div onClick={() => setIsOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
};

const NavBar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(() => {
    if (isAuthenticated && user?.shopId) {
      shopService
        .getNotifications(user.shopId)
        .then(setNotifications)
        .catch((err) => console.error("Failed to fetch notifications:", err));
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkNotificationsRead = () => {
    if (unreadCount > 0) {
      shopService.markNotificationsAsRead(user.shopId).then(() => {
        setNotifications((current) =>
          current.map((n) => ({ ...n, isRead: true }))
        );
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const BellIcon = ({ unreadCount }) => (
    <div className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white animate-pulse">
          {unreadCount}
        </span>
      )}
    </div>
  );

  const DropdownArrow = () => (
    <svg
      className="w-4 h-4 ml-1"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 9l-7 7-7-7"
      ></path>
    </svg>
  );

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <Link to="/" className="text-2xl font-bold text-indigo-600">
          TRIACT
        </Link>
        <div className="flex items-center space-x-6">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-indigo-600 font-medium"
              >
                Home
              </Link>

              <Dropdown
                buttonContent={
                  <>
                    <span>Orders</span>
                    <DropdownArrow />
                  </>
                }
              >
                <Link
                  to="/create-order"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Create Order
                </Link>
                <Link
                  to="/scan-invoice"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Scan Invoice
                </Link>
                <Link
                  to="/view-invoices"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  View Invoices
                </Link>
              </Dropdown>

              {user?.role === "owner" && (
                <Dropdown
                  buttonContent={
                    <>
                      <span>Settings</span>
                      <DropdownArrow />
                    </>
                  }
                >
                  <Link
                    to="/manage-stock"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Manage Stock
                  </Link>
                  <Link
                    to="/manage-employees"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Manage Employees
                  </Link>
                  <Link
                    to="/shop-settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Shop Settings
                  </Link>
                </Dropdown>
              )}

              {user?.role === "employee" && (
                <Link
                  to="/salary-info"
                  className="text-gray-600 hover:text-indigo-600"
                >
                  Salary Info
                </Link>
              )}

              <div className="flex items-center space-x-4 border-l pl-6">
                <Dropdown
                  buttonContent={<BellIcon unreadCount={unreadCount} />}
                  onClose={handleMarkNotificationsRead}
                  widthClass="w-80"
                >
                  <div className="p-3 font-bold border-b text-sm">
                    Notifications
                  </div>
                  <ul className="py-1 max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <li
                          key={n._id}
                          className={`px-4 py-3 border-b last:border-b-0 ${
                            !n.isRead ? "bg-indigo-50" : "bg-white"
                          }`}
                        >
                          <p
                            className={`text-sm ${
                              !n.isRead
                                ? "font-semibold text-gray-900"
                                : "text-gray-600"
                            }`}
                          >
                            {n.message}
                          </p>
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-gray-500 text-center">
                        You're all caught up!
                      </li>
                    )}
                  </ul>
                </Dropdown>

                <span className="text-gray-800 font-medium">
                  Hi, {user.name}
                </span>

                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition duration-200"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-indigo-600">
                Login
              </Link>
              <Link
                to="/register"
                className="text-gray-600 hover:text-indigo-600"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
