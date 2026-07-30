import { ref, toValue, type MaybeRefOrGetter, type Ref } from "vue";

// Minimal stand-in for the parts of `#app` used by `useAsyncGraphQLQuery`, aliased in
// `vitest.config.ts`. It mirrors the Nuxt behaviour the composable depends on:
// `useAsyncData` applies `transform` to the handler result and stores the *transformed* value in
// both `nuxtApp.payload.data[key]` and the reactive `nuxtApp._asyncData[key].data` entry
// (nuxt/dist/app/composables/asyncData.js), and it skips the handler when the payload already
// holds a value for the key.

/** Result shape returned by the stubbed `$executeOperation`. */
export type StubExecuteResult = { data?: unknown; error?: unknown };

/** Stubbed Nuxt app instance. One instance stands in for one server request. */
export type StubNuxtApp = {
  payload: { data: Record<string, unknown> };
  _asyncData: Record<string, { data: Ref<unknown> } | undefined>;
  $executeOperation: (input: {
    operationName: string;
    variables: unknown;
  }) => Promise<StubExecuteResult>;
  /** Number of times `$executeOperation` has been called on this instance. */
  calls: number;
};

let activeNuxtApp: StubNuxtApp | undefined;

/**
 * Create a stubbed Nuxt app backed by the given operation executor.
 *
 * @param execute Executor invoked by `$executeOperation`.
 * @returns A stubbed Nuxt app instance.
 */
export function createStubNuxtApp(
  execute: (input: { operationName: string; variables: unknown }) => Promise<StubExecuteResult>,
): StubNuxtApp {
  const app: StubNuxtApp = {
    payload: { data: {} },
    _asyncData: {},
    calls: 0,
    $executeOperation: (input) => {
      app.calls += 1;
      return execute(input);
    },
  };

  return app;
}

/**
 * Set the Nuxt app returned by `useNuxtApp`.
 *
 * @param app Stubbed Nuxt app instance, or `undefined` to clear it.
 */
export function setActiveNuxtApp(app: StubNuxtApp | undefined): void {
  activeNuxtApp = app;
}

/** @returns The active stubbed Nuxt app. */
export function useNuxtApp(): StubNuxtApp {
  if (!activeNuxtApp) throw new Error("No stubbed Nuxt app is active.");
  return activeNuxtApp;
}

/** @returns A runtime config with an empty global GraphQL cache configuration. */
export function useRuntimeConfig() {
  return { public: { graphql: { cacheConfig: {} } } };
}

type StubAsyncDataOptions<TRaw, TTransformed> = {
  transform?: (input: TRaw) => TTransformed;
};

/**
 * Stubbed `useAsyncData` reproducing the Nuxt transform and payload semantics.
 *
 * @param key Reactive or plain cache key.
 * @param handler Data handler.
 * @param options Async data options, of which only `transform` is honoured.
 * @returns An awaitable async data object.
 */
export function useAsyncData<TRaw, TError, TTransformed>(
  key: MaybeRefOrGetter<string>,
  handler: () => Promise<TRaw>,
  options: StubAsyncDataOptions<TRaw, TTransformed> = {},
) {
  const nuxtApp = useNuxtApp();
  const initialKey = toValue(key);

  const entry = (nuxtApp._asyncData[initialKey] ??= { data: ref() });
  const data = entry.data as Ref<TTransformed | undefined>;
  const pending = ref(false);
  const error = ref<TError | undefined>();

  async function run(): Promise<void> {
    pending.value = true;
    try {
      const raw = await handler();
      const currentKey = toValue(key);
      nuxtApp._asyncData[currentKey] ??= { data };

      const value = (options.transform ? options.transform(raw) : raw) as TTransformed;
      data.value = value;
      nuxtApp.payload.data[currentKey] = value;
      error.value = undefined;
    } catch (cause) {
      error.value = cause as TError;
    } finally {
      pending.value = false;
    }
  }

  const asyncData = { data, pending, error, refresh: run, execute: run };

  // Hydration: Nuxt returns the payload value without running the handler.
  const hydrated = nuxtApp.payload.data[initialKey];
  if (hydrated !== undefined) {
    data.value = hydrated as TTransformed;
    return Object.assign(Promise.resolve(asyncData), asyncData);
  }

  return Object.assign(
    run().then(() => asyncData),
    asyncData,
  );
}
