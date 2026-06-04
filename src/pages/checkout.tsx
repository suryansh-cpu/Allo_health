import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { getReservation } from '../services/reservationService';
import ReservationTimer from '../components/ReservationTimer';
import { useCart } from '../components/CartContext';
import styles from '../styles/Checkout.module.css';

type Reservation = NonNullable<Awaited<ReturnType<typeof getReservation>>>;

interface Props {
  reservations: Reservation[];
  earliestExpiry: string;
}

function formatPrice(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default function CheckoutPage({ reservations: initial, earliestExpiry }: Props) {
  const router = useRouter();
  const { clearActiveCheckout } = useCart();
  const [reservations, setReservations] = useState(initial);
  const [loading, setLoading] = useState<'confirm' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState<'confirmed' | 'released' | null>(null);

  const allPending = reservations.every((r) => r.status === 'PENDING');
  const canAct = allPending && !expired && !done;

  const total = reservations.reduce((s, r) => s + r.product.price * r.quantity, 0);

  async function handleConfirm() {
    setLoading('confirm');
    setError(null);

    const results = await Promise.all(
      reservations.map((r) =>
        fetch(`/api/reservations/${r.id}/confirm`, { method: 'POST' }).then((res) =>
          res.json().then((data) => ({ ok: res.ok, status: res.status, data, id: r.id })),
        ),
      ),
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      const err = failed[0];
      if (err.status === 410) {
        setExpired(true);
        setError('Your reservation has expired. Please start over.');
        clearActiveCheckout();
      } else {
        setError(err.data.error ?? 'Something went wrong.');
      }
      setLoading(null);
      return;
    }

    clearActiveCheckout();
    setDone('confirmed');
    setLoading(null);
  }

  async function handleCancel() {
    setLoading('cancel');
    await Promise.all(
      reservations.map((r) =>
        fetch(`/api/reservations/${r.id}/release`, { method: 'POST' }),
      ),
    );
    clearActiveCheckout();
    setDone('released');
    setLoading(null);
  }

  function handleExpire() {
    setExpired(true);
    clearActiveCheckout();
  }

  if (done === 'confirmed') {
    return (
      <CheckoutShell>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>🎉</div>
          <h2>Order Confirmed!</h2>
          <p>Your purchase is complete. {reservations.length} item{reservations.length > 1 ? 's' : ''} reserved.</p>
          <button className={styles.btnBack} onClick={() => router.push('/')}>Back to store</button>
        </div>
      </CheckoutShell>
    );
  }

  if (done === 'released') {
    return (
      <CheckoutShell>
        <div className={styles.releasedBox}>
          <div className={styles.releasedIcon}>🚫</div>
          <h2>Order Cancelled</h2>
          <p>All holds have been released. Stock is available again.</p>
          <button className={styles.btnBack} onClick={() => router.push('/')}>Back to store</button>
        </div>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <div className={styles.checkoutGrid}>
        {/* Left — order items */}
        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>

          {reservations.map((r) => (
            <div key={r.id} className={styles.orderItem}>
              <div className={styles.orderItemLeft}>
                <span className={styles.productCategory}>{r.product.category}</span>
                <p className={styles.productName}>{r.product.name}</p>
                <p className={styles.orderMeta}>{r.warehouse.name} · qty {r.quantity}</p>
              </div>
              <p className={styles.orderPrice}>{formatPrice(r.product.price * r.quantity)}</p>
            </div>
          ))}

          <div className={styles.orderTotal}>
            <span>Total</span>
            <span className={styles.orderTotalAmt}>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Right — timer + actions */}
        <div className={styles.actions}>
          {allPending && !expired && (
            <ReservationTimer expiresAt={earliestExpiry} onExpire={handleExpire} />
          )}

          {expired && (
            <div className={styles.errorBanner}>
              <strong>⛔ Reservation expired.</strong> Your stock hold has been released. Please start a new order.
            </div>
          )}

          {error && !expired && (
            <div className={styles.errorBanner}>
              <strong>⚠️ {error}</strong>
            </div>
          )}

          {canAct && (
            <div className={styles.btnGroup}>
              <button className={styles.btnConfirm} disabled={!!loading} onClick={handleConfirm}>
                {loading === 'confirm' ? 'Processing…' : '✓ Confirm Purchase'}
              </button>
              <button className={styles.btnCancel} disabled={!!loading} onClick={handleCancel}>
                {loading === 'cancel' ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          )}

          {(expired || done === 'released') && (
            <button className={styles.btnBack} onClick={() => router.push('/')}>← Back to store</button>
          )}
        </div>
      </div>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head><title>Checkout — Allo</title></Head>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.back}>← Back to products</Link>
            <div className={styles.logo}>
              <span className={styles.logoMark}>▲</span>
              <span className={styles.logoText}>allo</span>
            </div>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.container}>
            <h1 className={styles.pageTitle}>Checkout</h1>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const ids = context.query.ids;

  const idList: string[] = ids
    ? (typeof ids === 'string' ? ids.split(',') : ids)
    : context.query.id
    ? [context.query.id as string]
    : [];

  if (idList.length === 0) {
    return { redirect: { destination: '/', permanent: false } };
  }

  const reservations = (
    await Promise.all(idList.map((id) => getReservation(id)))
  ).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof getReservation>>>[];

  if (reservations.length === 0) {
    return { notFound: true };
  }

  const earliestExpiry = reservations
    .map((r) => new Date(r.expiresAt).getTime())
    .sort((a, b) => a - b)[0];

  return {
    props: {
      reservations: JSON.parse(JSON.stringify(reservations)),
      earliestExpiry: new Date(earliestExpiry).toISOString(),
    },
  };
};