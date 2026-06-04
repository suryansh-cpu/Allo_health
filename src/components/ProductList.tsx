import styles from './ProductList.module.css';
import { useCart } from './CartContext';

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

export default function ProductList({ products }: Props) {
  const { items, addItem, removeItem, updateQuantity } = useCart();

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
                  const cartItem = items.find(
                    (i) => i.productId === product.id && i.warehouseId === inv.warehouseId,
                  );
                  const inCart = !!cartItem;
                  const cartQty = cartItem?.quantity ?? 0;

                  return (
                    <div key={inv.warehouseId} className={styles.warehouseRow}>
                      <div className={styles.warehouseInfo}>
                        <span className={styles.warehouseName}>{inv.warehouseName}</span>
                        <span className={styles.warehouseLocation}>{inv.warehouseLocation}</span>
                        <StockBadge available={inv.availableUnits} />
                      </div>

                      <div className={styles.reserveCol}>
                        {!inCart ? (
                          <button
                            className={styles.reserveBtn}
                            disabled={inv.availableUnits === 0}
                            onClick={() =>
                              addItem({
                                productId: product.id,
                                productName: product.name,
                                productPrice: product.price,
                                productCategory: product.category,
                                warehouseId: inv.warehouseId,
                                warehouseName: inv.warehouseName,
                                warehouseLocation: inv.warehouseLocation,
                                availableUnits: inv.availableUnits,
                              })
                            }
                          >
                            Add to bag
                          </button>
                        ) : (
                          <div className={styles.qtyControls}>
                            <button
                              className={styles.qtyBtn}
                              onClick={() =>
                                updateQuantity(product.id, inv.warehouseId, cartQty - 1)
                              }
                            >
                              −
                            </button>
                            <span className={styles.qtyNum}>{cartQty}</span>
                            <button
                              className={styles.qtyBtn}
                              disabled={cartQty >= inv.availableUnits}
                              onClick={() =>
                                updateQuantity(product.id, inv.warehouseId, cartQty + 1)
                              }
                            >
                              +
                            </button>
                            <button
                              className={styles.removeBtn}
                              onClick={() => removeItem(product.id, inv.warehouseId)}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        )}
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
