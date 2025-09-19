# @repo/utils

Lightweight, dependency-free helpers we use across the monorepo. Every export is fully typed, runtime safe, and works in both browser and server runtimes.

## Exports

| Function | Description |
| --- | --- |
| `generateId(prefix?: string)` | Returns a short random identifier such as `task_ab12cd34ef56`. Use for ephemeral records or tests. |
| `wait(ms)` | Returns a promise that resolves after `ms` milliseconds. Useful in integration tests or staged UI flows. |
| `assertUnreachable(value, message?)` | Exhaustiveness guard for discriminated unions. Throws if hit at runtime. |
| `isDefined(value)` | Type guard that removes `null`/`undefined` from arrays. |
| `clamp(value, min, max)` | Keeps a number inside the inclusive range `[min, max]`. |
| `chunk(array, size)` | Splits an array into evenly-sized chunks. Throws if `size <= 0`. |
| `unique(array)` | Returns the unique values from an array while preserving order. |
| `partition(array, predicate)` | Splits items into `[matches, rest]` buckets using the provided predicate. |

## Quick start

```ts
import {
  assertUnreachable,
  chunk,
  clamp,
  generateId,
  isDefined,
  partition,
  unique,
  wait,
} from "@repo/utils";

const requestId = generateId("request");
await wait(120);

const [complete, upcoming] = partition(tasks, (task) => task.isComplete);
const batches = chunk(unique(students.map((s) => s.id)), 10);

function mapIntent(intent: "learn" | "practice") {
  switch (intent) {
    case "learn":
      return "Learn it";
    case "practice":
      return "Practice it";
    default:
      return assertUnreachable(intent);
  }
}
```

## Design principles

- **No runtime dependencies.** The helpers are pure TypeScript so the package stays tiny and tree‑shakeable.
- **Type-first ergonomics.** Utility APIs are shaped to improve developer experience when working with strict TypeScript settings.
- **Composable, not exhaustive.** Add helpers here only when they solve a cross-cutting concern. Keep the surface area intentional to avoid entropy.

If you need another shared helper, add it alongside tests and update this table so consumers know what is available.
