# @repo/api-client

Type-safe Hono RPC client with runtime validation for seamless API communication in the Bemo platform.

## Overview

This package provides a type-safe API client using Hono's RPC capabilities, ensuring end-to-end type safety from API routes to client calls. It includes automatic request/response validation, error handling, and seamless integration with the web application.

## Key Features

- **End-to-End Type Safety**: Full TypeScript inference from API routes to client
- **Runtime Validation**: Automatic request/response validation using Zod schemas
- **Error Handling**: Consistent error handling with meaningful messages
- **Zero Configuration**: Works out of the box with Hono API routes
- **Request Interception**: Customizable request/response processing
- **Development Friendly**: Excellent TypeScript intellisense and debugging

## Core Exports

### API Client Creation

```typescript
import { createApiClient, createClient } from "@repo/api-client";
import type { ApiClient } from "@repo/api-client";

// Create type-safe client instance
const client = createApiClient("http://localhost:3001");

// With custom options
const clientWithAuth = createApiClient("http://localhost:3001", {
  headers: {
    "Authorization": `Bearer ${token}`,
  },
});

// Type alias for the client
type Client = ApiClient;
```

### Response Handling

```typescript
import { handleApiResponse } from "@repo/api-client";
import { StudentProfileSchema } from "@repo/schemas";

// Validate API responses with schema
const response = await client.api.students[":id"].$get({
  param: { id: "student-uuid" },
});

const validated = await handleApiResponse(response, StudentProfileSchema);
// Type: { data: StudentProfile; meta?: Record<string, unknown> }
```

## Usage Patterns

### Basic API Calls

```typescript
import { createApiClient } from "@repo/api-client";

const client = createApiClient();

// GET request with params
const student = await client.api.students[":id"].$get({
  param: { id: "student-uuid" },
});

// POST request with JSON body  
const newStudent = await client.api.students.$post({
  json: {
    name: "Emma Smith",
    grade: "K",
    email: "emma@example.com",
  },
});

// PUT request with both params and body
const updated = await client.api.students[":id"].$put({
  param: { id: "student-uuid" },
  json: {
    name: "Emma Johnson",
    settings: { dailyXpGoal: 40 },
  },
});

// DELETE request
await client.api.students[":id"].$delete({
  param: { id: "student-uuid" },
});

// Query parameters
const students = await client.api.students.$get({
  query: {
    grade: "K",
    limit: "10",
    offset: "0",
  },
});
```

### With Schema Validation

```typescript
import { handleApiResponse } from "@repo/api-client";
import { 
  StudentProfileSchema,
  StudentsListSchema,
  TaskPlanSchema 
} from "@repo/schemas";

// Validated single response
async function getStudent(id: string) {
  const response = await client.api.students[":id"].$get({
    param: { id },
  });
  
  return await handleApiResponse(response, StudentProfileSchema);
  // Type: { data: StudentProfile; meta?: Record<string, unknown> }
}

// Validated list response
async function getStudents(params?: { grade?: string; limit?: number }) {
  const response = await client.api.students.$get({
    query: params ? {
      grade: params.grade,
      limit: params.limit?.toString(),
    } : undefined,
  });
  
  return await handleApiResponse(response, StudentsListSchema);
  // Type: { data: StudentProfile[]; meta?: { total: number; page: number } }
}

// Validated complex response
async function getPlan(studentId: string, max: number = 5) {
  const response = await client.api.students[":id"].plan.$get({
    param: { id: studentId },
    query: { max: max.toString() },
  });
  
  return await handleApiResponse(response, TaskPlanSchema);
  // Type: { data: { tasks: Task[]; metadata?: PlanMetadata } }
}
```

### Error Handling

```typescript
import { handleApiResponse } from "@repo/api-client";

async function safeApiCall() {
  try {
    const response = await client.api.students[":id"].$get({
      param: { id: "invalid-id" },
    });
    
    return await handleApiResponse(response, StudentProfileSchema);
  } catch (error) {
    if (error instanceof Error) {
      console.error("API Error:", error.message);
      
      // Handle specific error types
      if (error.message.includes("404")) {
        // Student not found
      } else if (error.message.includes("validation failed")) {
        // Schema validation error
      }
    }
    
    throw error;
  }
}
```

## Integration with React

### API Layer Abstraction

Create abstracted API functions for use in React components:

```typescript
// lib/api/students.ts
import { createApiClient, handleApiResponse } from "@repo/api-client";
import { 
  StudentProfileSchema,
  StudentsListSchema,
  type StudentProfile 
} from "@repo/schemas";

const client = createApiClient();

export const studentsApi = {
  // Get single student
  async getStudent(id: string) {
    const response = await client.api.students[":id"].$get({
      param: { id },
    });
    return handleApiResponse(response, StudentProfileSchema);
  },

  // Get all students
  async getStudents(params?: { grade?: string; limit?: number }) {
    const response = await client.api.students.$get({
      query: params ? {
        grade: params.grade,
        limit: params.limit?.toString(),
      } : undefined,
    });
    return handleApiResponse(response, StudentsListSchema);
  },

  // Create student
  async createStudent(data: Omit<StudentProfile, "id" | "createdAt" | "updatedAt">) {
    const response = await client.api.students.$post({
      json: data,
    });
    return handleApiResponse(response, StudentProfileSchema);
  },

  // Update student
  async updateStudent(id: string, data: Partial<StudentProfile>) {
    const response = await client.api.students[":id"].$put({
      param: { id },
      json: data,
    });
    return handleApiResponse(response, StudentProfileSchema);
  },

  // Delete student
  async deleteStudent(id: string) {
    const response = await client.api.students[":id"].$delete({
      param: { id },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Delete failed: ${response.statusText}`);
    }
  },
};
```

### TanStack Query Integration

```typescript
// hooks/useStudents.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsApi } from "@/lib/api/students";

