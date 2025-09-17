# @repo/utils

Shared utilities and helper functions for the Bemo platform, providing common functionality across all packages and applications.

## Overview

This package contains utility functions, helper methods, and common tools that are used throughout the Bemo monorepo. It promotes code reuse, consistency, and maintainability by centralizing frequently used operations.

## Key Features

- **ID Generation**: Consistent identifier creation across the platform
- **Async Utilities**: Promise-based helper functions
- **Type Utilities**: Common TypeScript type helpers
- **Validation Helpers**: Input validation and sanitization
- **Performance Utilities**: Timing and optimization tools
- **Development Helpers**: Debugging and development utilities

## Core Exports

### ID Generation

```typescript
import { generateId } from "@repo/utils";

// Generate unique identifiers with prefixes
const studentId = generateId("student"); // "student_abc123def456"
const sessionId = generateId("session"); // "session_xyz789ghi012"
const taskId = generateId("task");       // "task_mno345pqr678"

// Usage patterns
const ids = {
  student: generateId("student"),
  topic: generateId("topic"), 
  item: generateId("item"),
  response: generateId("response"),
  evidence: generateId("evidence"),
};
```

### Async Utilities

```typescript
import { wait } from "@repo/utils";

// Delay execution for specified milliseconds
async function delayedOperation() {
  console.log("Starting operation...");
  await wait(1000); // Wait 1 second
  console.log("Operation complete");
}

// Useful for rate limiting, animations, testing
async function rateLimitedApiCalls() {
  for (const item of items) {
    await processItem(item);
    await wait(100); // Prevent overwhelming the API
  }
}
```

## Extended Utility Functions

### String Utilities

```typescript
// String manipulation helpers
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Usage examples
const slug = slugify("Hello World!"); // "hello-world"
const title = capitalize("hello world"); // "Hello world"
const short = truncate("Very long text here", 10); // "Very lo..."
```

### Array Utilities

```typescript
// Array manipulation helpers
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

// Usage examples
const batches = chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
const mixed = shuffle([1, 2, 3, 4, 5]); // [3, 1, 5, 2, 4] (random)
const deduped = unique([1, 2, 2, 3, 3, 3]); // [1, 2, 3]
const grouped = groupBy(students, s => s.grade); // { K: [...], 1: [...] }
```

### Object Utilities

```typescript
// Object manipulation helpers
export function pick<T, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function omit<T, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

export function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }
  
  return result;
}

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Usage examples
const subset = pick(student, ["id", "name", "grade"]);
const withoutId = omit(student, ["id", "createdAt", "updatedAt"]);
const merged = deepMerge(defaultSettings, userSettings);
```

### Date Utilities

```typescript
// Date manipulation helpers
export function formatDate(date: Date, format: string = "YYYY-MM-DD"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return format
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function diffInDays(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Usage examples
const formatted = formatDate(new Date(), "MM/DD/YYYY"); // "12/25/2024"
const nextWeek = addDays(new Date(), 7);
const daysBetween = diffInDays(startDate, endDate);
const isTodayCheck = isToday(someDate);
```

### Validation Utilities

```typescript
// Input validation helpers
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential XSS characters
    .substring(0, 1000); // Limit length
}

export function validateGrade(grade: string): boolean {
  const validGrades = ["PreK", "K", "1", "2", "3", "4", "5"];
  return validGrades.includes(grade);
}

// Usage examples
const emailValid = isValidEmail("user@example.com"); // true
const uuidValid = isValidUUID("123e4567-e89b-12d3-a456-426614174000"); // true
const cleanInput = sanitizeInput(userInput);
const gradeValid = validateGrade("K"); // true
```

### Performance Utilities

```typescript
// Performance monitoring helpers
export function measureTime<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

export async function measureAsyncTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Usage examples
const { result, duration } = measureTime(() => expensiveComputation());
const debouncedSearch = debounce(searchFunction, 300);
const throttledScroll = throttle(onScrollHandler, 100);
```

### Type Utilities

```typescript
// TypeScript utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Usage examples
type PartialStudent = DeepPartial<StudentProfile>;
type StudentGrades = NonEmptyArray<string>;
type SettingValue = ValueOf<StudentSettings>;
```

### Development Utilities

```typescript
// Development and debugging helpers
export function logger(namespace: string) {
  return {
    info: (message: string, data?: any) => {
      console.log(`[${namespace}] ${message}`, data || "");
    },
    warn: (message: string, data?: any) => {
      console.warn(`[${namespace}] WARNING: ${message}`, data || "");
    },
    error: (message: string, error?: Error) => {
      console.error(`[${namespace}] ERROR: ${message}`, error || "");
    },
    debug: (message: string, data?: any) => {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[${namespace}] DEBUG: ${message}`, data || "");
      }
    },
  };
}

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invariant violation: ${message}`);
  }
}

// Usage examples
const log = logger("StudentService");
log.info("Creating new student", { studentId, name });
log.error("Failed to save student", error);

assert(student.id, "Student must have an ID");
invariant(student.grade in validGrades, "Invalid grade level");
```

