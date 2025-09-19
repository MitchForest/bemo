import type { CourseKey } from "./keys";
import type { CourseBlueprint } from "./types";

export const COURSE_BLUEPRINTS: Record<CourseKey, CourseBlueprint> = {
  READING_PRELITERACY: {
    subjectKey: "READING_FOUNDATIONAL",
    title: "Preliteracy Foundations",
    summary: "Concepts of print, oral language, and sound play routines",
    gradeBand: "PreK",
    sequence: 0,
  },
  READING_K_FOUNDATIONS: {
    subjectKey: "READING_FOUNDATIONAL",
    title: "Kindergarten Phonics Core",
    summary: "Phoneme mastery, short vowels, and consonant patterns",
    gradeBand: "K",
    sequence: 1,
  },
  READING_G1_CORE: {
    subjectKey: "READING_FOUNDATIONAL",
    title: "Grade 1 Word Study & Fluency",
    summary: "Long vowels, syllable work, fluency, and comprehension",
    gradeBand: "1",
    sequence: 2,
  },
  READING_G2_EXPANSION: {
    subjectKey: "READING_FOUNDATIONAL",
    title: "Grade 2 Expansion",
    summary: "Advanced decoding, morphology, fluent reading, and writing",
    gradeBand: "2",
    sequence: 3,
  },
  MATH_PRENUMBER: {
    subjectKey: "MATH_FOUNDATIONAL",
    title: "Pre-Number Sense",
    summary: "Same/different, positional language, and early counting",
    gradeBand: "PreK",
    sequence: 0,
  },
  MATH_K_CORE: {
    subjectKey: "MATH_FOUNDATIONAL",
    title: "Kindergarten Core",
    summary: "Counting, combining, and comparing within 20",
    gradeBand: "K",
    sequence: 1,
  },
  MATH_G1_CORE: {
    subjectKey: "MATH_FOUNDATIONAL",
    title: "Grade 1 Number Sense",
    summary: "Place value, fluent facts, and first-grade operations",
    gradeBand: "1",
    sequence: 2,
  },
  MATH_G2_EXTENSION: {
    subjectKey: "MATH_FOUNDATIONAL",
    title: "Grade 2 Problem Solving",
    summary: "Hundreds place value, measurement, and early multiplication",
    gradeBand: "2",
    sequence: 3,
  },
};
