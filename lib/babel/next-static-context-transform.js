"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = nextTransformStaticContext;
exports.EXPORT_NAME_GET_STATIC_CONTEXT = void 0;
const EXPORT_NAME_GET_STATIC_CONTEXT = 'getStaticContext';
exports.EXPORT_NAME_GET_STATIC_CONTEXT = EXPORT_NAME_GET_STATIC_CONTEXT;

const isDataIdentifier = name => {
  return name === EXPORT_NAME_GET_STATIC_CONTEXT;
};

function nextTransformStaticContext({
  types: t
}) {
  function getIdentifier(path) {
    const {
      parentPath
    } = path;

    if (parentPath.type === 'VariableDeclarator') {
      const pp = parentPath;
      const name = pp.get('id');
      return name.node.type === 'Identifier' ? name : null;
    }

    if (parentPath.type === 'AssignmentExpression') {
      const pp = parentPath;
      const name = pp.get('left');
      return name.node.type === 'Identifier' ? name : null;
    }

    if (path.node.type === 'ArrowFunctionExpression') {
      return null;
    }

    return path.node.id && path.node.id.type === 'Identifier' ? path.get('id') : null;
  }

  function isIdentifierReferenced(ident) {
    const b = ident.scope.getBinding(ident.node.name);

    if (b !== null && b !== void 0 && b.referenced) {
      // Functions can reference themselves, so we need to check if there's a
      // binding outside the function scope or not.
      if (b.path.type === 'FunctionDeclaration') {
        return !b.constantViolations.concat(b.referencePaths) // Check that every reference is contained within the function:
        .every(ref => ref.findParent(p => p === b.path));
      }

      return true;
    }

    return false;
  }

  function markFunction(path, state) {
    const ident = getIdentifier(path);

    if (ident !== null && ident !== void 0 && ident.node && isIdentifierReferenced(ident)) {
      state.refs.add(ident);
    }
  }

  function markImport(path, state) {
    const local = path.get('local');

    if (isIdentifierReferenced(local)) {
      state.refs.add(local);
    }
  }

  return {
    visitor: {
      Program: {
        enter(path, state) {
          state.refs = new Set();
          state.done = false;
          path.traverse({
            VariableDeclarator(variablePath, variableState) {
              if (variablePath.node.id.type === 'Identifier') {
                const local = variablePath.get('id');

                if (isIdentifierReferenced(local)) {
                  variableState.refs.add(local);
                }
              } else if (variablePath.node.id.type === 'ObjectPattern') {
                const pattern = variablePath.get('id');
                const properties = pattern.get('properties');
                properties.forEach(p => {
                  const local = p.get( // eslint-disable-next-line no-nested-ternary
                  p.node.type === 'ObjectProperty' ? 'value' : p.node.type === 'RestElement' ? 'argument' : (() => {
                    throw new Error('invariant');
                  })());

                  if (isIdentifierReferenced(local)) {
                    variableState.refs.add(local);
                  }
                });
              } else if (variablePath.node.id.type === 'ArrayPattern') {
                const pattern = variablePath.get('id');
                const elements = pattern.get('elements');
                elements.forEach(e => {
                  var _e$node, _e$node2;

                  let local;

                  if (((_e$node = e.node) === null || _e$node === void 0 ? void 0 : _e$node.type) === 'Identifier') {
                    local = e;
                  } else if (((_e$node2 = e.node) === null || _e$node2 === void 0 ? void 0 : _e$node2.type) === 'RestElement') {
                    local = e.get('argument');
                  } else {
                    return;
                  }

                  if (isIdentifierReferenced(local)) {
                    variableState.refs.add(local);
                  }
                });
              }
            },

            FunctionDeclaration: markFunction,
            FunctionExpression: markFunction,
            ArrowFunctionExpression: markFunction,
            ImportSpecifier: markImport,
            ImportDefaultSpecifier: markImport,
            ImportNamespaceSpecifier: markImport,

            ExportNamedDeclaration(exportNamedPath) {
              const specifiers = exportNamedPath.get('specifiers');

              if (specifiers.length) {
                specifiers.forEach(s => {
                  if (isDataIdentifier(t.isIdentifier(s.node.exported) ? s.node.exported.name : s.node.exported.value)) {
                    s.remove();
                  }
                });

                if (exportNamedPath.node.specifiers.length < 1) {
                  exportNamedPath.remove();
                }

                return;
              }

              const decl = exportNamedPath.get('declaration');

              if (decl == null || decl.node == null) {
                return;
              }

              switch (decl.node.type) {
                case 'FunctionDeclaration':
                  {
                    const {
                      name
                    } = decl.node.id;

                    if (isDataIdentifier(name)) {
                      exportNamedPath.remove();
                    }

                    break;
                  }

                case 'VariableDeclaration':
                  {
                    const inner = decl.get('declarations');
                    inner.forEach(d => {
                      if (d.node.id.type !== 'Identifier') {
                        return;
                      }

                      const {
                        name
                      } = d.node.id;

                      if (isDataIdentifier(name)) {
                        d.remove();
                      }
                    });
                    break;
                  }

                default:
                  {
                    break;
                  }
              }
            }

          }, state);
          const {
            refs
          } = state;
          let count;

          function sweepFunction(sweepPath) {
            const ident = getIdentifier(sweepPath);

            if (ident !== null && ident !== void 0 && ident.node && refs.has(ident) && !isIdentifierReferenced(ident)) {
              ++count;

              if (t.isAssignmentExpression(sweepPath.parentPath) || t.isVariableDeclarator(sweepPath.parentPath)) {
                sweepPath.parentPath.remove();
              } else {
                sweepPath.remove();
              }
            }
          }

          function sweepImport(sweepPath) {
            const local = sweepPath.get('local');

            if (refs.has(local) && !isIdentifierReferenced(local)) {
              ++count;
              sweepPath.remove();

              if (sweepPath.parent.specifiers.length === 0) {
                sweepPath.parentPath.remove();
              }
            }
          }

          do {
            path.scope.crawl();
            count = 0;
            path.traverse({
              // eslint-disable-next-line no-loop-func
              VariableDeclarator(variablePath) {
                if (variablePath.node.id.type === 'Identifier') {
                  const local = variablePath.get('id');

                  if (refs.has(local) && !isIdentifierReferenced(local)) {
                    ++count;
                    variablePath.remove();
                  }
                } else if (variablePath.node.id.type === 'ObjectPattern') {
                  const pattern = variablePath.get('id');
                  const beforeCount = count;
                  const properties = pattern.get('properties');
                  properties.forEach(p => {
                    const local = p.get( // eslint-disable-next-line no-nested-ternary
                    p.node.type === 'ObjectProperty' ? 'value' : p.node.type === 'RestElement' ? 'argument' : (() => {
                      throw new Error('invariant');
                    })());

                    if (refs.has(local) && !isIdentifierReferenced(local)) {
                      ++count;
                      p.remove();
                    }
                  });

                  if (beforeCount !== count && pattern.get('properties').length < 1) {
                    variablePath.remove();
                  }
                } else if (variablePath.node.id.type === 'ArrayPattern') {
                  const pattern = variablePath.get('id');
                  const beforeCount = count;
                  const elements = pattern.get('elements');
                  elements.forEach(e => {
                    var _e$node3, _e$node4;

                    let local;

                    if (((_e$node3 = e.node) === null || _e$node3 === void 0 ? void 0 : _e$node3.type) === 'Identifier') {
                      local = e;
                    } else if (((_e$node4 = e.node) === null || _e$node4 === void 0 ? void 0 : _e$node4.type) === 'RestElement') {
                      local = e.get('argument');
                    } else {
                      return;
                    }

                    if (refs.has(local) && !isIdentifierReferenced(local)) {
                      ++count;
                      e.remove();
                    }
                  });

                  if (beforeCount !== count && pattern.get('elements').length < 1) {
                    variablePath.remove();
                  }
                }
              },

              FunctionDeclaration: sweepFunction,
              FunctionExpression: sweepFunction,
              ArrowFunctionExpression: sweepFunction,
              ImportSpecifier: sweepImport,
              ImportDefaultSpecifier: sweepImport,
              ImportNamespaceSpecifier: sweepImport
            });
          } while (count);
        }

      }
    }
  };
}