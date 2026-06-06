import { useEffect, useState } from 'react';
import styles from './ReservationTimer.module.css';

interface Props {
  expiresAt: string;
  onExpire?: () => void;
}

export default function ReservationTimer({ expiresAt, onExpire }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire?.();
      return;
    }

    const tick = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(tick);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isWarning = secondsLeft > 0 && secondsLeft <= 120;
  const isExpired = secondsLeft === 0;

  return (
    <div
      className={[
        styles.timer,
        isWarning ? styles.warning : '',
        isExpired ? styles.expired : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.label}>
        {isExpired ? '⛔ERROR 410 : Reservation Expired' : '⏱ Time remaining to complete checkout'}
      </div>
      {!isExpired && (
        <div className={styles.display}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      )}
      {isExpired && (
        <p className={styles.expiredMsg}>
          Your hold has been released. Please go back and start a new reservation.
        </p>
      )}
    </div>
  );
}
