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
import { ToastViewport, useToast } from "../components/Toast";

const chartColors = ["#dc2626", "#0f766e", "#2563eb", "#f59e0b", "#7c3aed"];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatDateInput = (date) => date.toISOString().slice(0, 10);

const money = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const getOrderDate = (order) => new Date(order.payment?.paidAt || order.updatedAt || order.createdAt);

const isSameDay = (value, target) => {
  const date = new Date(value);
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
};

const getFinancialYear = (date = new Date()) => {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
};

const getFinancialYearRange = (label) => {
  const startYear = Number(String(label).split("-")[0]);
  return {
    start: new Date(startYear, 3, 1, 0, 0, 0, 0),
    end: new Date(startYear + 1, 2, 31, 23, 59, 59, 999),
  };
};

const getLastDays = (count) => {
  const days = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    days.push(date);
  }

  return days;
};

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deletionLogs, setDeletionLogs] = useState([]);
  const [financialYear, setFinancialYear] = useState(getFinancialYear());
  const [filterMode, setFilterMode] = useState("fy");
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(formatDateInput(new Date()).slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [customRange, setCustomRange] = useState({
    start: formatDateInput(new Date()),
    end: formatDateInput(new Date()),
  });
  const { toast, showToast } = useToast();

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [orderRes, itemRes, customerRes] = await Promise.all([
          API.get("/restaurant-orders"),
          API.get("/products"),
          API.get("/customers"),
        ]);

        if (!mounted) return;
        setOrders(orderRes.data.orders || orderRes.data || []);
        setItems(itemRes.data.products || itemRes.data || []);
        setCustomers(customerRes.data.customers || customerRes.data || []);
      } catch (error) {
        showToast(error.response?.data?.message || "Dashboard load failed");
      }

      try {
        const deletionRes = await API.get("/dashboard/deletions");
        if (!mounted) return;
        setDeletionLogs(deletionRes.data.logs || []);
      } catch {
        if (mounted) setDeletionLogs([]);
      }
    };

    fetchData();
    const timer = window.setInterval(fetchData, 15000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [showToast]);

  const financialYears = useMemo(() => {
    const years = new Set([getFinancialYear()]);
    orders.forEach((order) => years.add(getFinancialYear(new Date(order.createdAt))));
    return Array.from(years).sort((a, b) => Number(b.split("-")[0]) - Number(a.split("-")[0]));
  }, [orders]);

  const dateRange = useMemo(() => {
    const fyRange = getFinancialYearRange(financialYear);

    if (filterMode === "day") {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (filterMode === "month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      return {
        start: new Date(year, month - 1, 1, 0, 0, 0, 0),
        end: new Date(year, month, 0, 23, 59, 59, 999),
      };
    }

    if (filterMode === "year") {
      const year = Number(selectedYear);
      return {
        start: new Date(year, 0, 1, 0, 0, 0, 0),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    }

    if (filterMode === "custom") {
      const start = new Date(customRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    return fyRange;
  }, [customRange, filterMode, financialYear, selectedDate, selectedMonth, selectedYear]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const date = getOrderDate(order);
      return date >= dateRange.start && date <= dateRange.end;
    });
  }, [dateRange, orders]);

  const paidOrders = useMemo(
    () => filteredOrders.filter((order) => order.paymentStatus === "paid"),
    [filteredOrders]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const paidAll = orders.filter((order) => order.paymentStatus === "paid");
    const paidThisMonth = paidAll.filter((order) => {
      const date = getOrderDate(order);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
    const paidThisYear = paidAll.filter((order) => getOrderDate(order).getFullYear() === now.getFullYear());

    const selectedSale = paidOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
    const selectedCustomers = new Set(
      filteredOrders
        .map((order) => order.customerPhone || order.customerName || order.customerEmail)
        .filter(Boolean)
    );

    return {
      totalOrders: filteredOrders.length,
      totalSale: selectedSale,
      yesterdaySale: paidAll
        .filter((order) => isSameDay(getOrderDate(order), yesterday))
        .reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
      todaySale: paidAll
        .filter((order) => isSameDay(getOrderDate(order), now))
        .reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
      monthlySale: paidThisMonth.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
      yearlySale: paidThisYear.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
      totalCustomers: customers.length,
      totalItems: items.length,
      averageBill: paidOrders.length ? selectedSale / paidOrders.length : 0,
      cancelledOrders: filteredOrders.filter((order) => order.status === "cancelled").length,
      dineInOrders: filteredOrders.filter((order) => order.orderType !== "delivery").length,
      deliveryOrders: filteredOrders.filter((order) => order.orderType === "delivery").length,
      totalDelivery: orders.filter((order) => order.orderType === "delivery").length,
      activeCustomers: selectedCustomers.size,
      activeOrders: filteredOrders.filter((order) => !["served", "cancelled"].includes(order.status)).length,
    };
  }, [customers.length, filteredOrders, items.length, orders, paidOrders]);

  const topItems = useMemo(() => {
    const map = new Map();
    paidOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const current = map.get(item.name) || { name: item.name, qty: 0, amount: 0 };
        current.qty += Number(item.qty || 0);
        current.amount += Number(item.total || 0);
        map.set(item.name, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [paidOrders]);

  const peakHours = useMemo(() => {
    const map = new Map();
    paidOrders.forEach((order) => {
      const hour = getOrderDate(order).getHours();
      const label = `${String(hour).padStart(2, "0")}:00`;
      const current = map.get(label) || { name: label, orders: 0, sale: 0 };
      current.orders += 1;
      current.sale += Number(order.grandTotal || 0);
      map.set(label, current);
    });
    return Array.from(map.values()).sort((a, b) => b.orders - a.orders).slice(0, 8);
  }, [paidOrders]);

  const peakDays = useMemo(() => {
    const map = new Map(dayNames.map((name) => [name, { name, orders: 0, sale: 0 }]));
    paidOrders.forEach((order) => {
      const day = dayNames[getOrderDate(order).getDay()];
      const current = map.get(day);
      current.orders += 1;
      current.sale += Number(order.grandTotal || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.sale - a.sale);
  }, [paidOrders]);

  const paymentData = useMemo(() => {
    const totals = { Cash: 0, UPI: 0, Card: 0 };
    paidOrders.forEach((order) => {
      totals.Cash += Number(order.payment?.cash || 0);
      totals.UPI += Number(order.payment?.upi || 0);
      totals.Card += Number(order.payment?.card || 0);
    });
    return Object.entries(totals)
      .map(([name, amount]) => ({ name, amount }))
      .filter((entry) => entry.amount > 0);
  }, [paidOrders]);

  const last20Days = useMemo(() => {
    return getLastDays(20).map((date) => {
      const dayOrders = orders.filter((order) => isSameDay(getOrderDate(order), date));
      const dayPaid = dayOrders.filter((order) => order.paymentStatus === "paid");
      return {
        name: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        orders: dayOrders.length,
        sale: dayPaid.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
      };
    });
  }, [orders]);

  const topDay = peakDays[0];

  return (
    <div className="dashboard-page restaurant-dashboard">
      <ToastViewport toast={toast} />

      <div className="dashboard-header restaurant-dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Sales, orders, customers, delivery and payment performance.</p>
        </div>
      </div>

      <div className="dashboard-filter-card restaurant-dashboard-filters">
        <label>
          <span>Financial Year</span>
          <select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
            {financialYears.map((year) => (
              <option key={year} value={year}>
                FY {year}
              </option>
            ))}
          </select>
        </label>

        <div className="dashboard-filter-tabs">
          {[
            ["fy", "Full FY"],
            ["day", "Day"],
            ["month", "Month"],
            ["year", "Year"],
            ["custom", "Custom"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filterMode === value ? "active" : ""}
              onClick={() => setFilterMode(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {filterMode === "day" && (
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        )}
        {filterMode === "month" && (
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        )}
        {filterMode === "year" && (
          <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
        )}
        {filterMode === "custom" && (
          <>
            <input
              type="date"
              value={customRange.start}
              onChange={(e) => setCustomRange((current) => ({ ...current, start: e.target.value }))}
            />
            <input
              type="date"
              value={customRange.end}
              onChange={(e) => setCustomRange((current) => ({ ...current, end: e.target.value }))}
            />
          </>
        )}
      </div>

      <div className="dashboard-stats-grid restaurant-kpi-grid">
        <Kpi title="Total Order" value={stats.totalOrders} />
        <Kpi title="Total Sale" value={money(stats.totalSale)} />
        <Kpi title="Today Sale" value={money(stats.todaySale)} />
        <Kpi title="Yesterday Sale" value={money(stats.yesterdaySale)} />
        <Kpi title="Monthly Sale" value={money(stats.monthlySale)} />
        <Kpi title="Yearly Sale" value={money(stats.yearlySale)} />
      </div>

      <div className="dashboard-stats-grid restaurant-metric-grid">
        <Kpi title="Total Customer" value={stats.totalCustomers} quiet />
        <Kpi title="Total Items" value={stats.totalItems} quiet />
        <Kpi title="Average Bill" value={money(stats.averageBill)} quiet />
        <Kpi title="Cancelled Order" value={stats.cancelledOrders} quiet />
        <Kpi title="Dine In Order" value={stats.dineInOrders} quiet />
        <Kpi title="Delivery Order" value={stats.deliveryOrders} quiet />
        <Kpi title="Total Delivery" value={stats.totalDelivery} quiet />
        <Kpi title="Active Customer" value={stats.activeCustomers} quiet />
        <Kpi title="Active Order" value={stats.activeOrders} quiet />
        <Kpi title="Paid Order" value={paidOrders.length} quiet />
      </div>

      <div className="dashboard-charts-grid restaurant-chart-grid">
        <ChartBox title="Peak Hours">
          <BarPanel data={peakHours} dataKey="orders" color="#dc2626" empty="No peak hour data" />
        </ChartBox>

        <ChartBox title="Peak Days">
          <BarPanel data={peakDays} dataKey="sale" color="#0f766e" moneyTooltip empty="No peak day data" />
        </ChartBox>

        <ChartBox title="Top Best Item Sale">
          <BarPanel data={topItems} dataKey="amount" color="#2563eb" moneyTooltip empty="No item sale yet" />
        </ChartBox>

        <ChartBox title="Payment Section">
          {paymentData.length === 0 ? (
            <p>No payment data</p>
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <PieChart>
                <Pie data={paymentData} dataKey="amount" nameKey="name" outerRadius={92}>
                  {paymentData.map((_, index) => (
                    <Cell key={index} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(value)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </div>

      <div className="dashboard-breakdown-grid restaurant-dashboard-summary">
        <Breakdown
          title="Top Day For Sale"
          rows={[
            ["Day", topDay?.name || "-"],
            ["Sale", money(topDay?.sale || 0)],
            ["Orders", topDay?.orders || 0],
          ]}
        />
        <Breakdown
          title="Total Sale"
          rows={[
            ["Selected Sale", money(stats.totalSale)],
            ["Average Bill", money(stats.averageBill)],
            ["Paid Orders", paidOrders.length],
          ]}
        />
        <Breakdown
          title="Payment Section"
          rows={paymentData.length ? paymentData.map((entry) => [entry.name, money(entry.amount)]) : [["No payment", "Rs 0"]]}
        />
      </div>

      <div className="dashboard-chart-box restaurant-wide-chart">
        <h2>Total Sale & Total Order - Last 20 Days</h2>
        <ResponsiveContainer width="100%" height={330}>
          <BarChart data={last20Days}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip formatter={(value, name) => (name === "sale" ? money(value) : value)} />
            <Bar dataKey="sale" fill="#dc2626" radius={[8, 8, 0, 0]} />
            <Bar dataKey="orders" fill="#0f766e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="important-notices dashboard-delete-notices">
        <h2>Delete Notifications</h2>
        {deletionLogs.length === 0 ? (
          <p>No delete activity yet.</p>
        ) : (
          <div className="delete-notice-list">
            {deletionLogs.map((log) => (
              <div key={log._id}>
                <span>{new Date(log.createdAt).toLocaleString("en-IN")}</span>
                <b>{log.recordType}: {log.recordNo}</b>
                <p>{log.title} deleted by {log.deletedBy}. {log.details}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ title, value, quiet = false }) {
  return (
    <div className={`dashboard-stat-card ${quiet ? "" : "kpi-primary"}`}>
      <span>{title}</span>
      <h2>{value}</h2>
    </div>
  );
}

function ChartBox({ title, children }) {
  return (
    <div className="dashboard-chart-box">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function BarPanel({ data, dataKey, color, moneyTooltip = false, empty }) {
  if (!data.length) return <p>{empty}</p>;

  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip formatter={(value) => (moneyTooltip ? money(value) : value)} />
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
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
