import { transform } from '@babel/core';
import plugin from '../next-static-context-transform';

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
    compact: true,
    caller: {
      name: 'tests',
      supportsStaticESM: esm,
    },
  })?.code;

describe('babel plugin (next-static-context-transform)', () => {
  it('should remove separate named export specifiers', () => {
    const output = babel(trim`
      export { a as getStaticContext } from '.'
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should retain extra named export specifiers', () => {
    const output = babel(trim`
      export { getStaticContext, foo, bar as baz } from '.'
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export{foo,bar as baz}from'.';export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should remove named export function declarations', () => {
    const output = babel(trim`
      export function getStaticContext() {
        return { props: {} }
      }
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should remove named export function declarations (async)', () => {
    const output = babel(trim`
      export async function getStaticContext() {
        return { props: {} }
      }
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should not remove extra named export function declarations', () => {
    const output = babel(trim`
      export function getStaticContext() {
        return { props: {} }
      }
      export function Noop() {}
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export function Noop(){}export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should remove named export variable declarations', () => {
    const output = babel(trim`
      export const getStaticContext = function() {
        return { props: {} }
      }
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should remove named export variable declarations (async)', () => {
    const output = babel(trim`
      export const getStaticContext = async function() {
        return { props: {} }
      }
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should not remove extra named export variable declarations', () => {
    const output = babel(trim`
      export const foo=2
      export const getStaticContext = function() {
        return { props: {} }
      }
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export const foo=2;export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should remove re-exported variable declarations', () => {
    const output = babel(trim`
      const getStaticContext = () => {
        return []
      }
      export { getStaticContext }
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should remove re-exported variable declarations (safe)', () => {
    const output = babel(trim`
      const getStaticContext = () => {
        return []
      }, a = 2
      export { getStaticContext }
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"const a=2;export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should remove re-exported function declarations', () => {
    const output = babel(trim`
      function getStaticContext() {
        return []
      }
      export { getStaticContext }
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should not crash for class declarations', () => {
    const output = babel(trim`
      function getStaticContext() {
        return []
      }
      export { getStaticContext }
      export class MyClass {}
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export class MyClass{}export default function Test(){return React.createElement('div');}"`
    );
  });

  it(`should remove re-exported function declarations' dependents (variables, functions, imports)`, () => {
    const output = babel(trim`
      import keep_me from 'hello'
      import {keep_me2} from 'hello2'
      import * as keep_me3 from 'hello3'
      import drop_me from 'bla'
      import { drop_me2 } from 'foo'
      import { drop_me3, but_not_me } from 'bar'
      import * as remove_mua from 'hehe'
      var leave_me_alone = 1;
      function dont_bug_me_either() {}
      const inceptionVar = 'hahaa';
      var var1 = 1;
      let var2 = 2;
      const var3 = inceptionVar + remove_mua;
      function inception1() {var2;drop_me2;}
      function abc() {}
      const b = function() {var3;drop_me3;};
      const b2 = function apples() {};
      const bla = () => {inception1};
      function getStaticContext() {
        abc();
        drop_me;
        b;
        b2;
        bla();
        return { props: {var1} }
      }
      export { getStaticContext }
      export default function Test() {
        return React.createElement('div')
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"import keep_me from'hello';import{keep_me2}from'hello2';import*as keep_me3 from'hello3';import{but_not_me}from'bar';var leave_me_alone=1;function dont_bug_me_either(){}export default function Test(){return React.createElement('div');}"`
    );
  });

  it('should not mix up bindings', () => {
    const output = babel(trim`
      function Function1() {
        return {
          a: function bug(a) {
            return 2;
          }
        };
      }
      function Function2() {
        var bug = 1;
        return { bug };
      }
      export { getStaticContext } from 'a'
    `);

    expect(output).toMatchInlineSnapshot(
      `"function Function1(){return{a:function bug(a){return 2;}};}function Function2(){var bug=1;return{bug};}"`
    );
  });

  it('should support class exports', () => {
    const output = babel(trim`
      export function getStaticContext() {
        return { props: {} }
      }
      export default class Test extends React.Component {
        render() {
          return React.createElement('div')
        }
      }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export default class Test extends React.Component{render(){return React.createElement('div');}}"`
    );
  });

  it('should support class exports 2', () => {
    const output = babel(trim`
      export function getStaticContext() {
        return { props: {} }
      }
      class Test extends React.Component {
        render() {
          return React.createElement('div')
        }
      }
      export default Test;
    `);

    expect(output).toMatchInlineSnapshot(
      `"class Test extends React.Component{render(){return React.createElement('div');}}export default Test;"`
    );
  });

  it('should support export { _ as default }', () => {
    const output = babel(trim`
      export function getStaticContext() {
        return { props: {} }
      }
      function El() {
        return React.createElement('div')
      }
      export { El as default }
    `);

    expect(output).toMatchInlineSnapshot(
      `"function El(){return React.createElement('div');}export{El as default};"`
    );
  });

  it('should support export { _ as default } with other specifiers', () => {
    const output = babel(trim`
      export function getStaticContext() {
        return { props: {} }
      }
      function El() {
        return React.createElement('div')
      }
      const a = 5
      export { El as default, a }
    `);

    expect(output).toMatchInlineSnapshot(
      `"function El(){return React.createElement('div');}const a=5;export{El as default,a};"`
    );
  });

  it('should support export { _ as default } with a class', () => {
    const output = babel(trim`
      export function getStaticContext() {
        return { props: {} }
      }
      class El extends React.Component {
        render() {
          return React.createElement('div')
        }
      }
      const a = 5
      export { El as default, a }
    `);

    expect(output).toMatchInlineSnapshot(
      `"class El extends React.Component{render(){return React.createElement('div');}}const a=5;export{El as default,a};"`
    );
  });

  it('should support full re-export', () => {
    const output = babel(trim`
      export { getStaticContext, default } from 'a'
    `);

    expect(output).toMatchInlineSnapshot(`"export{default}from'a';"`);
  });

  it('should support babel-style memoized function', () => {
    const output = babel(trim`
      function fn() {
        fn = function () {};
        return fn.apply(this, arguments);
      }
      export function getStaticContext() {
        fn;
      }
      export default function Home() { return React.createElement('div'); }
    `);

    expect(output).toMatchInlineSnapshot(
      `"export default function Home(){return React.createElement('div');}"`
    );
  });

  it('destructuring assignment (object)', () => {
    const output = babel(trim`
      import fs from 'fs';
      import other from 'other';
      const {readFile, readdir, access: foo} = fs.promises;
      const {a,b, cat: bar,...rem} = other;
      export async function getStaticContext() {
        readFile;
        readdir;
        foo;
        b;
        cat;
        rem;
      }
      export default function Home() { return React.createElement('div'); }
    `);

    expect(output).toMatchInlineSnapshot(
      `"import other from'other';const{a,cat:bar}=other;export default function Home(){return React.createElement('div');}"`
    );
  });

  it('destructuring assignment (array)', () => {
    const output = babel(trim`
      import fs from 'fs';
      import other from 'other';
      const [a, b, ...rest]= fs.promises;
      const [foo, bar] = other;
      export async function getStaticContext() {
        a;
        b;
        rest;
        bar;
      }
      export default function Home() { return React.createElement('div'); }
    `);

    expect(output).toMatchInlineSnapshot(
      `"import other from'other';const[foo]=other;export default function Home(){return React.createElement('div');}"`
    );
  });
});
