const RANDOM_SUFFIX_LENGTH = 12;

export function generateId(prefix = "id"): string {
  const suffix = Math.random()
    .toString(36)
    .slice(2, 2 + RANDOM_SUFFIX_LENGTH);
  return `${prefix}_${suffix}`;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertUnreachable(value: never, message = "Unexpected value"): never {
  throw new Error(`${message}: ${String(value)}`);
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function chunk<T>(source: readonly T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("chunk size must be greater than zero");
  }

  const result: T[][] = [];
  for (let index = 0; index < source.length; index += size) {
    result.push(source.slice(index, index + size));
  }
  return result;
}

export function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

export function partition<T>(
  items: readonly T[],
  predicate: (item: T, index: number) => boolean,
): [T[], T[]] {
  const matched: T[] = [];
  const rest: T[] = [];

  items.forEach((item, index) => {
    if (predicate(item, index)) {
      matched.push(item);
    } else {
      rest.push(item);
    }
  });

  return [matched, rest];
}
