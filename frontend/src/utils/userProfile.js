export const USER_PROFILE_STORAGE_KEY = 'amypo_user_profile';

export const DEFAULT_USER_PROFILE = {
  name: 'Student Test',
  email: 'student@amypo.app',
  tier: 'Free Tier',
  avatarUrl: '',
  loggedIn: false
};

export function getInitials(name = '') {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'AM';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

export function normalizeUserProfile(profile = {}) {
  return {
    ...DEFAULT_USER_PROFILE,
    ...profile,
    name: String(profile?.name || DEFAULT_USER_PROFILE.name).trim() || DEFAULT_USER_PROFILE.name,
    email: String(profile?.email || DEFAULT_USER_PROFILE.email).trim() || DEFAULT_USER_PROFILE.email,
    tier: String(profile?.tier || DEFAULT_USER_PROFILE.tier).trim() || DEFAULT_USER_PROFILE.tier,
    avatarUrl: String(profile?.avatarUrl || '').trim(),
    loggedIn: Boolean(profile?.loggedIn)
  };
}

export function readUserProfile() {
  try {
    const raw = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) return normalizeUserProfile(DEFAULT_USER_PROFILE);
    return normalizeUserProfile(JSON.parse(raw));
  } catch (_) {
    return normalizeUserProfile(DEFAULT_USER_PROFILE);
  }
}

export function saveUserProfile(nextProfile) {
  const normalized = normalizeUserProfile(nextProfile);

  try {
    window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('amypo-user-profile-change', { detail: { profile: normalized } }));
  } catch (_) {
    // Ignore storage failures and still return the normalized profile.
  }

  return normalized;
}

export function resetUserProfile() {
  const next = normalizeUserProfile(DEFAULT_USER_PROFILE);

  try {
    window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('amypo-user-profile-change', { detail: { profile: next } }));
  } catch (_) {
    // Ignore storage failures.
  }

  return next;
}
