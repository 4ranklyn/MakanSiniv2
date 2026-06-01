import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import SwipeCard from './SwipeCard';
import { API_BASE_URL as API_URL } from '../config/api';

/**
 * Phase 2 — SwipeArena ("The Decider")
 * A card stack where users swipe right (Savor) or left (Reject).
 * Supports solo mode and multiplayer Vibe Room mode.
 */

export default function SwipeArena({ locations, token, roomId, onComplete, onRoomMatch }) {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [accepted, setAccepted] = useState([]);
  const [lastAction, setLastAction] = useState(null); // 'savor' | 'reject' | null
  const [matchData, setMatchData] = useState(null); // matched restaurant from room

  const totalCards = locations.length;
  const isFinished = currentIndex >= totalCards;

  // Safety: if 0 locations, immediately go to verdict
  useEffect(() => {
    if (totalCards === 0) {
      onComplete([]);
    }
  }, [totalCards, onComplete]);

  const handleSwipe = useCallback(
    async (direction) => {
      const currentLoc = locations[currentIndex];
      const action = direction === 'right' ? 'savor' : 'reject';
      setLastAction(action);

      const dbAction = direction === 'right' ? 'like' : 'dislike';

      // Record swipe history in Taste Vault (solo + room)
      if (token && currentLoc) {
        fetch(`${API_URL}/api/history/swipe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept-Language': i18n.language,
          },
          body: JSON.stringify({
            restaurant_id: currentLoc.id,
            restaurant_name: currentLoc.name,
            action: dbAction,
          }),
        }).catch((err) => {
          console.error('Failed to log swipe action to Taste Vault:', err);
        });
      }

      // If in a Vibe Room, also send to room swipe endpoint
      if (roomId && token && currentLoc) {
        try {
          const res = await fetch(`${API_URL}/api/rooms/swipe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Accept-Language': i18n.language,
            },
            body: JSON.stringify({
              room_id: roomId,
              restaurant_id: currentLoc.id,
              action: dbAction,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.match === true && data.restaurant) {
              // GROUP MATCH DETECTED!
              setMatchData(data.restaurant);
              if (onRoomMatch) {
                onRoomMatch(data.restaurant);
              }
              return; // Stop processing — match screen takes over
            }
          }
        } catch (err) {
          console.error('Failed to send room swipe:', err);
        }
      }

      let newAccepted = accepted;
      if (direction === 'right') {
        newAccepted = [...accepted, currentLoc];
        setAccepted(newAccepted);
      }

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // Auto-transition when stack is exhausted
      if (nextIndex >= totalCards) {
        setTimeout(() => {
          onComplete(direction === 'right' ? newAccepted : accepted);
        }, 300);
      }
    },
    [currentIndex, accepted, locations, totalCards, onComplete, token, roomId, onRoomMatch, i18n.language]
  );

  // Show remaining cards (current + up to 2 behind for deck effect)
  const visibleCards = [];
  for (let i = Math.min(currentIndex + 2, totalCards - 1); i >= currentIndex; i--) {
    if (i < totalCards) {
      visibleCards.push({ location: locations[i], stackIndex: i - currentIndex });
    }
  }

  // Match celebration overlay
  if (matchData) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          {/* Celebration emoji burst */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: '5rem' }}
          >
            🎉
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-savor))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            {t('match_title')}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize: '1.0625rem',
              color: 'var(--color-ink-muted)',
              lineHeight: 1.5,
              maxWidth: '320px',
            }}
          >
            {t('match_desc')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card-surface"
            style={{
              padding: '20px 24px',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-accent)',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              maxWidth: '340px',
              width: '100%',
            }}
          >
            {matchData.imageUrl && (
              <img
                src={matchData.imageUrl}
                alt={matchData.name}
                style={{
                  width: '100%',
                  height: '140px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}
              />
            )}
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--color-ink)',
                marginBottom: '4px',
              }}
            >
              {matchData.name}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
              {matchData.address}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                ⭐ {matchData.rating}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink-muted)' }}>
                📍 {matchData.distance?.toFixed(1)}km
              </span>
            </div>
            {matchData.mapsUrl && (
              <a
                href={matchData.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: '16px',
                  padding: '10px 24px',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  transition: 'transform 0.2s',
                }}
              >
                {t('open_google_maps')}
              </a>
            )}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '8px',
      }}
    >
      {/* ── Room Banner ── */}
      {roomId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            padding: '10px 16px',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, rgba(255,107,53,0.1), rgba(255,107,53,0.05))',
            borderRadius: '12px',
            border: '1px solid rgba(255,107,53,0.2)',
          }}
        >
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-accent)' }}>
            🏠 {t('vibe_room_banner', { roomId })}
          </span>
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
            {t('vibe_room_desc')}
          </p>
        </motion.div>
      )}

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        <span className="text-caption" style={{ color: 'var(--color-accent)' }}>
          {t('phase_decide')}
        </span>
        <h2
          className="text-headline"
          style={{ marginTop: '4px', fontSize: 'clamp(1.25rem, 3.5vw, 1.5rem)' }}
        >
          {t('swipe_arena')}
        </h2>
      </motion.div>

      {/* ── Progress Bar ── */}
      <div
        style={{
          width: '100%',
          height: '4px',
          background: 'var(--color-canvas-dark)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          marginBottom: '8px',
        }}
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${(currentIndex / totalCards) * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          style={{
            height: '100%',
            background: 'var(--color-accent)',
            borderRadius: 'var(--radius-full)',
          }}
        />
      </div>

      {/* ── Counter ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '0 4px',
        }}
      >
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-ink-muted)',
          }}
        >
          {Math.min(currentIndex + 1, totalCards)}/{totalCards}
        </span>

        <AnimatePresence mode="wait">
          {lastAction && (
            <motion.span
              key={`${lastAction}-${currentIndex}`}
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color:
                  lastAction === 'savor'
                    ? 'var(--color-savor)'
                    : 'var(--color-reject)',
              }}
            >
              {lastAction === 'savor' ? t('savored') : t('rejected')}
            </motion.span>
          )}
        </AnimatePresence>

        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-savor)',
          }}
        >
          {t('saved_count', { count: accepted.length })}
        </span>
      </div>

      {/* ── Card Stack ── */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <AnimatePresence>
          {!isFinished &&
            visibleCards.map(({ location, stackIndex }) => (
              <SwipeCard
                key={location.id}
                location={location}
                stackIndex={stackIndex}
                isTop={stackIndex === 0}
                onSwipe={handleSwipe}
              />
            ))}
        </AnimatePresence>

        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: 'center',
              padding: '40px 20px',
            }}
          >
            <span style={{ fontSize: '3rem' }}>🎯</span>
            <p
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '1.125rem',
                color: 'var(--color-ink)',
                marginTop: '12px',
              }}
            >
              {t('processing_verdict')}
            </p>
          </motion.div>
        )}
      </div>

      {/* ── Swipe Hints ── */}
      {!isFinished && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '16px 20px 20px',
          }}
        >
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-reject)',
              opacity: 0.7,
            }}
          >
            {t('reject_hint')}
          </span>
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-ink-subtle)',
            }}
          >
            {t('drag_hint')}
          </span>
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-savor)',
              opacity: 0.7,
            }}
          >
            {t('savor_hint')}
          </span>
        </motion.div>
      )}
    </div>
  );
}
