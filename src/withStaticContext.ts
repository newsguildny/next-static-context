import { resolve } from 'path';
import type { Configuration, RuleSetUseItem, RuleSetRule } from 'webpack';

interface NextConfig {
  env?: Record<string, string>;
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
          return useItem.loader === 'next-babel-loader' || useItem.loader?.includes('babel/loader');
        }
        return false;
      });
    }
    return rule.use?.loader === 'next-babel-loader' || rule.use?.loader?.includes('babel/loader');
  }) as NextBabelRuleSetRule;
}

export function withStaticContext(nextConfig: NextConfig = {}) {
  return {
    ...nextConfig,
    env: {
      ...nextConfig.env,
      NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT: resolve(process.cwd(), './src'),
    },
    webpack(config: Configuration, options: { isServer?: boolean }) {
      const { isServer } = options;

      const nextBabelRule = findNextBabelRule(config);

      if (!nextBabelRule || typeof nextBabelRule === 'string') {
        return config;
      }

      const babelLoader = require.resolve('./webpack/next-static-context-babel-loader');

      if (Array.isArray(nextBabelRule.use)) {
        nextBabelRule.use.unshift({
          loader: babelLoader,
          options: {
            isServer,
          },
        });
      } else {
        nextBabelRule.use = [
          {
            loader: babelLoader,
            options: {
              isServer,
            },
          },
          nextBabelRule.use,
        ];
      }

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
}
