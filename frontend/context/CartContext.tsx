"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { isApiConfigured } from "../lib/api-client";
import {
  addCartItem,
  addWishlistItem,
  cartLineToItem,
  clearServerCart,
  fetchCart,
  fetchWishlist,
  mergeWishlist,
  readLocalWishlist,
  removeCartLine,
  removeWishlistItem,
  updateCartLine,
  writeLocalWishlist,
  type CartSnapshot,
} from "../lib/storefront-api";
import type { CartItem, Product } from "../lib/storefront-types";
import { FREE_SHIPPING_THRESHOLD } from "../lib/pricing";
import { useAuth } from "./AuthContext";

export type { CartItem, Product } from "../lib/storefront-types";

export type StoreMode = "live" | "unavailable";

interface CartContextType {
  cart: CartItem[];
  /** Resolves true only when the line was accepted, so Buy Now and success toasts never guess. */
  addToCart: (product: Product, size: string, quantity?: number, color?: string) => Promise<boolean>;
  removeFromCart: (id: string, size: string, color?: string) => void;
  updateQuantity: (id: string, size: string, quantity: number, color?: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartCount: number;
  subtotal: number;
  freeShippingThreshold: number;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  /** Whether cart operations are backed by the live API. */
  mode: StoreMode;
  /** True while a cart mutation is in flight against the backend. */
  isSyncing: boolean;
  /** Human-readable problem from the last cart action (out of stock, network, …). */
  error: string | null;
  dismissError: () => void;
  refreshCart: () => void;
  /** Lines that cannot be sent to the backend because they lack live product identifiers. */
  hasLocalOnlyItems: boolean;
  /** Most recently removed line, kept briefly so an accidental tap can be undone. */
  lastRemoved: CartItem | null;
  undoRemove: () => void;
  dismissLastRemoved: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const freeShippingThreshold = FREE_SHIPPING_THRESHOLD;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const configured = isApiConfigured();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [snapshot, setSnapshot] = useState<CartSnapshot | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  /* Guests keep their wishlist in localStorage, which is a valid initial value before any request. */
  const [wishlist, setWishlist] = useState<string[]>(() => readLocalWishlist());
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRemoved, setLastRemoved] = useState<CartItem | null>(null);
  const [nonce, setNonce] = useState(0);

  const applySnapshot = useCallback((next: CartSnapshot) => {
    setSnapshot(next);
    setCart(next.lines.map(cartLineToItem));
  }, []);

  /* ---------------------------------------------------------------- cart load */

