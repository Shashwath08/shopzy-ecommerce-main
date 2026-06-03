import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, ShoppingCart, Heart, User, MapPin, ChevronDown, LogOut, Package, LayoutDashboard, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../lib/api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "./ui/dropdown-menu";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat && cat !== "all") params.set("category", cat);
    navigate(`/products?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Main bar */}
      <div className="bg-nav-dark text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center gap-2 sm:gap-4 py-2">
          <Link to="/" data-testid="logo-link" className="flex items-center gap-1 px-2 py-1 border border-transparent hover:border-white rounded">
            <span className="font-heading text-2xl font-bold tracking-tight">
              Shop<span className="text-[#FF9900]">Zy</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 px-2 text-xs cursor-pointer hover:border-white border border-transparent rounded py-1">
            <MapPin size={16} />
            <div className="leading-tight">
              <div className="text-gray-300 text-[11px]">Deliver to</div>
              <div className="font-semibold">India</div>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex items-stretch rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-[#FF9900]" data-testid="search-form">
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="bg-gray-100 text-gray-700 text-sm px-2 border-r border-gray-300 max-w-[140px] hidden sm:block focus:outline-none"
              data-testid="search-category-select"
            >
              <option value="all">All</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, brands and more"
              className="flex-1 rounded-none border-0 bg-white text-black h-10 focus-visible:ring-0"
              data-testid="search-input"
            />
            <button type="submit" className="bg-[#FF9900] hover:bg-[#E68A00] px-4 flex items-center justify-center transition-colors" data-testid="search-submit-button">
              <Search className="text-[#131921]" size={20} />
            </button>
          </form>

          {/* User */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex flex-col items-start px-2 py-1 hover:border-white border border-transparent rounded leading-tight" data-testid="user-menu-trigger">
                  <span className="text-[11px] text-gray-300">Hello, {user.name.split(" ")[0]}</span>
                  <span className="text-sm font-semibold flex items-center gap-1">Account <ChevronDown size={14} /></span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/orders")} data-testid="menu-orders"><Package className="mr-2 h-4 w-4" /> My Orders</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/wishlist")} data-testid="menu-wishlist"><Heart className="mr-2 h-4 w-4" /> Wishlist</DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin"><LayoutDashboard className="mr-2 h-4 w-4" /> Admin</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-logout"><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login" className="hidden md:flex flex-col items-start px-2 py-1 hover:border-white border border-transparent rounded leading-tight" data-testid="login-link">
              <span className="text-[11px] text-gray-300">Hello, sign in</span>
              <span className="text-sm font-semibold flex items-center gap-1"><User size={14} /> Account</span>
            </Link>
          )}

          <Link to="/wishlist" className="hidden md:flex p-2 hover:border-white border border-transparent rounded" aria-label="Wishlist" data-testid="nav-wishlist">
            <Heart size={22} />
          </Link>

          <Link to="/cart" className="relative flex items-center gap-1 px-2 py-1 hover:border-white border border-transparent rounded" data-testid="nav-cart">
            <div className="relative">
              <ShoppingCart size={26} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#FF9900] text-[#131921] text-xs font-bold rounded-full px-1.5 min-w-[20px] text-center" data-testid="cart-badge">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline text-sm font-semibold">Cart</span>
          </Link>
        </div>
      </div>

      {/* Categories bar */}
      <div className="bg-nav-secondary text-white text-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center gap-1 sm:gap-2 py-1 overflow-x-auto scrollbar-hide">
          <button className="flex items-center gap-1 px-2 py-1 hover:border-white border border-transparent rounded font-semibold whitespace-nowrap" data-testid="nav-menu-all">
            <Menu size={16} /> All
          </button>
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/products?category=${c.slug}`}
              className="px-2 py-1 hover:border-white border border-transparent rounded whitespace-nowrap"
              data-testid={`nav-cat-${c.slug}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
