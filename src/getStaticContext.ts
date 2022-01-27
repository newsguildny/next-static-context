export async function getStaticContext() {
  const context = require.context(
    process.env.NEXT_STATIC_CONTEXT_REQUIRE_CONTEXT!,
    true,
    /\.[tj]sx?$/
  );
  const contextGetters: Record<string, () => unknown> = {};
  context.keys().forEach((key) => {
    const m = context(key);
    if (m.getStaticContext && m.staticContextKey) {
      contextGetters[m.staticContextKey.key] = m.getStaticContext;
    }
  });
  return Object.fromEntries(
    await Promise.all(
      Object.entries(contextGetters).map(async ([key, getter]) => [key, await getter()])
    )
  );
}