  useEffect(() => {
    if (!configured || isAdminRoute) return;
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setIsSyncing(true);
      try {
        const next = await fetchCart(controller.signal);
        if (!cancelled) {
          applySnapshot(next);
          setError(null);
        }
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) setError((cause as Error)?.message ?? "Could not load your bag");
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [configured, isAdminRoute, applySnapshot, isAuthenticated, nonce]);

  /* ------------------------------------------------------------ wishlist load */

  useEffect(() => {
    const local = readLocalWishlist();
    if (isAdminRoute || !configured || !isAuthenticated) {
      /* Falling back to the device wishlist is a refresh, not a synchronous state reset. */
      void Promise.resolve().then(() =>
        setWishlist((previous) => (previous.join("|") === local.join("|") ? previous : local)),
      );
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      try {
        /* Only backend product identifiers can be merged into the customer wishlist. */
        const pending = local.filter((id) => OBJECT_ID.test(id));
        const deviceOnly = local.filter((id) => !OBJECT_ID.test(id));

        let merged = false;
        if (pending.length > 0) {
          try {
            /* One request for the whole guest list. The backend de-duplicates by productId and keeps
               each insert atomic, so signing in again — or in a second tab — cannot duplicate it. */
            await mergeWishlist(pending);
            merged = true;
          } catch {
            merged = false;
          }
        }

        /* Prune the device copy only once the server has actually accepted the merge. Doing it
           unconditionally (the old behaviour) meant a backend outage during sign-in silently deleted
           the guest's saved items from localStorage with no copy anywhere — permanent loss. */
        if (merged) writeLocalWishlist(deviceOnly);

        const server = await fetchWishlist(controller.signal);
        if (cancelled) return;
        /* If the merge failed, keep the unsynced ids visible so nothing appears to vanish; the next
           load retries the merge. */
        setWishlist(merged ? server : Array.from(new Set([...server, ...pending])));
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) setWishlist(local);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [configured, isAdminRoute, isAuthenticated]);

  /* ----------------------------------------------------------------- mutations */

  const refreshCart = useCallback(() => setNonce((value) => value + 1), []);

  const addToCart = useCallback(
    async (product: Product, size: string, quantity = 1, color?: string): Promise<boolean> => {
      setIsCartOpen(true);
      setError(null);

      // Never silently substitute another SKU when the requested size/colour is not sellable.
      // The old first-variant fallback could put the wrong size in the bag while the UI said the
      // shopper's chosen size had been added.
      const variants = product.variants ?? [];
      const variant = variants.find((candidate) => candidate.size === size && (!color || candidate.color === color))
        ?? (!size && variants.length === 1 ? variants[0] : undefined);

      if (!configured) {
        setCart((previous) => {
          const existing = previous.find((item) => item.id === product.id && item.size === size && item.color === color);
          if (existing) return previous.map((item) => (item.id === product.id && item.size === size && item.color === color ? { ...item, quantity: item.quantity + quantity } : item));
          return [
            ...previous,
            {
              id: product.id,
              productId: product.productId,
              sku: variant?.sku,
              slug: product.slug,
              title: product.title,
              price: variant?.price ?? product.price,
              originalPrice: variant?.mrp ?? product.originalPrice,
              size,
              color,
              image: product.image,
              quantity,
              localOnly: true,
            },
          ];
        });
        return true;
      }

      if (!variant) {
        setError("Yeh size/colour abhi online order ke liye uplabdh nahi hai — koi aur option chune ya atelier se sampark kare.");
        return false;
      }
      setIsSyncing(true);
      try {
        applySnapshot(await addCartItem(variant.sku, quantity));
        return true;
      } catch (cause) {
        setError((cause as Error)?.message ?? "Could not add this piece to your bag");
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [applySnapshot, configured]
  );

  const findLine = useCallback(
    (id: string, size: string, color?: string) => cart.find((item) => item.id === id && item.size === size && (color === undefined || item.color === color)),
    [cart]
  );

  const removeFromCart = useCallback(
    (id: string, size: string, color?: string) => {
      const line = findLine(id, size, color);
      if (line) setLastRemoved(line);
      if (!configured || !line?.lineId) {
        setCart((previous) => previous.filter((item) => !(item.id === id && item.size === size && (color === undefined || item.color === color))));
        return;
      }
      setIsSyncing(true);
      removeCartLine(line.lineId)
        .then(applySnapshot)
        .catch((cause) => {
          setLastRemoved(null);
          setError((cause as Error)?.message ?? "Could not update your bag");
        })
        .finally(() => setIsSyncing(false));
    },
    [applySnapshot, configured, findLine]
  );

  const undoRemove = useCallback(() => {
    if (!lastRemoved) return;
    const item = lastRemoved;
    setLastRemoved(null);
    setError(null);
    if (configured && item.sku) {
      setIsSyncing(true);
      addCartItem(item.sku, item.quantity)
        .then(applySnapshot)
        .catch((cause) => {
          setLastRemoved(item);
          setError((cause as Error)?.message ?? "Could not restore this item");
        })
        .finally(() => setIsSyncing(false));
      return;
    }
    setCart((previous) => {
      const existing = previous.find((entry) => entry.id === item.id && entry.size === item.size && entry.color === item.color);
      if (existing) {
        return previous.map((entry) => (entry.id === item.id && entry.size === item.size && entry.color === item.color ? { ...entry, quantity: entry.quantity + item.quantity } : entry));
      }
      return [...previous, item];
    });
  }, [applySnapshot, configured, lastRemoved]);

  const updateQuantity = useCallback(
    (id: string, size: string, quantity: number, color?: string) => {
      if (quantity <= 0) {
        removeFromCart(id, size, color);
        return;
      }
      const line = findLine(id, size, color);
      if (!configured || !line?.lineId) {
        setCart((previous) => previous.map((item) => (item.id === id && item.size === size && (color === undefined || item.color === color) ? { ...item, quantity } : item)));
        return;
      }
      setIsSyncing(true);
      updateCartLine(line.lineId, quantity)
        .then(applySnapshot)
        .catch((cause) => setError((cause as Error)?.message ?? "Could not update the quantity"))
        .finally(() => setIsSyncing(false));
    },
    [applySnapshot, configured, findLine, removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setSnapshot(null);
    setLastRemoved(null);
    if (!configured) return;
    clearServerCart().catch(() => undefined);
  }, [configured]);

  /* ------------------------------------------------------------------ wishlist */

  const persistWishlist = useCallback((next: string[], changedId?: string) => {
    setWishlist(next);
    if (!configured || !isAuthenticated || !changedId || !OBJECT_ID.test(changedId)) {
      writeLocalWishlist(next.filter((id) => !OBJECT_ID.test(id)));
      return;
    }
    const call = next.includes(changedId) ? addWishlistItem(changedId) : removeWishlistItem(changedId);
    call.catch(() => {
      /* the UI keeps the optimistic state; the next load reconciles with the server */
    });
  }, [configured, isAuthenticated]);

  const toggleWishlist = useCallback(
    (id: string) => {
      const next = wishlist.includes(id) ? wishlist.filter((itemId) => itemId !== id) : [...wishlist, id];
      persistWishlist(next, id);
    },
    [persistWishlist, wishlist]
  );

  const isInWishlist = useCallback((id: string) => wishlist.includes(id), [wishlist]);

  /* --------------------------------------------------------------------- value */

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = useMemo(() => {
    if (configured && snapshot) return snapshot.subtotal;
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart, configured, snapshot]);

  const value: CartContextType = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isCartOpen,
    setIsCartOpen,
    cartCount,
    subtotal,
    freeShippingThreshold,
    wishlist,
    toggleWishlist,
    isInWishlist,
    quickViewProduct,
    setQuickViewProduct,
    mode: configured ? "live" : "unavailable",
    isSyncing,
    error,
    dismissError: () => setError(null),
    refreshCart,
    hasLocalOnlyItems: configured ? cart.some((item) => !item.sku) : cart.length > 0,
    lastRemoved,
    undoRemove,
    dismissLastRemoved: () => setLastRemoved(null),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