// Query hook for fetching students
export function useStudents(params?: { grade?: string; limit?: number }) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: () => studentsApi.getStudents(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Query hook for single student
export function useStudent(id: string) {
  return useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsApi.getStudent(id),
    enabled: !!id,
  });
}

// Mutation hook for creating students
export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: studentsApi.createStudent,
    onSuccess: () => {
      // Invalidate and refetch students list
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

// Mutation hook for updating students
export function useUpdateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StudentProfile> }) =>
      studentsApi.updateStudent(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific student and students list
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
```

### React Component Usage

```typescript
// components/StudentList.tsx
import { useStudents, useCreateStudent } from "@/hooks/useStudents";
import { StudentCard } from "./StudentCard";
import { Button } from "@/components/ui/button";

export function StudentList() {
  const { data, isLoading, error } = useStudents({ grade: "K" });
  const createStudent = useCreateStudent();
  
  if (isLoading) return <div>Loading students...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const handleCreateStudent = () => {
    createStudent.mutate({
      name: "New Student",
      grade: "K",
      email: "student@example.com",
    });
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Students</h2>
        <Button onClick={handleCreateStudent}>
          Add Student
        </Button>
      </div>
      
      <div className="grid gap-4">
        {data?.data.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
      
      {data?.meta && (
        <div className="mt-4 text-sm text-gray-500">
          Total: {data.meta.total} students
        </div>
      )}
    </div>
  );
}
```

## Advanced Features

### Custom Request Configuration

```typescript
// Client with authentication
const authenticatedClient = createApiClient("http://localhost:3001", {
  headers: {
    "Authorization": `Bearer ${getAuthToken()}`,
    "X-Client-Version": "1.0.0",
  },
});

// Client with custom fetch behavior
const customClient = createApiClient("http://localhost:3001", {
  credentials: "include", // Include cookies
  mode: "cors",
  cache: "no-cache",
});
```

### Response Transformation

```typescript
// Custom response handler
async function handleApiResponseWithTransform<T>(
  response: Response,
  schema?: z.ZodSchema<T>,
  transform?: (data: T) => T,
) {
  const result = await handleApiResponse(response, schema);
  
  if (transform && result.data) {
    result.data = transform(result.data);
  }
  
  return result;
}

// Usage with date transformation
const student = await handleApiResponseWithTransform(
  response,
  StudentProfileSchema,
  (data) => ({
    ...data,
    createdAt: new Date(data.createdAt), // Convert string to Date
    updatedAt: new Date(data.updatedAt),
  })
);
```

### Batch Operations

```typescript
// Multiple requests in parallel
async function getBatchData(studentIds: string[]) {
  const promises = studentIds.map(id =>
    studentsApi.getStudent(id).catch(error => ({ error, id }))
  );
  
  const results = await Promise.all(promises);
  
  return {
    successful: results.filter(r => !("error" in r)),
    failed: results.filter(r => "error" in r),
  };
}
```

## Development Workflow

### Type Safety Flow

1. **Define API routes** in `apps/api` with OpenAPI schemas
2. **Export AppType** from the API application
3. **Import AppType** in api-client for type inference
4. **Create client** with full type safety
5. **Use in components** with automatic TypeScript checking

### Adding New Endpoints

When new API routes are added:

1. **API routes automatically typed** through Hono's type system
2. **Client calls get type checking** immediately
3. **Add schema validation** for runtime safety
4. **Create abstraction layer** for React integration
5. **Add React Query hooks** for data management

## Error Handling Patterns

```typescript
// Centralized error handling
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function handleApiResponseWithErrors<T>(
  response: Response,
  schema?: z.ZodSchema<T>,
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.message || `API Error: ${response.statusText}`,
      response.status,
      error.code,
    );
  }
  
  return handleApiResponse(response, schema);
}
```

## Testing

### Mock API Responses

```typescript
// test/mocks/apiClient.ts
export const mockApiClient = {
  api: {
    students: {
      $get: jest.fn(),
      $post: jest.fn(),
      ":id": {
        $get: jest.fn(),
        $put: jest.fn(),
        $delete: jest.fn(),
      },
    },
  },
} as unknown as ApiClient;

// In tests
mockApiClient.api.students.$get.mockResolvedValue(
  new Response(JSON.stringify({ data: mockStudents }))
);
```

## Performance Considerations

- **Request deduplication** through React Query
- **Automatic caching** of responses
- **Optimistic updates** for mutations
- **Background refetching** to keep data fresh
- **Error boundaries** to handle failures gracefully

## Dependencies

- **hono**: Fast web framework with RPC capabilities
- **zod**: Runtime validation for responses

This package bridges the gap between the Hono API and React frontend, providing type-safe, validated, and efficient API communication throughout the Bemo platform.