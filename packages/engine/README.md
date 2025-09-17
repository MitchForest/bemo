# @repo/engine

Core learning engine with adaptive algorithms and evidence processing for personalized learning in the Bemo platform.

## Overview

This package implements the heart of Bemo's adaptive learning system, featuring spaced repetition algorithms, evidence processing, task planning, and personalized learning pathways. It combines cognitive science principles with practical implementation to optimize learning outcomes for each student.

## Key Features

- **Spaced Repetition**: Memory-optimized scheduling using stability and strength models
- **Evidence Processing**: Analyzing student responses to update learning states
- **Task Planning**: Intelligent selection of learning activities based on student needs
- **Adaptive Algorithms**: Personalized learning paths that adapt to individual progress
- **Performance Analytics**: Tracking and analyzing learning patterns
- **Intervention Detection**: Identifying when students need additional support

## Core Concepts

### Memory Model

The engine uses a dual-factor memory model:

- **Stability**: How long information stays in memory (half-life)
- **Strength**: Current confidence/retrieval probability
- **Forgetting Curve**: Exponential decay based on time since last review

### Learning States

Each student-topic combination maintains:

```typescript
interface LearningState {
  stability: number;    // Memory half-life proxy
  strength: number;     // Current confidence (0-1)
  repNum: number;       // Number of repetitions
  dueAt: Date;          // When review is due
  lastSeenAt?: Date;    // Last interaction time
  strugglingFlag: boolean; // Needs intervention
}
```

## Core Exports

### Plan Generation

```typescript
import { getPlan } from "@repo/engine";
import type { PlanRequest, Task } from "@repo/schemas";

// Generate personalized learning tasks
async function generateStudentPlan(studentId: string) {
  const plan = await getPlan({
    studentId,
    max: 5,
    includeSpeedDrills: true,
    includeDiagnostic: false,
  });
  
  return plan; // Task[]
}
```

### Evidence Processing

```typescript
import { submitEvidence } from "@repo/engine";

// Process student response evidence
async function processResponse(studentId: string, evidence: {
  itemId: string;
  response: string;
  result: "correct" | "incorrect" | "partial";
  latencyMs: number;
  sessionId: string;
}) {
  await submitEvidence(studentId, evidence);
  // Updates learning states and schedules next review
}
```

## Algorithm Implementation

### Spaced Repetition Scheduler

```typescript
// Core scheduling algorithm
function calculateNextReview(state: LearningState, performance: Performance): LearningState {
  const { stability, strength, repNum } = state;
  const { result, latencyMs } = performance;
  
  // Update strength based on performance
  const newStrength = updateStrength(strength, result, latencyMs);
  
  // Update stability based on retrieval success
  const newStability = updateStability(stability, newStrength, repNum);
  
  // Calculate next due date
  const interval = calculateInterval(newStability, newStrength);
  const dueAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
  
  return {
    ...state,
    stability: newStability,
    strength: newStrength,
    repNum: repNum + 1,
    dueAt,
    lastSeenAt: new Date(),
    strugglingFlag: detectStruggling(newStrength, repNum),
  };
}

// Strength update function
function updateStrength(
  currentStrength: number,
  result: "correct" | "incorrect" | "partial",
  latencyMs: number,
): number {
  const baseUpdate = {
    correct: 0.1,
    partial: 0.05,
    incorrect: -0.2,
  }[result];
  
  // Factor in response speed
  const speedBonus = latencyMs < 3000 ? 0.05 : 0;
  const speedPenalty = latencyMs > 10000 ? -0.05 : 0;
  
  return Math.max(0, Math.min(1, 
    currentStrength + baseUpdate + speedBonus + speedPenalty
  ));
}

// Stability update function
function updateStability(
  currentStability: number,
  strength: number,
  repNum: number,
): number {
  // Successful retrieval increases stability
  if (strength > 0.6) {
    return currentStability * (1 + (strength - 0.5) * 0.3);
  }
  
  // Failed retrieval decreases stability
  return currentStability * Math.max(0.1, strength);
}
```

### Task Planning Algorithm

```typescript
interface TaskCandidate {
  topicId: string;
  urgency: number;     // How overdue (0-1)
  importance: number;  // Curriculum priority (0-1)
  readiness: number;   // Prerequisites met (0-1)
  engagement: number;  // Student motivation match (0-1)
}

function selectOptimalTasks(
  candidates: TaskCandidate[],
  maxTasks: number,
): TaskCandidate[] {
  // Multi-criteria optimization
  const scored = candidates.map(candidate => ({
    ...candidate,
    score: (
      candidate.urgency * 0.4 +      // Spaced repetition timing
      candidate.importance * 0.3 +   // Curriculum sequence
      candidate.readiness * 0.2 +    // Prerequisite readiness
      candidate.engagement * 0.1     // Motivation alignment
    ),
  }));
  
  // Sort by score and take top candidates
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTasks);
}
```

### Difficulty Adaptation

