"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withStaticContext = withStaticContext;

function isRuleSetUseItem(useItem) {
  return !!useItem.loader;
}

function findNextBabelRule(config) {
  var _config$module, _config$module$rules;

  return (_config$module = config.module) === null || _config$module === void 0 ? void 0 : (_config$module$rules = _config$module.rules) === null || _config$module$rules === void 0 ? void 0 : _config$module$rules.find(rule => {
    var _rule$use;

    if (typeof rule === 'string' || typeof rule.use === 'string' || typeof rule.use === 'function') {
      return false;
    }

    if (Array.isArray(rule.use)) {
      return rule.use.some(useItem => {
        if (isRuleSetUseItem(useItem)) {
          return useItem.loader === 'next-babel-loader';
        }

        return false;
      });
    }

    return ((_rule$use = rule.use) === null || _rule$use === void 0 ? void 0 : _rule$use.loader) === 'next-babel-loader';
  });
}

function withStaticContext(nextConfig = {}) {
  return { ...nextConfig,

    webpack(config, options) {
      const {
        isServer
      } = options;
      const nextBabelRule = findNextBabelRule(config);

      if (!nextBabelRule || typeof nextBabelRule === 'string') {
        return config;
      }

      const loader = require.resolve('./webpack/next-static-context-loader');

      if (Array.isArray(nextBabelRule.use)) {
        const nextBabelUseItem = nextBabelRule.use.find(useItem => {
          if (isRuleSetUseItem(useItem)) {
            return useItem.loader === 'next-babel-loader';
          }

          return false;
        });
        nextBabelRule.use.push({
          loader,
          options: { ...(typeof nextBabelUseItem.options === 'object' && nextBabelUseItem.options),
            isServer
          }
        });
      } else {
        const nextBabelUseItem = nextBabelRule.use;
        nextBabelRule.use = [nextBabelRule.use, {
          loader,
          options: { ...(typeof nextBabelUseItem.options === 'object' && nextBabelUseItem.options),
            isServer
          }
        }];
      }

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }

      return config;
    }

  };
}