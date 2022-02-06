import React from 'react';
import { AppProps } from 'next/app';
import { StaticContext } from '.';

interface PagePropsWithContext extends Record<string, unknown> {
  staticContext: Record<string, unknown>;
}

interface AppPropsWithContext extends AppProps {
  pageProps: PagePropsWithContext;
}

export function App({
  Component,
  pageProps: { staticContext, ...pageProps },
}: AppPropsWithContext) {
  <StaticContext.Provider value={staticContext}>
    <Component {...pageProps} />
  </StaticContext.Provider>;
}

export function provideStaticContext(CustomApp: (appProps: AppProps) => JSX.Element) {
  return ({
    pageProps: { staticContext = {}, ...pageProps },
    ...appProps
  }: AppPropsWithContext) => {
    const customAppElement = CustomApp({ ...appProps, pageProps });
    return (
      <StaticContext.Provider value={staticContext}>{customAppElement}</StaticContext.Provider>
    );
  };
}
