import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
} from 'motion/react';
import { Star } from 'lucide-react';

/**
 * SwipeCard — Individual draggable card in the Arena.
 *
 * Uses Framer Motion's drag API with:
 * - useMotionValue for tracking x position
 * - useTransform for rotation + overlay opacity
 * - onDragEnd for swipe detection with threshold
 */

const SWIPE_THRESHOLD = 100;
const DRAG_CONSTRAINT = 0;

const budgetLabels = {
  LOW: '💰',
  MED: '💰💰',
  HIGH: '💰💰💰',
};

export default function SwipeCard({ location, stackIndex, isTop, onSwipe }) {
  const cardRef = useRef(null);

  // Motion values
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const savorOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rejectOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  // Stack offset for cards behind
  const stackOffset = stackIndex * 8;
  const stackScale = 1 - stackIndex * 0.04;

  const handleDragEnd = (event, info) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    if (Math.abs(offsetX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 500) {
      const direction = offsetX > 0 ? 'right' : 'left';
      onSwipe(direction);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      style={{
        position: 'absolute',
        width: '100%',
        maxWidth: '360px',
        aspectRatio: '3 / 4.2',
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: stackScale,
        y: stackOffset,
        zIndex: 10 - stackIndex,
        cursor: isTop ? 'grab' : 'default',
      }}
      initial={{ scale: 0.8, opacity: 0, y: 60 }}
      animate={{
        scale: stackScale,
        opacity: 1,
        y: stackOffset,
        transition: { type: 'spring', stiffness: 300, damping: 25 },
      }}
      exit={{
        x: x.get() > 0 ? 400 : -400,
        opacity: 0,
        rotate: x.get() > 0 ? 20 : -20,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: DRAG_CONSTRAINT, right: DRAG_CONSTRAINT }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
    >
      <div
        className="card-surface"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          userSelect: 'none',
          background: 'linear-gradient(135deg, #242424 0%, #121212 100%)',
        }}
      >
        {/* ── Image Fallback Icon (centered behind the image) ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '5rem',
            opacity: 0.12,
            userSelect: 'none',
          }}
        >
          {location.category === 'Caffeine' ? '☕' : location.category === 'Vibe / Snack' ? '🍿' : '🍜'}
        </div>

        {/* ── Food Image ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${location.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* ── Gradient Overlay ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)',
          }}
        />

        {/* ── SAVOR Overlay ── */}
        {isTop && (
          <motion.div
            className="swipe-overlay swipe-overlay-savor"
            style={{ opacity: savorOpacity }}
          >
            <span
              className="swipe-overlay-text"
              style={{
                color: 'var(--color-savor)',
                border: '3px solid var(--color-savor)',
              }}
            >
              SAVOR ✓
            </span>
          </motion.div>
        )}

        {/* ── NOPE Overlay ── */}
        {isTop && (
          <motion.div
            className="swipe-overlay swipe-overlay-reject"
            style={{ opacity: rejectOpacity }}
          >
            <span
              className="swipe-overlay-text"
              style={{
                color: 'var(--color-reject)',
                border: '3px solid var(--color-reject)',
                transform: 'rotate(12deg)',
              }}
            >
              NOPE ✗
            </span>
          </motion.div>
        )}

        {/* ── Top Badges ── */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            zIndex: 5,
          }}
        >
          <span className="budget-tag">{budgetLabels[location.budget]}</span>
          <span className="rating-badge">
            <Star size={14} fill="currentColor" strokeWidth={0} />
            {location.rating}
          </span>
        </div>

        {/* ── Bottom Info ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '24px 20px',
            zIndex: 5,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              marginBottom: '4px',
            }}
          >
            {location.category}
          </span>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.25rem, 4vw, 1.625rem)',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {location.name}
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {location.distance === 'WALK'
                ? '🚶 Walking distance'
                : location.distance === 'RIDE'
                  ? '🛵 Short ride'
                  : '🌍 Worth the trip'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
