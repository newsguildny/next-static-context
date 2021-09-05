declare module 'babel-loader' {
  type Babel = import('@babel/core');
  type PartialConfig = import('@babel/core').PartialConfig;
  type TransformOptions = import('@babel/core').TransformOptions;
  type Loader = import('webpack').LoaderDefinitionFunction;
  type LoaderContext = import('webpack').LoaderContext;
  type RawSourceMap = import('source-map').RawSourceMap;

  interface LoaderOptions extends Record<string, unknown> {
    cacheDirectory?: boolean | string;
    cacheIdentifier?: string;
    cacheCompression?: boolean;
    customize?: string;
  }

  interface ConfigOptions<CustomOptions> {
    source: string | Buffer;
    map: RawSourceMap;
    customOptions: CustomOptions;
  }

  interface Overrides<CustomOptions> {
    customOptions(
      this: LoaderContext,
      options: LoaderOptions,
      source: { source: string | Buffer; sourceMap?: RawSourceMap }
    ): {
      loader: LoaderOptions;
      custom: CustomOptions;
    };
    config(
      this: LoaderContext,
      cfg: PartialConfig,
      options: ConfigOptions<CustomOptions>
    ): TransformOptions;
  }

  function makeLoader<CustomOptions>(callback: (babel: Babel) => Overrides<CustomOptions>): Loader;
  export const custom = makeLoader;
}
