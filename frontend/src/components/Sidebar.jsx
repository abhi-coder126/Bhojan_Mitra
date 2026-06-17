import { NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  LayoutDashboard,
  Users,
  ReceiptText,
  Settings,
  BadgePercent,
  LogOut,
  Utensils,
  QrCode,
} from "lucide-react";

export default function Sidebar({ onClose }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const links = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/restaurant-orders", label: "Restaurant Orders", icon: Utensils },
    { to: "/table-barcodes", label: "Table QR", icon: QrCode },
    { to: "/menu-items", label: "Menu Items", icon: Utensils },
    { to: "/reports", label: "Reports", icon: ReceiptText },
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/coupons", label: "Coupons", icon: BadgePercent },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
  <img
    src="/BhojanMitra_Logo.png"
    alt="BhojanMitra"
    className="sidebar-logo"
  />
</div>

        <button className="sidebar-toggle-btn" onClick={onClose} title="Hide Menu">
          <Menu size={22} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {links.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <button className="sidebar-logout" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}
