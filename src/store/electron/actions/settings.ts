import { NetworkProxySettings, ShortcutUpdateResult } from '@lobechat/electron-client-ipc';
import isEqual from 'fast-deep-equal';
import useSWR, { SWRResponse, mutate } from 'swr';
import type { StateCreator } from 'zustand/vanilla';

import { desktopSettingsService } from '@/services/electron/settings';

import type { ElectronStore } from '../store';

/**
 * 设置操作
 */
export interface ElectronSettingsAction {
  refreshDesktopHotkeys: () => Promise<void>;
  refreshProxySettings: () => Promise<void>;
  setProxySettings: (params: Partial<NetworkProxySettings>) => Promise<void>;
  updateDesktopHotkey: (id: string, accelerator: string) => Promise<ShortcutUpdateResult>;
  useFetchDesktopHotkeys: () => SWRResponse;
  useGetProxySettings: () => SWRResponse;
}

const ELECTRON_PROXY_SETTINGS_KEY = 'electron:getProxySettings';
const ELECTRON_DESKTOP_HOTKEYS_KEY = 'electron:getDesktopHotkeys';

export const settingsSlice: StateCreator<
  ElectronStore,
  [['zustand/devtools', never]],
  [],
  ElectronSettingsAction
> = (set, get) => ({
  refreshDesktopHotkeys: async () => {
    await mutate(ELECTRON_DESKTOP_HOTKEYS_KEY);
  },

  refreshProxySettings: async () => {
    await mutate(ELECTRON_PROXY_SETTINGS_KEY);
  },

  setProxySettings: async (values) => {
    try {
      // 更新设置
      await desktopSettingsService.setSettings(values);

      // 刷新状态
      await get().refreshProxySettings();
    } catch (error) {
      console.error('代理设置更新失败:', error);
    }
  },

  updateDesktopHotkey: async (id, accelerator) => {
    try {
      // 更新热键配置
      const result = await desktopSettingsService.updateDesktopHotkey(id, accelerator);

      // 如果更新成功，刷新状态
      if (result.success) {
        await get().refreshDesktopHotkeys();
      }

      return result;
    } catch (error) {
      console.error('桌面热键更新失败:', error);
      return {
        errorType: 'UNKNOWN' as const,
        success: false,
      };
    }
  },

  useFetchDesktopHotkeys: () =>
    useSWR<Record<string, string>>(
      ELECTRON_DESKTOP_HOTKEYS_KEY,
      async () => desktopSettingsService.getDesktopHotkeys(),
      {
        onSuccess: (data) => {
          if (!isEqual(data, get().desktopHotkeys)) {
            set({ desktopHotkeys: data, isDesktopHotkeysInit: true });
          }
        },
      },
    ),

  useGetProxySettings: () =>
    useSWR<NetworkProxySettings>(
      ELECTRON_PROXY_SETTINGS_KEY,
      async () => desktopSettingsService.getProxySettings(),
      {
        onSuccess: (data) => {
          if (!isEqual(data, get().proxySettings)) {
            set({ proxySettings: data });
          }
        },
      },
    ),
});
