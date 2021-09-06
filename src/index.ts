import { Configuration, RuleSetUseItem, RuleSetRule } from 'webpack';

interface NextConfig {
  webpack?: (config: Configuration, options: { isServer?: boolean }) => Configuration;
}

interface NextBabelRuleSetUseItem {
  ident?: string;
  loader?: string;
  options?: string | { [index: string]: any };
}

interface NextBabelRuleSetRule extends RuleSetRule {
  use: NextBabelRuleSetUseItem | NextBabelRuleSetUseItem[];
}

function isRuleSetUseItem(
  useItem: RuleSetUseItem
): useItem is { ident?: string; loader?: string; options?: string | { [index: string]: any } } {
  return !!(useItem as any).loader;
}

function findNextBabelRule(config: Configuration) {
  return config.module?.rules?.find((rule) => {
    if (
      typeof rule === 'string' ||
      typeof rule.use === 'string' ||
      typeof rule.use === 'function'
    ) {
      return false;
    }
    if (Array.isArray(rule.use)) {
      return rule.use.some((useItem) => {
        if (isRuleSetUseItem(useItem)) {
          return useItem.loader === 'next-babel-loader';
        }
        return false;
      });
    }
    return rule.use?.loader === 'next-babel-loader';
  }) as NextBabelRuleSetRule;
}

export function withStaticContext(nextConfig: NextConfig = {}) {
  return {
    ...nextConfig,
    webpack(config: Configuration, options: { isServer?: boolean }) {
      const { isServer } = options;

      const nextBabelRule = findNextBabelRule(config);

      if (!nextBabelRule || typeof nextBabelRule === 'string') {
        return config;
      }

      const loader = require.resolve('./webpack/next-static-context-loader');

      if (Array.isArray(nextBabelRule.use)) {
        const nextBabelUseItem = nextBabelRule.use.find((useItem) => {
          if (isRuleSetUseItem(useItem)) {
            return useItem.loader === 'next-babel-loader';
          }

          return false;
        })!;
        nextBabelRule.use.push({
          loader,
          options: {
            ...(typeof nextBabelUseItem.options === 'object' && nextBabelUseItem.options),
            isServer,
          },
        });
      } else {
        const nextBabelUseItem = nextBabelRule.use!;
        nextBabelRule.use = [
          nextBabelRule.use,
          {
            loader,
            options: {
              ...(typeof nextBabelUseItem.options === 'object' && nextBabelUseItem.options),
              isServer,
            },
          },
        ];
      }

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
}
