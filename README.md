# Next.js Static Context Plugin

`next-static-context` is a Next.js plugin that adds support for the a "static context" pattern for statically built Next.js applications. 

In the static context pattern, components can define server-side-executed functions named `getStaticContext` that return data that will be made available via a React Context. This is particularly useful for Next.js applications that use MDX, and therefore have a layer of indirection between component definitions and Next.js page definitions.

This plugin simply strips out any functions named `getStaticContext` when compiling the client-side bundles, along with any references that were only used by those functions. This means that `getStaticContext` can use node-only imports (like `path` and `fs`) in the same module as client-side component code.

## Example

In the following example, we have a React component that's intended to be used in MDX in a Netlify CMS application powered by Next.js.

The `useStaticContext` hook is not (yet) provided by this plugin, and has to be implemented in the application.

```tsx
import fs from 'fs';
import path from 'path';
import { useStaticContext } from '../../lib/staticContext/useStaticContext';
import { Testimonial } from '../Testimonial';
import { CallToAction } from './CallToAction';

export const STATIC_CONTEXT_KEY = 'highlightedTestimonials';

export function getStaticContext() {
  return fs
    .readdirSync(path.join(process.cwd(), 'src', 'markdown', 'testimonials'))
    .map((paper) => paper.slice(0, paper.length - 4));
}

export function HighlightedTestimonials() {
  const highlightedTestimonials = useStaticContext(STATIC_CONTEXT_KEY);
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