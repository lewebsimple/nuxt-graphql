export type IsEmptyObject<T> = [T] extends [never] ? true : T extends object ? keyof T extends never ? true : false : false;
