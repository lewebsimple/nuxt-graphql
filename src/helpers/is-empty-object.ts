// Type utility to check if an object type is empty
export type IsEmptyObject<T> = T extends Record<string, never> ? true : keyof T extends never ? true : false;
