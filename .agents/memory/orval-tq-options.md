---
name: Orval + TanStack Query v5 partial options type cast
description: Generated hooks require queryKey in UseQueryOptions — cast partial overrides with as any
---

## Rule
When passing partial query options to Orval-generated hooks (e.g. `refetchInterval`, `enabled`), TypeScript requires `queryKey` in `UseQueryOptions<...>`. The workaround is `as any`.

**Why:** TanStack Query v5 `UseQueryOptions` interface requires `queryKey`. Orval generates hooks with the full non-partial type, so passing `{ refetchInterval: 30000 }` fails typechecking without casting.

**How to apply:**
```ts
// Correct pattern with cast
const { data } = useGetSomething({ query: { refetchInterval: 30000 } as any });
// Or: for enabled: false, the QueryClient defaultOptions already sets retry: false globally,
// so you can omit { query: { retry: false } } entirely.
```

The `App.tsx` QueryClient already has `retry: false` and `refetchOnWindowFocus: false` as defaults, so those options don't need to be passed to individual hooks.
