/* eslint-disable jest/no-interpolation-in-snapshots */
import { transform } from '@babel/core';
import plugin from '../next-static-context-getstaticprops-transform';

const trim = (s: TemplateStringsArray) => s.join('\n').trim().replace(/^\s+/gm, '');

// avoid generating __source annotations in JSX during testing:
const { NODE_ENV } = process.env;
process.env.NODE_ENV = 'production';

process.env.NODE_ENV = NODE_ENV;

const babel = (code: string, esm = true, pluginOptions = {}) =>
  transform(code, {
    filename: 'noop.js',
    plugins: [[plugin, pluginOptions]],
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    compact: false,
    caller: {
      name: 'tests',
      supportsStaticESM: esm,
    },
  })?.code;

describe('babel plugin (next-static-context-transform)', () => {
  it('should wrap getStaticProps function declarations', () => {
    const output = babel(trim`
      export function getStaticProps({params}) {
        const slug = params.slug[0] || 'index';
        return {
          props: {
            slug,
          },
        };
      }
    `);

    expect(output).toMatchInlineSnapshot(`
      "import { getStaticContext } from \\"next-static-context\\";

      function _getStaticProps({
        params
      }) {
        const slug = params.slug[0] || 'index';
        return {
          props: {
            slug
          }
        };
      }

      export async function getStaticProps(...args) {
        const originalStaticProps = _getStaticProps(...args);

        const staticContext = await getStaticContext(require.context(process.env.NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT));
        return { ...originalStaticProps,
          props: { ...originalStaticProps.props,
            staticContext
          }
        };
      }"
    `);
  });

  it('should maintain async function declarations', () => {
    const output = babel(trim`
      export async function getStaticProps({params}) {
        const slug = params.slug[0] || 'index';
        return {
          props: {
            slug,
          },
        };
      }
    `);

    expect(output).toMatchInlineSnapshot(`
      "import { getStaticContext } from \\"next-static-context\\";

      async function _getStaticProps({
        params
      }) {
        const slug = params.slug[0] || 'index';
        return {
          props: {
            slug
          }
        };
      }

      export async function getStaticProps(...args) {
        const originalStaticProps = await _getStaticProps(...args);
        const staticContext = await getStaticContext(require.context(process.env.NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT));
        return { ...originalStaticProps,
          props: { ...originalStaticProps.props,
            staticContext
          }
        };
      }"
    `);
  });

  it('should wrap getStaticProps variable declarations', () => {
    const output = babel(trim`
      export const getStaticProps = function({params}) {
        const slug = params.slug[0] || 'index';
        return {
          props: {
            slug,
          },
        };
      }
    `);

    expect(output).toMatchInlineSnapshot(`
      "import { getStaticContext } from \\"next-static-context\\";

      function _getStaticProps({
        params
      }) {
        const slug = params.slug[0] || 'index';
        return {
          props: {
            slug
          }
        };
      }

      export async function getStaticProps(...args) {
        const originalStaticProps = _getStaticProps(...args);

        const staticContext = await getStaticContext(require.context(process.env.NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT));
        return { ...originalStaticProps,
          props: { ...originalStaticProps.props,
            staticContext
          }
        };
      }"
    `);
  });

  it('should not attempt to import getStaticContext if already imported', () => {
    const output = babel(trim`
      import { getStaticContext } from "next-static-context";

      export function getStaticProps({params}) {
        const staticContext = getStaticContext(require.context(process.env.NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT));
        const slug = params.slug[0] || 'index';
        return {
          props: {
            slug,
            staticContext,
          },
        };
      }
    `);

    expect(output).toMatchInlineSnapshot(`
      "import { getStaticContext } from \\"next-static-context\\";

      function _getStaticProps({
        params
      }) {
        const staticContext = getStaticContext(require.context(process.env.NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT));
        const slug = params.slug[0] || 'index';
        return {
          props: {
            slug,
            staticContext
          }
        };
      }

      export async function getStaticProps(...args) {
        const originalStaticProps = _getStaticProps(...args);

        const staticContext = await getStaticContext(require.context(process.env.NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT));
        return { ...originalStaticProps,
          props: { ...originalStaticProps.props,
            staticContext
          }
        };
      }"
    `);
  });
});
