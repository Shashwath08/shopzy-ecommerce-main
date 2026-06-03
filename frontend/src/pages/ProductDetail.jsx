import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import api, { fmtPrice } from "../lib/api";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const navigate = useNavigate();

  const load = () => {
    api.get(`/products/${id}`).then((r) => setProduct(r.data));
    api.get(`/products/${id}/reviews`).then((r) => setReviews(r.data));
  };
  useEffect(() => { load(); }, [id]);

  if (!product) return <Layout><div className="p-12 text-center text-gray-500">Loading...</div></Layout>;

  const finalPrice = product.price * (1 - (product.discount_pct || 0) / 100);

  const handleAdd = async () => {
    if (!user) { toast.error("Please sign in first"); navigate("/login"); return; }
    await addToCart(product.id, qty);
    toast.success("Added to cart");
  };

  const handleBuyNow = async () => {
    if (!user) { toast.error("Please sign in first"); navigate("/login"); return; }
    await addToCart(product.id, qty);
    navigate("/checkout");
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to write a review"); return; }
    setSubmitting(true);
    try {
      await api.post("/reviews", { product_id: product.id, rating, comment });
      toast.success("Review submitted");
      setComment("");
      setRating(5);
      load();
    } catch (e) {
      toast.error("Failed to submit");
    } finally { setSubmitting(false); }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Image gallery */}
          <div className="md:col-span-5">
            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
              <img src={product.images?.[activeImg] || product.images?.[0]} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 mt-3">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === activeImg ? "border-[#FF9900]" : "border-gray-200"}`}>
                    <img src={img} alt={`view ${i+1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">{product.brand}</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-gray-900 mt-1" data-testid="product-detail-name">{product.name}</h1>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex">
                {[1,2,3,4,5].map((i) => <Star key={i} size={18} className={i <= Math.round(product.rating_avg) ? "fill-[#FF9900] text-[#FF9900]" : "text-gray-300"} />)}
              </div>
              <span className="text-sm text-blue-700">{product.rating_count} ratings</span>
            </div>

            <div className="my-4 border-t border-b border-gray-200 py-4">
              <div className="flex items-baseline gap-3">
                {product.discount_pct > 0 && <span className="text-2xl text-[#CC0C39] font-semibold">-{product.discount_pct}%</span>}
                <span className="text-3xl font-medium text-price" data-testid="product-detail-price">{fmtPrice(finalPrice)}</span>
              </div>
              {product.discount_pct > 0 && <p className="text-sm text-gray-500 mt-1">M.R.P.: <span className="line-through">{fmtPrice(product.price)}</span></p>}
              <p className="text-sm text-gray-700 mt-2">Inclusive of all taxes</p>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>

            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <div className="flex flex-col items-center text-center"><Truck className="text-[#FF9900] mb-1" size={22} /><span>Free Delivery</span></div>
              <div className="flex flex-col items-center text-center"><Shield className="text-[#FF9900] mb-1" size={22} /><span>Secure Payment</span></div>
              <div className="flex flex-col items-center text-center"><RotateCcw className="text-[#FF9900] mb-1" size={22} /><span>7-day returns</span></div>
            </div>
          </div>

          {/* Buy box */}
          <div className="md:col-span-3">
            <div className="border border-gray-200 rounded-xl p-5 sticky top-32">
              <p className="text-2xl font-medium text-price">{fmtPrice(finalPrice)}</p>
              <p className="text-sm text-green-700 mt-1">FREE delivery</p>
              <p className={`text-base font-semibold mt-3 ${product.stock > 0 ? "text-green-700" : "text-red-600"}`}>
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <label className="text-sm text-gray-700">Qty:</label>
                <select value={qty} onChange={(e) => setQty(parseInt(e.target.value))} className="border rounded-md px-2 py-1 text-sm" data-testid="qty-select">
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <Button onClick={handleAdd} disabled={product.stock <= 0} className="w-full mt-4 bg-[#FF9900] hover:bg-[#E68A00] text-[#131921] font-semibold" data-testid="detail-add-to-cart">
                <ShoppingCart size={16} className="mr-2" /> Add to Cart
              </Button>
              <Button onClick={handleBuyNow} disabled={product.stock <= 0} className="w-full mt-2 bg-[#FFA41C] hover:bg-[#E68A00] text-[#131921] font-semibold" data-testid="buy-now-btn">
                Buy Now
              </Button>
              <Button onClick={async () => { if (!user) { toast.error("Sign in first"); return; } const a = await toggleWishlist(product.id); toast.success(a ? "Added to wishlist" : "Removed from wishlist"); }} variant="outline" className="w-full mt-2" data-testid="detail-wishlist">
                <Heart size={16} className={`mr-2 ${isWishlisted(product.id) ? "fill-[#B12704] text-[#B12704]" : ""}`} /> {isWishlisted(product.id) ? "In Wishlist" : "Add to Wishlist"}
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="font-heading text-2xl font-semibold mb-4">Customer Reviews</h2>

          {user && (
            <form onSubmit={submitReview} className="border-b pb-6 mb-6">
              <p className="font-semibold mb-2">Write a review</p>
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map((i) => (
                  <button type="button" key={i} onClick={() => setRating(i)} data-testid={`star-${i}`}>
                    <Star size={24} className={i <= rating ? "fill-[#FF9900] text-[#FF9900]" : "text-gray-300"} />
                  </button>
                ))}
              </div>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your thoughts..." rows={3} required data-testid="review-textarea" />
              <Button type="submit" disabled={submitting || !comment} className="mt-3 bg-[#FF9900] hover:bg-[#E68A00] text-[#131921]" data-testid="submit-review-btn">
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-gray-500" data-testid="no-reviews">No reviews yet. Be the first to review!</p>
          ) : (
            <ul className="space-y-5">
              {reviews.map((r) => (
                <li key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{r.user_name}</span>
                    <span className="text-xs text-gray-500">· {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex">
                    {[1,2,3,4,5].map((i) => <Star key={i} size={14} className={i <= r.rating ? "fill-[#FF9900] text-[#FF9900]" : "text-gray-300"} />)}
                  </div>
                  <p className="text-sm text-gray-700 mt-2">{r.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
