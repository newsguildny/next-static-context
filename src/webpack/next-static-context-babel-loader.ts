import { custom } from 'babel-loader';

export default custom<{ isServer: boolean }>(() => {
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
        isServer: isServer as boolean,
      };

      return { loader: loaderOptions, custom: customOptions };
    },
    config(cfg, { customOptions: { isServer } }) {
      const { ...options } = cfg.options;
      if (!isServer) {
        options.plugins!.push([require.resolve('../babel/next-static-context-transform'), {}]);
      } else {
        options.plugins!.push([
          require.resolve('../babel/next-static-context-getstaticprops-transform'),
          {},
        ]);
      }
      return options;
    },
  };
});
