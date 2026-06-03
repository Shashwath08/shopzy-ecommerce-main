import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [wishlist, setWishlist] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) { setCart({ items: [], subtotal: 0 }); setWishlist([]); return; }
    try {
      const [c, w] = await Promise.all([api.get("/cart"), api.get("/wishlist")]);
      setCart(c.data);
      setWishlist(w.data.items || []);
    } catch (e) { /* ignore */ }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const addToCart = async (product_id, quantity = 1) => {
  const token = localStorage.getItem("shopzy_token");

  const { data } = await api.post(
    "/cart/add",
    { product_id, quantity },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  setCart(data);
  return data;
};

  const updateQty = async (product_id, quantity) => {
    const { data } = await api.put(`/cart/${product_id}`, { quantity });
    setCart(data);
  };

  const removeFromCart = async (product_id) => {
    const { data } = await api.delete(`/cart/${product_id}`);
    setCart(data);
  };

  const toggleWishlist = async (product_id) => {
    const { data } = await api.post("/wishlist/toggle", { product_id });
    await refresh();
    return data.added;
  };

  const isWishlisted = (pid) => wishlist.some((p) => p.id === pid);
  const cartCount = cart.items.reduce((s, it) => s + it.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, wishlist, cartCount, refresh, addToCart, updateQty, removeFromCart, toggleWishlist, isWishlisted }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