```typescript
function adaptDifficulty(
  studentState: LearningState,
  recentPerformance: Performance[],
): number {
  const recentAccuracy = calculateAccuracy(recentPerformance);
  const avgLatency = calculateAverageLatency(recentPerformance);
  const currentDifficulty = studentState.difficulty || 1;
  
  // Increase difficulty if performing well
  if (recentAccuracy > 0.8 && avgLatency < 5000) {
    return Math.min(5, currentDifficulty + 0.5);
  }
  
  // Decrease difficulty if struggling
  if (recentAccuracy < 0.6 || studentState.strugglingFlag) {
    return Math.max(1, currentDifficulty - 0.5);
  }
  
  return currentDifficulty;
}
```

## Learning Analytics

### Performance Tracking

```typescript
interface PerformanceMetrics {
  accuracy: number;        // Overall correctness rate
  fluency: number;         // Speed of correct responses
  retention: number;       // Long-term memory retention
  consistency: number;     // Performance stability
  engagement: number;      // Time on task, persistence
}

function calculateMetrics(
  responses: StudentResponse[],
  timeWindow: number = 7, // days
): PerformanceMetrics {
  const recent = responses.filter(r => 
    Date.now() - new Date(r.createdAt).getTime() < timeWindow * 24 * 60 * 60 * 1000
  );
  
  return {
    accuracy: recent.filter(r => r.result === "correct").length / recent.length,
    fluency: calculateFluency(recent.filter(r => r.result === "correct")),
    retention: calculateRetention(responses, timeWindow),
    consistency: calculateConsistency(recent),
    engagement: calculateEngagement(recent),
  };
}

function calculateFluency(correctResponses: StudentResponse[]): number {
  const fastResponses = correctResponses.filter(r => r.latencyMs < 3000);
  return fastResponses.length / correctResponses.length;
}

function calculateRetention(
  allResponses: StudentResponse[],
  timeWindow: number,
): number {
  // Check performance on previously mastered items
  const previouslyCorrect = new Set(
    allResponses
      .filter(r => r.result === "correct")
      .map(r => r.itemId)
  );
  
  const recentAttempts = allResponses.filter(r =>
    Date.now() - new Date(r.createdAt).getTime() < timeWindow * 24 * 60 * 60 * 1000 &&
    previouslyCorrect.has(r.itemId)
  );
  
  return recentAttempts.filter(r => r.result === "correct").length / recentAttempts.length;
}
```

### Intervention Detection

```typescript
interface InterventionTrigger {
  type: "struggling" | "disengaged" | "accelerated" | "plateau";
  severity: "low" | "medium" | "high";
  recommendations: string[];
}

function detectInterventions(
  studentState: LearningState[],
  performance: PerformanceMetrics,
  engagement: EngagementMetrics,
): InterventionTrigger[] {
  const triggers: InterventionTrigger[] = [];
  
  // Detect struggling patterns
  if (performance.accuracy < 0.5 && performance.consistency < 0.6) {
    triggers.push({
      type: "struggling",
      severity: "high",
      recommendations: [
        "Provide additional scaffolding",
        "Reduce difficulty temporarily", 
        "Offer alternative learning modalities",
        "Schedule intervention session",
      ],
    });
  }
  
  // Detect disengagement
  if (engagement.timeOnTask < 0.3 && engagement.sessionFrequency < 0.5) {
    triggers.push({
      type: "disengaged",
      severity: "medium",
      recommendations: [
        "Introduce gamification elements",
        "Adjust motivation profile",
        "Vary activity types",
        "Check for external factors",
      ],
    });
  }
  
  // Detect acceleration opportunity
  if (performance.accuracy > 0.9 && performance.fluency > 0.8) {
    triggers.push({
      type: "accelerated",
      severity: "low",
      recommendations: [
        "Increase difficulty",
        "Introduce advanced concepts",
        "Provide enrichment activities",
        "Fast-track to next grade level",
      ],
    });
  }
  
  return triggers;
}
```

## Curriculum Integration

### Prerequisite Management

```typescript
function checkPrerequisites(
  topicId: string,
  studentStates: Map<string, LearningState>,
): boolean {
  const topic = getTopicById(topicId);
  
  return topic.prerequisites.every(prereq => {
    const state = studentStates.get(prereq.topicId);
    if (!state) return false;
    
    // Check if prerequisite is mastered
    const isMastered = state.strength > 0.8 && state.stability > 2.0;
    
    if (prereq.gate === "AND") {
      return isMastered;
    } else { // OR gate
      return isMastered || checkAlternativePrereqs(prereq, studentStates);
    }
  });
}

function prioritizeTopics(
  availableTopics: Topic[],
  studentStates: Map<string, LearningState>,
  curriculum: CurriculumGraph,
): Topic[] {
  return availableTopics
    .filter(topic => checkPrerequisites(topic.id, studentStates))
    .sort((a, b) => {
      const urgencyA = calculateUrgency(a.id, studentStates);
      const urgencyB = calculateUrgency(b.id, studentStates);
      const importanceA = curriculum.getImportance(a.id);
      const importanceB = curriculum.getImportance(b.id);
      
      return (urgencyB + importanceB) - (urgencyA + importanceA);
    });
}
```

