import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  LogIn,
  Mail,
  Menu,
  Moon,
  Search,
  Settings2,
  Sun,
  Target,
  UserPlus,
  X,
  FileVideo
} from 'lucide-react';
import { cn } from '../../utils/utils';
import { useNotifications } from '../ui/NotificationHub';
import { getInitials, readUserProfile, saveUserProfile } from '../../utils/userProfile';

function AccountDialog({
  mode,
  values,
  onChange,
  onClose,
  onSubmit
}) {
  if (!mode) return null;

  const titles = {
    login: {
      title: 'Log in to your workspace',
      subtitle: 'Continue with a local profile for this demo environment.',
      button: 'Log In'
    },
    signup: {
      title: 'Create a local account',
      subtitle: 'Set up a student profile that stays synced across the dashboard.',
      button: 'Create Account'
    },
    contact: {
      title: 'Contact Amypo',
      subtitle: 'Send a quick support message or open your mail app with everything prefilled.',
      button: 'Open Mail App'
    }
  };

  const meta = titles[mode];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="border-b border-gray-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_42%),linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(255,255,255,1))] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{meta.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{meta.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-200 p-2 text-gray-400 transition hover:border-gray-300 hover:text-gray-700"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <form
            className="space-y-4 px-6 py-6"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            {mode !== 'contact' && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Display name</span>
                <input
                  value={values.name}
                  onChange={(event) => onChange('name', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Your name"
                />
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {mode === 'contact' ? 'Reply email' : 'Email'}
              </span>
              <input
                type="email"
                value={values.email}
                onChange={(event) => onChange('email', event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="name@example.com"
                required
              />
            </label>

            {mode !== 'contact' && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Password</span>
                <input
                  type="password"
                  value={values.password}
                  onChange={(event) => onChange('password', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Minimum 6 characters"
                  required
                />
              </label>
            )}

            {mode === 'contact' && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Subject</span>
                  <input
                    value={values.subject}
                    onChange={(event) => onChange('subject', event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    placeholder="How can we help?"
                    required
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Message</span>
                  <textarea
                    value={values.message}
                    onChange={(event) => onChange('message', event.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Share the problem you ran into."
                    required
                  />
                </label>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                {meta.button}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function TopNav({ toggleSidebar, theme = 'light', toggleTheme }) {
  const navigate = useNavigate();
  const { addNotification } = useNotifications() || { addNotification: null };

  const inputRef = useRef(null);
  const searchRef = useRef(null);
  const accountRef = useRef(null);

  const cacheRef = useRef({ questions: null, submissions: null, fetchedAt: 0 });

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeDialog, setActiveDialog] = useState('');
  const [profile, setProfile] = useState(() => readUserProfile());
  const [dialogValues, setDialogValues] = useState(() => ({
    name: readUserProfile().name,
    email: readUserProfile().email,
    password: '',
    subject: 'Amypo Support Request',
    message: ''
  }));

  const normalized = query.trim().toLowerCase();

  useEffect(() => {
    const onDown = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };

    const onEsc = (event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setAccountOpen(false);
        setActiveDialog('');
      }
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  useEffect(() => {
    const onProfileChange = (event) => {
      const next = event?.detail?.profile || readUserProfile();
      setProfile(next);
      setDialogValues((prev) => ({
        ...prev,
        name: next.name,
        email: next.email
      }));
    };

    window.addEventListener('amypo-user-profile-change', onProfileChange);
    return () => window.removeEventListener('amypo-user-profile-change', onProfileChange);
  }, []);

  const fetchDataIfNeeded = async () => {
    const now = Date.now();
    if (cacheRef.current.questions && cacheRef.current.submissions && (now - cacheRef.current.fetchedAt) < 30_000) {
      setQuestions(cacheRef.current.questions);
      setSubmissions(cacheRef.current.submissions);
      return;
    }

    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch('/api/questions'),
        fetch('/api/submissions?limit=80')
      ]);

      const qJson = await qRes.json().catch(() => ({}));
      const sJson = await sRes.json().catch(() => ([]));

      const qs = Array.isArray(qJson?.questions) ? qJson.questions : [];
      const ss = Array.isArray(sJson) ? sJson : (Array.isArray(sJson?.items) ? sJson.items : []);

      cacheRef.current = { questions: qs, submissions: ss, fetchedAt: Date.now() };
      setQuestions(qs);
      setSubmissions(ss);
    } catch (_) {
      // Search should stay non-fatal.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchOpen) return;
    const timer = setTimeout(() => {
      fetchDataIfNeeded();
    }, 150);
    return () => clearTimeout(timer);
  }, [searchOpen]);

  const filteredQuestions = useMemo(() => {
    if (!normalized) return questions.slice(0, 6);
    return questions
      .filter((q) => String(q?.title || '').toLowerCase().includes(normalized) || String(q?.id || '').includes(normalized))
      .slice(0, 6);
  }, [questions, normalized]);

  const filteredSubmissions = useMemo(() => {
    const list = submissions || [];
    if (!normalized) return list.slice(0, 6);
    return list
      .filter((s) => {
        const id = String(s?.id || '');
        const title = String(s?.Question?.title || '').toLowerCase();
        return id.includes(normalized) || title.includes(normalized) || String(s?.status || '').toLowerCase().includes(normalized);
      })
      .slice(0, 6);
  }, [submissions, normalized]);

  const avatar = profile.avatarUrl ? (
    <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
  ) : (
    <span>{getInitials(profile.name)}</span>
  );

  const openDialog = (mode) => {
    setAccountOpen(false);
    setDialogValues((prev) => ({
      ...prev,
      name: profile.name,
      email: profile.email,
      password: '',
      subject: prev.subject || 'Amypo Support Request',
      message: ''
    }));
    setActiveDialog(mode);
  };

  const goQuestion = (qid) => {
    setSearchOpen(false);
    setQuery('');
    navigate(`/student?question=${encodeURIComponent(String(qid))}`);
  };

  const goSubmission = (sid) => {
    setSearchOpen(false);
    setQuery('');
    navigate(`/results/${encodeURIComponent(String(sid))}`);
  };

  const onSubmitSearch = () => {
    const next = query.trim();
    if (!next) return;
    setSearchOpen(false);
    navigate(`/submissions?q=${encodeURIComponent(next)}`);
  };

  const handleDialogSubmit = () => {
    if (activeDialog === 'contact') {
      const subject = encodeURIComponent(dialogValues.subject || 'Amypo Support Request');
      const body = encodeURIComponent(`From: ${dialogValues.email}\n\n${dialogValues.message || ''}`);
      window.location.href = `mailto:support@amypo.app?subject=${subject}&body=${body}`;
      if (typeof addNotification === 'function') {
        addNotification('success', 'Mail App Opened', 'Your support draft is ready to send.');
      }
      setActiveDialog('');
      return;
    }

    const trimmedEmail = String(dialogValues.email || '').trim();
    const trimmedName = String(dialogValues.name || '').trim();
    if (!trimmedEmail || String(dialogValues.password || '').trim().length < 6) {
      if (typeof addNotification === 'function') {
        addNotification('warning', 'Incomplete Details', 'Please add a valid email and a password with at least 6 characters.');
      }
      return;
    }

    const fallbackName = trimmedEmail.split('@')[0]?.replace(/[._-]+/g, ' ') || profile.name;
    const nextProfile = saveUserProfile({
      ...profile,
      name: trimmedName || fallbackName.replace(/\b\w/g, (char) => char.toUpperCase()),
      email: trimmedEmail,
      loggedIn: true
    });

    setProfile(nextProfile);
    setActiveDialog('');

    if (typeof addNotification === 'function') {
      addNotification(
        'success',
        activeDialog === 'signup' ? 'Profile Created' : 'Logged In',
        `${nextProfile.name} is now active in this workspace.`
      );
    }
  };

  const menuItems = [
    {
      id: 'login',
      label: 'Log In',
      description: 'Use an existing local profile',
      icon: <LogIn size={16} className="text-emerald-700" />,
      action: () => openDialog('login')
    },
    {
      id: 'signup',
      label: 'Sign Up',
      description: 'Create a fresh student account',
      icon: <UserPlus size={16} className="text-emerald-700" />,
      action: () => openDialog('signup')
    },
    {
      id: 'contact',
      label: 'Contact Us',
      description: 'Reach support with one click',
      icon: <Mail size={16} className="text-emerald-700" />,
      action: () => openDialog('contact')
    },
    {
      id: 'settings',
      label: 'User Settings',
      description: 'Rename profile, change photo, manage account',
      icon: <Settings2 size={16} className="text-emerald-700" />,
      action: () => {
        setAccountOpen(false);
        navigate('/settings#profile');
      }
    }
  ];

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>

          <div ref={searchRef} className="relative hidden md:block w-72">
            <button
              type="button"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => inputRef.current?.focus()}
              aria-label="Focus search"
            >
              <Search size={16} />
            </button>
            <input
              type="text"
              placeholder="Search questions, submissions..."
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSubmitSearch();
                if (event.key === 'Escape') setSearchOpen(false);
              }}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 rounded-lg text-sm transition-all outline-none"
            />

            {searchOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden z-50">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Search</div>
                  {loading && <div className="text-xs text-gray-400">Loading...</div>}
                </div>

                <div className="max-h-80 overflow-auto">
                  <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Questions</div>
                  {filteredQuestions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No matching questions</div>
                  ) : (
                    filteredQuestions.map((q) => (
                      <button
                        key={`q-${q.id}`}
                        type="button"
                        onClick={() => goQuestion(q.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors',
                          'border-b border-gray-50'
                        )}
                      >
                        <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <Target size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{q.title}</div>
                          <div className="text-xs text-gray-500">Question ID: {q.id}</div>
                        </div>
                      </button>
                    ))
                  )}

                  <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Submissions</div>
                  {filteredSubmissions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No matching submissions</div>
                  ) : (
                    filteredSubmissions.map((s) => (
                      <button
                        key={`s-${s.id}`}
                        type="button"
                        onClick={() => goSubmission(s.id)}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors border-b border-gray-50"
                      >
                        <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <FileVideo size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            Submission #{s.id}{' '}
                            <span className="text-xs font-bold text-gray-500">({s.status || 'unknown'})</span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">{s?.Question?.title ? `Q: ${s.Question.title}` : 'Question'}</div>
                        </div>
                        <div className="text-xs font-mono text-gray-500">{s.total_score ?? '-'}</div>
                      </button>
                    ))
                  )}
                </div>

                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500">Press Enter to search in submissions</div>
                  <button
                    type="button"
                    onClick={onSubmitSearch}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    Search
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => {
              if (typeof toggleTheme === 'function') toggleTheme();
            }}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => {
              if (typeof addNotification === 'function') {
                addNotification('info', 'Notifications', 'No new notifications right now.');
              }
            }}
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>

          <div className="h-8 w-px bg-gray-200 mx-1"></div>

          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-md"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label="Open account menu"
            >
              <div className="h-10 w-10 overflow-hidden rounded-full border border-emerald-200 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white text-sm font-bold text-emerald-700 flex items-center justify-center">
                {avatar}
              </div>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-semibold text-gray-800">{profile.name}</p>
                <p className="text-xs text-gray-500">{profile.tier}</p>
              </div>
              <ChevronDown
                size={16}
                className={cn('text-gray-400 transition-transform', accountOpen && 'rotate-180')}
              />
            </button>

            <AnimatePresence>
              {accountOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute right-0 z-50 mt-3 w-[320px] overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
                >
                  <div className="border-b border-gray-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(180deg,_rgba(249,250,251,1),_rgba(255,255,255,1))] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full border border-emerald-200 bg-gradient-to-br from-emerald-100 to-white text-base font-bold text-emerald-700 flex items-center justify-center">
                        {avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{profile.name}</p>
                        <p className="truncate text-xs text-gray-500">{profile.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-emerald-50/70"
                      >
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="text-xs leading-5 text-gray-500">{item.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <AccountDialog
        mode={activeDialog}
        values={dialogValues}
        onChange={(field, value) => {
          setDialogValues((prev) => ({ ...prev, [field]: value }));
        }}
        onClose={() => setActiveDialog('')}
        onSubmit={handleDialogSubmit}
      />
    </>
  );
}
