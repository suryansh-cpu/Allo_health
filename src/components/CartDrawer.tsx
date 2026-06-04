import { useRouter } from 'next/router';
import { useState } from 'react';
import { useCart } from './CartContext';
import styles from './CartDrawer.module.css';

function formatPrice(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

interface CheckoutError {
  productName: string;
  warehouseName: string;
  message: string;
}

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice, setActiveCheckout } = useCart();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<CheckoutError[]>([]);

  async function handleCheckout() {
    if (items.length === 0) return;
    setLoading(true);
    setErrors([]);

    // Create reservations for all cart items in parallel
    const results = await Promise.all(
      items.map(async (item) => {
        const res = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: item.quantity,
          }),
        });
        const data = await res.json();
        return { item, ok: res.ok, status: res.status, data };
      }),
    );

    const failed = results.filter((r) => !r.ok);
    const succeeded = results.filter((r) => r.ok);

    if (failed.length > 0) {
      // Roll back any succeeded reservations so stock isn't held unnecessarily
      await Promise.all(
        succeeded.map((r) =>
          fetch(`/api/reservations/${r.data.reservation.id}/release`, { method: 'POST' }),
        ),
      );

      setErrors(
        failed.map((r) => {
          const available = r.data.error?.match(/Available: (\d+)/)?.[1];
          let message = r.data.error ?? 'Not enough stock';
          if (r.status === 409) {
            if (available === '0' || available === undefined) {
              message = 'Out of stock — please try again later';
            } else {
              message = `Only ${available} unit${Number(available) === 1 ? '' : 's'} left`;
            }
          }
          return {
            productName: r.item.productName,
            warehouseName: r.item.warehouseName,
            message,
          };
        }),
      );
      setLoading(false);
      return;
    }

    // All succeeded — save active checkout to context/localStorage before navigating
    const ids = succeeded.map((r) => r.data.reservation.id).join(',');
    const earliestExpiry = succeeded
      .map((r) => new Date(r.data.reservation.expiresAt).getTime())
      .sort((a, b) => a - b)[0];

    setActiveCheckout({
      ids,
      expiresAt: new Date(earliestExpiry).toISOString(),
    });

    clearCart();
    onClose();
    router.push(`/checkout?ids=${ids}`);
  }

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} />}
      <div className={`${styles.drawer} ${open ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Your Bag {totalItems > 0 && <span className={styles.count}>{totalItems}</span>}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close cart">✕</button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🛍️</div>
            <p>Your bag is empty</p>
            <p className={styles.emptyHint}>Add items from the product list to get started.</p>
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {items.map((item) => (
                <div key={`${item.productId}:${item.warehouseId}`} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemCategory}>{item.productCategory}</span>
                    <p className={styles.itemName}>{item.productName}</p>
                    <p className={styles.itemWarehouse}>{item.warehouseName}</p>
                    <p className={styles.itemPrice}>{formatPrice(item.productPrice * item.quantity)}</p>
                  </div>
                  <div className={styles.itemControls}>
                    <div className={styles.qtyRow}>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => updateQuantity(item.productId, item.warehouseId, item.quantity - 1)}
                      >−</button>
                      <span className={styles.qtyNum}>{item.quantity}</span>
                      <button
                        className={styles.qtyBtn}
                        disabled={item.quantity >= item.availableUnits}
                        onClick={() => updateQuantity(item.productId, item.warehouseId, item.quantity + 1)}
                      >+</button>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeItem(item.productId, item.warehouseId)}
                    >Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {errors.length > 0 && (
              <div className={styles.errorBox}>
                <p className={styles.errorTitle}>⚠️ Some items couldn't be reserved:</p>
                {errors.map((e, i) => (
                  <div key={i} className={styles.errorItem}>
                    <span className={styles.errorProduct}>{e.productName} — {e.warehouseName}</span>
                    <span className={styles.errorMsg}>{e.message}</span>
                  </div>
                ))}
                <p className={styles.errorHint}>Update your quantities and try again.</p>
              </div>
            )}

            <div className={styles.footer}>
              <div className={styles.total}>
                <span>Total</span>
                <span className={styles.totalPrice}>{formatPrice(totalPrice)}</span>
              </div>
              <p className={styles.holdNote}>Stock will be held for 10 minutes after checkout begins.</p>
              <button
                className={styles.checkoutBtn}
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? 'Reserving stock…' : `Checkout (${totalItems} item${totalItems === 1 ? '' : 's'})`}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}