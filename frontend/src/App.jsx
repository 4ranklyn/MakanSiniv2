import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL as API_URL } from './config/api';
import SurveyView from './components/SurveyView';
import SwipeArena from './components/SwipeArena';
import ResultView from './components/ResultView';
import { DEFAULT_LOCATION } from './utils/haversine';
import CommunityView from './components/CommunityView';
import { Compass, MessageSquare } from 'lucide-react';

/**
 * MakanSini — The Hunger Protocol
 *
 * State Machine:
 *   SURVEY  → user sets filters, clicks "Generate Options"
 *   ARENA   → user swipes through 10 cards
 *   VERDICT → top matches displayed (or Desperation Protocol)
 */

/* ── Page transition variants ── */
const pageVariants = {
  initial: { opacity: 0, y: 40, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.96,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

export default function App() {
  const { t, i18n } = useTranslation();

  /* ── Global State ── */
  const [token] = useState(() => localStorage.getItem('makansini_token') || 'mock_token');
  const [, setUser] = useState(() => {
    const saved = localStorage.getItem('makansini_user');
    return saved ? JSON.parse(saved) : {
      id: 'mock_user_123',
      name: 'Guest User',
      pictureUrl: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
      email: 'guest@makansini.com'
    };
  });
  const [appState, setAppState] = useState('SURVEY');
  const [currentTab, setCurrentTab] = useState('discover'); // 'discover' | 'community'
  const [, setUserFilters] = useState({
    budget: null,
    distance: null,
    mood: null,
  });
  const [, setUserLocation] = useState({ lat: null, lng: null });
  const [locations, setLocations] = useState([]);

  /* ── Vibe Room State ── */
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [, setRoomMatch] = useState(null);

  const [acceptedLocations, setAcceptedLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  /* ── Helper Classifiers for Backend Locations ── */
  const classifyBudget = (name) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('hotel') || lowercaseName.includes('cafe') || lowercaseName.includes('steak') || lowercaseName.includes('resto') || lowercaseName.includes('lounge') || lowercaseName.includes('bistro')) {
      return 'HIGH';
    }
    if (lowercaseName.includes('warung') || lowercaseName.includes('angkringan') || lowercaseName.includes('es teh') || lowercaseName.includes('geprek') || lowercaseName.includes('kantin') || lowercaseName.includes('pujasera')) {
      return 'LOW';
    }
    return 'MED';
  };

  const classifyCategory = (name) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('kopi') || lowercaseName.includes('coffee') || lowercaseName.includes('teh') || lowercaseName.includes('es ') || lowercaseName.includes('juice') || lowercaseName.includes('drink') || lowercaseName.includes('cafe')) {
      return 'Caffeine';
    }
    if (lowercaseName.includes('snack') || lowercaseName.includes('roti') || lowercaseName.includes('martabak') || lowercaseName.includes('cemilan') || lowercaseName.includes('gorengan') || lowercaseName.includes('pisang') || lowercaseName.includes('donut') || lowercaseName.includes('angkringan') || lowercaseName.includes('serabi') || lowercaseName.includes('bakso') || lowercaseName.includes('soto')) {
      return 'Vibe / Snack';
    }
    return 'Heavy Meal';
  };

  /* ── Helper: map backend data to frontend representation ── */
  const mapBackendLocations = (data) => {
    return (data || []).map((loc) => {
      const cat = classifyCategory(loc.name);
      const budg = classifyBudget(loc.name);
      const distTag = loc.distance <= 1.5 ? 'WALK' : (loc.distance <= 5.0 ? 'RIDE' : 'GLOBAL');
      return {
        id: loc.id,
        name: loc.name,
        rating: loc.rating,
        distance: distTag,
        distanceKm: loc.distance,
        address: loc.address,
        lat: loc.latitude,
        lng: loc.longitude,
        mapsUrl: loc.mapsUrl,
        category: cat,
        budget: budg,
        imageUrl: loc.imageUrl || '',
      };
    });
  };

  /* ── Helper: get user location as a promise ── */
  const getUserLocation = () => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(DEFAULT_LOCATION),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      } else {
        resolve(DEFAULT_LOCATION);
      }
    });
  };

  /* ── Phase 1 → 2 transition (Solo Mode) ── */
  const handleSurveyComplete = useCallback(({ craving, max_distance, price_levels }) => {
    setIsLoading(true);
    setCurrentRoomId(null);
    setUserFilters((prev) => ({ ...prev, mood: craving }));

    const proceed = async (lat, lng) => {
      setUserLocation({ lat, lng });
      try {
        const headers = { 
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/api/recommendations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            craving,
            max_distance,
            price_levels,
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch recommendations');
        const data = await response.json();
        const finalChoices = mapBackendLocations(data).slice(0, 10);

        if (finalChoices.length === 0) console.warn('No restaurants found');

        setLocations(finalChoices);
        setAcceptedLocations([]);
        setAppState('ARENA');
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setLocations([]);
        alert(t('error_fetching'));
      } finally {
        setIsLoading(false);
      }
    };

    getUserLocation().then(({ lat, lng }) => proceed(lat, lng));
  }, [token, i18n.language]);

  /* ── Create Vibe Room ── */
  const handleCreateRoom = useCallback(async ({ craving, max_distance, price_levels }) => {
    setIsLoading(true);
    try {
      const { lat, lng } = await getUserLocation();
      setUserLocation({ lat, lng });

      const response = await fetch(`${API_URL}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept-Language': i18n.language,
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          craving,
          max_distance,
          price_levels,
        }),
      });

      if (!response.ok) throw new Error('Failed to create room');
      const data = await response.json();

      const finalChoices = mapBackendLocations(data.restaurants).slice(0, 10);
      setCurrentRoomId(data.room_id);
      setLocations(finalChoices);
      setAcceptedLocations([]);
      setRoomMatch(null);
      setAppState('ARENA');
    } catch (err) {
      console.error('Error creating room:', err);
      alert(t('error_creating_room'));
    } finally {
      setIsLoading(false);
    }
  }, [token, i18n.language]);

  /* ── Join Vibe Room ── */
  const handleJoinRoom = useCallback(async (roomCode) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept-Language': i18n.language,
        },
        body: JSON.stringify({ room_id: roomCode }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Room not found');
      }
      const data = await response.json();

      const finalChoices = mapBackendLocations(data.restaurants).slice(0, 10);
      setCurrentRoomId(data.room_id);
      setLocations(finalChoices);
      setAcceptedLocations([]);
      setRoomMatch(null);
      setAppState('ARENA');
    } catch (err) {
      console.error('Error joining room:', err);
      alert(t('error_joining_room', { message: err.message }));
    } finally {
      setIsLoading(false);
    }
  }, [token, i18n.language]);

  /* ── Room Match Handler ── */
  const handleRoomMatch = useCallback((restaurant) => {
    setRoomMatch(restaurant);
  }, []);

  /* ── Arena → Verdict ── */
  const handleArenaComplete = useCallback((accepted) => {
    let finalized = [...accepted];
    if (finalized.length < 3) {
      const acceptedIds = new Set(finalized.map((loc) => loc.id));
      const remaining = locations.filter((loc) => !acceptedIds.has(loc.id));
      // Sort remaining by rating descending
      remaining.sort((a, b) => b.rating - a.rating);
      for (const loc of remaining) {
        if (finalized.length >= 3) break;
        finalized.push(loc);
      }
    }
    // Limit to exactly 3
    finalized = finalized.slice(0, 3);
    setAcceptedLocations(finalized);
    setAppState('VERDICT');
  }, [locations]);

  /* ── Restart Protocol ── */
  const handleRestart = useCallback(() => {
    setAppState('SURVEY');
    setUserFilters({ budget: null, distance: null, mood: null });
    setUserLocation({ lat: null, lng: null });
    setLocations([]);
    setAcceptedLocations([]);
    setCurrentRoomId(null);
    setRoomMatch(null);
  }, []);

  const handleLanguageToggle = () => {
    const nextLang = i18n.language === 'id' ? 'en' : 'id';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('makansini_lang', nextLang);
  };

  return (
    <div className="page-container">
      {/* ── Brand Header ── */}
      <header 
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '16px 20px 8px',
          position: 'relative'
        }}
      >
        <div style={{ textAlign: 'center', flex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                margin: 0,
              }}
            >
              🍜 Makan<span style={{ color: 'var(--color-accent)' }}>Sini</span>
            </h1>
            <p
              style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-muted)',
                marginTop: '1px',
                marginBottom: 0
              }}
            >
              The Hunger Protocol
            </p>
          </motion.div>
        </div>

        {/* ── Elegant Language Toggle ── */}
        <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
          <button
            onClick={handleLanguageToggle}
            style={{
              background: 'var(--color-glass)',
              border: '1px solid var(--color-glass-border)',
              borderRadius: '20px',
              padding: '6px 12px',
              color: 'var(--color-ink)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: 'var(--shadow-elevated)',
            }}
          >
            {i18n.language === 'id' ? '🇮🇩 ID | 🇬🇧 EN' : '🇬🇧 EN | 🇮🇩 ID'}
          </button>
        </div>
      </header>

      {/* ── Phase Router ── */}
      <main style={{ flex: 1, display: 'flex', zIndex: 1, flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {currentTab === 'community' ? (
            <motion.div
              key="community"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <CommunityView likedRestaurants={locations} />
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '40px 20px',
              }}
            >
              <div 
                style={{ 
                  position: 'relative', 
                  width: '64px', 
                  height: '64px',
                  marginBottom: '16px'
                }}
              >
                <div 
                  style={{ 
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '4px solid var(--color-accent-glow)',
                  }}
                />
                <motion.div 
                  style={{ 
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '4px solid var(--color-accent)',
                    borderTopColor: 'transparent',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <motion.h3
                className="text-title"
                style={{ color: 'var(--color-ink)', marginTop: '8px' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {t('loading_title')}
              </motion.h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                {t('loading_desc')}
              </p>
            </motion.div>
          ) : appState === 'SURVEY' ? (
            <motion.div
              key="survey"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <SurveyView
                onSurveyComplete={handleSurveyComplete}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
              />
            </motion.div>
          ) : appState === 'ARENA' ? (
            <motion.div
              key="arena"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <SwipeArena
                locations={locations}
                token={token}
                roomId={currentRoomId}
                onComplete={handleArenaComplete}
                onRoomMatch={handleRoomMatch}
              />
            </motion.div>
          ) : appState === 'VERDICT' ? (
            <motion.div
              key="verdict"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <ResultView
                acceptedLocations={acceptedLocations}
                onRestart={handleRestart}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* ── Floating Navigation Tab Bar ── */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 40px)',
          maxWidth: '440px',
          height: '60px',
          background: 'var(--color-glass)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--color-glass-border)',
          borderRadius: '30px',
          boxShadow: 'var(--shadow-elevated)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 10px',
          zIndex: 100,
        }}
      >
        {[
          { id: 'discover', label: t('swipe_arena'), icon: Compass },
          { id: 'community', label: t('community_feed'), icon: MessageSquare },
        ].map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '20px',
                border: 'none',
                background: isActive ? 'var(--color-accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--color-ink-muted)',
                cursor: 'pointer',
                transition: 'all 0.25s var(--ease-spring)',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
