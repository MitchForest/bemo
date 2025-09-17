# @repo/curriculum

Learning curriculum domain logic and business rules for structured educational content in the Bemo platform.

## Overview

This package contains the curriculum structure, learning progression logic, and domain-specific business rules that define how educational content is organized and sequenced. It provides the foundation for adaptive learning paths and ensures pedagogical coherence across the platform.

## Key Features

- **Curriculum Structure**: Hierarchical organization of learning content
- **Learning Progressions**: Sequential skill development pathways
- **Domain Logic**: Subject-specific educational rules and constraints
- **Prerequisite Management**: Dependency tracking between learning objectives
- **Scope & Sequence**: Grade-appropriate content ordering
- **Standards Alignment**: Connection to educational standards and benchmarks

## Architecture

```
src/
└── index.ts    # Curriculum data and utilities
```

The package currently provides seed data structures for topics and knowledge points, with room for expansion into full curriculum management utilities.

## Core Exports

### Seed Data

```typescript
import { seedTopics, seedKnowledgePoints } from "@repo/curriculum";
import type { Topic, KnowledgePoint } from "@repo/schemas";

// Pre-defined curriculum structure
const topics: Topic[] = seedTopics;
const knowledgePoints: KnowledgePoint[] = seedKnowledgePoints;
```

## Curriculum Structure

### Domain Organization

The curriculum is organized by learning domains:

```typescript
// Math curriculum structure
const mathCurriculum = {
  domain: "math",
  strands: [
    "Counting & Cardinality",
    "Operations & Algebraic Thinking", 
    "Number & Operations in Base Ten",
    "Measurement & Data",
    "Geometry",
  ],
  gradeProgression: ["PreK", "K", "1"],
};

// Reading curriculum structure  
const readingCurriculum = {
  domain: "reading",
  strands: [
    "Phonological Awareness",
    "Phonics & Word Recognition",
    "Fluency",
    "Vocabulary",
    "Comprehension",
  ],
  gradeProgression: ["PreK", "K", "1"],
};
```

### Learning Progressions

Each strand follows a carefully sequenced progression:

```typescript
// Example: Counting progression
const countingProgression = [
  {
    id: "count-objects-1-10",
    title: "Count objects 1-10",
    gradeBand: "PreK",
    prerequisites: [],
    description: "Count concrete objects in sets up to 10",
  },
  {
    id: "count-objects-1-20", 
    title: "Count objects 1-20",
    gradeBand: "K",
    prerequisites: [{ topicId: "count-objects-1-10", gate: "AND" }],
    description: "Extend counting to sets up to 20",
  },
  {
    id: "count-objects-1-100",
    title: "Count objects 1-100", 
    gradeBand: "1",
    prerequisites: [{ topicId: "count-objects-1-20", gate: "AND" }],
    description: "Count larger sets and skip count by 10s",
  },
];
```

## Curriculum Utilities

### Topic Management

```typescript
// Utility functions for curriculum management
interface CurriculumManager {
  // Topic organization
  getTopicsByDomain(domain: Domain): Topic[];
  getTopicsByGrade(gradeBand: GradeBand): Topic[];
  getTopicsByStrand(strand: string): Topic[];
  
  // Prerequisite checking
  checkPrerequisites(topicId: string, completedTopics: string[]): boolean;
  getPrerequisitePath(topicId: string): Topic[];
  
  // Learning path generation
  generateLearningSequence(
    startTopics: string[],
    endTopics: string[], 
    constraints?: SequenceConstraints
  ): Topic[];
  
  // Standards alignment
  getStandardsAlignment(topicId: string): StandardsMapping[];
  getTopicsByStandard(standardId: string): Topic[];
}

// Implementation example
class CurriculumManagerImpl implements CurriculumManager {
  constructor(
    private topics: Topic[],
    private knowledgePoints: KnowledgePoint[],
  ) {}
  
  getTopicsByDomain(domain: Domain): Topic[] {
    return this.topics.filter(topic => topic.domain === domain);
  }
  
  checkPrerequisites(topicId: string, completedTopics: string[]): boolean {
    const topic = this.topics.find(t => t.id === topicId);
    if (!topic) return false;
    
    return topic.prerequisites.every(prereq => {
      if (prereq.gate === "AND") {
        return completedTopics.includes(prereq.topicId);
      } else { // OR gate
        return topic.prerequisites.some(p => completedTopics.includes(p.topicId));
      }
    });
  }
  
  generateLearningSequence(
    startTopics: string[],
    endTopics: string[],
    constraints?: SequenceConstraints,
  ): Topic[] {
    // Topological sort based on prerequisites
    const visited = new Set<string>();
    const sequence: Topic[] = [];
    
    function visitTopic(topicId: string) {
      if (visited.has(topicId)) return;
      visited.add(topicId);
      
      const topic = this.topics.find(t => t.id === topicId);
      if (!topic) return;
      
      // Visit prerequisites first
      topic.prerequisites.forEach(prereq => {
        visitTopic(prereq.topicId);
      });
      
      sequence.push(topic);
    }
    
    endTopics.forEach(topicId => visitTopic(topicId));
    
    return sequence.filter(topic => {
      const meetsConstraints = !constraints || (
        (!constraints.maxDifficulty || topic.difficulty <= constraints.maxDifficulty) &&
        (!constraints.domains || constraints.domains.includes(topic.domain)) &&
        (!constraints.gradeBands || constraints.gradeBands.includes(topic.gradeBand))
      );
      
      return meetsConstraints;
    });
  }
}
```

