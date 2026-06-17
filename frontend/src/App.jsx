import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import PublicLottie from "./components/PublicLottie";
import { ToastViewport, useToast } from "./components/Toast";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import AllProducts from "./pages/AllProducts";
import Purchase from "./pages/Purchase";
import GRNManagement from "./pages/GRNManagement";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import Vendors from "./pages/Vendors";
import SalesReturn from "./pages/SalesReturn";
import Settings from "./pages/Settings";
import Coupons from "./pages/Coupons";
import Accounts from "./pages/Accounts";
import SupplierBills from "./pages/SupplierBills";
import Login from "./pages/Login";
import RestaurantOrders from "./pages/RestaurantOrders";
import CustomerMenu from "./pages/CustomerMenu";
import TableBarcodes from "./pages/TableBarcodes";

const pageMeta = {
  "/": {
    title: "Dashboard | BhojanMitra Billing Software",
    description: "Complete overview of sales, payments, returns, stock alerts and business performance.",
  },
  "/products": {
    title: "Menu Items | BhojanMitra Restaurant POS",
    description: "Create and manage restaurant menu items with category, pricing, GST and availability.",
  },
  "/menu-items": {
    title: "Menu Items | BhojanMitra Restaurant POS",
    description: "Create and manage restaurant menu items with category, pricing, GST and availability.",
  },
  "/all-products": {
    title: "Inventory | BhojanMitra Billing Software",
    description: "Track live stock, low stock items, purchase cost, selling price, category and vendor details.",
  },
  "/purchase": {
    title: "Purchase / GRN | BhojanMitra Billing Software",
    description: "Receive vendor stock, create purchase bills, update product cost and manage GRN payments.",
  },
  "/grn-management": {
    title: "GRN Management | BhojanMitra Billing Software",
    description: "Review, search and update goods received notes, purchase quantities, pricing and payment records.",
  },
  "/supplier-bills": {
    title: "Supplier Bills | BhojanMitra Billing Software",
    description: "View supplier invoices, GRN totals, paid amounts, pending balances and payment status.",
  },
  "/sales-return": {
    title: "Sales Return / Refund | BhojanMitra Billing Software",
    description: "Manage invoice returns, returned products, refund amounts and stock reversal records.",
  },
  "/reports": {
    title: "Sales Reports | BhojanMitra Billing Software",
    description: "Search and review invoices, customers, payment modes, sale totals and billing history.",
  },
  "/customers": {
    title: "Customers | BhojanMitra Billing Software",
    description: "Manage customer profiles, CRN records, contact details, address and purchase history.",
  },
  "/vendors": {
    title: "Vendors | BhojanMitra Billing Software",
    description: "Manage supplier profiles, GST details, opening balance, purchases and outstanding payments.",
  },
  "/accounts": {
    title: "Accounts | BhojanMitra Billing Software",
    description: "Track vendor pending payments, payment history and supplier account balances.",
  },
  "/coupons": {
    title: "Coupons | BhojanMitra Billing Software",
    description: "Create, control and manage billing discount coupons for customer invoices.",
  },
  "/settings": {
    title: "Settings | BhojanMitra Billing Software",
    description: "Configure store details, invoice printing, payment modes, policies and system preferences.",
  },
  "/restaurant-orders": {
    title: "Restaurant Orders | BhojanMitra Billing Software",
    description: "Manage table QR orders, live restaurant order status and customer menu ordering.",
  },
  "/table-barcodes": {
    title: "Table QR Setup | BhojanMitra Restaurant POS",
    description: "Generate and print table QR codes for customer self ordering.",
  },
  "/login": {
    title: "Login | BhojanMitra Billing Software",
    description: "Secure login for BhojanMitra billing, inventory, purchase and POS management.",
  },
};

function PageMeta() {
  const location = useLocation();

  useEffect(() => {
    const meta = pageMeta[location.pathname] || pageMeta["/"];
    document.title = meta.title;

    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      document.head.appendChild(description);
    }

    description.setAttribute("content", meta.description);
  }, [location.pathname]);

  return null;
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector(".main-content")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
}

function ProtectedLayout() {
  const token = localStorage.getItem("token");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className={`app-layout ${!sidebarOpen ? "sidebar-closed" : ""}`}>
      {sidebarOpen && (
        <Sidebar onClose={() => setSidebarOpen(false)} />
      )}

      {!sidebarOpen && (
        <aside className="sidebar-mini">
          <button
            className="show-sidebar-btn"
            onClick={() => setSidebarOpen(true)}
            title="Show Menu"
          >
            <Menu size={24} />
          </button>
        </aside>
      )}

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/billing" element={<Navigate to="/restaurant-orders" replace />} />
          <Route path="/products" element={<Navigate to="/menu-items" replace />} />
          <Route path="/menu-items" element={<Products />} />
          <Route path="/all-products" element={<AllProducts />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/grn-management" element={<GRNManagement />} />
          <Route path="/supplier-bills" element={<SupplierBills />} />
          <Route path="/sales-return" element={<SalesReturn />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/restaurant-orders" element={<RestaurantOrders />} />
          <Route path="/table-barcodes" element={<TableBarcodes />} />
        </Routes>
      </main>
    </div>
  );
}

function GlobalPageLoader() {
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    setShowLoader(true);
    const timer = window.setTimeout(() => setShowLoader(false), 650);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  if (!showLoader) return null;

  return (
    <div className="global-page-loader">
      <PublicLottie path="/loading.json" className="global-page-loader-animation" />
    </div>
  );
}

export default function App() {
  const { toast, showToast } = useToast();

  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message) => showToast(String(message || ""), "info");
    return () => {
      window.alert = nativeAlert;
    };
  }, [showToast]);

  return (
    <>
      <PageMeta />
      <ScrollToTop />
      <GlobalPageLoader />
      <ToastViewport toast={toast} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/menu/:tableNo" element={<CustomerMenu />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </>
  );
}
