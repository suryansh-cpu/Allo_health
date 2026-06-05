import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getProductsWithInventory } from '../services/productService';
import ProductList from '../components/ProductList';
import CartDrawer from '../components/CartDrawer';
import { useCart } from '../components/CartContext';
import styles from '../styles/Home.module.css';

type ProductWithInventory = Awaited<ReturnType<typeof getProductsWithInventory>>[number];

interface Props {
  products: ProductWithInventory[];
}

function CartButton({ onClick }: { onClick: () => void }) {
  const { totalItems, totalPrice } = useCart();

  function formatPrice(paise: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  }

  return (
    <button className={styles.cartBtn} onClick={onClick}>
      <span className={styles.cartIcon}>🛍️</span>
      {totalItems > 0 ? (
        <>
          <span className={styles.cartCount}>{totalItems}</span>
          <span className={styles.cartTotal}>{formatPrice(totalPrice)}</span>
        </>
      ) : (
        <span className={styles.cartEmpty}>Bag</span>
      )}
    </button>
  );
}

/** Live countdown shown inside the active-checkout banner */
function CheckoutCountdown({ expiresAt }: { expiresAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const tick = setInterval(() => {
      const rem = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(rem);
      if (rem === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  if (secondsLeft === 0) return <span className={styles.checkoutBannerExpired}>Expired</span>;

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const isWarning = secondsLeft <= 120;
  return (
    <span className={`${styles.checkoutBannerTimer} ${isWarning ? styles.checkoutBannerTimerWarn : ''}`}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

/** Sticky banner shown when an active checkout is persisted */
function ActiveCheckoutBanner() {
  const { activeCheckout, clearActiveCheckout } = useCart();
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!activeCheckout) return;
    if (new Date(activeCheckout.expiresAt).getTime() <= Date.now()) {
      setExpired(true);
    }
  }, [activeCheckout]);

  if (!activeCheckout) return null;

  async function handleCancel() {
    if (!activeCheckout) return;
    setCancelling(true);
    try {
      const ids = activeCheckout.ids.split(',').map((s) => s.trim()).filter(Boolean);
      // Release every reservation that was part of this checkout
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/reservations/${id}/release`, { method: 'POST' }).catch(() => {
            // If a release fails (e.g. already released/expired), that's fine —
            // the server's cron job will clean it up. We still clear the UI.
          }),
        ),
      );
    } finally {
      setCancelling(false);
      clearActiveCheckout();
    }
  }

  if (expired) {
    return (
      <div className={`${styles.checkoutBanner} ${styles.checkoutBannerExpiredBg}`}>
        <span>⛔ Your checkout reservation expired — stock has been released.</span>
        <button className={styles.checkoutBannerDismiss} onClick={clearActiveCheckout}>
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className={styles.checkoutBanner}>
      <span className={styles.checkoutBannerLabel}>⏱ Checkout in progress —</span>
      <CheckoutCountdown expiresAt={activeCheckout.expiresAt} />
      <span className={styles.checkoutBannerLabel}>remaining</span>
      <button
        className={styles.checkoutBannerResume}
        onClick={() => router.push(`/checkout?ids=${activeCheckout.ids}`)}
      >
        Resume Checkout →
      </button>
      <button
        className={styles.checkoutBannerDismiss}
        onClick={handleCancel}
        disabled={cancelling}
        title="Cancel reservation and release held stock"
      >
        {'✕'}
      </button>
    </div>
  );
}

export default function Home({ products }: Props) {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Allo — Inventory Platform</title>
        <meta name="description" content="Reserve and purchase products across warehouses" />
      </Head>

      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.logo}>
              <span className={styles.logoMark}>▲</span>
              <span className={styles.logoText}>allo</span>
            </div>
            <p className={styles.tagline}>Multi-warehouse inventory &amp; order platform</p>
            <CartButton onClick={() => setCartOpen(true)} />
          </div>
        </header>

        {/* Active checkout banner sits right below the sticky header */}
        <ActiveCheckoutBanner />

        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h1 className={styles.sectionTitle}>All Products</h1>
              <p className={styles.sectionSub}>
                Add items to your bag, then checkout to hold stock for 10 minutes.
              </p>
            </div>
            <ProductList products={products} />
          </div>
        </main>

        <footer className={styles.footer}>
          <div className={styles.container}>
            Stock is held for 10 minutes once you begin checkout. Items in your bag are not reserved yet.
          </div>
        </footer>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const products = await getProductsWithInventory();
  return {
    props: { products: JSON.parse(JSON.stringify(products)) },
  };
};