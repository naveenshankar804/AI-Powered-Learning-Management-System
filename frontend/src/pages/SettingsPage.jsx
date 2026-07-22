import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Mail,
  Moon,
  Settings,
  ShieldAlert,
  Sun,
  Trash2,
  Upload,
  User,
  RotateCcw
} from 'lucide-react';
import {
  DEFAULT_USER_PROFILE,
  getInitials,
  readUserProfile,
  resetUserProfile,
  saveUserProfile
} from '../utils/userProfile';

export default function SettingsPage() {
  const profileSectionRef = useRef(null);
  const fileInputRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    try {
      const saved = window.localStorage.getItem('amypo_theme');
      return saved === 'dark' || saved === 'light' ? saved : 'light';
    } catch (_) {
      return 'light';
    }
  });

  const [userId, setUserId] = useState(() => {
    try {
      return window.localStorage.getItem('amypo_user_id') || '1';
    } catch (_) {
      return '1';
    }
  });

  const [profile, setProfile] = useState(() => readUserProfile());
  const [form, setForm] = useState(() => readUserProfile());
  const [notice, setNotice] = useState('');
  const [deleteToken, setDeleteToken] = useState('');

  useEffect(() => {
    if (window.location.hash === '#profile' && profileSectionRef.current) {
      profileSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('amypo_user_id', String(userId || '1'));
    } catch (_) {}
  }, [userId]);

  useEffect(() => {
    const onProfileChange = (event) => {
      const next = event?.detail?.profile || readUserProfile();
      setProfile(next);
      setForm(next);
    };

    window.addEventListener('amypo-user-profile-change', onProfileChange);
    return () => window.removeEventListener('amypo-user-profile-change', onProfileChange);
  }, []);

  const avatarPreview = useMemo(() => {
    if (form.avatarUrl) {
      return <img src={form.avatarUrl} alt={form.name} className="h-full w-full object-cover" />;
    }

    return <span>{getInitials(form.name)}</span>;
  }, [form.avatarUrl, form.name]);

  const updateTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        document.documentElement.dataset.theme = next;
        window.localStorage.setItem('amypo_theme', next);
        window.dispatchEvent(new CustomEvent('amypo-theme-change', { detail: { theme: next } }));
      } catch (_) {}
      return next;
    });
  };

  const saveProfileChanges = () => {
    const next = saveUserProfile({
      ...profile,
      ...form,
      name: String(form.name || '').trim() || DEFAULT_USER_PROFILE.name,
      email: String(form.email || '').trim() || DEFAULT_USER_PROFILE.email,
      avatarUrl: String(form.avatarUrl || '').trim(),
      loggedIn: true
    });

    setProfile(next);
    setForm(next);
    setNotice('Profile settings saved.');
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotice('Please choose an image file for the profile photo.');
      return;
    }

    if (file.size > 1_500_000) {
      setNotice('Please choose an image smaller than 1.5 MB so it saves reliably in the browser.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, avatarUrl: String(reader.result || '') }));
      setNotice('Profile photo updated. Save changes to apply it everywhere.');
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setForm((prev) => ({ ...prev, avatarUrl: '' }));
    setNotice('Profile photo removed. Save changes to apply the update.');
  };

  const deleteAccount = () => {
    if (deleteToken.trim().toUpperCase() !== 'DELETE') {
      setNotice('Type DELETE before removing the account.');
      return;
    }

    const next = resetUserProfile();
    setProfile(next);
    setForm(next);
    setDeleteToken('');
    setUserId('1');
    try {
      window.localStorage.setItem('amypo_user_id', '1');
    } catch (_) {}
    setNotice('Local account removed. The workspace has been reset to the default student profile.');
  };

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 pb-12">
      <section className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(180deg,_rgba(249,250,251,1),_rgba(255,255,255,1))] px-6 py-6">
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-gray-900">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Settings size={20} />
            </span>
            User Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Update the student identity shown in the capsule menu, manage the profile photo, and keep workspace preferences tidy.
          </p>
        </div>

        {notice && (
          <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div ref={profileSectionRef} className="space-y-6">
            <div className="rounded-[1.75rem] border border-gray-200 bg-gray-50/70 p-6">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] border border-emerald-200 bg-gradient-to-br from-emerald-100 via-white to-emerald-50 text-2xl font-bold text-emerald-700 shadow-inner">
                  {avatarPreview}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{form.name || DEFAULT_USER_PROFILE.name}</p>
                  <p className="text-sm text-gray-500">{form.email || DEFAULT_USER_PROFILE.email}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{profile.tier}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">User name</span>
                  <div className="relative">
                    <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      placeholder="Student name"
                    />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      placeholder="student@amypo.app"
                    />
                  </div>
                </label>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-dashed border-gray-300 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Profile picture</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload a photo or clear it to fall back to initials in the header capsule.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <Upload size={16} />
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      <RotateCcw size={16} />
                      Remove Photo
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={saveProfileChanges}
                  className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  Save Profile
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-red-200 bg-red-50/80 p-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <ShieldAlert size={18} />
                </span>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-red-950">Danger Zone</h2>
                  <p className="mt-1 text-sm leading-6 text-red-800/80">
                    Delete the local account stored in this browser. This resets the user name, profile photo, and login state back to the default student profile.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                <input
                  value={deleteToken}
                  onChange={(event) => setDeleteToken(event.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-950 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
                <button
                  type="button"
                  onClick={deleteAccount}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700"
                >
                  <Trash2 size={16} />
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Workspace Preferences</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Keep the theme toggle and local demo identity controls available in one place.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Theme</label>
                  <button
                    type="button"
                    onClick={updateTheme}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                  </button>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Demo User ID</label>
                  <input
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-mono text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    placeholder="1"
                  />
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Admin-only actions like replay evaluation still use <span className="font-mono">amypo_user_id</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Support & Troubleshooting</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                <li className="rounded-2xl bg-gray-50 px-4 py-3">
                  Backend health: <span className="font-mono text-gray-900">/health</span>
                </li>
                <li className="rounded-2xl bg-gray-50 px-4 py-3">
                  Artifacts route: <span className="font-mono text-gray-900">/artifacts/&lt;runId&gt;/...</span>
                </li>
                <li className="rounded-2xl bg-gray-50 px-4 py-3">
                  Results polling: <span className="font-mono text-gray-900">/api/submissions/&lt;id&gt;/result</span>
                </li>
              </ul>

              <a
                href="mailto:support@amypo.app?subject=Amypo%20Support"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <Mail size={16} />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
