import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string, warehouseId: string) => void;
  updateQuantity: (productId: string, warehouseId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
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
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}