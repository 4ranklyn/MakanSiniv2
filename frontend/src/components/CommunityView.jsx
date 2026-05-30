import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Send,
  MapPin,
  Tag,
  Clock,
  User,
  Heart,
  Smile,
  Compass,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { API_BASE_URL as API_URL } from '../config/api';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 25 },
  },
};

export default function CommunityView({ likedRestaurants = [] }) {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Trends State
  const [trendsData, setTrendsData] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [trendsError, setTrendsError] = useState(false);

  // Post Form State
  const [reviewText, setReviewText] = useState('');
  const [userName, setUserName] = useState(() => localStorage.getItem('makansini_handle') || '');
  const [selectedRestId, setSelectedRestId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Active Comment Post ID
  const [activePostId, setActivePostId] = useState(null);
  
  // Comments state maps postId -> comments array
  const [commentsMap, setCommentsMap] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});

  // Comment Form state
  const [commentText, setCommentText] = useState('');
  const [commentUserName, setCommentUserName] = useState(() => localStorage.getItem('makansini_handle') || '');
  const [commentError, setCommentError] = useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fetch timeline feed
  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/community/posts`, {
        headers: {
          'Accept-Language': i18n.language,
        }
      });
      if (!res.ok) throw new Error('Gagal mengambil data feed timeline.');
      const data = await res.json();
      setPosts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI trend analysis
  const fetchTrends = async () => {
    setTrendsLoading(true);
    setTrendsError(false);
    try {
      const res = await fetch(`${API_URL}/api/community/trends?lang=${i18n.language}`, {
        headers: {
          'Accept-Language': i18n.language,
        }
      });
      if (!res.ok) throw new Error('Gagal memuat tren.');
      const data = await res.json();
      setTrendsData(data);
    } catch (err) {
      console.error('Trends fetch error:', err);
      setTrendsError(true);
    } finally {
      setTrendsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
    fetchTrends();
  }, [i18n.language]); // Refetch trends when language changes

  // Fetch comments for a specific post
  const fetchComments = async (postId) => {
    setCommentsLoading(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`${API_URL}/api/community/posts/${postId}/comments`, {
        headers: {
          'Accept-Language': i18n.language,
        }
      });
      if (!res.ok) throw new Error('Gagal memuat diskusi.');
      const data = await res.json();
      setCommentsMap(prev => ({ ...prev, [postId]: data || [] }));
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleToggleDiscussion = (postId) => {
    if (activePostId === postId) {
      setActivePostId(null);
    } else {
      setActivePostId(postId);
      fetchComments(postId);
    }
  };

  // Submit new review post
  const handlePublishPost = async (e) => {
    e.preventDefault();
    setFormError(null);

    const txt = reviewText.trim();
    const handle = userName.trim();
    if (!txt || !handle) {
      setFormError(t('form_error_required'));
      return;
    }

    setIsSubmitting(true);
    // Find restaurant name if tagged
    let restaurantName = '';
    const selectedRest = likedRestaurants.find(r => r.id === selectedRestId);
    if (selectedRest) {
      restaurantName = selectedRest.name;
    }

    try {
      const res = await fetch(`${API_URL}/api/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
        },
        body: JSON.stringify({
          user_name: handle.startsWith('@') ? handle : `@${handle}`,
          review_text: txt,
          restaurant_id: selectedRestId || undefined,
          restaurant_name: restaurantName || undefined
        })
      });

      if (!res.ok) throw new Error('Gagal memposting ulasan.');
      const newPost = await res.json();
      
      // Save handle name
      localStorage.setItem('makansini_handle', handle);
      setCommentUserName(handle);

      // Prepend new post
      setPosts(prev => [newPost, ...prev]);
      setReviewText('');
      setSelectedRestId('');
    } catch (err) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit comment
  const handlePublishComment = async (e, postId) => {
    e.preventDefault();
    setCommentError(null);

    const txt = commentText.trim();
    const handle = commentUserName.trim();
    if (!txt || !handle) {
      setCommentError(t('comment_error_required'));
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
        },
        body: JSON.stringify({
          user_name: handle.startsWith('@') ? handle : `@${handle}`,
          comment_text: txt
        })
      });

      if (!res.ok) throw new Error('Gagal mengirimkan komentar.');
      const newComment = await res.json();

      // Save handle name
      localStorage.setItem('makansini_handle', handle);
      setUserName(handle);

      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));
      setCommentText('');
    } catch (err) {
      setCommentError(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Helper to format time relative
  const formatTime = (timeStr) => {
    try {
      const d = new Date(timeStr);
      const diffMs = new Date() - d;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return t('just_now');
      if (diffMins < 60) return t('minutes_ago', { count: diffMins });
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return t('hours_ago', { count: diffHours });
      return d.toLocaleDateString(i18n.language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
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
        paddingBottom: '80px', // padding for bottom nav tab bar
      }}
    >
      {/* ── Heading ── */}
      <div style={{ textAlign: 'center' }}>
        <span className="text-caption" style={{ color: 'var(--color-accent)' }}>
          {t('taste_timeline')}
        </span>
        <h2 className="text-headline" style={{ marginTop: '4px', color: 'var(--color-ink)' }}>
          {t('community_feed')}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
          {t('community_desc')}
        </p>
      </div>

      {/* ── AI Insights: Tren Kuliner Lokal ── */}
      <motion.div
        variants={cardVariants}
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: '2px',
          background: 'linear-gradient(135deg, rgba(255,175,64,0.5), rgba(255,107,107,0.4), rgba(168,85,247,0.5), rgba(59,130,246,0.4))',
          backgroundSize: '300% 300%',
          animation: 'shimmer-gradient 6s ease-in-out infinite',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: 'var(--color-glass, rgba(255,255,255,0.85))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 'calc(var(--radius-lg, 16px) - 2px)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Widget Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #FFB347, #FF6B6B, #A855F7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={14} color="#fff" />
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                {t('ai_insights')}
              </span>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: 'var(--color-ink-muted)',
                  marginLeft: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t('local_trends')}
              </span>
            </div>
          </div>

          {/* Content */}
          {trendsLoading ? (
            /* Skeleton Loader */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  height: '12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer-skeleton 1.5s ease-in-out infinite',
                  width: '100%',
                }}
              />
              <div
                style={{
                  height: '12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer-skeleton 1.5s ease-in-out infinite',
                  width: '75%',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    style={{
                      height: '24px',
                      width: '60px',
                      borderRadius: '12px',
                      background: 'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer-skeleton 1.5s ease-in-out infinite',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : trendsError || !trendsData ? (
            /* Fallback State */
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={14} style={{ color: 'var(--color-ink-subtle)', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', lineHeight: 1.4, margin: 0 }}>
                {t('loading_trends')}
              </p>
            </div>
          ) : (
            /* Live Trend Data */
            <>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-ink)',
                  lineHeight: 1.5,
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {trendsData.summary}
              </p>

              {/* Tag Pills */}
              {trendsData.tags && trendsData.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                  {trendsData.tags.map((tag, idx) => (
                    <motion.span
                      key={tag + idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        background: [
                          'linear-gradient(135deg, rgba(255,175,64,0.15), rgba(255,107,107,0.15))',
                          'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.15))',
                          'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))',
                          'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.15))',
                          'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))',
                        ][idx % 5],
                        color: [
                          '#D97706',
                          '#7C3AED',
                          '#059669',
                          '#DB2777',
                          '#DC2626',
                        ][idx % 5],
                        border: '1px solid ' + [
                          'rgba(255,175,64,0.25)',
                          'rgba(168,85,247,0.25)',
                          'rgba(16,185,129,0.25)',
                          'rgba(236,72,153,0.25)',
                          'rgba(245,158,11,0.25)',
                        ][idx % 5],
                      }}
                    >
                      <TrendingUp size={10} />
                      #{tag}
                    </motion.span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Shimmer keyframe animations injected via style tag */}
      <style>{`
        @keyframes shimmer-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer-skeleton {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* ── Share Review Form ── */}
      <motion.div variants={cardVariants} className="card-surface glass-card" style={{ padding: '20px' }}>
        <form onSubmit={handlePublishPost} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              {t('write_review')}
            </span>
          </div>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder={t('review_placeholder')}
            required
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-glass-border)',
              background: 'rgba(0,0,0,0.02)',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Handle Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink-muted)' }}>
                {t('pseudonym')}
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g., SotoHunter"
                required
                maxLength={20}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-glass-border)',
                  background: 'rgba(0,0,0,0.02)',
                  color: 'var(--color-ink)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Tag Restaurant Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink-muted)' }}>
                {t('tag_location')}
              </label>
              <select
                value={selectedRestId}
                onChange={(e) => setSelectedRestId(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-glass-border)',
                  background: 'var(--color-canvas)',
                  color: 'var(--color-ink)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  height: '38px',
                }}
              >
                <option value="">{t('select_place')}</option>
                {likedRestaurants.map((rest) => (
                  <option key={rest.id} value={rest.id}>
                    {rest.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-reject)', fontWeight: 600 }}>
              {formError}
            </p>
          )}

          <motion.button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || reviewText.trim() === '' || userName.trim() === ''}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '12px',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-md)',
              alignSelf: 'flex-end',
            }}
          >
            <Send size={14} />
            {t('share_post')}
          </motion.button>
        </form>
      </motion.div>

      {/* ── Feed Section ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ paddingLeft: '4px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-ink)' }}>
            {t('recent_timeline')}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
              {t('loading_feed')}
            </span>
          </div>
        ) : posts.length === 0 ? (
          <div className="card-surface" style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.01)' }}>
            <Compass size={32} style={{ color: 'var(--color-ink-subtle)', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink-muted)' }}>
              {t('no_feed_posts')}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-subtle)', marginTop: '4px' }}>
              {t('no_feed_posts_desc')}
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const isDiscussionOpen = activePostId === post.id;
            const comments = commentsMap[post.id] || [];
            
            return (
              <motion.div
                key={post.id}
                variants={cardVariants}
                className="card-surface"
                style={{
                  background: 'var(--color-card-bg)',
                  border: '1px solid var(--color-card-border)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Post Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--color-accent-glow)',
                        color: 'var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                      }}
                    >
                      <User size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                        {post.userName}
                      </p>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--color-ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} />
                        {formatTime(post.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <div style={{ fontSize: '0.875rem', color: 'var(--color-ink)', lineHeight: 1.5 }}>
                  {post.reviewText}
                </div>

                {/* Tagged Restaurant */}
                {post.restaurantName && (
                  <div style={{ alignSelf: 'flex-start' }}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(post.restaurantName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chip-toggle"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--color-accent-glow)',
                        background: 'var(--color-canvas)',
                        color: 'var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'none',
                      }}
                    >
                      <MapPin size={12} />
                      <span>Tag: <strong>{post.restaurantName}</strong></span>
                    </a>
                  </div>
                )}

                <div style={{ height: '1px', background: 'var(--color-card-border)', margin: '4px 0' }} />

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleDiscussion(post.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isDiscussionOpen ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isDiscussionOpen ? 'var(--color-accent-glow)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>{t('discussion', { count: commentsMap[post.id] ? commentsMap[post.id].length : 0 })}</span>
                  </button>
                </div>

                {/* Discussion Comment Box */}
                <AnimatePresence>
                  {isDiscussionOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          background: 'var(--color-canvas)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          marginTop: '8px',
                          border: '1px solid var(--color-card-border)',
                        }}
                      >
                        {/* List Comments */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>
                            {t('discussion_room')}
                          </span>

                          {commentsLoading[post.id] && comments.length === 0 ? (
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-subtle)', textAlign: 'center' }}>
                              {t('loading_comments')}
                            </p>
                          ) : comments.length === 0 ? (
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-subtle)', textAlign: 'center', padding: '8px 0' }}>
                              {t('no_comments')}
                            </p>
                          ) : (
                            comments.map((comm) => (
                              <div
                                key={comm.id}
                                style={{
                                  background: 'var(--color-card-bg)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '8px 12px',
                                  border: '1px solid var(--color-card-border)',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                                    {comm.userName}
                                  </span>
                                  <span style={{ fontSize: '0.625rem', color: 'var(--color-ink-subtle)' }}>
                                    {formatTime(comm.createdAt)}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-ink)', lineHeight: 1.4 }}>
                                  {comm.commentText}
                                </p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Comment Input */}
                        <form
                          onSubmit={(e) => handlePublishComment(e, post.id)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            borderTop: '1px solid var(--color-card-border)',
                            paddingTop: '10px',
                          }}
                        >
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={t('comment_placeholder')}
                            required
                            style={{
                              width: '100%',
                              minHeight: '50px',
                              padding: '8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-card-border)',
                              background: '#fff',
                              color: 'var(--color-ink)',
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.75rem',
                              resize: 'none',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="text"
                              value={commentUserName}
                              onChange={(e) => setCommentUserName(e.target.value)}
                              placeholder={t('comment_pseudonym')}
                              required
                              maxLength={20}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-card-border)',
                                background: '#fff',
                                color: 'var(--color-ink)',
                                fontSize: '0.75rem',
                                outline: 'none',
                              }}
                            />
                            <motion.button
                              type="submit"
                              disabled={isSubmittingComment || commentText.trim() === '' || commentUserName.trim() === ''}
                              whileTap={{ scale: 0.95 }}
                              style={{
                                padding: '6px 16px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--color-accent)',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {t('reply')}
                            </motion.button>
                          </div>

                          {commentError && (
                            <p style={{ fontSize: '0.6875rem', color: 'var(--color-reject)', fontWeight: 600 }}>
                              {commentError}
                            </p>
                          )}
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
