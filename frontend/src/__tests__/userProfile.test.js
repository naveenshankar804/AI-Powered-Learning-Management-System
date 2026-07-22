import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  USER_PROFILE_STORAGE_KEY,
  DEFAULT_USER_PROFILE,
  getInitials,
  normalizeUserProfile,
  readUserProfile,
  saveUserProfile,
  resetUserProfile
} from '../utils/userProfile';

describe('userProfile utils', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getInitials', () => {
    it('returns AM for empty or whitespace', () => {
      expect(getInitials('')).toBe('AM');
      expect(getInitials('   ')).toBe('AM');
      expect(getInitials(null)).toBe('AM');
    });

    it('returns first two letters for single word', () => {
      expect(getInitials('Student')).toBe('ST');
      expect(getInitials('A')).toBe('A');
    });

    it('returns first letter of first two words', () => {
      expect(getInitials('Student Test')).toBe('ST');
      expect(getInitials('John Doe Smith')).toBe('JD');
    });
  });

  describe('normalizeUserProfile', () => {
    it('returns default profile for empty input', () => {
      const normalized = normalizeUserProfile();
      expect(normalized).toEqual(DEFAULT_USER_PROFILE);
    });

    it('normalizes partial profile', () => {
      const input = { name: 'Alice', loggedIn: true };
      const normalized = normalizeUserProfile(input);
      expect(normalized).toEqual({
        ...DEFAULT_USER_PROFILE,
        name: 'Alice',
        loggedIn: true
      });
    });

    it('handles null/undefined fields gracefully', () => {
      const input = { name: null, email: undefined, tier: ' Pro ' };
      const normalized = normalizeUserProfile(input);
      expect(normalized.name).toBe(DEFAULT_USER_PROFILE.name);
      expect(normalized.email).toBe(DEFAULT_USER_PROFILE.email);
      expect(normalized.tier).toBe('Pro');
    });
  });

  describe('readUserProfile', () => {
    it('returns default profile if local storage is empty', () => {
      expect(readUserProfile()).toEqual(DEFAULT_USER_PROFILE);
    });

    it('returns parsed profile if local storage has valid JSON', () => {
      const profile = { name: 'Bob', loggedIn: true };
      window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      const read = readUserProfile();
      expect(read.name).toBe('Bob');
      expect(read.loggedIn).toBe(true);
    });

    it('returns default profile if local storage has invalid JSON', () => {
      window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, 'invalid-json');
      expect(readUserProfile()).toEqual(DEFAULT_USER_PROFILE);
    });
  });

  describe('saveUserProfile', () => {
    it('saves normalized profile to local storage and dispatches event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      const profile = { name: ' Charlie ' };

      const result = saveUserProfile(profile);

      expect(result.name).toBe('Charlie');

      const stored = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      expect(JSON.parse(stored)).toEqual(result);

      expect(dispatchEventSpy).toHaveBeenCalled();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.type).toBe('amypo-user-profile-change');
      expect(event.detail.profile).toEqual(result);
    });

    it('returns normalized profile even if localStorage fails', () => {
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage Full');
      });
      const profile = { name: 'Dave' };
      const result = saveUserProfile(profile);
      expect(result.name).toBe('Dave');
    });
  });

  describe('resetUserProfile', () => {
    it('removes profile from local storage and dispatches event', () => {
      window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, '{"name":"Eve"}');
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const result = resetUserProfile();

      expect(result).toEqual(DEFAULT_USER_PROFILE);
      expect(window.localStorage.getItem(USER_PROFILE_STORAGE_KEY)).toBeNull();

      expect(dispatchEventSpy).toHaveBeenCalled();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.type).toBe('amypo-user-profile-change');
      expect(event.detail.profile).toEqual(DEFAULT_USER_PROFILE);
    });

    it('returns default profile even if localStorage fails', () => {
      vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage Error');
      });
      const result = resetUserProfile();
      expect(result).toEqual(DEFAULT_USER_PROFILE);
    });
  });
});
