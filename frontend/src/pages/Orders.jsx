import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { fmtPrice } from "../lib/api";
import Layout from "../components/Layout";
import { Package, Truck, CheckCircle2, Clock } from "lucide-react";

const STATUSES = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function StatusBar({ status }) {
  const idx = STATUSES.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center justify-between max-w-2xl">
      {STATUSES.map((s, i) => {
        const Icon = s.icon;
        const active = i <= idx;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${active ? "bg-[#FF9900] text-[#131921]" : "bg-gray-200 text-gray-500"}`}>
              <Icon size={18} />
            </div>
            <span className="text-xs mt-1">{s.label}</span>
            {i < STATUSES.length - 1 && (
              <div className={`absolute top-5 left-1/2 w-full h-0.5 ${i < idx ? "bg-[#FF9900]" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Orders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get("/orders").then((r) => setOrders(r.data)); }, []);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-heading text-3xl font-semibold mb-6">Your Orders</h1>
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500" data-testid="no-orders">You haven't placed any orders yet.</div>
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid={`order-${o.id}`}>
                <div className="bg-gray-50 px-5 py-3 flex flex-wrap justify-between gap-3 text-sm border-b">
                  <div><p className="text-gray-500 text-xs">ORDER PLACED</p><p>{new Date(o.created_at).toLocaleDateString()}</p></div>
                  <div><p className="text-gray-500 text-xs">TOTAL</p><p className="font-semibold">{fmtPrice(o.total)}</p></div>
                  <div><p className="text-gray-500 text-xs">STATUS</p><p className="font-semibold uppercase text-[#FF9900]">{o.status}</p></div>
                  <Link to={`/orders/${o.id}`} className="text-sm text-blue-700 hover:text-[#FF9900] hover:underline self-center" data-testid={`view-order-${o.id}`}>View details →</Link>
                </div>
                <div className="p-5 flex gap-3 overflow-x-auto">
                  {o.items.slice(0, 4).map((it, i) => (
                    <div key={i} className="flex-shrink-0 w-16 h-16 rounded overflow-hidden border">
                      <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  useEffect(() => { api.get(`/orders/${id}`).then((r) => setOrder(r.data)); }, [id]);
  if (!order) return <Layout><div className="p-12 text-center text-gray-500">Loading...</div></Layout>;
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-heading text-3xl font-semibold mb-2">Order Details</h1>
        <p className="text-sm text-gray-600 mb-6">Order ID: <span className="font-mono">{order.id}</span></p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Tracking</h2>
          <StatusBar status={order.status} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold mb-3">Items</h2>
          <ul className="divide-y">
            {order.items.map((it, i) => (
              <li key={i} className="py-3 flex gap-4">
                <div className="w-16 h-16 rounded border overflow-hidden flex-shrink-0">
                  <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <Link to={`/product/${it.product_id}`} className="font-medium hover:text-[#FF9900]">{it.name}</Link>
                  <p className="text-sm text-gray-600">Qty: {it.quantity}</p>
                </div>
                <p className="font-semibold text-price">{fmtPrice(it.line_total)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-heading text-lg font-semibold mb-3">Shipping Address</h3>
            <p className="text-sm leading-relaxed">
              {order.shipping_address.full_name}<br />
              {order.shipping_address.line1}, {order.shipping_address.line2}<br />
              {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}<br />
              {order.shipping_address.country}<br />
              Phone: {order.shipping_address.phone}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-heading text-lg font-semibold mb-3">Payment Summary</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span>Method</span><span className="uppercase">{order.payment_method}</span></div>
              <div className="flex justify-between"><span>Subtotal</span><span>{fmtPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{order.shipping === 0 ? "FREE" : fmtPrice(order.shipping)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{fmtPrice(order.tax)}</span></div>
              <div className="flex justify-between border-t pt-2 font-semibold text-base"><span>Total</span><span className="text-price">{fmtPrice(order.total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
