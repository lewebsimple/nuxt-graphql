export type IsEmptyObject<T> = T extends Record<string, never> ? true : keyof T extends never ? true : false;
