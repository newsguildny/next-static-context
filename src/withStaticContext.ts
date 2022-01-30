import { resolve } from 'path';
import type { Configuration, RuleSetUseItem, RuleSetRule } from 'webpack';

/**
 * The type of the argument passed to functions provided
 * as the externals config. Not exported by webpack,
 * so partially reproduced here.
 */
interface ExternalItemFunctionData {
  context?: string;

  dependencyType?: string;

  getResolve?: (
    options?: Configuration['resolve']
  ) =>
    | ((context: string, request: string, callback: (err?: Error, result?: string) => void) => void)
    | ((context: string, request: string) => Promise<string>);

  request?: string;
}

/** Return type for externals functions */
type ExternalItemValue = string | boolean | string[] | { [index: string]: any };

/** This is the type of the externals config that next.js actually uses. */
type NextExternals = [(data: ExternalItemFunctionData) => Promise<ExternalItemValue>];

/** Subset of the config defined in next.config.js (only the parts we care about). */
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

/** Returns a reference to the webpack rule for the babel-loader */
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

/** Modifies the next.js config as needed to add support for this plugin */
export function withStaticContext(nextConfig: NextConfig = {}) {
  return {
    ...nextConfig,
    env: {
      NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT: resolve(process.cwd(), './src'),
      ...nextConfig.env,
    },
    webpack(config: Configuration, options: { isServer?: boolean }) {
      const { isServer } = options;

      const nextBabelRule = findNextBabelRule(config);

      if (!nextBabelRule || typeof nextBabelRule === 'string') {
        return config;
      }

      const babelLoader = require.resolve('./webpack/next-static-context-babel-loader');

      // Update the babel rule to run our babel loader first
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

      // Update the externals config to count our plugin as _internal_.
      // This forces webpack to bundle our plugin, which is necessary to
      // support our use of `require.context()`.
      if (isServer) {
        const nextBaseExternals = config.externals as NextExternals;
        config.externals = [
          ({ context, request, dependencyType, getResolve }: ExternalItemFunctionData) => {
            const isNextStaticContext = /^next-static-context/;
            if (request && isNextStaticContext.test(request)) {
              return undefined;
            }
            return nextBaseExternals[0]!({
              context,
              request,
              dependencyType,
              getResolve,
            });
          },
        ];
      }

      // If there's a user-defined webpack config function,
      // be sure to call that, too.
      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
}
