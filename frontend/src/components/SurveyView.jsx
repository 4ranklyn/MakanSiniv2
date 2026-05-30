import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Zap,
  MapPin,
  Users,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

/**
 * Phase 1 — SurveyView ("Initialize")
 * Natural craving textarea + dual-mode CTA (Solo / Vibe Room) + Join Room option.
 */

/* ── Animation variants ── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  },
};

const chipVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
};

export default function SurveyView({ onSurveyComplete, onCreateRoom, onJoinRoom }) {
  const { t } = useTranslation();
  const [isLocating, setIsLocating] = useState(false);
  const [craving, setCraving] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState(null);
  const [maxDistance, setMaxDistance] = useState(10); // Default 10km
  const [priceLevels, setPriceLevels] = useState([]); // Default empty (All prices)

  const isComplete = craving.trim() !== '';

  const handleSoloSubmit = () => {
    if (!isComplete || isLocating) return;
    setIsLocating(true);
    if (onSurveyComplete) {
      onSurveyComplete({
        craving,
        max_distance: maxDistance,
        price_levels: priceLevels,
      });
    }
    setTimeout(() => setIsLocating(false), 5000);
  };

  const handleCreateRoom = () => {
    if (!isComplete || isLocating) return;
    setIsLocating(true);
    if (onCreateRoom) {
      onCreateRoom({
        craving,
        max_distance: maxDistance,
        price_levels: priceLevels,
      });
    }
    setTimeout(() => setIsLocating(false), 5000);
  };

  const handleJoinRoom = () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length === 0) {
      setJoinError(t('enter_room_code_error'));
      return;
    }
    setJoinError(null);
    setIsLocating(true);
    if (onJoinRoom) {
      onJoinRoom(code);
    }
    setTimeout(() => setIsLocating(false), 5000);
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
        gap: '24px',
        paddingTop: '16px',
      }}
    >
      {/* ── Phase Label ── */}
      <motion.div variants={itemVariants} style={{ textAlign: 'center' }}>
        <span className="text-caption" style={{ color: 'var(--color-accent)' }}>
          {t('phase_initialize')}
        </span>
        <h2
          className="text-headline"
          style={{ marginTop: '6px', color: 'var(--color-ink)' }}
        >
          {t('craving_title')}
        </h2>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--color-ink-muted)',
            marginTop: '4px',
          }}
        >
          {t('craving_subtitle')}
        </p>
      </motion.div>

      {/* ── Natural Craving Input ── */}
      <motion.div variants={itemVariants}>
        <div style={{ marginBottom: '12px' }}>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--color-ink)',
              marginBottom: '2px',
            }}
          >
            {t('sustenance_vector')}
          </h3>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-ink-muted)',
            }}
          >
            {t('sustenance_desc')}
          </p>
        </div>

        <motion.div variants={chipVariants} style={{ width: '100%' }}>
          <textarea
            value={craving}
            onChange={(e) => setCraving(e.target.value)}
            placeholder={t('craving_placeholder')}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '16px',
              borderRadius: '12px',
              border: '2px solid var(--color-card-border)',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(8px)',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-accent)';
              e.target.style.boxShadow = '0 0 0 3px var(--color-accent-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-card-border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </motion.div>
      </motion.div>

      {/* ── Spatial & Budget Constraints (Hybrid Controls) ── */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginTop: '4px',
        }}
      >
        {/* Radius Option Selector */}
        <div>
          <div style={{ marginBottom: '8px' }}>
            <h4
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--color-ink)',
                marginBottom: '2px',
              }}
            >
              {t('search_radius')}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
              {t('radius_desc')}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[2, 5, 10, 15].map((distance) => {
              const isActive = maxDistance === distance;
              return (
                <button
                  key={distance}
                  type="button"
                  onClick={() => setMaxDistance(distance)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid ' + (isActive ? 'var(--color-accent)' : 'var(--color-card-border)'),
                    background: isActive ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.03)',
                    color: isActive ? '#fff' : 'var(--color-ink)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  {t('max_distance', { distance })}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget Selector */}
        <div>
          <div style={{ marginBottom: '8px' }}>
            <h4
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--color-ink)',
                marginBottom: '2px',
              }}
            >
              {t('budget_target')}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
              {t('budget_desc')}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: '$', desc: t('budget_murah'), value: 1 },
                { label: '$$', desc: t('budget_sedang'), value: 2 },
                { label: '$$$', desc: t('budget_mewah'), value: 3 },
              ].map((tier) => {
                const isActive = priceLevels.includes(tier.value);
                return (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => {
                      if (priceLevels.includes(tier.value)) {
                        setPriceLevels(priceLevels.filter((v) => v !== tier.value));
                      } else {
                        setPriceLevels([...priceLevels, tier.value]);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-sm)',
                      border: '2px solid ' + (isActive ? 'var(--color-accent)' : 'var(--color-card-border)'),
                      background: isActive ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.03)',
                      color: isActive ? '#fff' : 'var(--color-ink)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={tier.desc}
                  >
                    <span>{tier.label}</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 500, opacity: 0.8 }}>
                      {tier.desc}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Quick Helper / Reset indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-subtle)' }}>
                {priceLevels.length === 0 ? t('all_prices') : t('selected_prices', { count: priceLevels.length })}
              </span>
              {priceLevels.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPriceLevels([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-accent)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {t('reset')}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Dual-Mode CTA Buttons ── */}
      <motion.div
        variants={itemVariants}
        style={{ paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {/* Solo Button */}
        <motion.button
          type="button"
          className={`btn-primary ${isComplete ? 'animate-pulse-glow' : ''}`}
          disabled={!isComplete || isLocating}
          whileTap={isComplete ? { scale: 0.96 } : {}}
          onClick={handleSoloSubmit}
          id="btn-solo-mode"
          style={{
            width: '100%',
            fontSize: '1.0625rem',
            padding: '18px 32px',
          }}
        >
          {isLocating ? (
            <>
              <MapPin size={20} className="animate-float" />
              {t('locating')}
            </>
          ) : (
            <>
              <Zap size={20} />
              🍜 {t('dine_solo')}
            </>
          )}
        </motion.button>

        {/* Vibe Room Button */}
        <motion.button
          type="button"
          disabled={!isComplete || isLocating}
          whileTap={isComplete ? { scale: 0.96 } : {}}
          onClick={handleCreateRoom}
          id="btn-vibe-room"
          style={{
            width: '100%',
            fontSize: '1rem',
            padding: '16px 32px',
            border: '2px solid var(--color-accent)',
            borderRadius: 'var(--radius-lg)',
            background: 'transparent',
            color: isComplete ? 'var(--color-accent)' : 'var(--color-ink-subtle)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            cursor: isComplete ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            opacity: isComplete ? 1 : 0.5,
          }}
        >
          <Users size={20} />
          👥 {t('vibe_room')}
        </motion.button>

        {/* Join Room Toggle */}
        <motion.div
          style={{ textAlign: 'center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            type="button"
            onClick={() => setShowJoinInput(!showJoinInput)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-ink-muted)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              padding: '4px 8px',
            }}
          >
            <KeyRound size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            {showJoinInput ? t('hide') : t('have_room_code')}
          </button>
        </motion.div>

        {/* Join Room Input */}
        <AnimatePresence>
          {showJoinInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '4px 0',
                }}
              >
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  placeholder={t('enter_room_code')}
                  maxLength={6}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: joinError ? '2px solid var(--color-reject)' : '2px solid var(--color-card-border)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'var(--color-ink)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textAlign: 'center',
                    outline: 'none',
                    textTransform: 'uppercase',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    if (!joinError) e.target.style.borderColor = 'var(--color-accent)';
                  }}
                  onBlur={(e) => {
                    if (!joinError) e.target.style.borderColor = 'var(--color-card-border)';
                  }}
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleJoinRoom}
                  disabled={isLocating || roomCode.trim().length === 0}
                  style={{
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: roomCode.trim().length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: roomCode.trim().length > 0 ? 1 : 0.5,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <ArrowRight size={18} />
                  {t('join')}
                </motion.button>
              </div>
              {joinError && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-reject)', fontWeight: 600, marginTop: '4px', textAlign: 'center' }}>
                  {joinError}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isComplete && !showJoinInput && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              fontSize: '0.8125rem',
              color: 'var(--color-ink-subtle)',
              marginTop: '2px',
            }}
          >
            {t('unlock_message')}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