## React-Specific Utilities

### Hook Helpers

```typescript
// Custom hook utilities
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue: T) => {
    setValue(newValue);
    localStorage.setItem(key, JSON.stringify(newValue));
  }, [key]);

  return [value, setStoredValue];
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function useUpdateEffect(effect: () => void, deps?: DependencyList) {
  const isFirstMount = useRef(true);
  
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
    } else {
      effect();
    }
  }, deps);
}
```

### Component Utilities

```typescript
// Component helper functions
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function createContext<T>(name: string) {
  const Context = React.createContext<T | null>(null);
  
  function useContext(): T {
    const context = React.useContext(Context);
    if (!context) {
      throw new Error(`use${name} must be used within ${name}Provider`);
    }
    return context;
  }
  
  return [Context.Provider, useContext] as const;
}

// Usage examples
const className = cn("base-class", isActive && "active", "another-class");
const [AuthProvider, useAuth] = createContext<AuthContextType>("Auth");
```

## Testing Utilities

```typescript
// Testing helper functions
export function mockFn<T extends (...args: any[]) => any>(
  implementation?: T,
): jest.MockedFunction<T> {
  return jest.fn(implementation) as jest.MockedFunction<T>;
}

export function createMockStudent(overrides?: Partial<StudentProfile>): StudentProfile {
  return {
    id: generateId("student"),
    name: "Test Student",
    grade: "K",
    email: "test@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parentIds: [],
    coachIds: [],
    motivationProfile: {
      preferCompetition: false,
      preferMastery: true,
      preferSocial: false,
    },
    settings: {
      dailyXpGoal: 30,
      soundEnabled: true,
      musicEnabled: true,
    },
    ...overrides,
  };
}

export function waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    function check() {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error("Timeout waiting for condition"));
      } else {
        setTimeout(check, 10);
      }
    }
    
    check();
  });
}

// Usage in tests
const mockApi = mockFn();
const testStudent = createMockStudent({ name: "Emma" });
await waitFor(() => element.isVisible);
```

## Configuration

### Environment Utilities

```typescript
// Environment configuration helpers
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Required environment variable ${key} is not defined`);
  }
  return value || defaultValue!;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

// Usage examples
const apiUrl = getEnvVar("API_URL", "http://localhost:3001");
const dbUrl = getEnvVar("DATABASE_URL"); // Required, will throw if missing

if (isDevelopment()) {
  // Development-only code
}
```

## Error Handling

```typescript
// Error handling utilities
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export function createErrorHandler(context: string) {
  return (error: unknown): never => {
    if (error instanceof AppError) {
      throw error;
    }
    
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AppError(`${context}: ${message}`, "INTERNAL_ERROR");
  };
}

export function safeAsync<T>(
  fn: () => Promise<T>,
): Promise<{ data?: T; error?: Error }> {
  return fn()
    .then(data => ({ data }))
    .catch(error => ({ error }));
}

// Usage examples
throw new AppError("Student not found", "STUDENT_NOT_FOUND", 404);
const handleApiError = createErrorHandler("StudentAPI");
const { data, error } = await safeAsync(() => fetchStudent(id));
```

## Performance Optimization

```typescript
// Caching utilities
export function memoize<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
): (...args: Args) => Return {
  const cache = new Map<string, Return>();
  
  return (...args: Args): Return => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

export function createLRUCache<K, V>(maxSize: number) {
  const cache = new Map<K, V>();
  
  return {
    get(key: K): V | undefined {
      if (cache.has(key)) {
        const value = cache.get(key)!;
        cache.delete(key);
        cache.set(key, value); // Move to end
        return value;
      }
    },
    
    set(key: K, value: V): void {
      if (cache.has(key)) {
        cache.delete(key);
      } else if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, value);
    },
    
    clear(): void {
      cache.clear();
    },
  };
}

// Usage examples
const memoizedCalculation = memoize(expensiveCalculation);
const lruCache = createLRUCache<string, StudentProfile>(100);
```

## Dependencies

This package has no external dependencies, ensuring it remains lightweight and doesn't introduce additional complexity to the monorepo.

## Best Practices

1. **Pure Functions**: Utilities should be pure functions when possible
2. **Type Safety**: All functions should be fully typed
3. **Performance**: Consider performance implications of utility functions
4. **Testing**: All utilities should be thoroughly tested
5. **Documentation**: Include clear examples and use cases
6. **Consistency**: Follow consistent naming and patterns

This package serves as the foundational layer for common functionality across the Bemo platform, promoting code reuse and maintaining consistency throughout the application.