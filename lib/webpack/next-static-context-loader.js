"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _babelLoader = require("babel-loader");

var _default = (0, _babelLoader.custom)(() => {
  return {
    customOptions(options) {
      const {
        isServer,
        cache,
        distDir,
        pagesDir,
        development,
        hasReactRefresh,
        hasJsxRuntime,
        ...loaderOptions
      } = options;
      const customOptions = {
        isServer: isServer
      };
      return {
        loader: loaderOptions,
        custom: customOptions
      };
    },

    config(cfg, {
      customOptions: {
        isServer
      }
    }) {
      const { ...options
      } = cfg.options;

      if (!isServer) {
        options.plugins.push([require.resolve('../babel/next-static-context-transform'), {}]);
      }

      return options;
    }

  };
});

exports.default = _default;