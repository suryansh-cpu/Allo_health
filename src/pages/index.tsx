import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getProductsWithInventory } from '../services/productService';
import ProductList from '../components/ProductList';
import styles from '../styles/Home.module.css';

type ProductWithInventory = Awaited<ReturnType<typeof getProductsWithInventory>>[number];

interface Props {
  products: ProductWithInventory[];
}

export default function Home({ products }: Props) {
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
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h1 className={styles.sectionTitle}>All Products</h1>
              <p className={styles.sectionSub}>
                Click <strong>Reserve</strong> to hold a unit for 10 minutes while you check out.
              </p>
            </div>
            <ProductList products={products} />
          </div>
        </main>

        <footer className={styles.footer}>
          <div className={styles.container}>
            Reservations expire after 10 minutes if not confirmed.
          </div>
        </footer>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const products = await getProductsWithInventory();
  return {
    props: { products: JSON.parse(JSON.stringify(products)) },
  };
};