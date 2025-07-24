import { describe, expect, it } from 'vitest';

import { ElectronState, defaultProxySettings, initialState } from '@/store/electron/initialState';
import { merge } from '@/utils/merge';

import { desktopStateSelectors } from '../desktopState';

describe('desktopStateSelectors', () => {
  describe('usePath', () => {
    it('should return userPath from appState', () => {
      const state: ElectronState = merge(initialState, {
        appState: {
          userPath: {
            desktop: '/test/desktop',
            documents: '/test/documents',
            downloads: '/test/downloads',
            home: '/test/home',
            music: '/test/music',
            pictures: '/test/pictures',
            userData: '/test/userdata',
            videos: '/test/videos',
          },
        },
      });

      expect(desktopStateSelectors.usePath(state)).toEqual({
        desktop: '/test/desktop',
        documents: '/test/documents',
        downloads: '/test/downloads',
        home: '/test/home',
        music: '/test/music',
        pictures: '/test/pictures',
        userData: '/test/userdata',
        videos: '/test/videos',
      });
    });

    it('should handle undefined userPath', () => {
      const state: ElectronState = merge(initialState, {
        appState: {},
      });

      expect(desktopStateSelectors.usePath(state)).toBeUndefined();
    });
  });
});