### Knowledge Point Management

```typescript
interface KnowledgePointManager {
  // Knowledge point organization
  getKnowledgePointsByTopic(topicId: string): KnowledgePoint[];
  getKnowledgePointById(id: string): KnowledgePoint | null;
  
  // Learning objective tracking
  getObjectivesByStrand(strand: string): string[];
  checkObjectiveCompletion(studentId: string, objective: string): boolean;
  
  // Content relationships
  getRelatedKnowledgePoints(id: string): KnowledgePoint[];
  findKnowledgePointsByKeyword(keyword: string): KnowledgePoint[];
}

// Implementation for knowledge point management
class KnowledgePointManagerImpl implements KnowledgePointManager {
  constructor(private knowledgePoints: KnowledgePoint[]) {}
  
  getKnowledgePointsByTopic(topicId: string): KnowledgePoint[] {
    return this.knowledgePoints.filter(kp => kp.topicId === topicId);
  }
  
  getObjectivesByStrand(strand: string): string[] {
    return this.knowledgePoints
      .filter(kp => {
        const topic = this.getTopicById(kp.topicId);
        return topic?.strand === strand;
      })
      .map(kp => kp.objective);
  }
  
  findKnowledgePointsByKeyword(keyword: string): KnowledgePoint[] {
    return this.knowledgePoints.filter(kp =>
      kp.objective.toLowerCase().includes(keyword.toLowerCase()) ||
      kp.reteachSnippet.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}
```

## Standards Alignment

### Common Core Integration

```typescript
interface StandardsMapping {
  standardId: string;
  domain: string;
  cluster: string;
  standard: string;
  description: string;
  gradeBand: GradeBand;
}

// Example math standards mapping
const mathStandards: StandardsMapping[] = [
  {
    standardId: "K.CC.A.1",
    domain: "Counting and Cardinality",
    cluster: "Know number names and the count sequence",
    standard: "Count to 100 by ones and by tens",
    description: "Students learn to count by ones and tens to 100",
    gradeBand: "K",
  },
  {
    standardId: "K.CC.B.4",
    domain: "Counting and Cardinality", 
    cluster: "Count to tell the number of objects",
    standard: "Understand the relationship between numbers and quantities",
    description: "Connect counting to cardinality",
    gradeBand: "K",
  },
];

// Reading standards mapping
const readingStandards: StandardsMapping[] = [
  {
    standardId: "K.RF.2.A",
    domain: "Reading: Foundational Skills",
    cluster: "Phonological Awareness",
    standard: "Recognize and produce rhyming words",
    description: "Students identify and create rhyming words",
    gradeBand: "K",
  },
  {
    standardId: "K.RF.3.A",
    domain: "Reading: Foundational Skills",
    cluster: "Phonics and Word Recognition", 
    standard: "Demonstrate basic knowledge of letter-sound correspondences",
    description: "Connect letters to their sounds",
    gradeBand: "K",
  },
];
```

### Standards Alignment Utilities

```typescript
interface StandardsManager {
  getStandardsByGrade(gradeBand: GradeBand): StandardsMapping[];
  getStandardsByDomain(domain: Domain): StandardsMapping[];
  mapTopicToStandards(topicId: string): StandardsMapping[];
  getTopicsForStandard(standardId: string): Topic[];
  generateStandardsReport(studentId: string): StandardsProgress;
}

interface StandardsProgress {
  studentId: string;
  gradeBand: GradeBand;
  standards: Array<{
    standardId: string;
    status: "not-started" | "in-progress" | "mastered";
    progress: number; // 0-1
    relatedTopics: Topic[];
    lastAssessed?: Date;
  }>;
  overallProgress: number;
}
```

## Curriculum Data Structure

### Topic Definition

```typescript
const exampleTopic: Topic = {
  id: "decode-cvc-short-a",
  title: "Decode CVC words with short a",
  domain: "reading",
  strand: "Phonics & Word Recognition",
  gradeBand: "K",
  description: "Blend consonant-vowel-consonant words with short 'a' sound",
  prerequisites: [
    { topicId: "letter-sound-a", gate: "AND" },
    { topicId: "blend-two-sounds", gate: "AND" },
  ],
  encompassedBy: [
    { parentTopicId: "decode-all-cvc", weight: 0.3 },
  ],
  interferenceGroup: "CVC-short-vowels",
  expectedTimeSeconds: 240,
  checkChartTags: ["I can read CVC words with 'a'"],
  assets: ["cvc-a-wordlist", "short-a-audio"],
};
```

### Knowledge Point Definition

