import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

export interface CartItem {
  productId: string;
  productName: string;
  productPrice: number;
  productCategory: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  quantity: number;
  availableUnits: number;
}

export interface ActiveCheckout {
  ids: string;
  expiresAt: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string, warehouseId: string) => void;
  updateQuantity: (productId: string, warehouseId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  activeCheckout: ActiveCheckout | null;
  setActiveCheckout: (checkout: ActiveCheckout) => void;
  clearActiveCheckout: () => void;
}

const STORAGE_KEY = 'allo_active_checkout';

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [activeCheckout, setActiveCheckoutState] = useState<ActiveCheckout | null>(null);

  // Keep a ref in sync so addItem can read current value without stale closure
  const activeCheckoutRef = useRef<ActiveCheckout | null>(null);
  activeCheckoutRef.current = activeCheckout;

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ActiveCheckout = JSON.parse(stored);
        if (new Date(parsed.expiresAt).getTime() > Date.now()) {
          setActiveCheckoutState(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const setActiveCheckout = useCallback((checkout: ActiveCheckout) => {
    setActiveCheckoutState(checkout);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checkout)); } catch {}
  }, []);

  const clearActiveCheckout = useCallback(() => {
    setActiveCheckoutState(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  // Returns true if a live checkout is in progress — caller shows the warning
  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
    const current = activeCheckoutRef.current;
    if (current && new Date(current.expiresAt).getTime() > Date.now()) {
      throw new Error('CHECKOUT_ACTIVE');
    }

    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === newItem.productId && i.warehouseId === newItem.warehouseId,
      );
      if (existing) {
        return prev.map((i) =>
          i.productId === newItem.productId && i.warehouseId === newItem.warehouseId
            ? { ...i, quantity: Math.min(i.quantity + 1, i.availableUnits) }
            : i,
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string, warehouseId: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.warehouseId === warehouseId)),
    );
  }, []);

  const updateQuantity = useCallback((productId: string, warehouseId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) =>
        prev.filter((i) => !(i.productId === productId && i.warehouseId === warehouseId)),
      );
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.warehouseId === warehouseId ? { ...i, quantity } : i,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.productPrice * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        activeCheckout,
        setActiveCheckout,
        clearActiveCheckout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}