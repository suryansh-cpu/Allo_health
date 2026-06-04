import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useState } from 'react';
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
