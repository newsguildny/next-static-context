/* eslint-disable no-nested-ternary */
import { NodePath, PluginObj, types as BabelTypes } from '@babel/core';

export const EXPORT_NAME_GET_STATIC_PROPS = 'getStaticProps';

const ssgExports = new Set([
  EXPORT_NAME_GET_STATIC_PROPS,

  // legacy methods added so build doesn't fail from importing
  // server-side only methods
  `unstable_getStaticProps`,
]);

type PluginState = {
  done: boolean;
  needsImport: boolean;
};

export function isGetStaticProps(
  node: BabelTypes.FunctionDeclaration | BabelTypes.VariableDeclarator
): boolean {
  switch (node.type) {
    case 'FunctionDeclaration': {
      return !!node.id && ssgExports.has(node.id.name);
    }
    case 'VariableDeclarator': {
      const lval = node.id;
      if (lval.type === 'Identifier') {
        return ssgExports.has(lval.name);
      }
      return false;
    }
    default:
      return false;
  }
}

export default function transformNextGetStaticPropsWithStaticContext({
  types: t,
}: {
  types: typeof BabelTypes;
}): PluginObj<PluginState> {
  function transform(
    exportNamedPath: NodePath<BabelTypes.ExportNamedDeclaration>,
    needsImport: boolean,
    params: (BabelTypes.Identifier | BabelTypes.RestElement | BabelTypes.Pattern)[],
    body: BabelTypes.BlockStatement,
    async?: boolean
  ) {
    const originalGetStaticProps = t.functionDeclaration(
      t.identifier('_getStaticProps'),
      params,
      body,
      false,
      async
    );
    const newBody = t.blockStatement([
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('originalStaticProps'),
          async
            ? t.awaitExpression(
                t.callExpression(t.identifier('_getStaticProps'), [
                  t.spreadElement(t.identifier('args')),
                ])
              )
            : t.callExpression(t.identifier('_getStaticProps'), [
                t.spreadElement(t.identifier('args')),
              ])
        ),
      ]),
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('staticContext'),
          t.awaitExpression(
            t.callExpression(t.identifier('getStaticContext'), [
              t.callExpression(
                t.memberExpression(t.identifier('require'), t.identifier('context')),
                [
                  t.memberExpression(
                    t.memberExpression(t.identifier('process'), t.identifier('env')),
                    t.identifier('NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT')
                  ),
                ]
              ),
            ])
          )
        ),
      ]),
      t.returnStatement(
        t.objectExpression([
          t.spreadElement(t.identifier('originalStaticProps')),
          t.objectProperty(
            t.identifier('props'),
            t.objectExpression([
              t.spreadElement(
                t.memberExpression(t.identifier('originalStaticProps'), t.identifier('props'))
              ),
              t.objectProperty(
                t.identifier('staticContext'),
                t.identifier('staticContext'),
                false,
                true
              ),
            ])
          ),
        ])
      ),
    ]);
    const newParams = [t.restElement(t.identifier('args'))];
    const newGetStaticProps = t.functionDeclaration(
      t.identifier('getStaticProps'),
      newParams,
      newBody,
      false,
      true
    );
    const newExport = t.exportNamedDeclaration(newGetStaticProps);

    const getStaticContextImport = t.importDeclaration(
      [t.importSpecifier(t.identifier('getStaticContext'), t.identifier('getStaticContext'))],
      t.stringLiteral('next-static-context')
    );
    if (needsImport) {
      (exportNamedPath.parentPath as NodePath<BabelTypes.Program>).unshiftContainer(
        'body',
        getStaticContextImport
      );
    }
    exportNamedPath.replaceWithMultiple([originalGetStaticProps, newExport]);
  }

  return {
    visitor: {
      Program: {
        enter(path, state) {
          state.done = false;
          state.needsImport = true;

          path.traverse(
            {
              ImportDeclaration(importDeclarationPath, importDeclarationState) {
                if (
                  importDeclarationPath.node.source.value === 'next-static-context' &&
                  importDeclarationPath.node.specifiers.some(
                    (specifier) =>
                      t.isImportSpecifier(specifier) &&
                      t.isIdentifier(specifier.local) &&
                      specifier.local.name === 'getStaticContext'
                  )
                ) {
                  importDeclarationState.needsImport = false;
                }
              },
            },
            state
          );

          path.traverse(
            {
              ExportNamedDeclaration(exportNamedPath, exportNamedState) {
                const { declaration } = exportNamedPath.node;
                if (t.isFunctionDeclaration(declaration)) {
                  if (!isGetStaticProps(declaration)) {
                    return;
                  }
                  if (exportNamedState.done) {
                    return;
                  }
                  exportNamedState.done = true;
                  const { params, body, async } = declaration;
                  transform(exportNamedPath, exportNamedState.needsImport, params, body, async);
                  return;
                }
                if (t.isVariableDeclaration(declaration)) {
                  const functionDeclarator = declaration.declarations.find(
                    (declarator) =>
                      t.isFunctionExpression(declarator.init) ||
                      t.isArrowFunctionExpression(declarator.init)
                  ) as BabelTypes.VariableDeclarator;
                  if (!functionDeclarator || !isGetStaticProps(functionDeclarator)) {
                    return;
                  }
                  if (exportNamedState.done) {
                    return;
                  }
                  exportNamedState.done = true;
                  const functionExpression = functionDeclarator.init as
                    | BabelTypes.FunctionExpression
                    | BabelTypes.ArrowFunctionExpression;
                  const { params, body, async } = functionExpression;
                  const functionBody = t.isExpression(body)
                    ? t.blockStatement([t.returnStatement(body)])
                    : body;
                  transform(
                    exportNamedPath,
                    exportNamedState.needsImport,
                    params,
                    functionBody,
                    async
                  );
                }
              },
            },
            state
          );
        },
      },
    },
  };
}
