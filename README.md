# next-static-context

![Build status badge](https://img.shields.io/github/workflow/status/newsguildny/next-static-context/Validation/main) ![latest npm version](https://img.shields.io/npm/v/next-static-context/latest)

`next-static-context` is a plugin for [Next.js](https://nextjs.org).

Define component-level data dependencies for statically built Next.js sites!

## Installation

Install `next-static-context`

... with `yarn`:

```sh
yarn add next-static-context
```

... with `npm`:

```sh
npm install next-static-context
```

## Basic setup

Update your [`next.config.js`](https://nextjs.org/docs/api-reference/next.config.js/introduction):

```javascript
const { withNextStaticContext } = require('next-static-context/config');

// This is a relative path to the directory that holds your
// React components.
module.exports = withStaticContext('./src/components', {
  // Custom Next.js config can go here, or
  // leave empty for default configuration.
});
```

Add a [custom `App` component](https://nextjs.org/docs/advanced-features/custom-app):

```typescript
export { App as default } from 'next-static-context/app';
```

## Usage

`next-static-context` allows you to define data dependencies for your components *in your component files*, to be fulfilled at build time.

This is particularly useful for [Jamstack](https://jamstack.org/) websites; websites that are compiled to static files at build time. With Next.js, this pattern is enabled by the [`getStaticPaths`](https://nextjs.org/docs/basic-features/data-fetching/get-static-paths) and [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching/get-static-props) functions. If all of your [`pages`](https://nextjs.org/docs/basic-features/pages) export a `getStaticPaths` function, you can export a completely static build of your site with [`next export`](https://nextjs.org/docs/advanced-features/static-html-export).

Components using this plugin declare data dependencies by exporting a `getStaticContext` function, and a `staticContextKey`:

```typescript
import fs from 'fs';
import path from 'path';
import { useStaticContext, StaticContextKey } from 'next-static-context';
import { Testimonial } from '../Testimonial';
import { CallToAction } from './CallToAction';

/**
 * getStaticContext functions can execute any server-side code
 * allowed from your build context. For Jamstack sites, this
 * is most often file system reads, as demonstrated here,
 * but it can also include database access or API calls.
 */
export function getStaticContext() {
  return fs
    .readdirSync(path.join(process.cwd(), 'src', 'markdown', 'testimonials'))
    .map((paper) => paper.slice(0, paper.length - 4));
}

/**
 * The static context key must be an instance of `StaticContextKey`,
 * and it must have a unique string identifier. The type param is
 * used to inform the Typescript compiler about the proper type
 * for the React hook!
 */
export const staticContextKey = new StaticContextKey<typeof getStaticContext>('highlightedTestimonials');

export function HighlightedTestimonials() {
  // The component itself can access the data retrieved by its
  // `getStaticContext` function via the `useStaticContext` hook
  const highlightedTestimonials = useStaticContext(staticContextKey);
  return (
    <>
      {highlightedTestimonials?.map((testimonial) => (
        <Testimonial key={testimonial.name} testimonial={testimonial} />
      ))}
      <CallToAction to="/testimonials">Read more testimonials</CallToAction>
    </>
  );
}
```

## Advanced Usage

### Custom `App` Component

If your application already relies on a custom `App`, you can wrap your `App` with `provideStaticContext`:

```tsx
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { provideStaticContext } from 'next-static-context/app';

function CustomApp({
  Component,
  pageProps,
}: AppProps) {
  return (
    <>
      <Head>
        <meta name="theme-color" content="#ff4040" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default provideStaticContext(CustomApp);
```

### Providing Static Context in other rendering environments

Some rendering environments require that you provide React Context providers explicitly. For this reason, `next-static-context` exports `StaticContext` and `buildStaticContextValue`.

Say we're using `next-mdx-remote` to server-side render MDX. `next-mdx-remote` exports a `renderToString` function that takes a `provider` option, which we can pass `StaticContext` to:

```typescript
import { StaticContext, buildStaticContextValue } from 'next-static-context';
import renderToString from 'next-mdx-remote/render-to-string';

const staticContextValue = await buildStaticContextValue();

const renderedMdx = renderToString(mdxSource, { components }, {
  provider: {
    component: StaticContext,
    props: {
      value: staticContextValue;
    }
  }
})
```

Under the hood, this is also how `next-static-context/app` provides the `StaticContext` context for your components to use via `useStaticContext`.

## API

```typescript

/**
 * @package 'next-static-context/config'
 * 
 * Takes a relative path to a directory of React components, and
 * an optional Next.js configuration object. Returns a Next.js
 * configuration object, enhanced for use with the
 * `next-static-context` plugin.
 */
function withStaticContext(componentsDir: string, nextConfig: NextConfig = {}): NextConfig;

/**
 * @package 'next-static-context'
 * 
 * A class representing unique keys for components to register
 * with the static context provider.
 * 
 * @param {string} key - Must be unique across all `StaticContextKey`
 *                       instances
 * 
 * @usage
 * 
 * It's recommended to define a `getStaticContext` function first,
 * and then directly pass `typeof getStaticContext` as the type
 * parameter to your `StaticContextKey`.
 * 
 * e.g.
 * 
 * export async function getStaticContext() { ... }
 * 
 * export const staticContextKey = new StaticContextKey<typeof getStaticContext>(
 *   'exampleKey'
 * );
 * 
 * **Note**: StaticContextKeys and getStaticContext functions *must
 * be exported*, even if they're only used in the file where they're
 * defined.
 */
class StaticContextKey<GetterType extends () => unknown> {
  constructor(public key: string) {}
}

/**
 * @package 'next-static-context'
 * 
 * @param {StaticContextKey<GetterType>} key - The StaticContextKey to retrieve data
 *                                             for.
 * 
 * @returns {Unwrap<ReturnType<GetterType>>} - The return value of the associated
 *                                             getStaticContext function. If the function
 *                                             returned a Promise, this hook will return
 *                                             the unwrapped Promise value.
 */
function useStaticContext<GetterType>(key: StaticContextKey<GetterType>): Unwrap<ReturnType<GetterType>>;


/**
 * @package 'next-static-context/app'
 * 
 * A drop-in replacement for `next/app` that provides `StaticContext`
 * for all child components.
 */
function App(appProps: AppProps): JSX.Element;

/**
 * @package 'next-static-context/app'
 * 
 * A higher-order function that takes a custom Next.js App function
 * and enhances it to provide `StaticContext` for all child components.
 */
function provideStaticContext(CustomApp: (appProps: AppProps) => JSX.Element): JSX.Element;

/**
 * @package 'next-static-context'
 * 
 * The React Context that makes your components' data available via
 * `useStaticContext`.
 * 
 * You most likely do not need to use this directly, unless you're
 * rendering your components in a non-standard environment (such as
 * from MDX).
 */
const StaticContext: React.Context<Record<string, unknown>>;

/**
 * @package 'next-static-context'
 * 
 * A function that will construct your data record, to be passed as
 * the value to `StaticContext.Provider`.
 * 
 * You most likely do not need to use this directly, unless you're
 * rendering your components in a non-standard environment (such as
 * from MDX).
 */
function buildStaticContextValue(): Promise<Record<string, unknown>>;
```
