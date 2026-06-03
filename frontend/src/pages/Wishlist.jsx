import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { Button } from "../components/ui/button";

export default function Wishlist() {
  const { wishlist } = useCart();
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-heading text-3xl font-semibold mb-6">My Wishlist</h1>
        {wishlist.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center" data-testid="empty-wishlist">
            <p className="text-gray-700">Your wishlist is empty.</p>
            <Link to="/products"><Button className="mt-4 bg-[#FF9900] hover:bg-[#E68A00] text-[#131921]">Discover products</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlist.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
