import { createContext, useContext } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class StaticContextKey<GetterType extends (slug?: string) => unknown> {
  constructor(public key: string) {}
}

export const StaticContext = createContext<Record<string, unknown>>({});

export function useStaticContext<GetterType extends (slug?: string) => unknown>(
  key: StaticContextKey<GetterType>
) {
  const context = useContext(StaticContext);
  return context[key.key] as Unpacked<ReturnType<GetterType>>;
}

export async function getStaticContext(context: ReturnType<typeof require.context>) {
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
