import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Navigation, RotateCcw, Star, Trophy, MapPin } from 'lucide-react';
import DesperationCard from './DesperationCard';

/**
 * Phase 3 — ResultView ("The Verdict")
 *
 * Normal path: Top 3 accepted locations with "Execute Route" buttons.
 * Desperation Protocol: Easter egg when 0 locations were accepted.
 */

const medals = ['🥇', '🥈', '🥉'];

export default function ResultView({ acceptedLocations, onRestart }) {
  const { t } = useTranslation();
  const isDesperation = acceptedLocations.length === 0;
  const topLocations = acceptedLocations.slice(0, 3);

  const handleExecuteRoute = (mapsUrl) => {
    window.open(mapsUrl, '_blank');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        paddingTop: '8px',
      }}
    >
      {/* ── Phase Label ── */}
      <motion.div variants={cardVariants} style={{ textAlign: 'center' }}>
        <span className="text-caption" style={{ color: 'var(--color-accent)' }}>
          {t('phase_execute')}
        </span>
        <h2 className="text-headline" style={{ marginTop: '6px' }}>
          {isDesperation ? t('protocol_failed') : t('verdict')}
        </h2>
        {!isDesperation && (
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--color-ink-muted)',
              marginTop: '4px',
            }}
          >
            {topLocations.length > 1 ? t('optimal_destinations') : t('optimal_destination')}
          </p>
        )}
      </motion.div>

      {/* ── Desperation Protocol ── */}
      {isDesperation && (
        <motion.div variants={cardVariants}>
          <DesperationCard />
        </motion.div>
      )}

      {/* ── Result Cards ── */}
      {!isDesperation && (
        <>
          {/* Top Pick Highlight */}
          {topLocations.length > 0 && (
            <motion.div
              variants={cardVariants}
              className="card-surface"
              style={{
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background image */}
              <div
                style={{
                  width: '100%',
                  height: '200px',
                  position: 'relative',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Fallback gradient background */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, #242424 0%, #121212 100%)',
                  }}
                />
                {/* Real photo from Google Places */}
                {topLocations[0].imageUrl && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${topLocations[0].imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
                {/* Scrim overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                  }}
                />

                {/* Trophy badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: 'var(--color-accent)',
                    borderRadius: 'var(--radius-full)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Trophy size={14} />
                  {t('top_pick')}
                </div>

                {/* Rating */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                  }}
                >
                  <span className="rating-badge">
                    <Star size={14} fill="currentColor" strokeWidth={0} />
                    {topLocations[0].rating}
                  </span>
                </div>

                {/* Name overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    right: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {topLocations[0].category}
                  </span>
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.375rem',
                      fontWeight: 800,
                      color: 'white',
                      lineHeight: 1.2,
                      marginTop: '2px',
                    }}
                  >
                    {topLocations[0].name}
                  </h3>
                </div>
              </div>

              {/* CTA */}
              <div style={{ padding: '16px' }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleExecuteRoute(topLocations[0].mapsUrl)}
                  className="btn-primary animate-pulse-glow"
                  id="btn-execute-route-1"
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                  }}
                >
                  <Navigation size={18} />
                  {t('execute_route')}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Runner-up cards */}
          {topLocations.slice(1).map((loc, index) => (
            <motion.div
              key={loc.id}
              variants={cardVariants}
              className="card-surface"
              style={{
                display: 'flex',
                overflow: 'hidden',
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: '110px',
                  minHeight: '120px',
                  position: 'relative',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Fallback gradient */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, #242424 0%, #121212 100%)',
                  }}
                />
                {/* Real photo */}
                {loc.imageUrl && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${loc.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
                {/* Medal */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    fontSize: '1.5rem',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}
                >
                  {medals[index + 1]}
                </div>
              </div>

              {/* Info */}
              <div
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {loc.category}
                  </span>
                  <h4
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--color-ink)',
                      lineHeight: 1.3,
                      marginTop: '2px',
                    }}
                  >
                    {loc.name}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--color-ink-muted)',
                      }}
                    >
                      <Star
                        size={12}
                        fill="var(--color-accent)"
                        color="var(--color-accent)"
                        strokeWidth={0}
                      />
                      {loc.rating}
                    </span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleExecuteRoute(loc.mapsUrl)}
                  id={`btn-execute-route-${index + 2}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: 'var(--color-canvas-dark)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                    cursor: 'pointer',
                    marginTop: '10px',
                  }}
                >
                  <MapPin size={14} />
                  {t('navigate')}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </>
      )}

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Restart Protocol ── */}
      <motion.div variants={cardVariants} style={{ paddingBottom: '24px' }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onRestart}
          id="btn-restart-protocol"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '16px 24px',
            background: 'transparent',
            border: '2px solid var(--color-card-border)',
            borderRadius: 'var(--radius-lg)',
            fontFamily: 'var(--font-heading)',
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'var(--color-ink-muted)',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={18} />
          {t('restart_protocol')}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};
