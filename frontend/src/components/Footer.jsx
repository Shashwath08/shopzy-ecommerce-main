import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-nav-secondary text-gray-300 mt-12">
      <div className="bg-nav-dark text-white text-center py-4 text-sm hover:bg-[#1A2330] transition-colors cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        Back to top
      </div>
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">Get to Know Us</h4>
          <ul className="space-y-2">
            <li><Link to="#" className="hover:text-white">About ShopZy</Link></li>
            <li><Link to="#" className="hover:text-white">Careers</Link></li>
            <li><Link to="#" className="hover:text-white">Press Releases</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">Make Money with Us</h4>
          <ul className="space-y-2">
            <li><Link to="#" className="hover:text-white">Sell on ShopZy</Link></li>
            <li><Link to="#" className="hover:text-white">Become an Affiliate</Link></li>
            <li><Link to="#" className="hover:text-white">Advertise Products</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">Let Us Help You</h4>
          <ul className="space-y-2">
            <li><Link to="/orders" className="hover:text-white">Your Orders</Link></li>
            <li><Link to="#" className="hover:text-white">Returns</Link></li>
            <li><Link to="#" className="hover:text-white">Help Center</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">Payment</h4>
          <ul className="space-y-2">
            <li>Cash on Delivery</li>
            <li>UPI / Net Banking</li>
            <li>All major Cards</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-700 py-6 text-center text-xs">
        © 2026 ShopZy.com — A DBMS Project Demo. All rights reserved.
      </div>
    </footer>
  );
}
