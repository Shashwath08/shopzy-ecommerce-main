import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { fmtPrice } from "../lib/api";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Trash2, Edit, Plus, Users, Package, ShoppingBag, DollarSign } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "../components/ui/dialog";

function StatCard({ label, value, icon: Icon, color, testId }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5" data-testid={testId}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon size={20} /></div>
      </div>
      <p className="font-heading text-3xl font-semibold">{value}</p>
    </div>
  );
}

function ProductForm({ initial, categories, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: "", description: "", price: 0, discount_pct: 0, stock: 10, category_id: "", brand: "", images: [""] });
  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, images: form.images.filter(Boolean), price: parseFloat(form.price), discount_pct: parseFloat(form.discount_pct), stock: parseInt(form.stock) };
    try {
      await onSave(body);
      toast.success("Saved");
      onClose();
    } catch (err) { toast.error("Failed"); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
      <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} data-testid="pf-name" /></div>
      <div><Label>Description</Label><Textarea required rows={3} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} data-testid="pf-desc" /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Price</Label><Input type="number" required min={1} value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} data-testid="pf-price" /></div>
        <div><Label>Discount %</Label><Input type="number" min={0} max={90} value={form.discount_pct} onChange={(e) => setForm({...form, discount_pct: e.target.value})} data-testid="pf-disc" /></div>
        <div><Label>Stock</Label><Input type="number" min={0} value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})} data-testid="pf-stock" /></div>
      </div>
      <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} /></div>
      <div>
        <Label>Category</Label>
        <Select value={form.category_id} onValueChange={(v) => setForm({...form, category_id: v})}>
          <SelectTrigger data-testid="pf-cat"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Image URL</Label><Input value={form.images[0] || ""} onChange={(e) => setForm({...form, images: [e.target.value]})} placeholder="https://..." data-testid="pf-img" /></div>
      <DialogFooter><Button type="submit" className="bg-[#FF9900] hover:bg-[#E68A00] text-[#131921]" data-testid="pf-save">Save Product</Button></DialogFooter>
    </form>
  );
}

export default function Admin() {
  const [stats, setStats] = useState({});
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const refresh = async () => {
    const [s, p, o, u, c] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/products?limit=50"),
      api.get("/admin/orders"),
      api.get("/admin/users"),
      api.get("/categories"),
    ]);
    setStats(s.data); setProducts(p.data.items); setOrders(o.data); setUsers(u.data); setCategories(c.data);
  };
  useEffect(() => { refresh(); }, []);

  const saveProduct = async (body) => {
    if (editing) await api.put(`/products/${editing.id}`, body);
    else await api.post("/products", body);
    await refresh();
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    await api.delete(`/products/${id}`);
    await refresh();
    toast.success("Deleted");
  };

  const updateOrderStatus = async (id, status) => {
    await api.put(`/admin/orders/${id}/status`, { status });
    await refresh();
    toast.success(`Status: ${status}`);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-heading text-3xl font-semibold mb-6">Admin Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Revenue" value={fmtPrice(stats.revenue || 0)} icon={DollarSign} color="bg-green-100 text-green-700" testId="stat-revenue" />
          <StatCard label="Orders" value={stats.orders || 0} icon={ShoppingBag} color="bg-orange-100 text-[#FF9900]" testId="stat-orders" />
          <StatCard label="Products" value={stats.products || 0} icon={Package} color="bg-blue-100 text-blue-700" testId="stat-products" />
          <StatCard label="Users" value={stats.users || 0} icon={Users} color="bg-purple-100 text-purple-700" testId="stat-users" />
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-xl font-semibold">All Products</h2>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#FF9900] hover:bg-[#E68A00] text-[#131921]" onClick={() => setEditing(null)} data-testid="add-product-btn"><Plus size={16} className="mr-1" /> Add Product</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
                    <ProductForm initial={editing} categories={categories} onSave={saveProduct} onClose={() => setOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Rating</th><th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-t" data-testid={`admin-prod-${p.id}`}>
                        <td className="p-3 flex items-center gap-3">
                          <img src={p.images?.[0]} alt="" className="w-10 h-10 object-cover rounded" />
                          <span className="line-clamp-1 max-w-xs">{p.name}</span>
                        </td>
                        <td className="p-3">{p.category_name}</td>
                        <td className="p-3">{fmtPrice(p.price)}</td>
                        <td className="p-3">{p.stock}</td>
                        <td className="p-3">{p.rating_avg} ({p.rating_count})</td>
                        <td className="p-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditing(p); setOpen(true); }} data-testid={`edit-${p.id}`}><Edit size={14} /></Button>
                          <Button size="sm" variant="outline" onClick={() => deleteProduct(p.id)} data-testid={`del-${p.id}`}><Trash2 size={14} /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-heading text-xl font-semibold mb-4">All Orders</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr><th className="p-3">ID</th><th className="p-3">User</th><th className="p-3">Date</th><th className="p-3">Total</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t" data-testid={`admin-order-${o.id}`}>
                        <td className="p-3 font-mono text-xs"><Link to={`/orders/${o.id}`} className="text-blue-700 hover:underline">{o.id.slice(0,8)}</Link></td>
                        <td className="p-3">{o.user_email}</td>
                        <td className="p-3">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="p-3">{fmtPrice(o.total)}</td>
                        <td className="p-3">
                          <Select value={o.status} onValueChange={(v) => updateOrderStatus(o.id, v)}>
                            <SelectTrigger className="w-32" data-testid={`status-${o.id}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-heading text-xl font-semibold mb-4">All Users</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Joined</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t" data-testid={`admin-user-${u.id}`}>
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3"><span className={u.role === "admin" ? "bg-[#FF9900]/20 text-[#FF9900] px-2 py-0.5 rounded text-xs font-semibold uppercase" : "bg-gray-100 px-2 py-0.5 rounded text-xs uppercase"}>{u.role}</span></td>
                      <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
