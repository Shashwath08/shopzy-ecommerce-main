import { Link } from "react-router-dom";
import { Star, Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { fmtPrice } from "../lib/api";
import { Button } from "./ui/button";

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const finalPrice = product.price * (1 - (product.discount_pct || 0) / 100);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Please sign in to add items to cart"); return; }
    try { await addToCart(product.id, 1); toast.success("Added to cart"); }
    catch { toast.error("Failed to add to cart"); }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Please sign in"); return; }
    const added = await toggleWishlist(product.id);
    toast.success(added ? "Added to wishlist" : "Removed from wishlist");
  };

  return (
    <Link to={`/product/${product.id}`} className="group block bg-white rounded-xl border border-gray-200 p-4 product-card-hover relative" data-testid={`product-card-${product.id}`}>
      <button
        onClick={handleWishlist}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-all"
        aria-label="Toggle wishlist"
        data-testid={`wishlist-btn-${product.id}`}
      >
        <Heart size={18} className={isWishlisted(product.id) ? "fill-[#B12704] text-[#B12704]" : "text-gray-600"} />
      </button>

      <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
        <img src={product.images?.[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
      </div>

      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 min-h-[2.5rem]" data-testid={`product-name-${product.id}`}>{product.name}</h3>

      <div className="flex items-center gap-1 mb-2">
        <div className="flex items-center">
          {[1,2,3,4,5].map((i) => (
            <Star key={i} size={14} className={i <= Math.round(product.rating_avg || 0) ? "fill-[#FF9900] text-[#FF9900]" : "text-gray-300"} />
          ))}
        </div>
        <span className="text-xs text-gray-500">({product.rating_count || 0})</span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-lg font-semibold text-price" data-testid={`product-price-${product.id}`}>{fmtPrice(finalPrice)}</span>
        {product.discount_pct > 0 && (
          <>
            <span className="text-xs text-gray-400 line-through">{fmtPrice(product.price)}</span>
            <span className="text-xs font-semibold text-green-700">-{product.discount_pct}%</span>
          </>
        )}
      </div>

      <Button onClick={handleAdd} className="w-full bg-[#FF9900] hover:bg-[#E68A00] text-[#131921] font-semibold" data-testid={`add-to-cart-${product.id}`}>
        Add to cart
      </Button>
    </Link>
  );
}
