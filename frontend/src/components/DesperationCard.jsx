import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShoppingCart } from 'lucide-react';

/**
 * DesperationCard — The "Desperation Protocol" Easter Egg
 *
 * Shown when the user rejects ALL cards in the SwipeArena.
 * Features a glitchy/shake animation and a humorous fallback.
 */

export default function DesperationCard() {
  const { t } = useTranslation();

  const handleFindMinimarket = () => {
    window.open(
      'https://www.google.com/maps/search/?api=1&query=Indomaret+near+me',
      '_blank'
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="card-surface"
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        border: '2px dashed var(--color-reject)',
      }}
    >
      {/* ── Glitch Background ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(239, 68, 68, 0.03) 2px, rgba(239, 68, 68, 0.03) 4px)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Warning Icon ── */}
      <motion.div
        animate={{
          rotate: [0, -5, 5, -5, 5, 0],
          scale: [1, 1.05, 1, 1.05, 1],
        }}
        transition={{
          duration: 0.6,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatDelay: 3,
        }}
        style={{ marginBottom: '20px' }}
      >
        <AlertTriangle
          size={56}
          color="var(--color-reject)"
          strokeWidth={1.5}
        />
      </motion.div>

      {/* ── Status Badge ── */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 'auto' }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 16px',
          background: 'var(--color-reject-bg)',
          borderRadius: 'var(--radius-full)',
          color: 'var(--color-reject)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '16px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {t('protocol_failure')}
      </motion.div>

      {/* ── Title ── */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-title"
        style={{
          color: 'var(--color-ink)',
          marginBottom: '12px',
          lineHeight: 1.3,
        }}
      >
        {t('decision_paralysis')}
      </motion.h3>

      {/* ── Description ── */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          fontSize: '0.9375rem',
          color: 'var(--color-ink-muted)',
          lineHeight: 1.6,
          marginBottom: '28px',
          maxWidth: '300px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {t('desperation_desc')}
      </motion.p>

      {/* ── Noodle Emoji ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 15 }}
        style={{ fontSize: '4rem', marginBottom: '24px' }}
      >
        🍜
      </motion.div>

      {/* ── CTA ── */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleFindMinimarket}
        id="btn-find-minimarket"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '16px 28px',
          background: 'var(--color-reject)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          fontFamily: 'var(--font-heading)',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <ShoppingCart size={20} />
        {t('find_nearest_minimarket')}
      </motion.button>
    </motion.div>
  );
}
