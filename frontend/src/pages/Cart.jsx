import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { useCart } from "../context/CartContext";
import { fmtPrice } from "../lib/api";
import { Button } from "../components/ui/button";

export default function Cart() {
  const { cart, updateQty, removeFromCart } = useCart();
  const navigate = useNavigate();

  const shipping = cart.subtotal > 499 || cart.subtotal === 0 ? 0 : 49;
  const tax = +(cart.subtotal * 0.05).toFixed(2);
  const total = +(cart.subtotal + shipping + tax).toFixed(2);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-heading text-3xl font-semibold mb-6">Shopping Cart</h1>
        {cart.items.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center" data-testid="empty-cart">
            <p className="text-xl font-semibold text-gray-800">Your ShopZy Cart is empty</p>
            <p className="text-gray-500 mt-2">Browse products and start shopping.</p>
            <Link to="/products"><Button className="mt-4 bg-[#FF9900] hover:bg-[#E68A00] text-[#131921]" data-testid="empty-cart-shop-btn">Shop now</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
              <ul>
                {cart.items.map((it) => (
                  <li key={it.product_id} className="flex gap-4 p-5 border-b border-gray-100 last:border-0" data-testid={`cart-item-${it.product_id}`}>
                    <Link to={`/product/${it.product_id}`} className="w-28 h-28 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                      <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1">
                      <Link to={`/product/${it.product_id}`} className="font-medium text-gray-900 hover:text-[#FF9900] line-clamp-2">{it.name}</Link>
                      <p className="text-xs text-green-700 mt-1">In Stock</p>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="inline-flex items-center border rounded-lg">
                          <button onClick={() => updateQty(it.product_id, Math.max(1, it.quantity - 1))} className="p-1.5 hover:bg-gray-50" data-testid={`qty-dec-${it.product_id}`}><Minus size={14} /></button>
                          <span className="px-3 text-sm font-medium" data-testid={`qty-val-${it.product_id}`}>{it.quantity}</span>
                          <button onClick={() => updateQty(it.product_id, it.quantity + 1)} className="p-1.5 hover:bg-gray-50" data-testid={`qty-inc-${it.product_id}`}><Plus size={14} /></button>
                        </div>
                        <button onClick={async () => { await removeFromCart(it.product_id); toast.success("Removed"); }} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1" data-testid={`remove-${it.product_id}`}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-price">{fmtPrice(it.line_total)}</p>
                      <p className="text-xs text-gray-500">{fmtPrice(it.price)} × {it.quantity}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="bg-white rounded-xl border border-gray-200 p-5 h-fit sticky top-32">
              <h3 className="font-heading text-lg font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span data-testid="summary-subtotal">{fmtPrice(cart.subtotal)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span className={shipping === 0 ? "text-green-700" : ""}>{shipping === 0 ? "FREE" : fmtPrice(shipping)}</span></div>
                <div className="flex justify-between"><span>Estimated tax (5%)</span><span>{fmtPrice(tax)}</span></div>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-base">
                  <span>Order total</span><span className="text-price" data-testid="summary-total">{fmtPrice(total)}</span>
                </div>
              </div>
              <Button onClick={() => navigate("/checkout")} className="w-full mt-4 bg-[#FF9900] hover:bg-[#E68A00] text-[#131921] font-semibold" data-testid="proceed-to-checkout">
                Proceed to Checkout
              </Button>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}
