'use client';

import { Form, type FormGroupItemType, HotkeyInput, Icon } from '@lobehub/ui';
import { App, Skeleton } from 'antd';
import isEqual from 'fast-deep-equal';
import { Loader2Icon } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DESKTOP_HOTKEYS_REGISTRATION } from '@/const/hotkeys';
import { FORM_STYLE } from '@/const/layoutTokens';
import hotkeyMeta from '@/locales/default/hotkey';
import { useElectronStore } from '@/store/electron';
import { desktopHotkeysSelectors } from '@/store/electron/selectors';
import { DesktopHotkeyItem } from '@/types/hotkey';

const HotkeySetting = memo(() => {
  const { t } = useTranslation(['setting', 'hotkey']);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const hotkeys = useElectronStore(desktopHotkeysSelectors.hotkeys, isEqual);
  const [isHotkeysInit, updateDesktopHotkey, useFetchDesktopHotkeys] = useElectronStore((s) => [
    desktopHotkeysSelectors.isHotkeysInit(s),
    s.updateDesktopHotkey,
    s.useFetchDesktopHotkeys,
  ]);

  useFetchDesktopHotkeys();

  const [loading, setLoading] = useState(false);

  if (!isHotkeysInit) return <Skeleton active paragraph={{ rows: 5 }} title={false} />;

  const mapHotkeyItem = (item: DesktopHotkeyItem) => ({
    children: (
      <HotkeyInput
        disabled={item.nonEditable}
        onChange={async (value) => {
          setLoading(true);
          try {
            const result = await updateDesktopHotkey(item.id, value);
            console.log(result);
            if (result.success) {
              message.success(t('hotkey.updateSuccess', { ns: 'setting' }));
            } else {
              // 根据错误类型显示相应的错误消息

              message.error(t(`hotkey.errors.${result.errorType}` as any, { ns: 'setting' }));
            }
          } catch {
            message.error(t('hotkey.updateError', { ns: 'setting' }));
          } finally {
            setLoading(false);
          }
        }}
        placeholder={t('hotkey.record')}
        resetValue={item.keys}
        texts={{
          conflicts: t('hotkey.conflicts'),
          invalidCombination: t('hotkey.invalidCombination'),
          reset: t('hotkey.reset'),
        }}
        value={hotkeys[item.id]}
      />
    ),
    desc: hotkeyMeta.desktop[item.id]?.desc
      ? t(`desktop.${item.id}.desc`, { ns: 'hotkey' })
      : undefined,
    label: t(`desktop.${item.id}.title`, { ns: 'hotkey' }),
    name: item.id,
  });

  const desktop: FormGroupItemType = {
    children: DESKTOP_HOTKEYS_REGISTRATION.map((item) => mapHotkeyItem(item)),
    extra: loading && <Icon icon={Loader2Icon} size={16} spin style={{ opacity: 0.5 }} />,
    title: t('hotkey.group.desktop'),
  };

  return (
    <Form
      form={form}
      initialValues={hotkeys}
      items={[desktop]}
      itemsType={'group'}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

export default HotkeySetting;
