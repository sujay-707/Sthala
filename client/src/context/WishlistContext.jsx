import { createContext, useContext, useEffect, useState } from "react";
import { request } from "../services/api";
import { useAuth } from "./AuthContext";
const WishlistContext = createContext(null);
export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    request("/wishlists")
      .then((d) => setItems(d.listings || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);
  const toggle = async (listing) => {
    const exists = items.some((x) => x._id === listing._id);
    if (exists) {
      await request("/wishlists/" + listing._id, { method: "DELETE" });
      setItems((old) => old.filter((x) => x._id !== listing._id));
    } else {
      await request("/wishlists/" + listing._id, { method: "POST" });
      setItems((old) => [...old, listing]);
    }
  };
  return (
    <WishlistContext.Provider
      value={{
        items,
        loading,
        toggle,
        isSaved: (id) => items.some((x) => x._id === id),
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
export const useWishlist = () => useContext(WishlistContext);