### Learning Path Generation

```typescript
interface LearningPath {
  topics: Topic[];
  estimatedDuration: number; // minutes
  difficulty: number;
  reasoning: string[];
}

function generateLearningPath(
  studentId: string,
  goal: string,
  constraints: {
    maxDuration?: number;
    preferredModalities?: string[];
    avoidTopics?: string[];
  },
): LearningPath {
  const studentStates = getStudentStates(studentId);
  const availableTopics = getAvailableTopics(goal, constraints);
  
  const path: Topic[] = [];
  let totalDuration = 0;
  const reasoning: string[] = [];
  
  while (totalDuration < (constraints.maxDuration || 30) && availableTopics.length > 0) {
    const nextTopic = selectNextTopic(availableTopics, studentStates, path);
    if (!nextTopic) break;
    
    path.push(nextTopic);
    totalDuration += nextTopic.expectedTimeSeconds / 60;
    reasoning.push(`Selected ${nextTopic.title}: ${getSelectionReason(nextTopic)}`);
    
    // Update available topics
    availableTopics.splice(availableTopics.indexOf(nextTopic), 1);
  }
  
  return {
    topics: path,
    estimatedDuration: totalDuration,
    difficulty: calculatePathDifficulty(path),
    reasoning,
  };
}
```

## Performance Optimization

### Caching Strategy

```typescript
// Cache frequently computed values
const stateCache = new Map<string, LearningState>();
const planCache = new Map<string, { plan: Task[]; timestamp: number }>();

function getCachedPlan(studentId: string, params: PlanRequest): Task[] | null {
  const cacheKey = `${studentId}:${JSON.stringify(params)}`;
  const cached = planCache.get(cacheKey);
  
  // Cache for 5 minutes
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.plan;
  }
  
  return null;
}

function setCachedPlan(studentId: string, params: PlanRequest, plan: Task[]) {
  const cacheKey = `${studentId}:${JSON.stringify(params)}`;
  planCache.set(cacheKey, { plan, timestamp: Date.now() });
}
```

### Batch Processing

```typescript
async function batchUpdateStates(
  updates: Array<{
    studentId: string;
    topicId: string;
    evidence: Evidence;
  }>,
): Promise<void> {
  // Group by student for efficient processing
  const byStudent = groupBy(updates, "studentId");
  
  await Promise.all(
    Object.entries(byStudent).map(async ([studentId, studentUpdates]) => {
      await withAppUser(studentId, async (trx) => {
        // Process all updates for this student in one transaction
        for (const update of studentUpdates) {
          await updateLearningState(trx, update);
        }
      });
    })
  );
}
```

## Testing

### Algorithm Testing

```typescript
// test/algorithms.test.ts
describe("Spaced Repetition", () => {
  test("should increase stability on successful retrieval", () => {
    const state = {
      stability: 1.0,
      strength: 0.7,
      repNum: 3,
      dueAt: new Date(),
    };
    
    const performance = {
      result: "correct" as const,
      latencyMs: 2000,
    };
    
    const newState = calculateNextReview(state, performance);
    
    expect(newState.stability).toBeGreaterThan(state.stability);
    expect(newState.strength).toBeGreaterThan(state.strength);
  });
  
  test("should decrease stability on failed retrieval", () => {
    const state = {
      stability: 2.0,
      strength: 0.8,
      repNum: 5,
      dueAt: new Date(),
    };
    
    const performance = {
      result: "incorrect" as const,
      latencyMs: 8000,
    };
    
    const newState = calculateNextReview(state, performance);
    
    expect(newState.stability).toBeLessThan(state.stability);
    expect(newState.strength).toBeLessThan(state.strength);
  });
});
```

### Integration Testing

```typescript
// test/integration.test.ts
describe("Engine Integration", () => {
  test("should generate appropriate plan for struggling student", async () => {
    const studentId = "struggling-student";
    const plan = await getPlan({
      studentId,
      max: 3,
      includeSpeedDrills: false,
    });
    
    expect(plan.length).toBeLessThanOrEqual(3);
    expect(plan.every(task => task.reason === "struggling_support")).toBe(true);
  });
});
```

## Configuration

### Algorithm Parameters

```typescript
interface EngineConfig {
  spacedRepetition: {
    minStability: number;      // Minimum stability value
    maxStability: number;      // Maximum stability value
    strengthThreshold: number; // Mastery threshold
    strugglingThreshold: number; // Intervention threshold
  };
  planning: {
    maxTasksPerSession: number;
    urgencyWeight: number;
    importanceWeight: number;
    readinessWeight: number;
  };
  difficulty: {
    adaptationRate: number;    // How quickly to adjust
    minDifficulty: number;     // Minimum difficulty level
    maxDifficulty: number;     // Maximum difficulty level
  };
}
```

## Dependencies

- **@repo/schemas**: Type definitions for tasks, students, and curriculum
- **@repo/db**: Database access for learning states and evidence
- **kysely**: Type-safe database operations

This package represents the cognitive core of Bemo, implementing research-backed algorithms to optimize learning outcomes through personalized, adaptive instruction.