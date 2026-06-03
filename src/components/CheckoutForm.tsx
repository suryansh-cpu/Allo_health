import { useState } from 'react';
import { useRouter } from 'next/router';
import ReservationTimer from './ReservationTimer';
import styles from './CheckoutForm.module.css';

// Match the shape returned from Prisma (dates serialised as strings by Next.js SSR)
interface ProductSummary {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
}

interface WarehouseSummary {
  id: string;
  name: string;
  location: string;
}

export interface ReservationDetail {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: string;
  createdAt: string;
  confirmedAt?: string | null;
  releasedAt?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  product: ProductSummary;
  warehouse: WarehouseSummary;
}

interface Props {
  reservation: ReservationDetail;
}

function formatPrice(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: '✅ Confirmed',
  RELEASED: '🚫 Released',
};

export default function CheckoutForm({ reservation: initialReservation }: Props) {
  const router = useRouter();
  const [reservation, setReservation] = useState(initialReservation);
  const [loading, setLoading] = useState<'confirm' | 'release' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const isTerminal = reservation.status === 'CONFIRMED' || reservation.status === 'RELEASED';
  const canAct = !isTerminal && !expired;

  async function postAction(action: 'confirm' | 'release') {
    setLoading(action);
    setError(null);

    const path =
      action === 'confirm'
        ? `/api/reservations/${reservation.id}/confirm`
        : `/api/reservations/${reservation.id}/release`;

    try {
      const res = await fetch(path, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        if (res.status === 410) setExpired(true);
      } else {
        setReservation((prev) => ({ ...prev, ...data.reservation }));
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={styles.container}>
      {/* Left: order summary */}
      <div className={styles.summary}>
        <div className={styles.summaryHeader}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>
          <span
            className={[styles.statusBadge, styles[`status_${reservation.status}`]].join(' ')}
          >
            {STATUS_LABELS[reservation.status] ?? reservation.status}
          </span>
        </div>

        <div className={styles.productBlock}>
          <span className={styles.productCategory}>{reservation.product.category}</span>
          <h3 className={styles.productName}>{reservation.product.name}</h3>
          <p className={styles.productDesc}>{reservation.product.description}</p>
        </div>

        <table className={styles.detailTable}>
          <tbody>
            <tr>
              <td className={styles.detailLabel}>Warehouse</td>
              <td className={styles.detailValue}>
                {reservation.warehouse.name}
                <span className={styles.detailSub}>{reservation.warehouse.location}</span>
              </td>
            </tr>
            <tr>
              <td className={styles.detailLabel}>Quantity</td>
              <td className={styles.detailValue}>{reservation.quantity}</td>
            </tr>
            <tr>
              <td className={styles.detailLabel}>Unit price</td>
              <td className={styles.detailValue}>{formatPrice(reservation.product.price)}</td>
            </tr>
            <tr className={styles.totalRow}>
              <td className={styles.detailLabel}>Total</td>
              <td className={styles.detailValue}>
                {formatPrice(reservation.product.price * reservation.quantity)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className={styles.meta}>
          <span>
            Reservation ID: <code>{reservation.id}</code>
          </span>
          <span>
            Reserved at:{' '}
            {new Date(reservation.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Right: timer + actions */}
      <div className={styles.actions}>
        {reservation.status === 'PENDING' && (
          <ReservationTimer expiresAt={reservation.expiresAt} onExpire={() => setExpired(true)} />
        )}

        {reservation.status === 'CONFIRMED' && (
          <div className={styles.successBox}>
            <div className={styles.successIcon}>🎉</div>
            <h3>Order Confirmed!</h3>
            <p>
              Your purchase is complete. Confirmed at{' '}
              {new Date(reservation.confirmedAt!).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              .
            </p>
            <button className={styles.btnBack} onClick={() => router.push('/')}>
              Back to store
            </button>
          </div>
        )}

        {reservation.status === 'RELEASED' && (
          <div className={styles.releasedBox}>
            <div className={styles.releasedIcon}>🚫</div>
            <h3>Reservation Released</h3>
            <p>
              The stock hold has been lifted.
              {reservation.releasedAt && (
                <>
                  {' '}Released at{' '}
                  {new Date(reservation.releasedAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  .
                </>
              )}
            </p>
            <button className={styles.btnBack} onClick={() => router.push('/')}>
              Start over
            </button>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            <strong>⚠️ {error}</strong>
          </div>
        )}

        {canAct && (
          <div className={styles.btnGroup}>
            <button
              className={styles.btnConfirm}
              disabled={!!loading}
              onClick={() => postAction('confirm')}
            >
              {loading === 'confirm' ? 'Processing…' : '✓ Confirm Purchase'}
            </button>
            <button
              className={styles.btnCancel}
              disabled={!!loading}
              onClick={() => postAction('release')}
            >
              {loading === 'release' ? 'Cancelling…' : 'Cancel'}
            </button>
          </div>
        )}

        {expired && reservation.status === 'PENDING' && (
          <div className={styles.btnGroup}>
            <button className={styles.btnBack} onClick={() => router.push('/')}>
              ← Back to store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
