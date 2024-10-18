export type Callback<T> = (callback: T) => T

export type Maybe<T> = T | undefined

export type UnknownArray<T> = T[]

export type KeyedFunction<T extends string, V> = {
  [K in T]: (value?: unknown) => V
}

export type KeyedFunctionGroup<T extends [string, any][]> = {
  [K in T[number] as K[0]]: (value?: K[1]) => K[1];
}
