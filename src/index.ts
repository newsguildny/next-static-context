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
