import { useEffect, useState } from "react";
import API from "../api/axios";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import PhoneInput from "../components/PhoneInput";

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    gstNumber: "",
    address: "",
    openingBalance: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchVendors = async () => {
    const res = await API.get("/vendors");
    setVendors(res.data.vendors);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await API.post("/vendors", form);
    setForm({ name: "", phone: "", email: "", gstNumber: "", address: "", openingBalance: 0 });
    fetchVendors();
  };

  const remove = async (password) => {
    if (!deleteTarget) return;
    await API.delete(`/vendors/${deleteTarget._id}`, { data: { password } });
    setDeleteTarget(null);
    fetchVendors();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Vendor Management</h1>
          <p>Manage supplier profiles, GST details, opening balances, purchases and payments</p>
        </div>
      </div>

      <form className="panel form-grid" onSubmit={submit}>
        <input placeholder="Vendor Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <PhoneInput placeholder="Mobile number" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="GST Number" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
        <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input type="number" placeholder="Opening Balance" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
        <button>Add Vendor</button>
      </form>

      <div className="panel">
        <h2>Vendor Dashboard</h2>
        <table>
          <thead>
            <tr>
              <th>Vendor</th><th>Total Purchase</th><th>Paid</th><th>Pending</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v._id}>
                <td>{v.name}</td>
                <td>₹{v.totalPurchase}</td>
                <td>₹{v.paidAmount}</td>
                <td>₹{v.pendingAmount}</td>
                <td>{v.status}</td>
                <td><button onClick={() => setDeleteTarget(v)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || "vendor"}?`}
        message="Vendor record will be deleted. Enter login password to continue."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
