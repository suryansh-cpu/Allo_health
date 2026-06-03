import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from './ProductList.module.css';

interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inventory: WarehouseStock[];
}

interface Props {
  products: Product[];
}

function formatPrice(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function StockBadge({ available }: { available: number }) {
  if (available === 0)
    return <span className={`${styles.badge} ${styles.badgeOut}`}>Out of stock</span>;
  if (available <= 2)
    return <span className={`${styles.badge} ${styles.badgeLow}`}>{available} left!</span>;
  return <span className={`${styles.badge} ${styles.badgeOk}`}>{available} available</span>;
}

interface ReserveState {
  loading: boolean;
  error: string | null;
}

export default function ProductList({ products }: Props) {
  const router = useRouter();
  const [reserveState, setReserveState] = useState<Record<string, ReserveState>>({});

  async function handleReserve(productId: string, warehouseId: string) {
    const key = `${productId}:${warehouseId}`;
    setReserveState((s) => ({ ...s, [key]: { loading: true, error: null } }));

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReserveState((s) => ({
          ...s,
          [key]: { loading: false, error: data.error ?? 'Reservation failed. Please try again.' },
        }));
        return;
      }

      router.push(`/checkout?id=${data.reservation.id}`);
    } catch {
      setReserveState((s) => ({
        ...s,
        [key]: { loading: false, error: 'Network error. Please try again.' },
      }));
    }
  }

  if (products.length === 0) {
    return <p className={styles.empty}>No products available.</p>;
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => {
        const totalAvailable = product.inventory.reduce((sum, i) => sum + i.availableUnits, 0);

        return (
          <div key={product.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.category}>{product.category}</span>
              <h2 className={styles.productName}>{product.name}</h2>
              <p className={styles.description}>{product.description}</p>
              <p className={styles.price}>{formatPrice(product.price)}</p>
            </div>

            <div className={styles.inventory}>
              <h3 className={styles.inventoryHeading}>Stock by warehouse</h3>
              {product.inventory.length === 0 ? (
                <p className={styles.noInventory}>Not stocked anywhere.</p>
              ) : (
                product.inventory.map((inv) => {
                  const key = `${product.id}:${inv.warehouseId}`;
                  const state = reserveState[key];

                  return (
                    <div key={inv.warehouseId} className={styles.warehouseRow}>
                      <div className={styles.warehouseInfo}>
                        <span className={styles.warehouseName}>{inv.warehouseName}</span>
                        <span className={styles.warehouseLocation}>{inv.warehouseLocation}</span>
                        <StockBadge available={inv.availableUnits} />
                      </div>

                      <div className={styles.reserveCol}>
                        <button
                          className={styles.reserveBtn}
                          disabled={inv.availableUnits === 0 || state?.loading}
                          onClick={() => handleReserve(product.id, inv.warehouseId)}
                        >
                          {state?.loading ? 'Holding…' : 'Reserve'}
                        </button>
                        {state?.error && <p className={styles.reserveError}>{state.error}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {totalAvailable === 0 && (
              <div className={styles.soldOutBanner}>Sold out across all warehouses</div>
            )}
          </div>
        );
      })}
    </div>
  );
}