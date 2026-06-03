import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { useCart } from "../context/CartContext";
import { fmtPrice } from "../lib/api";
import api from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";

export default function Checkout() {
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [addr, setAddr] = useState({
    full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India",
  });
  const [payment, setPayment] = useState("cod");

  const shipping = cart.subtotal > 499 || cart.subtotal === 0 ? 0 : 49;
  const tax = +(cart.subtotal * 0.05).toFixed(2);
  const total = +(cart.subtotal + shipping + tax).toFixed(2);

  const placeOrder = async (e) => {
    e.preventDefault();
    if (cart.items.length === 0) { toast.error("Cart is empty"); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/orders", { shipping_address: addr, payment_method: payment });
      await refresh();
      toast.success("Order placed successfully");
      navigate(`/orders/${data.id}`);
    } catch (e) {
      toast.error("Could not place order");
    } finally { setSubmitting(false); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-heading text-3xl font-semibold mb-6">Checkout</h1>
        <form onSubmit={placeOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-heading text-xl font-semibold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label htmlFor="full_name">Full Name</Label><Input id="full_name" required value={addr.full_name} onChange={(e) => setAddr({...addr, full_name: e.target.value})} data-testid="addr-name" /></div>
                <div><Label htmlFor="phone">Phone</Label><Input id="phone" required value={addr.phone} onChange={(e) => setAddr({...addr, phone: e.target.value})} data-testid="addr-phone" /></div>
                <div><Label htmlFor="pincode">Pincode</Label><Input id="pincode" required value={addr.pincode} onChange={(e) => setAddr({...addr, pincode: e.target.value})} data-testid="addr-pincode" /></div>
                <div className="sm:col-span-2"><Label htmlFor="line1">Address Line 1</Label><Input id="line1" required value={addr.line1} onChange={(e) => setAddr({...addr, line1: e.target.value})} data-testid="addr-line1" /></div>
                <div className="sm:col-span-2"><Label htmlFor="line2">Address Line 2 (Optional)</Label><Input id="line2" value={addr.line2} onChange={(e) => setAddr({...addr, line2: e.target.value})} data-testid="addr-line2" /></div>
                <div><Label htmlFor="city">City</Label><Input id="city" required value={addr.city} onChange={(e) => setAddr({...addr, city: e.target.value})} data-testid="addr-city" /></div>
                <div><Label htmlFor="state">State</Label><Input id="state" required value={addr.state} onChange={(e) => setAddr({...addr, state: e.target.value})} data-testid="addr-state" /></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-heading text-xl font-semibold mb-4">Payment Method</h2>
              <RadioGroup value={payment} onValueChange={setPayment} className="space-y-3">
                <label htmlFor="cod" className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-[#FF9900]"><RadioGroupItem value="cod" id="cod" data-testid="pay-cod" /><span>Cash on Delivery</span></label>
                <label htmlFor="card" className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-[#FF9900]"><RadioGroupItem value="card" id="card" data-testid="pay-card" /><span>Credit / Debit Card (Mock)</span></label>
                <label htmlFor="upi" className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-[#FF9900]"><RadioGroupItem value="upi" id="upi" data-testid="pay-upi" /><span>UPI (Mock)</span></label>
              </RadioGroup>
            </div>
          </div>

          <aside className="bg-white rounded-xl border border-gray-200 p-6 h-fit sticky top-32">
            <h3 className="font-heading text-lg font-semibold mb-3">Order Summary</h3>
            <ul className="space-y-2 max-h-60 overflow-auto mb-3">
              {cart.items.map((it) => (
                <li key={it.product_id} className="text-sm flex justify-between gap-2">
                  <span className="flex-1 line-clamp-1">{it.name} × {it.quantity}</span>
                  <span>{fmtPrice(it.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 text-sm border-t pt-2">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmtPrice(cart.subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "FREE" : fmtPrice(shipping)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{fmtPrice(tax)}</span></div>
              <div className="flex justify-between font-semibold text-base border-t pt-2"><span>Total</span><span className="text-price" data-testid="checkout-total">{fmtPrice(total)}</span></div>
            </div>
            <Button type="submit" disabled={submitting || cart.items.length === 0} className="w-full mt-4 bg-[#FF9900] hover:bg-[#E68A00] text-[#131921] font-semibold" data-testid="place-order-btn">
              {submitting ? "Placing order..." : "Place Order"}
            </Button>
          </aside>
        </form>
      </div>
    </Layout>
  );
}
