# Next.js Static Context Plugin

`next-static-context` is a Next.js plugin that adds support for the a "static context" pattern for statically built Next.js applications. 

In the static context pattern, components can define server-side-executed functions named `getStaticContext` that return data that will be made available via a React Context. This is particularly useful for Next.js applications that use MDX, and therefore have a layer of indirection between component definitions and Next.js page definitions.

On the client side, this plugin simply strips out any functions named `getStaticContext` when compiling the client-side bundles, along with any references that were only used by those functions. This means that `getStaticContext` can use node-only imports (like `path` and `fs`) in the same module as client-side component code.

On the server side, this plugin modifies any `getStaticProps` functions to include an additional prop, `staticContext`, which can be used to hydrate the provided `StaticContext`, which is a React context.

## Example

In the following example, we have a React component that's intended to be used in MDX in a Netlify CMS application powered by Next.js.


```tsx
import fs from 'fs';
import path from 'path';
import { useStaticContext, StaticContextKey } from 'next-static-context';
import { Testimonial } from '../Testimonial';
import { CallToAction } from './CallToAction';

export function getStaticContext() {
  return fs
    .readdirSync(path.join(process.cwd(), 'src', 'markdown', 'testimonials'))
    .map((paper) => paper.slice(0, paper.length - 4));
}

export const staticContextKey = new StaticContextKey<typeof getStaticContext>('highlightedTestimonials');

export function HighlightedTestimonials() {
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

In `pages/_app.tsx`, we can use the provided `StaticContext` provider:

```tsx
export default function AppWithContext({
  Component,
  pageProps: { staticContext, ...pageProps },
}: AppPropsWithContext) {
  return (
    <StaticContext.Provider value={staticContext}>
      <Component {...pageProps} />
    </StaticContext.Provider>
  )
```

And that's all! Now, when our `HighlightedTestimonials` component is rendered, both on the client and on the server, it will be provided with the result of its `getStaticContext` function via the `useStaticContext` hook.