```typescript
const exampleKnowledgePoint: KnowledgePoint = {
  id: "blend-cat-words",
  topicId: "decode-cvc-short-a", 
  objective: "Blend and read words in the -at family",
  workedExample: [
    "Point to each letter: c-a-t",
    "Say each sound: /k/ /a/ /t/",
    "Blend sounds together: cat",
  ],
  practiceItems: [
    "cat", "bat", "hat", "mat", "rat", "sat",
  ],
  reteachSnippet: "Use letter blocks to stretch sounds: c—a—t → cat",
  expectedTimeSeconds: 120,
  hints: [
    "Start with the first sound",
    "Say each sound clearly", 
    "Blend sounds smoothly together",
  ],
};
```

## Curriculum Expansion

### Adding New Content

To add new curriculum content:

1. **Define Topic Structure**:

```typescript
const newTopic: Topic = {
  id: "new-topic-id",
  title: "New Learning Objective",
  domain: "math" | "reading",
  strand: "Appropriate Strand",
  gradeBand: "PreK" | "K" | "1",
  description: "Clear description of what students will learn",
  prerequisites: [], // Define prerequisite relationships
  expectedTimeSeconds: 300, // Estimated completion time
  checkChartTags: ["I can..."], // Student-facing objectives
};
```

2. **Create Knowledge Points**:

```typescript
const knowledgePoints: KnowledgePoint[] = [
  {
    id: "sub-objective-1",
    topicId: "new-topic-id",
    objective: "Specific learning objective",
    workedExample: ["Step 1", "Step 2", "Step 3"],
    reteachSnippet: "Alternative explanation for struggling students",
    expectedTimeSeconds: 150,
    hints: ["Helpful hint 1", "Helpful hint 2"],
  },
];
```

3. **Update Seed Data**:

```typescript
// Add to seedTopics and seedKnowledgePoints arrays
export const seedTopics: Topic[] = [
  ...existingTopics,
  newTopic,
];

export const seedKnowledgePoints: KnowledgePoint[] = [
  ...existingKnowledgePoints,
  ...knowledgePoints,
];
```

### Validation Rules

```typescript
interface CurriculumValidator {
  validateTopic(topic: Topic): ValidationResult;
  validateKnowledgePoint(kp: KnowledgePoint): ValidationResult;
  validateCurriculumGraph(topics: Topic[]): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class CurriculumValidatorImpl implements CurriculumValidator {
  validateTopic(topic: Topic): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for circular dependencies
    if (this.hasCircularDependency(topic)) {
      errors.push("Topic has circular prerequisite dependency");
    }
    
    // Validate grade progression
    if (!this.isValidGradeProgression(topic)) {
      errors.push("Prerequisites must be from earlier or same grade");
    }
    
    // Check expected time reasonableness
    if (topic.expectedTimeSeconds > 1800) { // 30 minutes
      warnings.push("Topic duration exceeds recommended maximum");
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
```

## Integration with Learning Engine

The curriculum package integrates tightly with the learning engine:

```typescript
// Engine uses curriculum to make planning decisions
import { seedTopics } from "@repo/curriculum";

function selectNextTopic(
  studentStates: Map<string, LearningState>,
  availableTopics: Topic[],
): Topic | null {
  // Filter by prerequisites
  const readyTopics = availableTopics.filter(topic =>
    checkPrerequisites(topic.id, studentStates)
  );
  
  // Prioritize by curriculum sequence
  return readyTopics.sort((a, b) => 
    getCurriculumPriority(a) - getCurriculumPriority(b)
  )[0] || null;
}
```

## Testing Curriculum Logic

```typescript
// test/curriculum.test.ts
describe("Curriculum Logic", () => {
  test("should validate prerequisite relationships", () => {
    const manager = new CurriculumManagerImpl(seedTopics, seedKnowledgePoints);
    
    const canAccess = manager.checkPrerequisites(
      "decode-cvc-short-a",
      ["letter-sound-a", "blend-two-sounds"]
    );
    
    expect(canAccess).toBe(true);
  });
  
  test("should generate valid learning sequence", () => {
    const manager = new CurriculumManagerImpl(seedTopics, seedKnowledgePoints);
    
    const sequence = manager.generateLearningSequence(
      ["phoneme-awareness"],
      ["read-simple-sentences"]
    );
    
    expect(sequence.length).toBeGreaterThan(0);
    expect(sequence[0].id).toBe("phoneme-awareness");
    expect(sequence[sequence.length - 1].id).toBe("read-simple-sentences");
  });
});
```

## Future Enhancements

Planned expansions for the curriculum package:

1. **Dynamic Curriculum Loading**: Database-driven curriculum management
2. **Adaptive Sequencing**: AI-powered learning path optimization  
3. **Multi-Modal Content**: Support for different learning styles
4. **Assessment Integration**: Built-in formative and summative assessments
5. **Standards Mapping**: Comprehensive standards alignment tools
6. **Differentiation Support**: Multiple pathways for diverse learners

## Dependencies

- **@repo/schemas**: Type definitions for topics, knowledge points, and curriculum structures

This package provides the educational foundation for Bemo's adaptive learning system, ensuring that content is pedagogically sound, properly sequenced, and aligned with educational standards.