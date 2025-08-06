'use client';

import { Alert, Block, Modal, Text } from '@lobehub/ui';
import { App } from 'antd';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import PluginAvatar from '@/components/Plugins/PluginAvatar';
import PluginTag from '@/components/Plugins/PluginTag';
import { useAgentStore } from '@/store/agent';
import { useToolStore } from '@/store/tool';
import { mcpStoreSelectors } from '@/store/tool/selectors';
import { McpConnectionParams } from '@/types/plugins';
import { LobeToolCustomPlugin } from '@/types/tool/plugin';

import ConfigDisplay from './ConfigDisplay';
import { McpInstallRequest, TRUSTED_MARKETPLACES, TrustedMarketplaceId } from './types';

interface CustomPluginInstallModalProps {
  installRequest: McpInstallRequest | null;
  isMarketplace?: boolean;
  onComplete?: () => void;
}

const CustomPluginInstallModal = memo<CustomPluginInstallModalProps>(
  ({ installRequest, isMarketplace = false, onComplete }) => {
    const { message } = App.useApp();
    const { t } = useTranslation('plugin');
    const [loading, setLoading] = useState(false);

    // 跟踪配置更新
    const [updatedConfig, setUpdatedConfig] = useState<{
      env?: Record<string, string>;
      headers?: Record<string, string>;
    }>({});

    const [installCustomPlugin] = useToolStore((s) => [s.installCustomPlugin]);
    const testMcpConnection = useToolStore((s) => s.testMcpConnection);
    const togglePlugin = useAgentStore((s) => s.togglePlugin);

    // 为自定义插件测试连接生成唯一标识符
    const identifier = installRequest?.schema?.identifier || '';
    const testState = useToolStore(mcpStoreSelectors.getMCPConnectionTestState(identifier));

    const schema = installRequest?.schema;
    const marketId = installRequest?.marketId;
    const marketplace =
      isMarketplace && marketId ? TRUSTED_MARKETPLACES[marketId as TrustedMarketplaceId] : null;

    // 重置加载状态和配置
    useEffect(() => {
      if (!installRequest) {
        setLoading(false);
        setUpdatedConfig({});
      }
    }, [installRequest]);

    const handleConfirm = useCallback(async () => {
      if (!installRequest || !schema) return;

      setLoading(true);
      try {
        // 第三方市场和自定义插件：构建自定义插件数据
        let customPlugin: LobeToolCustomPlugin;

        // 合并原始配置和用户更新的配置
        const finalConfig = {
          ...schema.config,
          env: updatedConfig.env || schema.config.env,
          headers: updatedConfig.headers || schema.config.headers,
        };

        // 自定义插件：先测试连接获取真实的 manifest
        const testParams: McpConnectionParams = {
          connection: finalConfig,
          identifier: identifier,
          metadata: {
            avatar: schema.icon,
            description: schema.description,
          },
        };
        console.log('testParams:', testParams);

        const testResult = await testMcpConnection(testParams);

        if (!testResult.success) {
          throw new Error(testResult.error || t('protocolInstall.messages.connectionTestFailed'));
        }

        if (!testResult.manifest) {
          throw new Error(t('protocolInstall.messages.manifestNotFound'));
        }

        // 使用测试连接获取的真实 manifest
        customPlugin = {
          customParams: {
            avatar: schema.icon,
            description: schema.description,
            mcp: {
              ...finalConfig, // 使用合并后的配置
              headers: finalConfig.type === 'http' ? finalConfig.headers : undefined,
            },
          },
          identifier: schema.identifier,
          manifest: testResult.manifest, // 使用真实的 manifest
          type: 'customPlugin',
        };

        await installCustomPlugin(customPlugin);
        await togglePlugin(schema.identifier);
        message.success(t('protocolInstall.messages.installSuccess', { name: schema.name }));

        onComplete?.();
      } catch (error) {
        console.error('Plugin installation error:', error);
        message.error(t('protocolInstall.messages.installError'));
        setLoading(false);
      }
    }, [
      installRequest,
      schema,
      updatedConfig,
      onComplete,
      installCustomPlugin,
      testMcpConnection,
      togglePlugin,
      message,
      t,
      identifier,
    ]);

    const handleCancel = useCallback(() => {
      onComplete?.();
    }, [onComplete]);

    if (!installRequest || !schema) return null;

    // 根据类型渲染不同的 Alert 组件
    const renderAlert = () => {
      if (!isMarketplace) {
        return (
          <Alert
            message={t('protocolInstall.custom.security.description')}
            showIcon
            type="warning"
            variant={'borderless'}
          />
        );
      }

      // marketplace 类型
      return marketplace ? (
        <Alert
          message={t('protocolInstall.marketplace.trustedBy', { name: marketplace.name })}
          showIcon
          type="success"
          variant={'borderless'}
        />
      ) : (
        <Alert
          message={t('protocolInstall.marketplace.unverified.warning')}
          showIcon
          type="warning"
          variant={'borderless'}
        />
      );
    };

    const modalTitle = isMarketplace
      ? t('protocolInstall.marketplace.title')
      : t('protocolInstall.custom.title');

    const okText = isMarketplace
      ? t('protocolInstall.actions.install')
      : t('protocolInstall.actions.installAnyway');

    return (
      <Modal
        confirmLoading={loading || testState.loading}
        okText={okText}
        onCancel={handleCancel}
        onOk={handleConfirm}
        open
        title={modalTitle}
        width={680}
      >
        <Flexbox gap={24}>
          {renderAlert()}

          <Block gap={16} horizontal justify={'space-between'} padding={16} variant={'outlined'}>
            <Flexbox gap={16} horizontal>
              <PluginAvatar avatar={schema.icon} size={40} />
              <Flexbox gap={2}>
                <Flexbox align={'center'} gap={8} horizontal>
                  {schema.name}
                  <PluginTag type={'customPlugin'} />
                </Flexbox>
                <Text style={{ fontSize: 12 }} type={'secondary'}>
                  {schema.description}
                </Text>
              </Flexbox>
            </Flexbox>
          </Block>

          <Flexbox>
            <ConfigDisplay onConfigUpdate={setUpdatedConfig} schema={schema} />
            {/* 显示测试连接错误 */}
            {testState.error && (
              <Alert
                closable
                description={testState.error}
                message={t('protocolInstall.messages.connectionTestFailed')}
                showIcon
                type="error"
                variant={'filled'}
              />
            )}
          </Flexbox>
        </Flexbox>
      </Modal>
    );
  },
);

CustomPluginInstallModal.displayName = 'CustomPluginInstallModal';

export default CustomPluginInstallModal;
