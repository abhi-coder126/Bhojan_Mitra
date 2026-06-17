import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import API from "../api/axios";
import PublicLottie from "../components/PublicLottie";
import { ToastViewport, useToast } from "../components/Toast";

const chartColors = ["#0f766e", "#2563eb", "#f59e0b", "#ef4444"];

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const fetchData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [orderRes, itemRes] = await Promise.all([
        API.get("/restaurant-orders"),
        API.get("/products"),
      ]);
      setOrders(orderRes.data.orders || orderRes.data || []);
      setItems(itemRes.data.products || itemRes.data || []);
    } catch (error) {
      showToast(error.response?.data?.message || "Dashboard load failed");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, []);

  const isSameDay = (date, target) => {
    const d = new Date(date);
    return (
      d.getFullYear() === target.getFullYear() &&
      d.getMonth() === target.getMonth() &&
      d.getDate() === target.getDate()
    );
  };

  const stats = useMemo(() => {
    const active = orders.filter((order) => !["served", "cancelled"].includes(order.status));
    const paid = orders.filter((order) => order.paymentStatus === "paid");
    const cancelled = orders.filter((order) => order.status === "cancelled");
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const paidOn = (target) =>
      paid.filter((order) => isSameDay(order.payment?.paidAt || order.updatedAt || order.createdAt, target));
    const paidThisMonth = paid.filter((order) => {
      const d = new Date(order.payment?.paidAt || order.updatedAt || order.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const paidThisYear = paid.filter((order) => {
      const d = new Date(order.payment?.paidAt || order.updatedAt || order.createdAt);
      return d.getFullYear() === now.getFullYear();
    });

    const todayPaid = paidOn(now);
    const yesterdayPaid = paidOn(yesterday);
    const sumTotal = (list) => list.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
    const revenue = paid.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
    const pendingRevenue = active.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
    const discountTotal = paid.reduce((sum, order) => sum + Number(order.discountAmount || 0), 0);
    const gstTotal = paid.reduce((sum, order) => sum + Number(order.gstAmount || 0), 0);

    return {
      totalOrders: orders.length,
      active: active.length,
      newOrders: orders.filter((order) => order.status === "new").length,
      accepted: orders.filter((order) => order.status === "accepted").length,
      preparing: orders.filter((order) => order.status === "preparing").length,
      ready: orders.filter((order) => order.status === "ready").length,
      cancelled: cancelled.length,
      dineIn: active.filter((order) => order.orderType !== "delivery").length,
      delivery: active.filter((order) => order.orderType === "delivery").length,
      revenue,
      todaySale: sumTotal(todayPaid),
      yesterdaySale: sumTotal(yesterdayPaid),
      monthlySale: sumTotal(paidThisMonth),
      yearlySale: sumTotal(paidThisYear),
      todayOrders: orders.filter((order) => isSameDay(order.createdAt, now)).length,
      yesterdayOrders: orders.filter((order) => isSameDay(order.createdAt, yesterday)).length,
      pendingRevenue,
      menuItems: items.length,
      paidOrders: paid.length,
      avgSale: paid.length ? revenue / paid.length : 0,
      discountTotal,
      gstTotal,
      vegItems: items.filter((item) => item.foodType !== "non-veg").length,
      nonVegItems: items.filter((item) => item.foodType === "non-veg").length,
    };
  }, [items, orders]);

  const categoryData = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const category = item.category || "Uncategorized";
      map.set(category, (map.get(category) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [items]);

  const topItems = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const current = map.get(item.name) || { name: item.name, qty: 0, amount: 0 };
        current.qty += Number(item.qty || 0);
        current.amount += Number(item.total || 0);
        map.set(item.name, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [orders]);

  const topCategories = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const category = item.category || "Uncategorized";
        const current = map.get(category) || { name: category, qty: 0, amount: 0 };
        current.qty += Number(item.qty || 0);
        current.amount += Number(item.total || 0);
        map.set(category, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [orders]);

  const paymentData = useMemo(() => {
    const totals = { Cash: 0, UPI: 0, Card: 0 };
    orders.forEach((order) => {
      if (order.paymentStatus !== "paid") return;
      totals.Cash += Number(order.payment?.cash || 0);
      totals.UPI += Number(order.payment?.upi || 0);
      totals.Card += Number(order.payment?.card || 0);
    });
    return Object.entries(totals)
      .map(([name, amount]) => ({ name, amount }))
      .filter((entry) => entry.amount > 0);
  }, [orders]);

  const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

  return (
    <div className="dashboard-page restaurant-dashboard">
      <ToastViewport toast={toast} />

      <div className="dashboard-header restaurant-dashboard-header">
        <h1>Restaurant Ordering Dashboard</h1>
        <p>Live dine-in, delivery, menu performance, pending orders and payment collection.</p>
      </div>

      <DashboardSection loading={loading} skeleton="kpi">
        <div className="dashboard-stats-grid restaurant-kpi-grid">
          <Kpi title="Total Orders" value={stats.totalOrders} />
          <Kpi title="Paid Revenue" value={money(stats.revenue)} />
          <Kpi title="Today Sale" value={money(stats.todaySale)} />
          <Kpi title="Yesterday Sale" value={money(stats.yesterdaySale)} />
          <Kpi title="Monthly Sale" value={money(stats.monthlySale)} />
          <Kpi title="Yearly Sale" value={money(stats.yearlySale)} />
          <Kpi title="Average Bill" value={money(stats.avgSale)} />
          <Kpi title="Pending Bill Value" value={money(stats.pendingRevenue)} />
          <Kpi title="Today Orders" value={stats.todayOrders} />
          <Kpi title="Yesterday Orders" value={stats.yesterdayOrders} />
          <Kpi title="Paid Orders" value={stats.paidOrders} />
          <Kpi title="Cancelled Orders" value={stats.cancelled} />
          <Kpi title="Active Orders" value={stats.active} />
          <Kpi title="Dine-In Running" value={stats.dineIn} />
          <Kpi title="Delivery Running" value={stats.delivery} />
          <Kpi title="Discount Given" value={money(stats.discountTotal)} />
          <Kpi title="GST Collected" value={money(stats.gstTotal)} />
          <Kpi title="Menu Items" value={stats.menuItems} />
          <Kpi title="Veg Items" value={stats.vegItems} />
          <Kpi title="Non-Veg Items" value={stats.nonVegItems} />
        </div>
      </DashboardSection>

      <DashboardSection loading={loading} skeleton="charts">
        <div className="dashboard-charts-grid">
        <div className="dashboard-chart-box">
          <h2>Top Selling Menu Items</h2>
          {topItems.length === 0 ? (
            <p>No orders yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={topItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="qty" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-chart-box">
          <h2>Payment Collection</h2>
          {paymentData.length === 0 ? (
            <p>No paid orders yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <PieChart>
                <Pie data={paymentData} dataKey="amount" nameKey="name" outerRadius={95}>
                  {paymentData.map((_, index) => (
                    <Cell key={index} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(value)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-chart-box">
          <h2>Top Sales Categories</h2>
          {topCategories.length === 0 ? (
            <p>No category sale yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={topCategories}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip formatter={(value) => money(value)} />
                <Bar dataKey="amount" fill="#dc2626" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-chart-box">
          <h2>Menu Categories</h2>
          {categoryData.length === 0 ? (
            <p>No menu items yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#7c3aed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        </div>
      </DashboardSection>

      <DashboardSection loading={loading} skeleton="status">
        <div className="dashboard-breakdown-grid">
          <Breakdown title="Order Status" rows={[
            ["New", stats.newOrders],
            ["Accepted", stats.accepted],
            ["Preparing", stats.preparing],
            ["Ready", stats.ready],
            ["Active", stats.active],
            ["Cancelled", stats.cancelled],
          ]} />
          <Breakdown title="Payment Modes" rows={paymentData.length ? paymentData.map((entry) => [entry.name, money(entry.amount)]) : [["No paid order", "Rs 0.00"]]} />
          <Breakdown title="Menu Mix" rows={[
            ["Total Items", stats.menuItems],
            ["Veg Items", stats.vegItems],
            ["Non-Veg Items", stats.nonVegItems],
            ["Categories", categoryData.length],
          ]} />
        </div>
      </DashboardSection>

      <DashboardSection loading={loading} skeleton="list">
        <div className="important-notices">
          <h2>Live Order Queue</h2>
          <div className="restaurant-live-list">
            {orders.filter((order) => !["served", "cancelled"].includes(order.status)).slice(0, 10).map((order) => (
              <div key={order._id}>
                <span>{order.orderNo}</span>
                <b>{order.orderType === "delivery" ? "Delivery" : `Table ${order.tableNo}`}</b>
                <strong>{order.status}</strong>
                <em>{money(order.grandTotal)}</em>
              </div>
            ))}
            {stats.active === 0 && <p>No active orders.</p>}
          </div>
        </div>
      </DashboardSection>
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div className="dashboard-stat-card kpi-primary">
      <span>{title}</span>
      <h2>{value}</h2>
    </div>
  );
}

function Breakdown({ title, rows }) {
  return (
    <div className="dashboard-breakdown-card">
      <h2>{title}</h2>
      {rows.map(([label, value]) => (
        <p key={label}>
          <span>{label}</span>
          <b>{value}</b>
        </p>
      ))}
    </div>
  );
}

function DashboardSection({ loading, skeleton, children }) {
  if (loading) return <DashboardSkeleton type={skeleton} />;
  return children;
}

function DashboardSkeleton({ type }) {
  const count = type === "kpi" ? 20 : type === "charts" ? 4 : type === "status" ? 3 : 1;
  return (
    <div className={`dashboard-skeleton dashboard-skeleton-${type}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <PublicLottie path="/loading.json" className="dashboard-loading-lottie" />
        </div>
      ))}
    </div>
  );
}
