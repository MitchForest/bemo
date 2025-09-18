import type {
  Asset,
  CheckChart,
  CheckChartEntry,
  DiagnosticProbe,
  JoyBreak,
  KnowledgePoint,
  KnowledgePointExperience,
  MicroGame,
  MotivationLeague,
  MotivationQuest,
  MotivationReward,
  MotivationTrack,
  PracticeActivity,
  Skill,
  TimeBackLedgerEntry,
} from "@repo/schemas";

// Local types for curriculum seed data
interface CurriculumLesson {
  id: string;
  courseId: string;
  title: string;
  summary: string | undefined;
  sequence: number;
  focusQuestion: string | undefined;
  skillIds: string[];
  estimatedMinutes: number | undefined;
  metadata: Record<string, any>;
}

interface CurriculumCourse {
  id: string;
  subjectId: string;
  title: string;
  summary: string | undefined;
  gradeBand: "PreK" | "K" | "1" | undefined;
  sequence: number;
  lessonIds: string[];
  metadata: Record<string, any>;
}

interface CurriculumSubject {
  id: string;
  title: string;
  domain: "math" | "reading";
  description: string | undefined;
  courseIds: string[];
  metadata: Record<string, any>;
}

export const SKILL_IDS = {
  // Reading — Stage R0 Foundations
  RD_PRINT_HANDLE: "00000000-0000-4000-8000-000000000301",
  RD_ORAL_LISTEN: "00000000-0000-4000-8000-000000000302",
  RD_PA_WORD: "00000000-0000-4000-8000-000000000303",
  RD_PA_SYLLABLE: "00000000-0000-4000-8000-000000000304",
  RD_PA_RHYME: "00000000-0000-4000-8000-000000000305",
  RD_ORAL_VOCAB_CAT: "00000000-0000-4000-8000-000000000306",
  // Reading — Stage R1 PreK Core
  RD_LN_UPPER: "00000000-0000-4000-8000-000000000102",
  RD_LN_LOWER: "00000000-0000-4000-8000-000000000307",
  RD_LS_SET1: "00000000-0000-4000-8000-000000000308",
  RD_PA_INIT: "00000000-0000-4000-8000-000000000310",
  RD_BLEND_2PH: "00000000-0000-4000-8000-000000000101",
  RD_SEGMENT_2PH: "00000000-0000-4000-8000-000000000312",
  // Reading — Stage R2 Kindergarten Phonics Core
  RD_LS_SET2: "00000000-0000-4000-8000-000000000313",
  RD_PA_MED: "00000000-0000-4000-8000-000000000314",
  RD_BLEND_3PH: "00000000-0000-4000-8000-000000000103",
  RD_SEGMENT_3PH: "00000000-0000-4000-8000-000000000316",
  RD_CVC_A: "00000000-0000-4000-8000-000000000104",
  RD_CVC_I: "00000000-0000-4000-8000-000000000317",
  RD_HFW_L1: "00000000-0000-4000-8000-000000000105",
  // Reading — Stage R3 Kindergarten Automaticity
  RD_CVC_O: "00000000-0000-4000-8000-000000000318",
  RD_CVC_U: "00000000-0000-4000-8000-000000000319",
  RD_CVC_E: "00000000-0000-4000-8000-000000000320",
  RD_DIGRAPH_CH_SH: "00000000-0000-4000-8000-000000000321",
  RD_BLEND_L_CLUSTER: "00000000-0000-4000-8000-000000000322",
  RD_HFW_L2: "00000000-0000-4000-8000-000000000106",
  RD_HFW_L3: "00000000-0000-4000-8000-000000000323",
  RD_DEC_SENT_A: "00000000-0000-4000-8000-000000000324",
  RD_COMP_SEQUENCE: "00000000-0000-4000-8000-000000000325",
  // Reading — Stage R4 Grade 1 Core
  RD_LONG_VOWEL_E: "00000000-0000-4000-8000-000000000326",
  RD_VOWEL_TEAMS_AI_OA: "00000000-0000-4000-8000-000000000327",
  RD_R_CONTROLLED: "00000000-0000-4000-8000-000000000328",
  RD_DIGRAPH_TH_WH_PH: "00000000-0000-4000-8000-000000000329",
  RD_HFW_L4: "00000000-0000-4000-8000-000000000330",
  RD_HFW_L5: "00000000-0000-4000-8000-000000000331",
  RD_FLUENCY_J: "00000000-0000-4000-8000-000000000107",
  RD_FLUENCY_M: "00000000-0000-4000-8000-000000000332",
  RD_COMP_WHO_WHAT_WHY: "00000000-0000-4000-8000-000000000333",
  RD_COMP_INFER_L1: "00000000-0000-4000-8000-000000000334",
  RD_WRITE_SENTENCE: "00000000-0000-4000-8000-000000000335",
  // Math (unchanged)
  MATH_PK_SUBITIZE_1_4: "00000000-0000-4000-8000-000000000201",
  MATH_PK_COUNT_TO_5: "00000000-0000-4000-8000-000000000202",
  MATH_K_COUNT_TO_20: "00000000-0000-4000-8000-000000000203",
  MATH_K_ADD_WITHIN_5: "00000000-0000-4000-8000-000000000204",
  MATH_1_ADD_WITHIN_20: "00000000-0000-4000-8000-000000000205",
  MATH_1_TIME_TO_HOUR: "00000000-0000-4000-8000-000000000206",
  MATH_1_SPEED_FACTS_0_10: "00000000-0000-4000-8000-000000000207",
} as const;

export const TOPIC_IDS = SKILL_IDS;

export const KNOWLEDGE_POINT_IDS = {
  // Reading — Stage R0 Foundations
  RD_PRINT_HANDLE_K1: "10000000-0000-4000-8000-000000000301",
  RD_PRINT_HANDLE_K2: "10000000-0000-4000-8000-000000000302",
  RD_ORAL_LISTEN_K1: "10000000-0000-4000-8000-000000000303",
  RD_ORAL_LISTEN_K2: "10000000-0000-4000-8000-000000000304",
  RD_PA_WORD_K1: "10000000-0000-4000-8000-000000000305",
  RD_PA_WORD_K2: "10000000-0000-4000-8000-000000000306",
  RD_PA_SYLLABLE_K1: "10000000-0000-4000-8000-000000000307",
  RD_PA_SYLLABLE_K2: "10000000-0000-4000-8000-000000000308",
  RD_PA_RHYME_K1: "10000000-0000-4000-8000-000000000309",
  RD_PA_RHYME_K2: "10000000-0000-4000-8000-000000000310",
  RD_ORAL_VOCAB_CAT_K1: "10000000-0000-4000-8000-000000000311",
  RD_ORAL_VOCAB_CAT_K2: "10000000-0000-4000-8000-000000000312",
  // Reading — Stage R1 PreK Core
  RD_LN_UPPER_K1: "10000000-0000-4000-8000-000000000313",
  RD_LN_UPPER_K2: "10000000-0000-4000-8000-000000000314",
  RD_LN_LOWER_K1: "10000000-0000-4000-8000-000000000315",
  RD_LN_LOWER_K2: "10000000-0000-4000-8000-000000000316",
  RD_LS_SET1_K1: "10000000-0000-4000-8000-000000000317",
  RD_LS_SET1_K2: "10000000-0000-4000-8000-000000000318",
  RD_PA_INIT_K1: "10000000-0000-4000-8000-000000000319",
  RD_PA_INIT_K2: "10000000-0000-4000-8000-000000000320",
  RD_BLEND_2PH_ORAL: "10000000-0000-4000-8000-000000000321",
  RD_BLEND_2PH_MATCH: "10000000-0000-4000-8000-000000000322",
  RD_SEGMENT_2PH_TAP: "10000000-0000-4000-8000-000000000323",
  RD_SEGMENT_2PH_TILES: "10000000-0000-4000-8000-000000000324",
  // Reading — Stage R2 Kindergarten Phonics Core
  RD_LS_SET2_K1: "10000000-0000-4000-8000-000000000325",
  RD_LS_SET2_K2: "10000000-0000-4000-8000-000000000326",
  RD_PA_MED_MATCH: "10000000-0000-4000-8000-000000000327",
  RD_PA_MED_TILE: "10000000-0000-4000-8000-000000000328",
  RD_BLEND_3PH_ORAL: "10000000-0000-4000-8000-000000000329",
  RD_BLEND_3PH_TIMED: "10000000-0000-4000-8000-000000000330",
  RD_SEGMENT_3PH_TAP: "10000000-0000-4000-8000-000000000331",
  RD_SEGMENT_3PH_BUILD: "10000000-0000-4000-8000-000000000332",
  RD_CVC_A_DECODE: "10000000-0000-4000-8000-000000000333",
  RD_CVC_A_SPELL: "10000000-0000-4000-8000-000000000334",
  RD_CVC_I_DECODE: "10000000-0000-4000-8000-000000000335",
  RD_CVC_I_SPELL: "10000000-0000-4000-8000-000000000336",
  RD_HFW_L1_FLASH: "10000000-0000-4000-8000-000000000337",
  RD_HFW_L1_PHRASE: "10000000-0000-4000-8000-000000000338",
  // Reading — Stage R3 Kindergarten Automaticity
  RD_CVC_O_DECODE: "10000000-0000-4000-8000-000000000339",
  RD_CVC_O_SPELL: "10000000-0000-4000-8000-000000000340",
  RD_CVC_U_DECODE: "10000000-0000-4000-8000-000000000341",
  RD_CVC_U_SPELL: "10000000-0000-4000-8000-000000000342",
  RD_CVC_E_DECODE: "10000000-0000-4000-8000-000000000343",
  RD_CVC_E_SPELL: "10000000-0000-4000-8000-000000000344",
  RD_DIGRAPH_CH_SH_SORT: "10000000-0000-4000-8000-000000000345",
  RD_DIGRAPH_CH_SH_DECODE: "10000000-0000-4000-8000-000000000346",
  RD_BLEND_L_CLUSTER_READ: "10000000-0000-4000-8000-000000000347",
  RD_BLEND_L_CLUSTER_SEGMENT: "10000000-0000-4000-8000-000000000348",
  RD_HFW_L2_FLASH: "10000000-0000-4000-8000-000000000349",
  RD_HFW_L2_PHRASE: "10000000-0000-4000-8000-000000000350",
  RD_HFW_L3_FLASH: "10000000-0000-4000-8000-000000000351",
  RD_HFW_L3_SENTENCE: "10000000-0000-4000-8000-000000000352",
  RD_DEC_SENT_A_READ: "10000000-0000-4000-8000-000000000353",
  RD_DEC_SENT_A_RATE: "10000000-0000-4000-8000-000000000354",
  RD_COMP_SEQUENCE_ORDER: "10000000-0000-4000-8000-000000000355",
  RD_COMP_SEQUENCE_QA: "10000000-0000-4000-8000-000000000356",
  // Reading — Stage R4 Grade 1 Core
  RD_LONG_VOWEL_E_DECODE: "10000000-0000-4000-8000-000000000357",
  RD_LONG_VOWEL_E_SPELL: "10000000-0000-4000-8000-000000000358",
  RD_VOWEL_TEAMS_AI_OA_DECODE: "10000000-0000-4000-8000-000000000359",
  RD_VOWEL_TEAMS_AI_OA_CHOOSE: "10000000-0000-4000-8000-000000000360",
  RD_R_CONTROLLED_SORT: "10000000-0000-4000-8000-000000000361",
  RD_R_CONTROLLED_DECODE: "10000000-0000-4000-8000-000000000362",
  RD_DIGRAPH_TH_WH_PH_DECODE: "10000000-0000-4000-8000-000000000363",
  RD_DIGRAPH_TH_WH_PH_MULTI: "10000000-0000-4000-8000-000000000364",
  RD_HFW_L4_FLASH: "10000000-0000-4000-8000-000000000365",
  RD_HFW_L4_CLOZE: "10000000-0000-4000-8000-000000000366",
  RD_HFW_L5_FLASH: "10000000-0000-4000-8000-000000000367",
  RD_HFW_L5_PARAGRAPH: "10000000-0000-4000-8000-000000000368",
  RD_FLUENCY_J_PASSAGE: "10000000-0000-4000-8000-000000000369",
  RD_FLUENCY_J_PROSODY: "10000000-0000-4000-8000-000000000370",
  RD_FLUENCY_M_PASSAGE: "10000000-0000-4000-8000-000000000371",
  RD_FLUENCY_M_PROSODY: "10000000-0000-4000-8000-000000000372",
  RD_COMP_WHO_WHAT_WHY_QA: "10000000-0000-4000-8000-000000000373",
  RD_COMP_WHO_WHAT_WHY_EVIDENCE: "10000000-0000-4000-8000-000000000374",
  RD_COMP_INFER_L1_CHOICE: "10000000-0000-4000-8000-000000000375",
  RD_COMP_INFER_L1_EXPLAIN: "10000000-0000-4000-8000-000000000376",
  RD_WRITE_SENTENCE_BUILD: "10000000-0000-4000-8000-000000000377",
  RD_WRITE_SENTENCE_COMPOSE: "10000000-0000-4000-8000-000000000378",
  // Math (unchanged)
  MATH_PK_SUBITIZE_SPOT: "10000000-0000-4000-8000-000000000201",
  MATH_PK_SUBITIZE_MATCH: "10000000-0000-4000-8000-000000000202",
  MATH_PK_COUNT_TO_5_ORAL: "10000000-0000-4000-8000-000000000203",
  MATH_PK_COUNT_TO_5_OBJECTS: "10000000-0000-4000-8000-000000000204",
  MATH_K_COUNT_TO_20_ORAL: "10000000-0000-4000-8000-000000000205",
  MATH_K_COUNT_TO_20_FILL: "10000000-0000-4000-8000-000000000206",
  MATH_K_ADD_WITHIN_5_MODEL: "10000000-0000-4000-8000-000000000207",
  MATH_K_ADD_WITHIN_5_DRILL: "10000000-0000-4000-8000-000000000208",
  MATH_1_ADD_WITHIN_20_STRATEGY: "10000000-0000-4000-8000-000000000209",
  MATH_1_ADD_WITHIN_20_DRILL: "10000000-0000-4000-8000-000000000210",
  MATH_1_TIME_TO_HOUR_READ: "10000000-0000-4000-8000-000000000211",
  MATH_1_TIME_TO_HOUR_SET: "10000000-0000-4000-8000-000000000212",
  MATH_1_SPEED_FACTS_WARMUP: "10000000-0000-4000-8000-000000000213",
  MATH_1_SPEED_FACTS_TIMED: "10000000-0000-4000-8000-000000000214",
} as const;

export const KNOWLEDGE_POINT_EXPERIENCE_IDS = {
  RD_CVC_A_TILE_BLEND: "41000000-0000-4000-8000-000000000701",
  RD_CVC_A_LISTEN_AND_READ: "41000000-0000-4000-8000-000000000702",
  RD_HFW_L1_SPEED_STARS: "41000000-0000-4000-8000-000000000703",
  MATH_ADD_WITHIN_5_HANDS_ON: "41000000-0000-4000-8000-000000000801",
  MATH_ADD_WITHIN_5_FLUENCY_LOOP: "41000000-0000-4000-8000-000000000802",
} as const;

export const SUBJECT_IDS = {
  READING_FOUNDATIONAL: "40000000-0000-4000-8000-000000000101",
  MATH_FOUNDATIONAL: "40000000-0000-4000-8000-000000000201",
} as const;

export const COURSE_IDS = {
  READING_PREK_FOUNDATIONS: "40000000-0000-4000-8000-000000000301",
  READING_K_CORE: "40000000-0000-4000-8000-000000000302",
  READING_G1_CORE: "40000000-0000-4000-8000-000000000303",
  MATH_PREK_CORE: "40000000-0000-4000-8000-000000000401",
  MATH_K_CORE: "40000000-0000-4000-8000-000000000402",
} as const;

export const LESSON_IDS = {
  READING_PRINT_CONCEPTS: "40000000-0000-4000-8000-000000000501",
  READING_PA_EARLY: "40000000-0000-4000-8000-000000000502",
  READING_PHONICS_CVC: "40000000-0000-4000-8000-000000000503",
  READING_WORD_AUTOMATICITY: "40000000-0000-4000-8000-000000000504",
  READING_LONG_VOWELS: "40000000-0000-4000-8000-000000000505",
  READING_COMPREHENSION: "40000000-0000-4000-8000-000000000506",
  MATH_SUBITIZE_AND_COUNT: "40000000-0000-4000-8000-000000000601",
  MATH_EARLY_OPERATIONS: "40000000-0000-4000-8000-000000000602",
  MATH_TIME_AND_FLUENCY: "40000000-0000-4000-8000-000000000603",
} as const;

const SUBJECT_BLUEPRINTS: Record<
  string,
  { title: string; domain: "reading" | "math"; description?: string }
> = {
  [SUBJECT_IDS.READING_FOUNDATIONAL]: {
    title: "Foundational Literacy",
    domain: "reading",
    description: "Science-of-Reading-aligned scope for early decoding, fluency, and comprehension",
  },
  [SUBJECT_IDS.MATH_FOUNDATIONAL]: {
    title: "Foundational Math",
    domain: "math",
    description: "PreK–Grade 1 numeracy, operations, and fluency progression",
  },
};

const COURSE_BLUEPRINTS: Record<
  string,
  {
    subjectId: string;
    title: string;
    summary?: string;
    gradeBand?: "PreK" | "K" | "1";
    sequence: number;
  }
> = {
  [COURSE_IDS.READING_PREK_FOUNDATIONS]: {
    subjectId: SUBJECT_IDS.READING_FOUNDATIONAL,
    title: "PreK Foundations",
    summary: "Print concepts, oral language, and early phonological awareness",
    gradeBand: "PreK",
    sequence: 0,
  },
  [COURSE_IDS.READING_K_CORE]: {
    subjectId: SUBJECT_IDS.READING_FOUNDATIONAL,
    title: "Kindergarten Core",
    summary: "Systematic phonics, CVC decoding, and sight word fluency",
    gradeBand: "K",
    sequence: 1,
  },
  [COURSE_IDS.READING_G1_CORE]: {
    subjectId: SUBJECT_IDS.READING_FOUNDATIONAL,
    title: "Grade 1 Stretch",
    summary: "Long vowels, advanced patterns, and comprehension monitoring",
    gradeBand: "1",
    sequence: 2,
  },
  [COURSE_IDS.MATH_PREK_CORE]: {
    subjectId: SUBJECT_IDS.MATH_FOUNDATIONAL,
    title: "PreK Math Core",
    summary: "Subitizing, counting, and sense-making to 5",
    gradeBand: "PreK",
    sequence: 0,
  },
  [COURSE_IDS.MATH_K_CORE]: {
    subjectId: SUBJECT_IDS.MATH_FOUNDATIONAL,
    title: "Kindergarten Math Extension",
    summary: "Counting to 20, early addition, and measurement fluency",
    gradeBand: "K",
    sequence: 1,
  },
};

const LESSON_BLUEPRINTS: Record<
  string,
  {
    courseId: string;
    title: string;
    summary?: string;
    sequence: number;
    focusQuestion?: string;
    estimatedMinutes?: number;
  }
> = {
  [LESSON_IDS.READING_PRINT_CONCEPTS]: {
    courseId: COURSE_IDS.READING_PREK_FOUNDATIONS,
    title: "Print Concepts & Listening",
    summary: "Book handling, listening comprehension, and category language",
    sequence: 0,
    estimatedMinutes: 25,
  },
  [LESSON_IDS.READING_PA_EARLY]: {
    courseId: COURSE_IDS.READING_PREK_FOUNDATIONS,
    title: "Early Phonological Awareness",
    summary: "Hearing and playing with sounds in words",
    sequence: 1,
    estimatedMinutes: 30,
  },
  [LESSON_IDS.READING_PHONICS_CVC]: {
    courseId: COURSE_IDS.READING_K_CORE,
    title: "CVC Decoding Lab",
    summary: "Blend, segment, and decode consonant-vowel-consonant words",
    sequence: 0,
    estimatedMinutes: 35,
  },
  [LESSON_IDS.READING_WORD_AUTOMATICITY]: {
    courseId: COURSE_IDS.READING_K_CORE,
    title: "High-Frequency Word Fluency",
    summary: "Build automaticity with sight words and decodable sentences",
    sequence: 1,
    estimatedMinutes: 20,
  },
  [LESSON_IDS.READING_LONG_VOWELS]: {
    courseId: COURSE_IDS.READING_G1_CORE,
    title: "Long Vowels & Advanced Patterns",
    sequence: 0,
    summary: "Silent e, vowel teams, digraphs, and r-controlled syllables",
    estimatedMinutes: 30,
  },
  [LESSON_IDS.READING_COMPREHENSION]: {
    courseId: COURSE_IDS.READING_G1_CORE,
    title: "Comprehension & Writing",
    summary: "Sequencing, evidence, inference, and sentence writing",
    sequence: 1,
    estimatedMinutes: 25,
  },
  [LESSON_IDS.MATH_SUBITIZE_AND_COUNT]: {
    courseId: COURSE_IDS.MATH_PREK_CORE,
    title: "See & Count",
    summary: "Subitize small groups and count within 20",
    sequence: 0,
    estimatedMinutes: 20,
  },
  [LESSON_IDS.MATH_EARLY_OPERATIONS]: {
    courseId: COURSE_IDS.MATH_K_CORE,
    title: "Early Addition Stories",
    summary: "Model and combine quantities within 20",
    sequence: 0,
    estimatedMinutes: 25,
  },
  [LESSON_IDS.MATH_TIME_AND_FLUENCY]: {
    courseId: COURSE_IDS.MATH_K_CORE,
    title: "Time & Fact Fluency",
    summary: "Tell time to the hour and build addition fluency",
    sequence: 1,
    estimatedMinutes: 20,
  },
};

export const ASSET_IDS = {
  AUDIO_BLEND_STORY: "30000000-0000-4000-8000-000000000101",
  VIDEO_SHORT_A: "30000000-0000-4000-8000-000000000102",
  IMAGE_TEN_FRAME: "30000000-0000-4000-8000-000000000103",
  AUDIO_BREATHING: "30000000-0000-4000-8000-000000000104",
  VIDEO_SMOOTHIE_GAMEPLAY: "30000000-0000-4000-8000-000000000105",
} as const;

export const MICRO_GAME_IDS = {
  SMOOTHIE_ADDITION: "31000000-0000-4000-8000-000000000201",
  SOUND_STUDIO: "31000000-0000-4000-8000-000000000202",
} as const;

export const PRACTICE_ACTIVITY_IDS = {
  BLEND_TILE_BUILDER: "32000000-0000-4000-8000-000000000301",
  LETTER_MATCH_FLIP: "32000000-0000-4000-8000-000000000302",
  ADDITION_SMOOTHIE: "32000000-0000-4000-8000-000000000303",
  SPEED_FACT_DASH: "32000000-0000-4000-8000-000000000304",
  HFW_SPEED_STARS: "32000000-0000-4000-8000-000000000305",
} as const;

export const CHECK_CHART_IDS = {
  READING_FOUNDATIONS: "33000000-0000-4000-8000-000000000401",
  MATH_PREK_CORE: "33000000-0000-4000-8000-000000000601",
  MATH_PREK_STRETCH: "33000000-0000-4000-8000-000000000602",
  MATH_K_CORE: "33000000-0000-4000-8000-000000000603",
} as const;

export const MOTIVATION_TRACK_IDS = {
  DAILY_SPARK: "34000000-0000-4000-8000-000000000501",
} as const;

export const MOTIVATION_REWARD_IDS = {
  SPARK_BADGE_ONE: "34000000-0000-4000-8000-000000000511",
  SPARK_BADGE_TWO: "34000000-0000-4000-8000-000000000512",
} as const;

export const MOTIVATION_LEAGUE_IDS = {
  SPARK_STARTERS: "34000000-0000-4000-8000-000000000521",
} as const;

export const MOTIVATION_SQUAD_IDS = {
  CONSTELLATION_CREW: "34000000-0000-4000-8000-000000000531",
  STELLAR_SQUAD: "34000000-0000-4000-8000-000000000532",
} as const;

export const MOTIVATION_QUEST_IDS = {
  SHAPE_MASTER: "34000000-0000-4000-8000-000000000541",
  STORY_CHAMPION: "34000000-0000-4000-8000-000000000542",
  SPEED_STAR: "34000000-0000-4000-8000-000000000543",
} as const;

export const JOY_BREAK_IDS = {
  RAINBOW_BREATHING: "35000000-0000-4000-8000-000000000601",
} as const;

export const DIAGNOSTIC_PROBE_IDS = {
  MATH_SUBITIZE_DOTS: "36000000-0000-4000-8000-000000000701",
  MATH_COUNT_TO_20_START: "36000000-0000-4000-8000-000000000702",
  MATH_ADD_WITHIN_10: "36000000-0000-4000-8000-000000000703",
  MATH_TIME_TO_HOUR: "36000000-0000-4000-8000-000000000704",
} as const;

const ISO_NOW = "2024-01-01T00:00:00.000Z";

const readingSkillBlueprints: Skill[] = [
  {
    id: SKILL_IDS.RD_PRINT_HANDLE,
    title: "Handle books & track print",
    domain: "reading",
    strand: "Concepts of Print",
    gradeBand: "PreK",
    stageCode: "R0_FOUNDATIONS",
    description: "Hold a book correctly and track print left to right and top to bottom.",
    prerequisites: [],
    encompassing: [],
    interferenceGroup: "print-concepts",
    expectedTimeSeconds: 150,
    checkChartTags: ["I know how to handle a book"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_ORAL_LISTEN,
    title: "Listen & retell stories",
    domain: "reading",
    strand: "Oral Language",
    gradeBand: "PreK",
    stageCode: "R0_FOUNDATIONS",
    description: "Follow a short story, carry out one-step directions, and retell three events.",
    prerequisites: [{ skillId: SKILL_IDS.RD_PRINT_HANDLE, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "oral-language-routines",
    expectedTimeSeconds: 150,
    checkChartTags: ["I can listen and tell what happened"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_PA_WORD,
    title: "Word awareness",
    domain: "reading",
    strand: "Phonological Awareness",
    gradeBand: "PreK",
    stageCode: "R0_FOUNDATIONS",
    description: "Count the number of words in short sentences and match speech to print spaces.",
    prerequisites: [{ skillId: SKILL_IDS.RD_PRINT_HANDLE, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "pa-word-awareness",
    expectedTimeSeconds: 150,
    checkChartTags: ["I can tell how many words I hear"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_PA_SYLLABLE,
    title: "Clap syllables (1–3)",
    domain: "reading",
    strand: "Phonological Awareness",
    gradeBand: "PreK",
    stageCode: "R0_FOUNDATIONS",
    description: "Clap and sort words with one to three syllables using picture support.",
    prerequisites: [{ skillId: SKILL_IDS.RD_PA_WORD, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "pa-syllable",
    expectedTimeSeconds: 150,
    checkChartTags: ["I can clap syllables"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_PA_RHYME,
    title: "Rhyme and odd-one-out",
    domain: "reading",
    strand: "Phonological Awareness",
    gradeBand: "PreK",
    stageCode: "R0_FOUNDATIONS",
    description: "Identify rhyming pairs and the word that does not rhyme.",
    prerequisites: [{ skillId: SKILL_IDS.RD_PA_SYLLABLE, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "pa-rhyme",
    expectedTimeSeconds: 150,
    checkChartTags: ["I can find rhyming words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_ORAL_VOCAB_CAT,
    title: "Category vocabulary",
    domain: "reading",
    strand: "Oral Language",
    gradeBand: "PreK",
    stageCode: "R0_FOUNDATIONS",
    description: "Sort pictures into categories and name what belongs together.",
    prerequisites: [{ skillId: SKILL_IDS.RD_ORAL_LISTEN, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "oral-vocabulary",
    expectedTimeSeconds: 150,
    checkChartTags: ["I can name things in a group"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_LN_UPPER,
    title: "Uppercase letter names",
    domain: "reading",
    strand: "Alphabet Knowledge",
    gradeBand: "PreK",
    stageCode: "R1_PREK_CORE",
    description: "Identify and name uppercase letters in small, mixed sets.",
    prerequisites: [{ skillId: SKILL_IDS.RD_PRINT_HANDLE, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "letter-names",
    expectedTimeSeconds: 180,
    checkChartTags: ["I know my letter names"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_LN_LOWER,
    title: "Lowercase letter names",
    domain: "reading",
    strand: "Alphabet Knowledge",
    gradeBand: "PreK",
    stageCode: "R1_PREK_CORE",
    description: "Match lowercase letters to uppercase partners and say their names.",
    prerequisites: [{ skillId: SKILL_IDS.RD_LN_UPPER, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "letter-names",
    expectedTimeSeconds: 180,
    checkChartTags: ["I know my letter names"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_LS_SET1,
    title: "Letter sounds set 1",
    domain: "reading",
    strand: "Alphabet Knowledge",
    gradeBand: "PreK",
    stageCode: "R1_PREK_CORE",
    description: "Produce reliable consonant sounds /m s t a p n/ and connect sound to letter.",
    prerequisites: [{ skillId: SKILL_IDS.RD_LN_LOWER, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "letter-sounds-set1",
    expectedTimeSeconds: 180,
    checkChartTags: ["I know my letter sounds"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_PA_INIT,
    title: "Initial phoneme",
    domain: "reading",
    strand: "Phonological Awareness",
    gradeBand: "PreK",
    stageCode: "R1_PREK_CORE",
    description: "Hear and match the first sound in VC and CVC words.",
    prerequisites: [{ skillId: SKILL_IDS.RD_LS_SET1, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "pa-initial",
    expectedTimeSeconds: 160,
    checkChartTags: ["I can hear beginning sounds"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_BLEND_2PH,
    title: "Blend 2 phonemes",
    domain: "reading",
    strand: "Phonological Awareness",
    gradeBand: "PreK",
    stageCode: "R1_PREK_CORE",
    description: "Blend onset and rime to form a word with picture or word cues.",
    prerequisites: [{ skillId: SKILL_IDS.RD_PA_INIT, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "blend-two",
    expectedTimeSeconds: 170,
    checkChartTags: ["I can blend two sounds"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_SEGMENT_2PH,
    title: "Segment 2 phonemes",
    domain: "reading",
    strand: "Phonological Awareness",
    gradeBand: "PreK",
    stageCode: "R1_PREK_CORE",
    description: "Break simple words into onset and rime with counters or tiles.",
    prerequisites: [{ skillId: SKILL_IDS.RD_BLEND_2PH, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "segment-two",
    expectedTimeSeconds: 170,
    checkChartTags: ["I can pull apart two sounds"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_LS_SET2,
    title: "Letter sounds set 2",
    domain: "reading",
    strand: "Alphabet Knowledge",
    gradeBand: "K",
    stageCode: "R2_K_PHONICS",
    description: "Add consonant sounds /c f b h r l d g o/ with mouth formation videos.",
    prerequisites: [{ skillId: SKILL_IDS.RD_LS_SET1, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "letter-sounds-set2",
    expectedTimeSeconds: 190,
    checkChartTags: ["I know more letter sounds"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_PA_MED,
    title: "Medial vowel",
    domain: "reading",
    strand: "Phonological Awareness",
    gradeBand: "K",
    stageCode: "R2_K_PHONICS",
    description: "Identify the middle vowel sound in consonant-vowel-consonant words.",
    prerequisites: [{ skillId: SKILL_IDS.RD_LS_SET2, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "pa-medial",
    expectedTimeSeconds: 190,
    checkChartTags: ["I can hear middle sounds"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_BLEND_3PH,
    title: "Blend 3 phonemes",
    domain: "reading",
    strand: "Phonological Awareness",
    gradeBand: "K",
    stageCode: "R2_K_PHONICS",
    description: "Blend three phonemes to say real and nonsense words with minimal prompts.",
    prerequisites: [{ skillId: SKILL_IDS.RD_LS_SET2, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_BLEND_2PH, weight: 0.4 }],
    interferenceGroup: "blend-three",
    expectedTimeSeconds: 200,
    checkChartTags: ["I can blend three sounds"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_SEGMENT_3PH,
    title: "Segment 3 phonemes",
    domain: "reading",
    strand: "Phonological Awareness",
    gradeBand: "K",
    stageCode: "R2_K_PHONICS",
    description: "Tap or build each sound in a three-phoneme word using manipulatives.",
    prerequisites: [{ skillId: SKILL_IDS.RD_BLEND_3PH, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_SEGMENT_2PH, weight: 0.4 }],
    interferenceGroup: "segment-three",
    expectedTimeSeconds: 200,
    checkChartTags: ["I can pull apart three sounds"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_CVC_A,
    title: "Decode CVC short a",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "K",
    stageCode: "R2_K_PHONICS",
    description: "Read and spell short a word families including nonsense words.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_BLEND_3PH, gate: "AND" },
      { skillId: SKILL_IDS.RD_LN_LOWER, gate: "AND" },
    ],
    encompassing: [{ skillId: SKILL_IDS.RD_BLEND_3PH, weight: 0.4 }],
    interferenceGroup: "cvc-short-a",
    expectedTimeSeconds: 240,
    checkChartTags: ["I can read CVC words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_CVC_I,
    title: "Decode CVC short i",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "K",
    stageCode: "R2_K_PHONICS",
    description: "Decode and spell short i words with mixed review from prior families.",
    prerequisites: [{ skillId: SKILL_IDS.RD_CVC_A, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_CVC_A, weight: 0.5 }],
    interferenceGroup: "cvc-short-i",
    expectedTimeSeconds: 230,
    checkChartTags: ["I can read more CVC words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_HFW_L1,
    title: "Sight Word Ladder Level 1",
    domain: "reading",
    strand: "High-Frequency Words",
    gradeBand: "K",
    stageCode: "R2_K_PHONICS",
    description: "Read the first 40 high-frequency words with automaticity and phrase usage.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_LN_LOWER, gate: "AND" },
      { skillId: SKILL_IDS.RD_PRINT_HANDLE, gate: "AND" },
    ],
    encompassing: [],
    interferenceGroup: "hfw-ladder",
    expectedTimeSeconds: 210,
    checkChartTags: ["I know 40 PreK sight words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_CVC_O,
    title: "Decode CVC short o",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "K",
    stageCode: "R3_K_AUTOMATIC",
    description: "Read and spell short o words with speed and accuracy goals.",
    prerequisites: [{ skillId: SKILL_IDS.RD_CVC_I, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_CVC_I, weight: 0.5 }],
    interferenceGroup: "cvc-short-o",
    expectedTimeSeconds: 230,
    checkChartTags: ["I can read even more CVC words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_CVC_U,
    title: "Decode CVC short u",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "K",
    stageCode: "R3_K_AUTOMATIC",
    description: "Read and spell short u families with mixed vowel review.",
    prerequisites: [{ skillId: SKILL_IDS.RD_CVC_O, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_CVC_O, weight: 0.5 }],
    interferenceGroup: "cvc-short-u",
    expectedTimeSeconds: 230,
    checkChartTags: ["I can read all short vowel words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_CVC_E,
    title: "Decode CVC short e",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "K",
    stageCode: "R3_K_AUTOMATIC",
    description: "Decode short e word families, including nonsense words and mixed review.",
    prerequisites: [{ skillId: SKILL_IDS.RD_CVC_U, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_CVC_U, weight: 0.5 }],
    interferenceGroup: "cvc-short-e",
    expectedTimeSeconds: 240,
    checkChartTags: ["I can read all CVC words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_DIGRAPH_CH_SH,
    title: "Digraphs ch, sh, th",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "K",
    stageCode: "R3_K_AUTOMATIC",
    description: "Decode and sort digraph words including voiced and unvoiced th.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_CVC_E, gate: "AND" },
      { skillId: SKILL_IDS.RD_HFW_L1, gate: "AND" },
    ],
    encompassing: [],
    interferenceGroup: "digraphs",
    expectedTimeSeconds: 240,
    checkChartTags: ["I can read digraph words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_BLEND_L_CLUSTER,
    title: "Initial blends",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "K",
    stageCode: "R3_K_AUTOMATIC",
    description: "Read words with beginning blends (bl, cl, st, gr) and segment the sounds.",
    prerequisites: [{ skillId: SKILL_IDS.RD_DIGRAPH_CH_SH, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_DIGRAPH_CH_SH, weight: 0.4 }],
    interferenceGroup: "consonant-blends",
    expectedTimeSeconds: 240,
    checkChartTags: ["I can read blend words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_HFW_L2,
    title: "Sight Word Ladder Level 2",
    domain: "reading",
    strand: "High-Frequency Words",
    gradeBand: "K",
    stageCode: "R3_K_AUTOMATIC",
    description: "Read 50 additional high-frequency words, focusing on speed within 2 seconds.",
    prerequisites: [{ skillId: SKILL_IDS.RD_HFW_L1, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_HFW_L1, weight: 0.5 }],
    interferenceGroup: "hfw-ladder",
    expectedTimeSeconds: 210,
    checkChartTags: ["I know Level 2 sight words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_HFW_L3,
    title: "Sight Word Ladder Level 3",
    domain: "reading",
    strand: "High-Frequency Words",
    gradeBand: "K",
    stageCode: "R3_K_AUTOMATIC",
    description: "Read 60 more high-frequency words in phrases and sentences with fluency.",
    prerequisites: [{ skillId: SKILL_IDS.RD_HFW_L2, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_HFW_L2, weight: 0.5 }],
    interferenceGroup: "hfw-ladder",
    expectedTimeSeconds: 220,
    checkChartTags: ["I know Level 3 sight words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_DEC_SENT_A,
    title: "Decodable sentences Set A",
    domain: "reading",
    strand: "Fluency",
    gradeBand: "K",
    stageCode: "R3_K_AUTOMATIC",
    description: "Read multi-sentence decodables using taught patterns and targeted sight words.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_CVC_E, gate: "AND" },
      { skillId: SKILL_IDS.RD_HFW_L2, gate: "AND" },
    ],
    encompassing: [
      { skillId: SKILL_IDS.RD_CVC_E, weight: 0.4 },
      { skillId: SKILL_IDS.RD_HFW_L2, weight: 0.4 },
    ],
    interferenceGroup: "decodable-sentences",
    expectedTimeSeconds: 260,
    checkChartTags: ["I can read decodable sentences"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_COMP_SEQUENCE,
    title: "Story sequencing",
    domain: "reading",
    strand: "Comprehension",
    gradeBand: "K",
    stageCode: "R3_K_AUTOMATIC",
    description:
      "Identify beginning, middle, and end of stories and answer who/what/where questions.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_ORAL_LISTEN, gate: "AND" },
      { skillId: SKILL_IDS.RD_DEC_SENT_A, gate: "AND" },
    ],
    encompassing: [{ skillId: SKILL_IDS.RD_ORAL_LISTEN, weight: 0.3 }],
    interferenceGroup: "story-structure",
    expectedTimeSeconds: 220,
    checkChartTags: ["I can retell a story"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_LONG_VOWEL_E,
    title: "Silent e long vowels",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description:
      "Read and spell CVCe words (a_e, i_e, o_e, u_e) with accuracy and contrast to short vowels.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_CVC_E, gate: "AND" },
      { skillId: SKILL_IDS.RD_HFW_L3, gate: "AND" },
    ],
    encompassing: [],
    interferenceGroup: "long-vowel",
    expectedTimeSeconds: 260,
    checkChartTags: ["I can read silent-e words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_VOWEL_TEAMS_AI_OA,
    title: "Vowel teams ai/ay, ee/ea, oa/ow",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description: "Decode vowel-team patterns in words and phrases and choose correct spellings.",
    prerequisites: [{ skillId: SKILL_IDS.RD_LONG_VOWEL_E, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_LONG_VOWEL_E, weight: 0.4 }],
    interferenceGroup: "vowel-teams",
    expectedTimeSeconds: 260,
    checkChartTags: ["I can read vowel-team words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_R_CONTROLLED,
    title: "R-controlled vowels",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description: "Read and spell ar, or, er/ir/ur syllables inside one- and two-syllable words.",
    prerequisites: [{ skillId: SKILL_IDS.RD_LONG_VOWEL_E, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "r-controlled",
    expectedTimeSeconds: 260,
    checkChartTags: ["I can read r-controlled words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_DIGRAPH_TH_WH_PH,
    title: "Advanced digraphs th/wh/ph",
    domain: "reading",
    strand: "Phonics & Word Recognition",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description: "Decode late digraphs in isolation and inside multisyllabic words.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_DIGRAPH_CH_SH, gate: "AND" },
      { skillId: SKILL_IDS.RD_BLEND_L_CLUSTER, gate: "AND" },
    ],
    encompassing: [],
    interferenceGroup: "digraphs",
    expectedTimeSeconds: 260,
    checkChartTags: ["I can read tricky digraphs"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_HFW_L4,
    title: "Sight Word Ladder Level 4",
    domain: "reading",
    strand: "High-Frequency Words",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description: "Read 80 additional high-frequency words including irregular spellings.",
    prerequisites: [{ skillId: SKILL_IDS.RD_HFW_L3, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_HFW_L3, weight: 0.5 }],
    interferenceGroup: "hfw-ladder",
    expectedTimeSeconds: 220,
    checkChartTags: ["I know Level 4 sight words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_HFW_L5,
    title: "Sight Word Ladder Level 5",
    domain: "reading",
    strand: "High-Frequency Words",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description: "Read 100 more sight words across short paragraphs and dictation sentences.",
    prerequisites: [{ skillId: SKILL_IDS.RD_HFW_L4, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_HFW_L4, weight: 0.5 }],
    interferenceGroup: "hfw-ladder",
    expectedTimeSeconds: 230,
    checkChartTags: ["I know Level 5 sight words"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_FLUENCY_J,
    title: "Fluency Level J",
    domain: "reading",
    strand: "Fluency",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description: "Read a Level J passage at 60 words per minute with phrasing and expression.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_DEC_SENT_A, gate: "AND" },
      { skillId: SKILL_IDS.RD_HFW_L4, gate: "AND" },
    ],
    encompassing: [{ skillId: SKILL_IDS.RD_DEC_SENT_A, weight: 0.4 }],
    interferenceGroup: "fluency-level-j",
    expectedTimeSeconds: 360,
    checkChartTags: ["I can read Level J books"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_FLUENCY_M,
    title: "Fluency Level M",
    domain: "reading",
    strand: "Fluency",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description: "Read a Level M passage at 70 words per minute with expression and accuracy.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_FLUENCY_J, gate: "AND" },
      { skillId: SKILL_IDS.RD_HFW_L5, gate: "AND" },
    ],
    encompassing: [{ skillId: SKILL_IDS.RD_FLUENCY_J, weight: 0.5 }],
    interferenceGroup: "fluency-level-m",
    expectedTimeSeconds: 380,
    checkChartTags: ["I can read Level M books"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_COMP_WHO_WHAT_WHY,
    title: "Comprehension: who/what/where/why",
    domain: "reading",
    strand: "Comprehension",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description:
      "Answer literal questions and point to text evidence in decodable and leveled texts.",
    prerequisites: [{ skillId: SKILL_IDS.RD_DEC_SENT_A, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.RD_COMP_SEQUENCE, weight: 0.4 }],
    interferenceGroup: "comprehension-literal",
    expectedTimeSeconds: 220,
    checkChartTags: ["I can answer story questions"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_COMP_INFER_L1,
    title: "Early inference",
    domain: "reading",
    strand: "Comprehension",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description:
      "Use text and picture clues to make simple inferences about characters and events.",
    prerequisites: [{ skillId: SKILL_IDS.RD_COMP_WHO_WHAT_WHY, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "comprehension-inference",
    expectedTimeSeconds: 220,
    checkChartTags: ["I can make simple inferences"],
    assets: [],
  },
  {
    id: SKILL_IDS.RD_WRITE_SENTENCE,
    title: "Write & punctuate sentences",
    domain: "reading",
    strand: "Writing",
    gradeBand: "1",
    stageCode: "R4_G1_CORE",
    description: "Compose complete sentences using taught patterns, capitals, and punctuation.",
    prerequisites: [
      { skillId: SKILL_IDS.RD_LONG_VOWEL_E, gate: "AND" },
      { skillId: SKILL_IDS.RD_HFW_L4, gate: "AND" },
    ],
    encompassing: [],
    interferenceGroup: "writing-sentence",
    expectedTimeSeconds: 300,
    checkChartTags: ["I can write sentences"],
    assets: [],
  },
];

const mathSkillBlueprints: Skill[] = [
  {
    id: SKILL_IDS.MATH_PK_SUBITIZE_1_4,
    title: "Subitize up to 4",
    domain: "math",
    strand: "Counting & Cardinality",
    gradeBand: "PreK",
    stageCode: "M1_PREK_CORE",
    description: "Recognize quantities of up to four without counting",
    prerequisites: [],
    encompassing: [],
    interferenceGroup: "subitize-1-4",
    expectedTimeSeconds: 150,
    checkChartTags: ["I can see groups to 4"],
    assets: [],
  },
  {
    id: SKILL_IDS.MATH_PK_COUNT_TO_5,
    title: "Count to 5",
    domain: "math",
    strand: "Counting & Cardinality",
    gradeBand: "PreK",
    stageCode: "M1_PREK_CORE",
    description: "Count forward and match numbers to quantities up to five",
    prerequisites: [{ skillId: SKILL_IDS.MATH_PK_SUBITIZE_1_4, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.MATH_PK_SUBITIZE_1_4, weight: 0.3 }],
    interferenceGroup: "counting-sequences",
    expectedTimeSeconds: 180,
    checkChartTags: ["I can count to 5"],
    assets: [],
  },
  {
    id: SKILL_IDS.MATH_K_COUNT_TO_20,
    title: "Count to 20",
    domain: "math",
    strand: "Counting & Cardinality",
    gradeBand: "K",
    stageCode: "M2_PREK_STRETCH",
    description: "Count forward from random start numbers up to twenty",
    prerequisites: [{ skillId: SKILL_IDS.MATH_PK_COUNT_TO_5, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.MATH_PK_COUNT_TO_5, weight: 0.4 }],
    interferenceGroup: "counting-sequences",
    expectedTimeSeconds: 210,
    checkChartTags: ["I can count to 20"],
    assets: [],
  },
  {
    id: SKILL_IDS.MATH_K_ADD_WITHIN_5,
    title: "Add within 5",
    domain: "math",
    strand: "Operations & Algebraic Thinking",
    gradeBand: "K",
    stageCode: "M1_PREK_CORE",
    description: "Combine two sets with sums up to five using objects and mental strategies",
    prerequisites: [{ skillId: SKILL_IDS.MATH_PK_COUNT_TO_5, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.MATH_PK_COUNT_TO_5, weight: 0.4 }],
    interferenceGroup: "single-digit-addition",
    expectedTimeSeconds: 240,
    checkChartTags: ["I can add within 5"],
    assets: [],
  },
  {
    id: SKILL_IDS.MATH_1_ADD_WITHIN_20,
    title: "Add within 20",
    domain: "math",
    strand: "Operations & Algebraic Thinking",
    gradeBand: "1",
    stageCode: "M3_K_CORE",
    description: "Add two numbers within twenty using strategies and facts",
    prerequisites: [
      { skillId: SKILL_IDS.MATH_K_ADD_WITHIN_5, gate: "AND" },
      { skillId: SKILL_IDS.MATH_K_COUNT_TO_20, gate: "AND" },
    ],
    encompassing: [{ skillId: SKILL_IDS.MATH_K_ADD_WITHIN_5, weight: 0.5 }],
    interferenceGroup: "single-digit-addition",
    expectedTimeSeconds: 300,
    checkChartTags: ["I can add within 20"],
    assets: [],
  },
  {
    id: SKILL_IDS.MATH_1_TIME_TO_HOUR,
    title: "Tell time to the hour",
    domain: "math",
    strand: "Measurement & Data",
    gradeBand: "1",
    stageCode: "M3_K_CORE",
    description: "Read analog clocks to the hour and match to daily routines",
    prerequisites: [{ skillId: SKILL_IDS.MATH_K_COUNT_TO_20, gate: "AND" }],
    encompassing: [],
    interferenceGroup: "time-reading",
    expectedTimeSeconds: 240,
    checkChartTags: ["I can tell time to the hour"],
    assets: [],
  },
  {
    id: SKILL_IDS.MATH_1_SPEED_FACTS_0_10,
    title: "Speed facts 0–10",
    domain: "math",
    strand: "Operations & Algebraic Thinking",
    gradeBand: "1",
    stageCode: "M3_K_CORE",
    description: "Respond quickly to addition facts with sums to ten",
    prerequisites: [{ skillId: SKILL_IDS.MATH_1_ADD_WITHIN_20, gate: "AND" }],
    encompassing: [{ skillId: SKILL_IDS.MATH_1_ADD_WITHIN_20, weight: 0.7 }],
    interferenceGroup: "fact-fluency",
    expectedTimeSeconds: 180,
    checkChartTags: ["I can answer facts fast"],
    assets: [],
  },
];

const readingLessonMap: Record<string, string> = {};
const readingCourseMap: Record<string, string> = {};
const setReadingLesson = (skills: string[], lessonId: string) => {
  for (const id of skills) readingLessonMap[id] = lessonId;
};
const setReadingCourse = (skills: string[], courseId: string) => {
  for (const id of skills) readingCourseMap[id] = courseId;
};

setReadingCourse(
  [
    SKILL_IDS.RD_PRINT_HANDLE,
    SKILL_IDS.RD_ORAL_LISTEN,
    SKILL_IDS.RD_PA_WORD,
    SKILL_IDS.RD_PA_SYLLABLE,
    SKILL_IDS.RD_PA_RHYME,
    SKILL_IDS.RD_ORAL_VOCAB_CAT,
  ],
  COURSE_IDS.READING_PREK_FOUNDATIONS,
);
setReadingCourse(
  [
    SKILL_IDS.RD_LN_UPPER,
    SKILL_IDS.RD_LN_LOWER,
    SKILL_IDS.RD_LS_SET1,
    SKILL_IDS.RD_PA_INIT,
    SKILL_IDS.RD_BLEND_2PH,
    SKILL_IDS.RD_SEGMENT_2PH,
  ],
  COURSE_IDS.READING_PREK_FOUNDATIONS,
);
setReadingCourse(
  [
    SKILL_IDS.RD_LS_SET2,
    SKILL_IDS.RD_PA_MED,
    SKILL_IDS.RD_BLEND_3PH,
    SKILL_IDS.RD_SEGMENT_3PH,
    SKILL_IDS.RD_CVC_A,
    SKILL_IDS.RD_CVC_I,
    SKILL_IDS.RD_HFW_L1,
  ],
  COURSE_IDS.READING_K_CORE,
);
setReadingCourse(
  [
    SKILL_IDS.RD_CVC_O,
    SKILL_IDS.RD_CVC_U,
    SKILL_IDS.RD_CVC_E,
    SKILL_IDS.RD_DIGRAPH_CH_SH,
    SKILL_IDS.RD_BLEND_L_CLUSTER,
    SKILL_IDS.RD_HFW_L2,
    SKILL_IDS.RD_HFW_L3,
    SKILL_IDS.RD_DEC_SENT_A,
    SKILL_IDS.RD_COMP_SEQUENCE,
  ],
  COURSE_IDS.READING_K_CORE,
);
setReadingCourse(
  [
    SKILL_IDS.RD_LONG_VOWEL_E,
    SKILL_IDS.RD_VOWEL_TEAMS_AI_OA,
    SKILL_IDS.RD_R_CONTROLLED,
    SKILL_IDS.RD_DIGRAPH_TH_WH_PH,
    SKILL_IDS.RD_HFW_L4,
    SKILL_IDS.RD_HFW_L5,
    SKILL_IDS.RD_FLUENCY_J,
    SKILL_IDS.RD_FLUENCY_M,
    SKILL_IDS.RD_COMP_WHO_WHAT_WHY,
    SKILL_IDS.RD_COMP_INFER_L1,
    SKILL_IDS.RD_WRITE_SENTENCE,
  ],
  COURSE_IDS.READING_G1_CORE,
);

setReadingLesson(
  [SKILL_IDS.RD_PRINT_HANDLE, SKILL_IDS.RD_ORAL_LISTEN, SKILL_IDS.RD_ORAL_VOCAB_CAT],
  LESSON_IDS.READING_PRINT_CONCEPTS,
);
setReadingLesson(
  [SKILL_IDS.RD_PA_WORD, SKILL_IDS.RD_PA_SYLLABLE, SKILL_IDS.RD_PA_RHYME, SKILL_IDS.RD_PA_INIT],
  LESSON_IDS.READING_PA_EARLY,
);
setReadingLesson(
  [
    SKILL_IDS.RD_LN_UPPER,
    SKILL_IDS.RD_LN_LOWER,
    SKILL_IDS.RD_LS_SET1,
    SKILL_IDS.RD_LS_SET2,
    SKILL_IDS.RD_PA_MED,
    SKILL_IDS.RD_BLEND_2PH,
    SKILL_IDS.RD_BLEND_3PH,
    SKILL_IDS.RD_SEGMENT_2PH,
    SKILL_IDS.RD_SEGMENT_3PH,
    SKILL_IDS.RD_CVC_A,
    SKILL_IDS.RD_CVC_I,
    SKILL_IDS.RD_CVC_O,
    SKILL_IDS.RD_CVC_U,
    SKILL_IDS.RD_CVC_E,
    SKILL_IDS.RD_DIGRAPH_CH_SH,
    SKILL_IDS.RD_BLEND_L_CLUSTER,
  ],
  LESSON_IDS.READING_PHONICS_CVC,
);
setReadingLesson(
  [
    SKILL_IDS.RD_HFW_L1,
    SKILL_IDS.RD_HFW_L2,
    SKILL_IDS.RD_HFW_L3,
    SKILL_IDS.RD_HFW_L4,
    SKILL_IDS.RD_HFW_L5,
    SKILL_IDS.RD_DEC_SENT_A,
    SKILL_IDS.RD_FLUENCY_J,
    SKILL_IDS.RD_FLUENCY_M,
  ],
  LESSON_IDS.READING_WORD_AUTOMATICITY,
);
setReadingLesson(
  [
    SKILL_IDS.RD_LONG_VOWEL_E,
    SKILL_IDS.RD_VOWEL_TEAMS_AI_OA,
    SKILL_IDS.RD_R_CONTROLLED,
    SKILL_IDS.RD_DIGRAPH_TH_WH_PH,
  ],
  LESSON_IDS.READING_LONG_VOWELS,
);
setReadingLesson(
  [
    SKILL_IDS.RD_COMP_SEQUENCE,
    SKILL_IDS.RD_COMP_WHO_WHAT_WHY,
    SKILL_IDS.RD_COMP_INFER_L1,
    SKILL_IDS.RD_WRITE_SENTENCE,
  ],
  LESSON_IDS.READING_COMPREHENSION,
);

const mathLessonMap: Record<string, string> = {};
const mathCourseMap: Record<string, string> = {};
const setMathLesson = (skills: string[], lessonId: string) => {
  for (const id of skills) mathLessonMap[id] = lessonId;
};
const setMathCourse = (skills: string[], courseId: string) => {
  for (const id of skills) mathCourseMap[id] = courseId;
};

setMathCourse(
  [SKILL_IDS.MATH_PK_SUBITIZE_1_4, SKILL_IDS.MATH_PK_COUNT_TO_5],
  COURSE_IDS.MATH_PREK_CORE,
);
setMathCourse(
  [
    SKILL_IDS.MATH_K_COUNT_TO_20,
    SKILL_IDS.MATH_K_ADD_WITHIN_5,
    SKILL_IDS.MATH_1_ADD_WITHIN_20,
    SKILL_IDS.MATH_1_TIME_TO_HOUR,
    SKILL_IDS.MATH_1_SPEED_FACTS_0_10,
  ],
  COURSE_IDS.MATH_K_CORE,
);

setMathLesson(
  [SKILL_IDS.MATH_PK_SUBITIZE_1_4, SKILL_IDS.MATH_PK_COUNT_TO_5, SKILL_IDS.MATH_K_COUNT_TO_20],
  LESSON_IDS.MATH_SUBITIZE_AND_COUNT,
);
setMathLesson(
  [SKILL_IDS.MATH_K_ADD_WITHIN_5, SKILL_IDS.MATH_1_ADD_WITHIN_20],
  LESSON_IDS.MATH_EARLY_OPERATIONS,
);
setMathLesson(
  [SKILL_IDS.MATH_1_TIME_TO_HOUR, SKILL_IDS.MATH_1_SPEED_FACTS_0_10],
  LESSON_IDS.MATH_TIME_AND_FLUENCY,
);

const readingSkills: Skill[] = readingSkillBlueprints.map((skill) => ({
  ...skill,
  subjectId: SUBJECT_IDS.READING_FOUNDATIONAL,
  courseId: readingCourseMap[skill.id] ?? COURSE_IDS.READING_PREK_FOUNDATIONS,
  lessonId: readingLessonMap[skill.id] ?? LESSON_IDS.READING_PRINT_CONCEPTS,
  encompassing: skill.encompassing ?? [],
}));

const mathSkills: Skill[] = mathSkillBlueprints.map((skill) => ({
  ...skill,
  subjectId: SUBJECT_IDS.MATH_FOUNDATIONAL,
  courseId: mathCourseMap[skill.id] ?? COURSE_IDS.MATH_PREK_CORE,
  lessonId: mathLessonMap[skill.id] ?? LESSON_IDS.MATH_SUBITIZE_AND_COUNT,
  encompassing: skill.encompassing ?? [],
}));

export const seedSkills: Skill[] = [...readingSkills, ...mathSkills];
export const seedTopics = seedSkills;

const lessonSkillMap = new Map<string, string[]>();
for (const skill of seedSkills) {
  if (!skill.lessonId) continue;
  const current = lessonSkillMap.get(skill.lessonId) ?? [];
  current.push(skill.id);
  lessonSkillMap.set(skill.lessonId, current);
}

export const seedLessons: CurriculumLesson[] = Object.entries(LESSON_BLUEPRINTS).map(
  ([lessonId, blueprint]) => ({
    id: lessonId,
    courseId: blueprint.courseId,
    title: blueprint.title,
    summary: blueprint.summary,
    sequence: blueprint.sequence,
    focusQuestion: blueprint.focusQuestion,
    skillIds: lessonSkillMap.get(lessonId) ?? [],
    estimatedMinutes: blueprint.estimatedMinutes,
    metadata: {},
  }),
);

const courseLessonMap = new Map<string, string[]>();
for (const lesson of seedLessons) {
  const current = courseLessonMap.get(lesson.courseId) ?? [];
  current.push(lesson.id);
  courseLessonMap.set(lesson.courseId, current);
}

export const seedCourses: CurriculumCourse[] = Object.entries(COURSE_BLUEPRINTS).map(
  ([courseId, blueprint]) => ({
    id: courseId,
    subjectId: blueprint.subjectId,
    title: blueprint.title,
    summary: blueprint.summary,
    gradeBand: blueprint.gradeBand,
    sequence: blueprint.sequence,
    lessonIds: courseLessonMap.get(courseId) ?? [],
    metadata: {},
  }),
);

const subjectCourseMap = new Map<string, string[]>();
for (const course of seedCourses) {
  const current = subjectCourseMap.get(course.subjectId) ?? [];
  current.push(course.id);
  subjectCourseMap.set(course.subjectId, current);
}

export const seedSubjects: CurriculumSubject[] = Object.entries(SUBJECT_BLUEPRINTS).map(
  ([subjectId, blueprint]) => ({
    id: subjectId,
    title: blueprint.title,
    domain: blueprint.domain,
    description: blueprint.description,
    courseIds: subjectCourseMap.get(subjectId) ?? [],
    metadata: {},
  }),
);

const practiceId = (numeric: number) =>
  `20000000-0000-4000-8000-${numeric.toString().padStart(12, "0")}`;

const practiceIds = (...numerics: number[]) => numerics.map(practiceId);

const createKnowledgePoint = (config: {
  id: KnowledgePoint["id"];
  skillId: KnowledgePoint["skillId"];
  objective: string;
  workedExample: string[];
  practiceItemSuffixes: number[];
  reteachSnippet: string;
  expectedTimeSeconds: number;
  hints?: string[];
}): KnowledgePoint => ({
  id: config.id,
  skillId: config.skillId,
  objective: config.objective,
  workedExample: config.workedExample,
  practiceItems: practiceIds(...config.practiceItemSuffixes),
  reteachSnippet: config.reteachSnippet,
  expectedTimeSeconds: config.expectedTimeSeconds,
  hints: config.hints ?? [],
});

const readingKnowledgePoints: KnowledgePoint[] = [
  // R0 Foundations (Pre-Reader)
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PRINT_HANDLE_K1,
    skillId: SKILL_IDS.RD_PRINT_HANDLE,
    objective: "Identify the front, back, and spine of a book",
    workedExample: [
      "Point to the front cover and say the word front.",
      "Turn the book and point to the spine while naming it.",
    ],
    practiceItemSuffixes: [30101, 30102],
    reteachSnippet:
      "Use a real or virtual book, label each part aloud, then have the learner show it.",
    expectedTimeSeconds: 90,
    hints: [
      "Look for the title and picture to find the front cover.",
      "The spine is the bumpy edge that holds the pages together.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PRINT_HANDLE_K2,
    skillId: SKILL_IDS.RD_PRINT_HANDLE,
    objective: "Track print left to right with a return sweep",
    workedExample: [
      "Slide a finger under each word as audio reads the sentence.",
      "Jump down to the next line when the sentence ends.",
    ],
    practiceItemSuffixes: [30103, 30104],
    reteachSnippet:
      "Draw arrows over the sentence and model how to move the finger with the words.",
    expectedTimeSeconds: 100,
    hints: [
      "Start where the green dot shows the first word.",
      "Move your finger to the start of the next line when you reach the end.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_ORAL_LISTEN_K1,
    skillId: SKILL_IDS.RD_ORAL_LISTEN,
    objective: "Follow one-step directions from a story",
    workedExample: [
      "Listen to a short instruction and tap the picture that matches.",
      "After the sentence finishes, choose the action that was asked.",
    ],
    practiceItemSuffixes: [30201, 30202],
    reteachSnippet: "Replay the direction, act it out together, then try the question again.",
    expectedTimeSeconds: 110,
    hints: [
      "Listen for the action word in the sentence.",
      "Pause and picture what the storyteller asked you to do.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_ORAL_LISTEN_K2,
    skillId: SKILL_IDS.RD_ORAL_LISTEN,
    objective: "Retell three events in order",
    workedExample: [
      "Arrange picture cards to show beginning, middle, and end.",
      "Use first, next, last to retell the story.",
    ],
    practiceItemSuffixes: [30203, 30204],
    reteachSnippet: "Review the story with pictures, then have the learner narrate each part.",
    expectedTimeSeconds: 120,
    hints: [
      "Think about what happened first before anything else.",
      "Say the story in three parts: beginning, middle, end.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_WORD_K1,
    skillId: SKILL_IDS.RD_PA_WORD,
    objective: "Count words in sentences",
    workedExample: [
      "Clap for each word in the sentence 'I see dogs'.",
      "Tap boxes to show how many words were said.",
    ],
    practiceItemSuffixes: [30301, 30302],
    reteachSnippet: "Place a counter for each word as you repeat the sentence slowly.",
    expectedTimeSeconds: 110,
    hints: [
      "Say the sentence slowly and clap each word.",
      "Match each word to a box to keep track.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_WORD_K2,
    skillId: SKILL_IDS.RD_PA_WORD,
    objective: "Match spoken words to print spaces",
    workedExample: [
      "Drag a token under each printed word as it is spoken.",
      "Point to the blank when you hear the space between words.",
    ],
    practiceItemSuffixes: [30303, 30304],
    reteachSnippet:
      "Say one word, place a token, then repeat with the next until the sentence is covered.",
    expectedTimeSeconds: 110,
    hints: [
      "Watch for the gap between words in the sentence strip.",
      "Move one space at a time; do not skip blanks.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_SYLLABLE_K1,
    skillId: SKILL_IDS.RD_PA_SYLLABLE,
    objective: "Clap syllables in names and objects",
    workedExample: [
      "Clap two times for 'rabbit' and one time for 'cat'.",
      "Sort picture cards by the number of claps.",
    ],
    practiceItemSuffixes: [30401, 30402],
    reteachSnippet: "Use chin drops or taps to feel how many parts the word has.",
    expectedTimeSeconds: 110,
    hints: [
      "Open your mouth for each part of the word.",
      "Clap and count at the same time to keep track.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_SYLLABLE_K2,
    skillId: SKILL_IDS.RD_PA_SYLLABLE,
    objective: "Sort pictures by syllable count",
    workedExample: [
      "Drag all one-clap words into the one box.",
      "Place three-clap words in the three box.",
    ],
    practiceItemSuffixes: [30403, 30404],
    reteachSnippet: "Clap each picture together, then move it to the correct column.",
    expectedTimeSeconds: 120,
    hints: [
      "Count the claps out loud before you sort.",
      "Check the number on the box before dropping the card.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_RHYME_K1,
    skillId: SKILL_IDS.RD_PA_RHYME,
    objective: "Identify rhyming pairs",
    workedExample: [
      "Hear 'cat' and 'hat' and choose they rhyme.",
      "Listen to three words and find the two that rhyme.",
    ],
    practiceItemSuffixes: [30501, 30502],
    reteachSnippet: "Say the words slowly and notice the ending sound matching.",
    expectedTimeSeconds: 110,
    hints: [
      "Say the end of each word and listen if they sound the same.",
      "Cover the first sound and listen to the rest of the word.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_RHYME_K2,
    skillId: SKILL_IDS.RD_PA_RHYME,
    objective: "Generate a rhyming word",
    workedExample: [
      "Name a word that rhymes with 'sun'.",
      "Choose the picture that rhymes with 'log'.",
    ],
    practiceItemSuffixes: [30503, 30504],
    reteachSnippet:
      "Say the word, hold the ending sound, then change the first sound to make a new word.",
    expectedTimeSeconds: 120,
    hints: [
      "Keep the last part of the word the same.",
      "Try new beginning sounds until it sounds right.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_ORAL_VOCAB_CAT_K1,
    skillId: SKILL_IDS.RD_ORAL_VOCAB_CAT,
    objective: "Sort pictures into categories",
    workedExample: [
      "Place all animals together and all foods together.",
      "Explain the rule for why the pictures go together.",
    ],
    practiceItemSuffixes: [30601, 30602],
    reteachSnippet: "Name each item aloud, ask what they have in common, then sort again.",
    expectedTimeSeconds: 110,
    hints: [
      "Think about where you would find the item.",
      "Ask yourself if the pictures are alike in some way.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_ORAL_VOCAB_CAT_K2,
    skillId: SKILL_IDS.RD_ORAL_VOCAB_CAT,
    objective: "Name and describe category members",
    workedExample: [
      "Say 'These are fruits because they grow on plants and we can eat them'.",
      "Use a sentence to describe what belongs in the group.",
    ],
    practiceItemSuffixes: [30603, 30604],
    reteachSnippet: "Use the sentence frame 'These are ___ because ___' with picture support.",
    expectedTimeSeconds: 120,
    hints: [
      "Start your sentence with 'These are...'.",
      "Tell one detail about what the items do or where they go.",
    ],
  }),
  // R1 PreK Core (Letter/Sound Launch)
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LN_UPPER_K1,
    skillId: SKILL_IDS.RD_LN_UPPER,
    objective: "Identify target uppercase letters",
    workedExample: [
      "Hear the letter name M and tap the uppercase M.",
      "Find the letter that matches the sound in the song.",
    ],
    practiceItemSuffixes: [30701, 30702],
    reteachSnippet: "Trace the capital letter in the air while saying its name, then try again.",
    expectedTimeSeconds: 120,
    hints: [
      "Look at the straight and slanted lines in the letter.",
      "Sing the alphabet up to the letter you need.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LN_UPPER_K2,
    skillId: SKILL_IDS.RD_LN_UPPER,
    objective: "Match uppercase letters in mini-sets",
    workedExample: [
      "Flip cards to match identical uppercase letters.",
      "Drag the highlighted letter to the matching shadow.",
    ],
    practiceItemSuffixes: [30703, 30704],
    reteachSnippet: "Compare the shapes side by side and trace each before matching.",
    expectedTimeSeconds: 120,
    hints: [
      "Check for tall or wide letters to help you match.",
      "Look closely at the middle of the letter to confirm it matches.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LN_LOWER_K1,
    skillId: SKILL_IDS.RD_LN_LOWER,
    objective: "Match lowercase to uppercase partners",
    workedExample: [
      "Match lowercase a to uppercase A.",
      "Find the lowercase friend that goes with capital S.",
    ],
    practiceItemSuffixes: [30801, 30802],
    reteachSnippet: "Place the uppercase letter beside each option and compare shapes.",
    expectedTimeSeconds: 130,
    hints: [
      "Trace both letters with your finger to feel the same motions.",
      "Look for small tails or sticks that match the uppercase letter.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LN_LOWER_K2,
    skillId: SKILL_IDS.RD_LN_LOWER,
    objective: "Name lowercase letters",
    workedExample: [
      "Point to the lowercase letter and say its name.",
      "Spin a wheel and name the lowercase letter you land on.",
    ],
    practiceItemSuffixes: [30803, 30804],
    reteachSnippet: "Trace the lowercase letter while repeating its name, then identify it.",
    expectedTimeSeconds: 130,
    hints: [
      "Notice if the letter sits on the line or drops below it.",
      "Use the alphabet strip to double-check the letter name.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LS_SET1_K1,
    skillId: SKILL_IDS.RD_LS_SET1,
    objective: "Produce consonant sounds /m s t a p n/",
    workedExample: [
      "Watch the mouth model for /m/ then say the sound.",
      "Hold the sound for two seconds to show it.",
    ],
    practiceItemSuffixes: [30901, 30902],
    reteachSnippet:
      "Use the mirror to show lip and tongue placement before trying the sound again.",
    expectedTimeSeconds: 120,
    hints: [
      "Press your lips together for /m/.",
      "Use your teeth and tongue for /t/ and release quickly.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LS_SET1_K2,
    skillId: SKILL_IDS.RD_LS_SET1,
    objective: "Match consonant sounds to letters",
    workedExample: ["Hear /s/ and pick the letter s.", "See the letter p and say /p/."],
    practiceItemSuffixes: [30903, 30904],
    reteachSnippet: "Play the sound again and trace the letter while repeating it.",
    expectedTimeSeconds: 120,
    hints: [
      "Listen for how the sound starts in your mouth.",
      "Remember the key picture from the anchor chart.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_INIT_K1,
    skillId: SKILL_IDS.RD_PA_INIT,
    objective: "Identify the first sound in words",
    workedExample: [
      "Hear 'map' and tap the first sound /m/.",
      "Choose the picture that starts with the same sound as sun.",
    ],
    practiceItemSuffixes: [31001, 31002],
    reteachSnippet: "Stretch the word slowly, isolate the beginning sound, then choose the match.",
    expectedTimeSeconds: 120,
    hints: [
      "Say the first part of the word louder to catch the sound.",
      "Compare it to the target sound before selecting.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_INIT_K2,
    skillId: SKILL_IDS.RD_PA_INIT,
    objective: "Match beginning sounds to letters",
    workedExample: [
      "Hear /p/ and drag the lowercase p into the box.",
      "Listen to 'sit' and tap the letter s.",
    ],
    practiceItemSuffixes: [31003, 31004],
    reteachSnippet:
      "Stretch the word, say the first sound, then point to the letter that makes it.",
    expectedTimeSeconds: 130,
    hints: ["Sing the alphabet to the sound you hear.", "Check the sound wall picture for help."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_BLEND_2PH_ORAL,
    skillId: SKILL_IDS.RD_BLEND_2PH,
    objective: "Blend onset and rime orally",
    workedExample: [
      "Hear /s/ ... /un/ and say the whole word sun.",
      "Push two counters together while blending.",
    ],
    practiceItemSuffixes: [31101, 31102],
    reteachSnippet: "Stretch each sound with your hands, then close them quickly to blend.",
    expectedTimeSeconds: 120,
    hints: [
      "Say the sounds faster and faster until they become a word.",
      "Use your fingers to show each part, then swipe to blend.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_BLEND_2PH_MATCH,
    skillId: SKILL_IDS.RD_BLEND_2PH,
    objective: "Match blended words to pictures",
    workedExample: [
      "Hear /m/ ... /op/ and choose the mop picture.",
      "Blend the sounds and tap the correct word card.",
    ],
    practiceItemSuffixes: [31103, 31104],
    reteachSnippet: "Blend with picture support first, then remove the picture and try again.",
    expectedTimeSeconds: 120,
    hints: [
      "Repeat the sounds once more before choosing.",
      "Look at the picture and say the word softly to yourself.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_SEGMENT_2PH_TAP,
    skillId: SKILL_IDS.RD_SEGMENT_2PH,
    objective: "Tap onset and rime",
    workedExample: [
      "Hear 'cat' and tap once for /c/, once for /at/.",
      "Slide first sound away from the rest with counters.",
    ],
    practiceItemSuffixes: [31201, 31202],
    reteachSnippet: "Use two large counters: tap one for the first sound, one for the rest.",
    expectedTimeSeconds: 120,
    hints: [
      "Say the word slowly and listen for the break.",
      "Tap your shoulder then hand to separate the parts.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_SEGMENT_2PH_TILES,
    skillId: SKILL_IDS.RD_SEGMENT_2PH,
    objective: "Match onset and rime tiles",
    workedExample: [
      "Drag the onset 's' and the rime 'at' into boxes.",
      "Split the word 'dog' into d and og.",
    ],
    practiceItemSuffixes: [31203, 31204],
    reteachSnippet: "Say the word, slide the tile for the first sound away, then place the rest.",
    expectedTimeSeconds: 130,
    hints: [
      "Focus on the first sound you hear before the rest.",
      "Match the letters to the sounds you stretched.",
    ],
  }),
  // R2 Kindergarten Phonics Core
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LS_SET2_K1,
    skillId: SKILL_IDS.RD_LS_SET2,
    objective: "Produce the new consonant sounds",
    workedExample: [
      "Watch the mouth for /g/ then practice the sound.",
      "Hold out /f/ and feel the air on your lip.",
    ],
    practiceItemSuffixes: [31301, 31302],
    reteachSnippet: "Use the mirror to check lip or tongue placement, then record the sound again.",
    expectedTimeSeconds: 130,
    hints: [
      "Notice if the sound uses voice or just air.",
      "Check the mouth picture to match your shape.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LS_SET2_K2,
    skillId: SKILL_IDS.RD_LS_SET2,
    objective: "Link sounds to letters",
    workedExample: ["Hear /g/ and tap the letter g.", "See the letter h and say the sound /h/."],
    practiceItemSuffixes: [31303, 31304],
    reteachSnippet: "Repeat the sound, trace the lowercase letter, then pick the match.",
    expectedTimeSeconds: 130,
    hints: [
      "Think about where your mouth moves when you make the sound.",
      "Use the letter-sound chart if you get stuck.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_MED_MATCH,
    skillId: SKILL_IDS.RD_PA_MED,
    objective: "Identify medial vowels in CVC words",
    workedExample: [
      "Hear 'map' and choose the middle sound /a/.",
      "Listen to 'sip' and tap the vowel that you hear in the middle.",
    ],
    practiceItemSuffixes: [31401, 31402],
    reteachSnippet: "Stretch the word, hold the middle sound, then match it to the vowel letter.",
    expectedTimeSeconds: 130,
    hints: [
      "Say the word slowly and feel the vowel in the middle.",
      "Compare the word to other short vowel words you know.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_PA_MED_TILE,
    skillId: SKILL_IDS.RD_PA_MED,
    objective: "Build CVC words by inserting the correct vowel",
    workedExample: [
      "See _at and choose a to make 'sat'.",
      "Listen to /p/ /i/ /n/ and place i in the middle tile.",
    ],
    practiceItemSuffixes: [31403, 31404],
    reteachSnippet: "Say the first sound, stretch the vowel, place the tile, then finish the word.",
    expectedTimeSeconds: 140,
    hints: [
      "Check the picture clue for the middle sound.",
      "Whisper the word again and listen to the vowel.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_BLEND_3PH_ORAL,
    skillId: SKILL_IDS.RD_BLEND_3PH,
    objective: "Blend three phonemes orally",
    workedExample: [
      "Hear /s/ /ă/ /t/ and say 'sat'.",
      "Swipe three sound cards together to blend.",
    ],
    practiceItemSuffixes: [31501, 31502],
    reteachSnippet: "Use hand motions for each sound, then swoop them together quickly.",
    expectedTimeSeconds: 130,
    hints: [
      "Say the sounds without pausing in between.",
      "Try blending the first two sounds, then add the last.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_BLEND_3PH_TIMED,
    skillId: SKILL_IDS.RD_BLEND_3PH,
    objective: "Blend three sounds within a latency goal",
    workedExample: [
      "Respond within three seconds after hearing the sounds.",
      "Repeat a timed row of blended words to build speed.",
    ],
    practiceItemSuffixes: [31503, 31504],
    reteachSnippet: "Practice slowly once, then try again with the timer to build fluency.",
    expectedTimeSeconds: 120,
    hints: [
      "Take a breath before the sounds start so you can answer quickly.",
      "If stuck, repeat the sounds quietly then say the word.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_SEGMENT_3PH_TAP,
    skillId: SKILL_IDS.RD_SEGMENT_3PH,
    objective: "Tap each phoneme in a CVC word",
    workedExample: [
      "Hear 'map' and tap three times: /m/ /ă/ /p/.",
      "Slide counters into boxes for each sound.",
    ],
    practiceItemSuffixes: [31601, 31602],
    reteachSnippet: "Place three counters in a row, push one for each sound while saying it.",
    expectedTimeSeconds: 130,
    hints: ["Say the word slowly to hear every sound.", "Tap from left to right to keep order."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_SEGMENT_3PH_BUILD,
    skillId: SKILL_IDS.RD_SEGMENT_3PH,
    objective: "Spell CVC words sound by sound",
    workedExample: [
      "Drag letter tiles to build the word 'sit'.",
      "Type the letters you hear in 'ham'.",
    ],
    practiceItemSuffixes: [31603, 31604],
    reteachSnippet: "Say the word, stretch each sound, place the matching letter tile in order.",
    expectedTimeSeconds: 150,
    hints: [
      "Use your finger to tap each box as you say the sound.",
      "Check the word family if you need a clue.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_A_DECODE,
    skillId: SKILL_IDS.RD_CVC_A,
    objective: "Decode short a CVC words",
    workedExample: ["Sound out c-a-t and blend to read cat.", "Read a row of -at words aloud."],
    practiceItemSuffixes: [31701, 31702],
    reteachSnippet: "Touch under each letter, say its sound, then sweep to read the word.",
    expectedTimeSeconds: 150,
    hints: [
      "Blend the first two sounds before adding the last.",
      "Use the picture clue if the word is tricky.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_A_SPELL,
    skillId: SKILL_IDS.RD_CVC_A,
    objective: "Spell short a CVC words",
    workedExample: [
      "Hear 'jam' and drag j-a-m into the boxes.",
      "Type the word 'lap' after hearing it.",
    ],
    practiceItemSuffixes: [31703, 31704],
    reteachSnippet: "Stretch the word with your fingers, place each letter, then blend to check.",
    expectedTimeSeconds: 150,
    hints: [
      "Say each sound as you place the letter.",
      "Use the letter tiles for the vowel if you forget.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_I_DECODE,
    skillId: SKILL_IDS.RD_CVC_I,
    objective: "Decode short i CVC words",
    workedExample: ["Read 'sip' by stretching s-i-p.", "Blend and read nonsense word 'mig'."],
    practiceItemSuffixes: [31801, 31802],
    reteachSnippet: "Compare the word to a known short i word, then reread.",
    expectedTimeSeconds: 150,
    hints: [
      "Short i sounds like the i in 'sit'.",
      "Check the picture when available for confirmation.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_I_SPELL,
    skillId: SKILL_IDS.RD_CVC_I,
    objective: "Spell short i CVC words",
    workedExample: ["Hear 'dig' and build d-i-g.", "Spell 'lip' using the keyboard tiles."],
    practiceItemSuffixes: [31803, 31804],
    reteachSnippet: "Say the word, tap each sound, then select the matching letters.",
    expectedTimeSeconds: 150,
    hints: [
      "Use a tap for each sound to keep them in order.",
      "Think of other short i words to check the vowel sound.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L1_FLASH,
    skillId: SKILL_IDS.RD_HFW_L1,
    objective: "Read Level 1 sight words within two seconds",
    workedExample: [
      "Flash the word 'the' and read it instantly.",
      "Use a digital card to practice 'and'.",
    ],
    practiceItemSuffixes: [31901, 31902],
    reteachSnippet: "Use a chant or snap to rehearse the tricky part before reattempting.",
    expectedTimeSeconds: 140,
    hints: [
      "Remember the chant: T-H-E spells 'the'.",
      "Picture the word in a short sentence you know.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L1_PHRASE,
    skillId: SKILL_IDS.RD_HFW_L1,
    objective: "Use Level 1 sight words in phrases",
    workedExample: [
      "Read 'I see the cat' smoothly.",
      "Fill in the missing sight word in 'We can ___ it'.",
    ],
    practiceItemSuffixes: [31903, 31904],
    reteachSnippet: "Whisper-read the phrase first, then read aloud with expression.",
    expectedTimeSeconds: 150,
    hints: [
      "Think of the sentence as one idea, not separate words.",
      "Slide your finger under the phrase to stay smooth.",
    ],
  }),
  // R3 Kindergarten Automaticity
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_O_DECODE,
    skillId: SKILL_IDS.RD_CVC_O,
    objective: "Decode short o CVC words",
    workedExample: ["Blend b-o-x to read 'box'.", "Read a mixed list of -op words."],
    practiceItemSuffixes: [32001, 32002],
    reteachSnippet: "Compare the word to a known -op word, then reread.",
    expectedTimeSeconds: 150,
    hints: [
      "Short o sounds like the o in 'hot'.",
      "Check the picture to confirm the word you read.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_O_SPELL,
    skillId: SKILL_IDS.RD_CVC_O,
    objective: "Spell short o CVC words",
    workedExample: ["Build 'fog' with f-o-g.", "Spell 'cot' on the keyboard."],
    practiceItemSuffixes: [32003, 32004],
    reteachSnippet: "Stretch the word, place each letter, then blend to check.",
    expectedTimeSeconds: 150,
    hints: [
      "Tap once for each sound before placing letters.",
      "Compare the vowel to other short o words.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_U_DECODE,
    skillId: SKILL_IDS.RD_CVC_U,
    objective: "Decode short u CVC words",
    workedExample: ["Read 'sun' by blending s-u-n.", "Mix review of -ug and -un families."],
    practiceItemSuffixes: [32101, 32102],
    reteachSnippet: "Use a word family card to anchor the vowel sound, then reread.",
    expectedTimeSeconds: 150,
    hints: ["Short u sounds like the u in 'up'.", "Underline the vowel if you need a reminder."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_U_SPELL,
    skillId: SKILL_IDS.RD_CVC_U,
    objective: "Spell short u CVC words",
    workedExample: ["Build 'cup' with c-u-p.", "Type 'rug' and press check."],
    practiceItemSuffixes: [32103, 32104],
    reteachSnippet: "Say the word, tap each sound, then choose the letter that matches.",
    expectedTimeSeconds: 150,
    hints: ["If unsure, compare it to 'sun' or 'fun'.", "Use tiles if typing feels tricky."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_E_DECODE,
    skillId: SKILL_IDS.RD_CVC_E,
    objective: "Decode short e CVC words",
    workedExample: [
      "Read 'web' by blending w-e-b.",
      "Practice nonsense short e words for fluency.",
    ],
    practiceItemSuffixes: [32201, 32202],
    reteachSnippet: "Compare short e to short i, say both words, then pick the correct vowel.",
    expectedTimeSeconds: 160,
    hints: ["Short e sounds like the e in 'bed'.", "Look at the vowel, then read the word again."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_CVC_E_SPELL,
    skillId: SKILL_IDS.RD_CVC_E,
    objective: "Spell short e CVC words",
    workedExample: ["Spell 'ten' after hearing it.", "Build 'pet' using tiles."],
    practiceItemSuffixes: [32203, 32204],
    reteachSnippet: "Say the word, stretch the vowel, then place the matching letter tile.",
    expectedTimeSeconds: 160,
    hints: [
      "Say the word twice to confirm the vowel sound.",
      "Check with a short e anchor word like 'red'.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_DIGRAPH_CH_SH_SORT,
    skillId: SKILL_IDS.RD_DIGRAPH_CH_SH,
    objective: "Sort words by digraph",
    workedExample: [
      "Drag 'ship' into the sh column and 'chip' into the ch column.",
      "Identify whether a picture starts with ch, sh, or th.",
    ],
    practiceItemSuffixes: [32301, 32302],
    reteachSnippet:
      "Play the sound for each digraph, then sort with a smaller set before retrying.",
    expectedTimeSeconds: 160,
    hints: [
      "Listen for the beginning two-letter sound.",
      "Use your mouth to make the sound before sorting.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_DIGRAPH_CH_SH_DECODE,
    skillId: SKILL_IDS.RD_DIGRAPH_CH_SH,
    objective: "Read digraph words",
    workedExample: ["Blend ch-i-p to read 'chip'.", "Read sentences containing sh and th words."],
    practiceItemSuffixes: [32303, 32304],
    reteachSnippet: "Underline the digraph, say it as one sound, then finish blending the word.",
    expectedTimeSeconds: 170,
    hints: [
      "Say the digraph sound before adding the vowel.",
      "Check the word family list if you feel stuck.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_BLEND_L_CLUSTER_READ,
    skillId: SKILL_IDS.RD_BLEND_L_CLUSTER,
    objective: "Read initial blend words",
    workedExample: [
      "Blend bl-a-d to read 'blad', then real words like 'blue'.",
      "Read a list mixing blends and digraphs.",
    ],
    practiceItemSuffixes: [32401, 32402],
    reteachSnippet: "Say the two consonants quickly together before adding the vowel.",
    expectedTimeSeconds: 170,
    hints: [
      "Slide the first two consonants together.",
      "If stuck, break the word into blend and rime.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_BLEND_L_CLUSTER_SEGMENT,
    skillId: SKILL_IDS.RD_BLEND_L_CLUSTER,
    objective: "Segment blends plus rime",
    workedExample: [
      "Hear 'flag' and segment /fl/ /a/ /g/.",
      "Drag the blend tile and vowel-consonant tiles into place.",
    ],
    practiceItemSuffixes: [32403, 32404],
    reteachSnippet:
      "Use three boxes: blend in the first, vowel in the second, final consonant last.",
    expectedTimeSeconds: 170,
    hints: [
      "Say the blend as one smooth sound.",
      "Tap each sound from left to right to keep order.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L2_FLASH,
    skillId: SKILL_IDS.RD_HFW_L2,
    objective: "Read Level 2 sight words within two seconds",
    workedExample: [
      "Flash 'because' and read it instantly.",
      "Practice with timed cards for Level 2 words.",
    ],
    practiceItemSuffixes: [32501, 32502],
    reteachSnippet: "Highlight the irregular part, recite the chant, then flash again.",
    expectedTimeSeconds: 150,
    hints: [
      "Focus on the tricky letters in the middle.",
      "Say the word in a short phrase to help you remember.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L2_PHRASE,
    skillId: SKILL_IDS.RD_HFW_L2,
    objective: "Use Level 2 sight words in phrases",
    workedExample: [
      "Read 'She will come here today' smoothly.",
      "Fill in the missing Level 2 word in a sentence.",
    ],
    practiceItemSuffixes: [32503, 32504],
    reteachSnippet: "Choral read the phrase with the coach, then try independently.",
    expectedTimeSeconds: 160,
    hints: [
      "Group the words so you read in phrases.",
      "Point to the words while you read to stay on track.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L3_FLASH,
    skillId: SKILL_IDS.RD_HFW_L3,
    objective: "Read Level 3 sight words quickly",
    workedExample: [
      "Flash 'people' and read it without sounding out.",
      "Go through a shuffled deck of Level 3 words.",
    ],
    practiceItemSuffixes: [32601, 32602],
    reteachSnippet: "Cover and reveal the word quickly, cheering when the learner answers in time.",
    expectedTimeSeconds: 160,
    hints: [
      "Chunk longer words into parts you know.",
      "Use a motion or rhythm to help you remember the spelling.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L3_SENTENCE,
    skillId: SKILL_IDS.RD_HFW_L3,
    objective: "Apply Level 3 sight words in sentences",
    workedExample: [
      "Read two sentences that include Level 3 words with expression.",
      "Fill missing Level 3 words into a short paragraph.",
    ],
    practiceItemSuffixes: [32603, 32604],
    reteachSnippet:
      "Read the sentence slowly, slot the sight word frame in place, then reread smoothly.",
    expectedTimeSeconds: 170,
    hints: [
      "Look at the first letter to narrow down the answer.",
      "Use the meaning of the sentence to guide your choice.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_DEC_SENT_A_READ,
    skillId: SKILL_IDS.RD_DEC_SENT_A,
    objective: "Read decodable sentences accurately",
    workedExample: [
      "Read a four-sentence decodable story with taught patterns.",
      "Record yourself reading and listen back.",
    ],
    practiceItemSuffixes: [32701, 32702],
    reteachSnippet: "Echo read each sentence with support, then try on your own again.",
    expectedTimeSeconds: 200,
    hints: [
      "Blend unfamiliar words using sounds you know.",
      "Use the punctuation to help your voice move smoothly.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_DEC_SENT_A_RATE,
    skillId: SKILL_IDS.RD_DEC_SENT_A,
    objective: "Increase sentence reading rate",
    workedExample: [
      "Read the same decodable sentence twice, beating the time bar the second time.",
      "Practice a fluency warm-up with repeated sentences.",
    ],
    practiceItemSuffixes: [32703, 32704],
    reteachSnippet: "Use a whisper-first pass, then read aloud with expression and timing.",
    expectedTimeSeconds: 190,
    hints: [
      "Keep your finger under the words to stay focused.",
      "Relax your voice and aim for smooth reading instead of rushing.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_COMP_SEQUENCE_ORDER,
    skillId: SKILL_IDS.RD_COMP_SEQUENCE,
    objective: "Order story events",
    workedExample: [
      "Move pictures into beginning, middle, end sequence.",
      "Retell using first, next, last language.",
    ],
    practiceItemSuffixes: [32801, 32802],
    reteachSnippet: "Replay the story with visuals, then have the learner retell with support.",
    expectedTimeSeconds: 150,
    hints: [
      "Think about what happened before anything else.",
      "Use transition words to help you order events.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_COMP_SEQUENCE_QA,
    skillId: SKILL_IDS.RD_COMP_SEQUENCE,
    objective: "Answer who/what/where questions",
    workedExample: [
      "Read a short passage and answer who the story is about.",
      "Tap the picture that shows where it happened.",
    ],
    practiceItemSuffixes: [32803, 32804],
    reteachSnippet: "Reread the sentence with the answer highlighted, then respond again.",
    expectedTimeSeconds: 150,
    hints: ["Look back at the sentence to find the answer.", "Use the question word as a clue."],
  }),
  // R4 Grade 1 Core
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LONG_VOWEL_E_DECODE,
    skillId: SKILL_IDS.RD_LONG_VOWEL_E,
    objective: "Read silent e words",
    workedExample: [
      "Read 'cake' and explain the silent e makes the vowel say its name.",
      "Sort CVC and CVCe words.",
    ],
    practiceItemSuffixes: [32901, 32902],
    reteachSnippet: "Mark the vowel with a macron and slash the e, then read the word.",
    expectedTimeSeconds: 170,
    hints: [
      "Check if the word ends with silent e before reading.",
      "Remember: e at the end makes the vowel long.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_LONG_VOWEL_E_SPELL,
    skillId: SKILL_IDS.RD_LONG_VOWEL_E,
    objective: "Spell silent e words",
    workedExample: [
      "Build 'bike' with b-i-k-e.",
      "Choose whether to use silent e or not in a word.",
    ],
    practiceItemSuffixes: [32903, 32904],
    reteachSnippet: "Write the base CVC word, then add the e and check the vowel sound.",
    expectedTimeSeconds: 180,
    hints: [
      "If the vowel needs to say its name, add silent e.",
      "Compare with the short vowel version to see the difference.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_VOWEL_TEAMS_AI_OA_DECODE,
    skillId: SKILL_IDS.RD_VOWEL_TEAMS_AI_OA,
    objective: "Decode vowel team words",
    workedExample: [
      "Read 'train' by noticing ai makes the long a sound.",
      "Read sentences with ay, ee, ea, oa, ow patterns.",
    ],
    practiceItemSuffixes: [33001, 33002],
    reteachSnippet: "Highlight the vowel team, say the sound it makes, then blend the word.",
    expectedTimeSeconds: 180,
    hints: [
      "Remember common vowel team rhymes like 'ay says long a'.",
      "If two vowels go walking, listen for the first one talking.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_VOWEL_TEAMS_AI_OA_CHOOSE,
    skillId: SKILL_IDS.RD_VOWEL_TEAMS_AI_OA,
    objective: "Choose the correct vowel team spelling",
    workedExample: [
      "Hear 'boat' and pick oa instead of ow.",
      "Complete word building with the correct team.",
    ],
    practiceItemSuffixes: [33003, 33004],
    reteachSnippet: "Say the word aloud, try each spelling, and choose the one that looks right.",
    expectedTimeSeconds: 190,
    hints: ["Use word endings to pick ay vs. ai.", "Think of a known word with the same sound."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_R_CONTROLLED_SORT,
    skillId: SKILL_IDS.RD_R_CONTROLLED,
    objective: "Sort r-controlled vowel words",
    workedExample: [
      "Sort ar words into one column and or words into another.",
      "Identify the vowel sound in 'bird' vs. 'barn'.",
    ],
    practiceItemSuffixes: [33101, 33102],
    reteachSnippet:
      "Say each word, focus on the r-controlled sound, then sort with fewer cards first.",
    expectedTimeSeconds: 180,
    hints: [
      "Listen for the vowel sound, not just the r.",
      "Use keyword cards like car, her, bird to help.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_R_CONTROLLED_DECODE,
    skillId: SKILL_IDS.RD_R_CONTROLLED,
    objective: "Decode r-controlled words",
    workedExample: [
      "Read 'start' by blending st-ar-t.",
      "Read a passage with ar, or, er/ir/ur words.",
    ],
    practiceItemSuffixes: [33103, 33104],
    reteachSnippet: "Underline the r-controlled pattern, say it as one unit, then finish the word.",
    expectedTimeSeconds: 190,
    hints: [
      "Remember each r-controlled vowel has its own sound.",
      "Blend the rest of the word after you say the vowel team.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_DIGRAPH_TH_WH_PH_DECODE,
    skillId: SKILL_IDS.RD_DIGRAPH_TH_WH_PH,
    objective: "Decode advanced digraph words",
    workedExample: ["Read 'phone' noticing ph says /f/.", "Read 'whale' and 'these' in sentences."],
    practiceItemSuffixes: [33201, 33202],
    reteachSnippet: "Practice each digraph sound with a mouth model, then reread the word.",
    expectedTimeSeconds: 190,
    hints: [
      "Check if th is voiced or unvoiced by touching your throat.",
      "Wh says /w/ at the start, ph says /f/.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_DIGRAPH_TH_WH_PH_MULTI,
    skillId: SKILL_IDS.RD_DIGRAPH_TH_WH_PH,
    objective: "Read multisyllabic words with digraphs",
    workedExample: [
      "Read 'whisper' by chunking whis-per.",
      "Break 'sulfur' into syllables and read each part.",
    ],
    practiceItemSuffixes: [33203, 33204],
    reteachSnippet: "Use syllable scoops to break the word, read each chunk, then blend.",
    expectedTimeSeconds: 210,
    hints: [
      "Cover part of the word to focus on one syllable at a time.",
      "Underline the digraph before attempting the whole word.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L4_FLASH,
    skillId: SKILL_IDS.RD_HFW_L4,
    objective: "Read Level 4 sight words automatically",
    workedExample: [
      "Flash 'through' and read it correctly.",
      "Cycle through the Level 4 deck for speed.",
    ],
    practiceItemSuffixes: [33301, 33302],
    reteachSnippet: "Highlight tricky spelling, chant it, then flash again.",
    expectedTimeSeconds: 170,
    hints: [
      "Chunk long words into smaller parts.",
      "Connect the word to a sentence you know well.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L4_CLOZE,
    skillId: SKILL_IDS.RD_HFW_L4,
    objective: "Use Level 4 sight words in context",
    workedExample: [
      "Fill in the correct sight word to complete a sentence.",
      "Read a sentence containing two Level 4 words smoothly.",
    ],
    practiceItemSuffixes: [33303, 33304],
    reteachSnippet:
      "Read the sentence aloud, try each option, and choose the one that sounds right.",
    expectedTimeSeconds: 180,
    hints: [
      "Use context clues before selecting a word.",
      "Check the first and last letters to confirm the choice.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L5_FLASH,
    skillId: SKILL_IDS.RD_HFW_L5,
    objective: "Read Level 5 sight words quickly",
    workedExample: [
      "Flash 'beautiful' and read it instantly.",
      "Review irregular words from Level 5 using timed cards.",
    ],
    practiceItemSuffixes: [33401, 33402],
    reteachSnippet: "Break the word into syllables, say it, then flash the card again for speed.",
    expectedTimeSeconds: 180,
    hints: [
      "Clap the syllables to help remember long words.",
      "Notice unusual letter groups to anchor the spelling.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_HFW_L5_PARAGRAPH,
    skillId: SKILL_IDS.RD_HFW_L5,
    objective: "Read paragraphs with Level 5 sight words",
    workedExample: [
      "Read a short paragraph that includes Level 5 words with fluency.",
      "Answer a question about the paragraph using the sight word.",
    ],
    practiceItemSuffixes: [33403, 33404],
    reteachSnippet:
      "Highlight sight words in the paragraph, rehearse them, then reread the whole passage.",
    expectedTimeSeconds: 200,
    hints: [
      "Preview sight words before reading the paragraph.",
      "Use your finger to track if the paragraph feels challenging.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_FLUENCY_J_PASSAGE,
    skillId: SKILL_IDS.RD_FLUENCY_J,
    objective: "Read Level J passage at 60 words per minute",
    workedExample: [
      "Listen to a model reading the Level J passage.",
      "Record and replay your reading to check pace.",
    ],
    practiceItemSuffixes: [33501, 33502],
    reteachSnippet: "Echo read paragraph chunks, then do a recorded timed read.",
    expectedTimeSeconds: 240,
    hints: [
      "Take a quick breath at commas to stay smooth.",
      "Keep your eyes a few words ahead to maintain flow.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_FLUENCY_J_PROSODY,
    skillId: SKILL_IDS.RD_FLUENCY_J,
    objective: "Read Level J passage with phrasing and expression",
    workedExample: [
      "Read dialogue with different voices for each character.",
      "Use punctuation to guide phrasing.",
    ],
    practiceItemSuffixes: [33503, 33504],
    reteachSnippet:
      "Practice one sentence with exaggerated expression, then reset to natural reading.",
    expectedTimeSeconds: 220,
    hints: [
      "Let punctuation be your guide for how your voice should change.",
      "Smile slightly to warm up your voice before reading.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_FLUENCY_M_PASSAGE,
    skillId: SKILL_IDS.RD_FLUENCY_M,
    objective: "Read Level M passage at 70 words per minute",
    workedExample: [
      "Read a 200-word Level M passage and record your time.",
      "Graph words per minute after each attempt.",
    ],
    practiceItemSuffixes: [33601, 33602],
    reteachSnippet: "Preview vocabulary, chunk the text, then attempt another timed read.",
    expectedTimeSeconds: 260,
    hints: [
      "Keep a steady pace—smooth is faster than rushing.",
      "Use a pointer or pencil to keep your place if the text is dense.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_FLUENCY_M_PROSODY,
    skillId: SKILL_IDS.RD_FLUENCY_M,
    objective: "Read Level M passage with expression",
    workedExample: [
      "Mark sentences with arrows to show rising or falling voice.",
      "Record a performance read focusing on character feelings.",
    ],
    practiceItemSuffixes: [33603, 33604],
    reteachSnippet: "Practice one paragraph with a coach, emphasizing expression cues.",
    expectedTimeSeconds: 240,
    hints: [
      "Change your voice slightly for questions versus statements.",
      "Pause longer at paragraph breaks for dramatic effect.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_COMP_WHO_WHAT_WHY_QA,
    skillId: SKILL_IDS.RD_COMP_WHO_WHAT_WHY,
    objective: "Answer literal questions with evidence",
    workedExample: [
      "Read a question, scan the text, highlight the sentence with the answer.",
      "Tap the best answer choice after rereading the relevant sentence.",
    ],
    practiceItemSuffixes: [33701, 33702],
    reteachSnippet: "Use the question word to guide which part of the text to reread.",
    expectedTimeSeconds: 180,
    hints: [
      "Underline the keywords in the question.",
      "Point to the sentence that proves your answer.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_COMP_WHO_WHAT_WHY_EVIDENCE,
    skillId: SKILL_IDS.RD_COMP_WHO_WHAT_WHY,
    objective: "Select the sentence that supports the answer",
    workedExample: [
      "Highlight the sentence that tells why the character moved.",
      "Tap the evidence sentence after choosing the answer.",
    ],
    practiceItemSuffixes: [33703, 33704],
    reteachSnippet:
      "Reread the question, scan for matching words in the passage, then tap the sentence.",
    expectedTimeSeconds: 190,
    hints: [
      "Look for vocabulary from the question in the text.",
      "Point to the sentence before you select it.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_COMP_INFER_L1_CHOICE,
    skillId: SKILL_IDS.RD_COMP_INFER_L1,
    objective: "Choose the best inference from text clues",
    workedExample: [
      "Use picture and text clues to decide why the character is smiling.",
      "Pick the inference that matches the evidence shown.",
    ],
    practiceItemSuffixes: [33801, 33802],
    reteachSnippet: "Use the frame 'I think __ because __' before selecting an answer.",
    expectedTimeSeconds: 190,
    hints: [
      "Use both the text and picture to help you infer.",
      "Ask yourself how the character might be feeling and why.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_COMP_INFER_L1_EXPLAIN,
    skillId: SKILL_IDS.RD_COMP_INFER_L1,
    objective: "Explain an inference with evidence",
    workedExample: [
      "Type or record why you think the character is worried using clues.",
      "Point to the word that proves your inference.",
    ],
    practiceItemSuffixes: [33803, 33804],
    reteachSnippet:
      "Model an inference sentence, then have the learner echo with their own reason.",
    expectedTimeSeconds: 200,
    hints: ["Start with 'I think... because...'.", "Mention the clue that helped you decide."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_WRITE_SENTENCE_BUILD,
    skillId: SKILL_IDS.RD_WRITE_SENTENCE,
    objective: "Build a sentence with word tiles",
    workedExample: [
      "Arrange tiles to build 'I can jump'.",
      "Check for capitals and punctuation after building.",
    ],
    practiceItemSuffixes: [33901, 33902],
    reteachSnippet: "Use the sentence frame 'I can ___.' and add your own ending.",
    expectedTimeSeconds: 200,
    hints: [
      "Make sure the first word starts with a capital letter.",
      "Read the sentence aloud to see if it sounds right.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.RD_WRITE_SENTENCE_COMPOSE,
    skillId: SKILL_IDS.RD_WRITE_SENTENCE,
    objective: "Compose and punctuate a sentence",
    workedExample: [
      "Type a sentence using a provided picture prompt and add punctuation.",
      "Record yourself reading the sentence you wrote.",
    ],
    practiceItemSuffixes: [33903, 33904],
    reteachSnippet:
      "Say the sentence aloud, tap each word, then write or type it with punctuation.",
    expectedTimeSeconds: 220,
    hints: [
      "Check for spaces between each word.",
      "Reread to ensure the sentence ends with the right punctuation.",
    ],
  }),
];

const mathKnowledgePoints: KnowledgePoint[] = [
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_PK_SUBITIZE_SPOT,
    skillId: SKILL_IDS.MATH_PK_SUBITIZE_1_4,
    objective: "Recognize dot patterns instantly",
    workedExample: [
      "See three dots and say 'three' without counting.",
      "Flash a five-frame with four dots and name it quickly.",
    ],
    practiceItemSuffixes: [201, 202],
    reteachSnippet: "Group the dots into familiar dice patterns before answering.",
    expectedTimeSeconds: 110,
    hints: ["Look for shapes you already know like dice faces.", "Cover and peek to answer fast."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_PK_SUBITIZE_MATCH,
    skillId: SKILL_IDS.MATH_PK_SUBITIZE_1_4,
    objective: "Match sets to numerals",
    workedExample: [
      "Match three stars to the numeral 3.",
      "Pair a hand with four fingers up to the number 4.",
    ],
    practiceItemSuffixes: [203, 204],
    reteachSnippet: "Count once to confirm, then match without counting the second time.",
    expectedTimeSeconds: 120,
    hints: [
      "Use your fingers to show the number first.",
      "Think about what dice look like for that number.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_PK_COUNT_TO_5_ORAL,
    skillId: SKILL_IDS.MATH_PK_COUNT_TO_5,
    objective: "Count aloud to five",
    workedExample: [
      "Count 1 through 5 while pointing to blocks.",
      "Start at 2 and count to 5 together.",
    ],
    practiceItemSuffixes: [205, 206],
    reteachSnippet: "Tap each object as you count to keep a steady rhythm.",
    expectedTimeSeconds: 120,
    hints: [
      "Start from the number shown, not always one.",
      "Say the last number louder to show how many you counted.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_PK_COUNT_TO_5_OBJECTS,
    skillId: SKILL_IDS.MATH_PK_COUNT_TO_5,
    objective: "Match counts to numbers",
    workedExample: [
      "Count four bears and drag the number 4 card.",
      "Fill a five-frame with counters to show 3.",
    ],
    practiceItemSuffixes: [207, 208],
    reteachSnippet: "Line the objects up and touch each one once as you count.",
    expectedTimeSeconds: 140,
    hints: ["Move each object to a counted pile.", "Count again if you're not sure."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_K_COUNT_TO_20_ORAL,
    skillId: SKILL_IDS.MATH_K_COUNT_TO_20,
    objective: "Count forward to twenty",
    workedExample: [
      "Start at 7 and count to 20 using a number line.",
      "Count on from 14 with no visual support.",
    ],
    practiceItemSuffixes: [209, 210],
    reteachSnippet: "Hop along the number line together before trying without it.",
    expectedTimeSeconds: 150,
    hints: ["Find the starting number first.", "Keep a steady rhythm as you count."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_K_COUNT_TO_20_FILL,
    skillId: SKILL_IDS.MATH_K_COUNT_TO_20,
    objective: "Fill in missing numbers to 20",
    workedExample: [
      "Drag the missing 12 onto the number track.",
      "Type the number that comes after 17.",
    ],
    practiceItemSuffixes: [211, 212],
    reteachSnippet: "Count up from the known number and listen for the missing one.",
    expectedTimeSeconds: 150,
    hints: [
      "Use the tens frame or number chart for support.",
      "Say the sequence quietly before answering.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_K_ADD_WITHIN_5_MODEL,
    skillId: SKILL_IDS.MATH_K_ADD_WITHIN_5,
    objective: "Model addition within five",
    workedExample: [
      "Show 2 bears plus 3 bears and count 5.",
      "Use a five-frame to combine 1 and 4.",
    ],
    practiceItemSuffixes: [213, 214],
    reteachSnippet: "Use a five-frame to show both parts before counting all.",
    expectedTimeSeconds: 160,
    hints: ["Start counting from the bigger part.", "Touch each counter as you count all."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_K_ADD_WITHIN_5_DRILL,
    skillId: SKILL_IDS.MATH_K_ADD_WITHIN_5,
    objective: "Add within five without supports",
    workedExample: ["Answer 4 + 1 mentally.", "Solve a quick-fire row of within-5 facts."],
    practiceItemSuffixes: [215, 216],
    reteachSnippet: "Use fingers or dots to show the numbers, then try again mentally.",
    expectedTimeSeconds: 140,
    hints: ["Say the larger number and count on.", "Use doubles or near doubles you already know."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_1_ADD_WITHIN_20_STRATEGY,
    skillId: SKILL_IDS.MATH_1_ADD_WITHIN_20,
    objective: "Solve addition within 20 using strategies",
    workedExample: [
      "Decompose 8 + 7 into 8 + 2 + 5 to make 15.",
      "Use a number bond to show 9 + 6 as 10 + 5.",
    ],
    practiceItemSuffixes: [217, 218],
    reteachSnippet: "Use a make-a-ten or doubles-plus-one strategy and explain it aloud.",
    expectedTimeSeconds: 200,
    hints: ["Circle the pair that makes ten.", "Draw a quick number line if you need it."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_1_ADD_WITHIN_20_DRILL,
    skillId: SKILL_IDS.MATH_1_ADD_WITHIN_20,
    objective: "Timed addition within 20",
    workedExample: [
      "Complete a sprint row while the timer counts down.",
      "Use a fact family to solve 7 + 8 quickly.",
    ],
    practiceItemSuffixes: [219, 220],
    reteachSnippet: "Solve the row untimed with strategy talk, then retry with the timer.",
    expectedTimeSeconds: 160,
    hints: [
      "Skip the one you do not know and return later.",
      "Keep eyes on the timer stripe to pace yourself.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_1_TIME_TO_HOUR_READ,
    skillId: SKILL_IDS.MATH_1_TIME_TO_HOUR,
    objective: "Read analog clocks to the hour",
    workedExample: [
      "Match 3 o'clock to the clock with the hour hand on 3.",
      "Explain how the short hand shows the hour.",
    ],
    practiceItemSuffixes: [221, 222],
    reteachSnippet: "Color the hour hand shorter, minute hand longer, then read again.",
    expectedTimeSeconds: 150,
    hints: [
      "Find where the short hand points first.",
      "If the minute hand points straight up, it's o'clock.",
    ],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_1_TIME_TO_HOUR_SET,
    skillId: SKILL_IDS.MATH_1_TIME_TO_HOUR,
    objective: "Set analog clocks to the hour",
    workedExample: [
      "Move the hour hand to 5, minute hand to 12 to show 5 o'clock.",
      "Set the clock to 2 o'clock using interactive hands.",
    ],
    practiceItemSuffixes: [223, 224],
    reteachSnippet: "Move the hour hand first, then set the minute hand straight up.",
    expectedTimeSeconds: 150,
    hints: ["Think about what you do at that time.", "Check both hands before submitting."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_1_SPEED_FACTS_WARMUP,
    skillId: SKILL_IDS.MATH_1_SPEED_FACTS_0_10,
    objective: "Warm-up facts within ten",
    workedExample: [
      "Review 4 + 5 by building on a five-frame before timing.",
      "Use doubles or near doubles in a warm-up row.",
    ],
    practiceItemSuffixes: [225, 226],
    reteachSnippet: "Visualize the ten-frame or number bond, then try again.",
    expectedTimeSeconds: 140,
    hints: ["Group to make five or ten first.", "Think of the matching subtraction fact."],
  }),
  createKnowledgePoint({
    id: KNOWLEDGE_POINT_IDS.MATH_1_SPEED_FACTS_TIMED,
    skillId: SKILL_IDS.MATH_1_SPEED_FACTS_0_10,
    objective: "Timed addition facts within ten",
    workedExample: [
      "Answer 10 facts in 30 seconds while staying accurate.",
      "Track your best time and try to beat it.",
    ],
    practiceItemSuffixes: [227, 228],
    reteachSnippet: "Practice skip counting and doubles before trying timed mode again.",
    expectedTimeSeconds: 150,
    hints: ["Keep eyes on the fact row.", "Move to the next fact if stuck, then return."],
  }),
];

export const seedKnowledgePoints: KnowledgePoint[] = [
  ...readingKnowledgePoints,
  ...mathKnowledgePoints,
];

export const seedKnowledgePointExperiences: KnowledgePointExperience[] = [
  {
    id: KNOWLEDGE_POINT_EXPERIENCE_IDS.RD_CVC_A_TILE_BLEND,
    knowledgePointId: KNOWLEDGE_POINT_IDS.RD_CVC_A_DECODE,
    title: "Tile build & audio blend",
    deliveryKind: "manipulative_play",
    purposes: ["entry", "reteach"],
    modalities: ["drag", "voice"],
    sensoryTags: ["tactile", "auditory"],
    estimatedMinutes: 4,
    stepIds: [],
    practiceActivityIds: [PRACTICE_ACTIVITY_IDS.BLEND_TILE_BUILDER],
    assetIds: [ASSET_IDS.AUDIO_BLEND_STORY],
    metadata: {
      prompt: "Use tiles to build and then blend the word aloud",
    },
  },
  {
    id: KNOWLEDGE_POINT_EXPERIENCE_IDS.RD_CVC_A_LISTEN_AND_READ,
    knowledgePointId: KNOWLEDGE_POINT_IDS.RD_CVC_A_DECODE,
    title: "Read-along decodable sentences",
    deliveryKind: "storytelling",
    purposes: ["entry", "fluency"],
    modalities: ["voice", "tap"],
    sensoryTags: ["auditory", "visual"],
    estimatedMinutes: 3,
    stepIds: [],
    practiceActivityIds: [],
    assetIds: [ASSET_IDS.AUDIO_BLEND_STORY],
    metadata: {
      instructions: "Listen first, then read the sentence by yourself",
    },
  },
  {
    id: KNOWLEDGE_POINT_EXPERIENCE_IDS.RD_HFW_L1_SPEED_STARS,
    knowledgePointId: KNOWLEDGE_POINT_IDS.RD_HFW_L1_FLASH,
    title: "Speed star flash ladder",
    deliveryKind: "fluency_loop",
    purposes: ["fluency"],
    modalities: ["tap", "voice"],
    sensoryTags: ["visual", "verbal"],
    estimatedMinutes: 2,
    stepIds: [],
    practiceActivityIds: [PRACTICE_ACTIVITY_IDS.HFW_SPEED_STARS],
    assetIds: [],
    metadata: {
      paceTargetMs: 2000,
    },
  },
  {
    id: KNOWLEDGE_POINT_EXPERIENCE_IDS.MATH_ADD_WITHIN_5_HANDS_ON,
    knowledgePointId: KNOWLEDGE_POINT_IDS.MATH_K_ADD_WITHIN_5_MODEL,
    title: "Smoothie shop manipulatives",
    deliveryKind: "manipulative_play",
    purposes: ["entry", "reteach"],
    modalities: ["drag", "tap"],
    sensoryTags: ["tactile", "visual"],
    estimatedMinutes: 5,
    stepIds: [],
    practiceActivityIds: [PRACTICE_ACTIVITY_IDS.ADDITION_SMOOTHIE],
    assetIds: [ASSET_IDS.IMAGE_TEN_FRAME],
    metadata: {
      prompt: "Drag fruit into the blender to model each addend",
    },
  },
  {
    id: KNOWLEDGE_POINT_EXPERIENCE_IDS.MATH_ADD_WITHIN_5_FLUENCY_LOOP,
    knowledgePointId: KNOWLEDGE_POINT_IDS.MATH_K_ADD_WITHIN_5_DRILL,
    title: "Addition fact dash",
    deliveryKind: "fluency_loop",
    purposes: ["fluency", "challenge"],
    modalities: ["tap"],
    sensoryTags: ["visual"],
    estimatedMinutes: 2,
    stepIds: [],
    practiceActivityIds: [PRACTICE_ACTIVITY_IDS.SPEED_FACT_DASH],
    assetIds: [],
    metadata: {
      targetLatencyMs: 3000,
    },
  },
];

export const seedAssets: Asset[] = [
  {
    id: ASSET_IDS.AUDIO_BLEND_STORY,
    organizationId: undefined,
    title: "Blend Story Intro",
    type: "audio",
    uri: "https://cdn.bemo.local/audio/blend-story-intro.mp3",
    altText: "Narration guiding a short-a blend story",
    locale: "en",
    durationMs: 52000,
    transcript: "Let's stretch the sounds together...",
    metadata: { usage: "lesson_introduction" },
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: ASSET_IDS.VIDEO_SHORT_A,
    organizationId: undefined,
    title: "Short A Animation",
    type: "video",
    uri: "https://cdn.bemo.local/video/short-a-animation.mp4",
    altText: "Animated apples showing the short a sound",
    locale: "en",
    durationMs: 45000,
    metadata: { captions: true },
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: ASSET_IDS.IMAGE_TEN_FRAME,
    organizationId: undefined,
    title: "Ten Frame Counters",
    type: "image",
    uri: "https://cdn.bemo.local/images/ten-frame-5.png",
    altText: "Ten frame showing five counters",
    locale: "en",
    metadata: { variant: "within_5" },
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: ASSET_IDS.AUDIO_BREATHING,
    organizationId: undefined,
    title: "Rainbow Bubble Breaths",
    type: "audio",
    uri: "https://cdn.bemo.local/audio/rainbow-breathing.mp3",
    altText: "Guided breathing prompt",
    locale: "en",
    durationMs: 60000,
    metadata: { category: "joy_break" },
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: ASSET_IDS.VIDEO_SMOOTHIE_GAMEPLAY,
    organizationId: undefined,
    title: "Smoothie Addition Gameplay",
    type: "video",
    uri: "https://cdn.bemo.local/video/smoothie-gameplay.mp4",
    altText: "Gameplay demo for smoothie addition",
    locale: "en",
    durationMs: 40000,
    metadata: { usage: "micro_game" },
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

export const seedMicroGames: MicroGame[] = [
  {
    id: MICRO_GAME_IDS.SMOOTHIE_ADDITION,
    slug: "smoothie-shop-addition",
    title: "Smoothie Shop Addition",
    genre: "arcade",
    description: "Drag fruit to the blender to build sums within 10",
    domain: "math",
    engineHooks: {
      map_topics: [
        { topic_id: SKILL_IDS.MATH_K_ADD_WITHIN_5, weight: 1.0 },
        { topic_id: SKILL_IDS.MATH_1_ADD_WITHIN_20, weight: 0.5 },
      ],
      item_generator: "add_within_ten_recipe",
      scoring: { correct: 1, partial: 0.5, incorrect: 0 },
    },
    ioSchema: {
      input: [{ type: "drag_drop", role: "ingredient", count: 3 }],
      output: [{ type: "result", fields: ["correct", "latency_ms", "hints_used"] }],
    },
    ui: { large_targets: true, buttons: ["Hint", "Hear Again", "Skip", "Answer"] },
    assetIds: [ASSET_IDS.VIDEO_SMOOTHIE_GAMEPLAY],
    modalities: ["drag", "tap"],
    sensoryTags: ["tactile", "visual"],
    purposes: ["entry", "reteach"],
    difficultyBand: "intro",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: MICRO_GAME_IDS.SOUND_STUDIO,
    slug: "sound-studio-blend",
    title: "Sound Studio",
    genre: "creative",
    description: "Blend phonemes on a digital mixing board",
    domain: "reading",
    engineHooks: {
      map_topics: [{ topic_id: SKILL_IDS.RD_BLEND_3PH, weight: 1.0 }],
      item_generator: "blend_three_phonemes",
    },
    ioSchema: {
      input: [{ type: "tap", role: "phoneme_button" }],
      output: [{ type: "recording", fields: ["audio_path", "latency_ms"] }],
    },
    ui: { large_targets: true, enable_voice_meter: true },
    assetIds: [ASSET_IDS.AUDIO_BLEND_STORY],
    modalities: ["tap", "voice"],
    sensoryTags: ["auditory", "visual"],
    purposes: ["entry", "reteach"],
    difficultyBand: "intro",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

export const seedPracticeActivities: PracticeActivity[] = [
  {
    id: PRACTICE_ACTIVITY_IDS.BLEND_TILE_BUILDER,
    knowledgePointId: KNOWLEDGE_POINT_IDS.RD_CVC_A_SPELL,
    skillId: SKILL_IDS.RD_CVC_A,
    type: "manipulative",
    title: "Tile Builder",
    description: "Drag letter tiles to build short a words with audio scaffolds.",
    microGameId: MICRO_GAME_IDS.SOUND_STUDIO,
    config: {
      tileSet: ["a", "m", "s", "t", "p", "n"],
      supportsVoicePlayback: true,
    },
    expectedMinutes: 4,
    assetIds: [ASSET_IDS.AUDIO_BLEND_STORY],
    modalities: ["drag", "voice"],
    sensoryTags: ["tactile", "auditory"],
    purposes: ["entry", "reteach"],
    difficultyBand: "intro",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: PRACTICE_ACTIVITY_IDS.LETTER_MATCH_FLIP,
    knowledgePointId: KNOWLEDGE_POINT_IDS.RD_LN_LOWER_K1,
    skillId: SKILL_IDS.RD_LN_LOWER,
    type: "game",
    title: "Letter Match Flip",
    description: "Flip cards to pair uppercase and lowercase letters with friendly art.",
    config: { grid: [3, 4], autoplayPronunciation: true },
    expectedMinutes: 3,
    assetIds: [],
    modalities: ["tap"],
    sensoryTags: ["visual"],
    purposes: ["entry"],
    difficultyBand: "intro",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: PRACTICE_ACTIVITY_IDS.ADDITION_SMOOTHIE,
    knowledgePointId: KNOWLEDGE_POINT_IDS.MATH_K_ADD_WITHIN_5_MODEL,
    skillId: SKILL_IDS.MATH_K_ADD_WITHIN_5,
    type: "game",
    title: "Smoothie Builder",
    description: "Blend ingredients to model addition within five.",
    microGameId: MICRO_GAME_IDS.SMOOTHIE_ADDITION,
    config: { sumRange: [2, 5], visualSupports: true },
    expectedMinutes: 5,
    assetIds: [ASSET_IDS.IMAGE_TEN_FRAME],
    modalities: ["drag", "tap"],
    sensoryTags: ["tactile", "visual"],
    purposes: ["entry", "reteach"],
    difficultyBand: "intro",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: PRACTICE_ACTIVITY_IDS.SPEED_FACT_DASH,
    knowledgePointId: KNOWLEDGE_POINT_IDS.MATH_1_SPEED_FACTS_TIMED,
    skillId: SKILL_IDS.MATH_1_SPEED_FACTS_0_10,
    type: "speed_drill",
    title: "Fact Dash",
    description: "Answer quick-fire facts with adaptive timing.",
    config: { timeLimitSeconds: 60, targetLatencyMs: 3000 },
    expectedMinutes: 2,
    assetIds: [],
    modalities: ["tap"],
    sensoryTags: ["visual"],
    purposes: ["fluency"],
    difficultyBand: "core",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: PRACTICE_ACTIVITY_IDS.HFW_SPEED_STARS,
    knowledgePointId: KNOWLEDGE_POINT_IDS.RD_HFW_L1_FLASH,
    skillId: SKILL_IDS.RD_HFW_L1,
    type: "speed_drill",
    title: "Sight Word Speed Stars",
    description: "Tap and read Level 1 sight words under a two-second target.",
    config: { wordSet: "hfw_l1", targetLatencyMs: 2000 },
    expectedMinutes: 2,
    assetIds: [],
    modalities: ["tap", "voice"],
    sensoryTags: ["visual", "verbal"],
    purposes: ["fluency"],
    difficultyBand: "core",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

export const seedCheckCharts: CheckChart[] = [
  {
    id: CHECK_CHART_IDS.READING_FOUNDATIONS,
    organizationId: undefined,
    title: "Reading Foundations",
    description: "Track blending, decoding, and sight word milestones.",
    domain: "reading",
    gradeBand: "PreK",
    stageCode: undefined,
    icon: "📚",
    color: "oklch(0.92 0.09 320)",
    displayOrder: 0,
    statements: [
      {
        id: "33000000-0000-4000-8000-000000000411",
        chartId: CHECK_CHART_IDS.READING_FOUNDATIONS,
        label: "I know how to hold a book and track the words.",
        skillIds: [SKILL_IDS.RD_PRINT_HANDLE],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.RD_PRINT_HANDLE_K2],
        threshold: { accuracy: 0.85, consecutivePasses: 2 },
        badgeId: MOTIVATION_REWARD_IDS.SPARK_BADGE_ONE,
        coachOnly: false,
        metadata: { emoji: "📖" },
      },
      {
        id: "33000000-0000-4000-8000-000000000412",
        chartId: CHECK_CHART_IDS.READING_FOUNDATIONS,
        label: "I can blend two sounds to make a word.",
        skillIds: [SKILL_IDS.RD_BLEND_2PH],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.RD_BLEND_2PH_ORAL],
        threshold: { accuracy: 0.85, consecutivePasses: 2 },
        badgeId: MOTIVATION_REWARD_IDS.SPARK_BADGE_ONE,
        coachOnly: false,
        metadata: { emoji: "🧩" },
      },
      {
        id: "33000000-0000-4000-8000-000000000413",
        chartId: CHECK_CHART_IDS.READING_FOUNDATIONS,
        label: "I know my letter names and sounds.",
        skillIds: [SKILL_IDS.RD_LN_LOWER, SKILL_IDS.RD_LS_SET1],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.RD_LN_LOWER_K2, KNOWLEDGE_POINT_IDS.RD_LS_SET1_K2],
        threshold: { accuracy: 0.9, consecutivePasses: 2 },
        badgeId: MOTIVATION_REWARD_IDS.SPARK_BADGE_TWO,
        coachOnly: false,
        metadata: { emoji: "🔤" },
      },
      {
        id: "33000000-0000-4000-8000-000000000414",
        chartId: CHECK_CHART_IDS.READING_FOUNDATIONS,
        label: "I can hear beginning sounds in words.",
        skillIds: [SKILL_IDS.RD_PA_INIT],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.RD_PA_INIT_K1],
        threshold: { accuracy: 0.85, consecutivePasses: 2 },
        badgeId: MOTIVATION_REWARD_IDS.SPARK_BADGE_TWO,
        coachOnly: false,
        metadata: { emoji: "👂" },
      },
      {
        id: "33000000-0000-4000-8000-000000000415",
        chartId: CHECK_CHART_IDS.READING_FOUNDATIONS,
        label: "I can read CVC words all by myself.",
        skillIds: [SKILL_IDS.RD_CVC_A],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.RD_CVC_A_DECODE],
        threshold: { accuracy: 0.9, consecutivePasses: 2 },
        badgeId: MOTIVATION_REWARD_IDS.SPARK_BADGE_TWO,
        coachOnly: false,
        metadata: { emoji: "🪄" },
        celebrationCopy: "Way to decode those words!",
      },
      {
        id: "33000000-0000-4000-8000-000000000416",
        chartId: CHECK_CHART_IDS.READING_FOUNDATIONS,
        label: "I know 40 sight words.",
        skillIds: [SKILL_IDS.RD_HFW_L1],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.RD_HFW_L1_FLASH],
        threshold: { accuracy: 0.95, consecutivePasses: 2, latencyMs: 2000 },
        badgeId: MOTIVATION_REWARD_IDS.SPARK_BADGE_TWO,
        coachOnly: false,
        metadata: { emoji: "⭐" },
      },
    ],
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: CHECK_CHART_IDS.MATH_PREK_CORE,
    organizationId: undefined,
    title: "Pre-K Math Core",
    description: "Foundational counting and subitizing milestones.",
    domain: "math",
    gradeBand: "PreK",
    stageCode: "M1_PREK_CORE",
    icon: "🔢",
    color: "oklch(0.87 0.12 150)",
    displayOrder: 10,
    statements: [
      {
        id: "33000000-0000-4000-8000-000000000621",
        chartId: CHECK_CHART_IDS.MATH_PREK_CORE,
        label: "I can instantly see groups up to 4.",
        skillIds: [SKILL_IDS.MATH_PK_SUBITIZE_1_4],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.MATH_PK_SUBITIZE_SPOT],
        threshold: { accuracy: 0.9, consecutivePasses: 2 },
        coachOnly: false,
        metadata: { emoji: "👀" },
      },
      {
        id: "33000000-0000-4000-8000-000000000622",
        chartId: CHECK_CHART_IDS.MATH_PREK_CORE,
        label: "I can count to 5 and show how many.",
        skillIds: [SKILL_IDS.MATH_PK_COUNT_TO_5],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.MATH_PK_COUNT_TO_5_OBJECTS],
        threshold: { accuracy: 0.85, consecutivePasses: 2 },
        coachOnly: false,
        metadata: { emoji: "🖐️" },
      },
      {
        id: "33000000-0000-4000-8000-000000000623",
        chartId: CHECK_CHART_IDS.MATH_PREK_CORE,
        label: "I can add within 5 using objects.",
        skillIds: [SKILL_IDS.MATH_K_ADD_WITHIN_5],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.MATH_K_ADD_WITHIN_5_MODEL],
        threshold: { accuracy: 0.85, consecutivePasses: 2 },
        coachOnly: false,
        metadata: { emoji: "➕" },
      },
    ],
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: CHECK_CHART_IDS.MATH_PREK_STRETCH,
    organizationId: undefined,
    title: "Pre-K Math Stretch",
    description: "Ready-for-K stretch goals through 20.",
    domain: "math",
    gradeBand: "PreK",
    stageCode: "M2_PREK_STRETCH",
    icon: "🚀",
    color: "oklch(0.84 0.13 70)",
    displayOrder: 11,
    statements: [
      {
        id: "33000000-0000-4000-8000-000000000631",
        chartId: CHECK_CHART_IDS.MATH_PREK_STRETCH,
        label: "I can count forward to 20.",
        skillIds: [SKILL_IDS.MATH_K_COUNT_TO_20],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.MATH_K_COUNT_TO_20_ORAL],
        threshold: { accuracy: 0.9, consecutivePasses: 2 },
        coachOnly: false,
        metadata: { emoji: "🎯" },
      },
      {
        id: "33000000-0000-4000-8000-000000000632",
        chartId: CHECK_CHART_IDS.MATH_PREK_STRETCH,
        label: "I can add story problems within 5.",
        skillIds: [SKILL_IDS.MATH_K_ADD_WITHIN_5],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.MATH_K_ADD_WITHIN_5_DRILL],
        threshold: { accuracy: 0.85, consecutivePasses: 2 },
        coachOnly: false,
        metadata: { emoji: "📖" },
      },
    ],
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: CHECK_CHART_IDS.MATH_K_CORE,
    organizationId: undefined,
    title: "Kindergarten Math Core",
    description: "Core K fluency targets for addition and time.",
    domain: "math",
    gradeBand: "K",
    stageCode: "M3_K_CORE",
    icon: "🧮",
    color: "oklch(0.82 0.14 30)",
    displayOrder: 20,
    statements: [
      {
        id: "33000000-0000-4000-8000-000000000641",
        chartId: CHECK_CHART_IDS.MATH_K_CORE,
        label: "I can add within 20 using strategies.",
        skillIds: [SKILL_IDS.MATH_1_ADD_WITHIN_20],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.MATH_1_ADD_WITHIN_20_STRATEGY],
        threshold: { accuracy: 0.9, consecutivePasses: 2 },
        coachOnly: false,
        metadata: { emoji: "⚡" },
      },
      {
        id: "33000000-0000-4000-8000-000000000642",
        chartId: CHECK_CHART_IDS.MATH_K_CORE,
        label: "I can answer 20 facts in under a minute.",
        skillIds: [SKILL_IDS.MATH_1_SPEED_FACTS_0_10],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.MATH_1_SPEED_FACTS_TIMED],
        threshold: { accuracy: 0.9, consecutivePasses: 2, latencyMs: 3000 },
        coachOnly: false,
        metadata: { emoji: "🏁" },
        celebrationCopy: "Lightning fast facts!",
      },
      {
        id: "33000000-0000-4000-8000-000000000643",
        chartId: CHECK_CHART_IDS.MATH_K_CORE,
        label: "I can tell time to the hour.",
        skillIds: [SKILL_IDS.MATH_1_TIME_TO_HOUR],
        knowledgePointIds: [KNOWLEDGE_POINT_IDS.MATH_1_TIME_TO_HOUR_READ],
        threshold: { accuracy: 0.9, consecutivePasses: 2 },
        coachOnly: false,
        metadata: { emoji: "🕒" },
      },
    ],
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

export const seedCheckChartEntries: CheckChartEntry[] = seedCheckCharts.flatMap((chart) =>
  chart.statements.map((statement, index) => ({
    ...statement,
    chartId: chart.id,
    displayOrder: statement.displayOrder ?? index,
  })),
);

export const seedMotivationTracks: MotivationTrack[] = [
  {
    id: MOTIVATION_TRACK_IDS.DAILY_SPARK,
    organizationId: undefined,
    title: "Daily Spark",
    description: "Earn sparkles by completing your learning journey.",
    targetXp: 200,
    cadence: "daily",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

export const seedMotivationRewards: MotivationReward[] = [
  {
    id: MOTIVATION_REWARD_IDS.SPARK_BADGE_ONE,
    trackId: MOTIVATION_TRACK_IDS.DAILY_SPARK,
    type: "badge",
    title: "Blending Buddy",
    description: "Unlocked after reaching 80 XP in a day",
    threshold: 80,
    icon: "✨",
    assetIds: [ASSET_IDS.AUDIO_BLEND_STORY],
    metadata: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: MOTIVATION_REWARD_IDS.SPARK_BADGE_TWO,
    trackId: MOTIVATION_TRACK_IDS.DAILY_SPARK,
    type: "joy_break",
    title: "Mystery Sticker Break",
    description: "Unlock a joy break after finishing the lesson playlist.",
    threshold: 200,
    icon: "🎁",
    assetIds: [ASSET_IDS.AUDIO_BREATHING],
    metadata: { joyBreakId: JOY_BREAK_IDS.RAINBOW_BREATHING },
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

export const seedMotivationLeagues: MotivationLeague[] = [
  {
    id: MOTIVATION_LEAGUE_IDS.SPARK_STARTERS,
    title: "Spark Starters League",
    type: "squad",
    tier: "spark",
    rank: 1,
    weeklyXpTarget: 400,
    squads: [
      {
        id: MOTIVATION_SQUAD_IDS.CONSTELLATION_CREW,
        leagueId: MOTIVATION_LEAGUE_IDS.SPARK_STARTERS,
        name: "Constellation Crew",
        description: "Our math explorers lighting up the night sky.",
        invitationCode: "STARRY",
        members: [
          {
            studentId: "11111111-1111-4111-8111-111111111111",
            displayName: "Nova",
            avatarUrl: undefined,
            xpThisWeek: 180,
            isLeader: true,
          },
          {
            studentId: "22222222-2222-4222-8222-222222222222",
            displayName: "Comet",
            avatarUrl: undefined,
            xpThisWeek: 160,
            isLeader: false,
          },
        ],
        weeklyXp: 340,
        rank: 1,
      },
      {
        id: MOTIVATION_SQUAD_IDS.STELLAR_SQUAD,
        leagueId: MOTIVATION_LEAGUE_IDS.SPARK_STARTERS,
        name: "Stellar Squad",
        description: "Readers reaching for the next galaxy.",
        invitationCode: undefined,
        members: [
          {
            studentId: "33333333-3333-4333-8333-333333333333",
            displayName: "Orbit",
            avatarUrl: undefined,
            xpThisWeek: 150,
            isLeader: true,
          },
        ],
        weeklyXp: 150,
        rank: 2,
      },
    ],
  },
];

export const seedMotivationQuests: MotivationQuest[] = [
  {
    id: MOTIVATION_QUEST_IDS.SHAPE_MASTER,
    title: "Shape Master",
    description: "Complete three geometry practice cards and identify 10 shapes.",
    type: "weekly",
    xpReward: 60,
    badgeId: MOTIVATION_REWARD_IDS.SPARK_BADGE_ONE,
    tasks: [
      {
        id: "34000000-0000-4000-8000-000000000551",
        description: "Finish 3 geometry review tasks",
        progress: 0.66,
        completed: false,
      },
      {
        id: "34000000-0000-4000-8000-000000000552",
        description: "Identify 10 shapes in speed drill",
        progress: 0.5,
        completed: false,
      },
    ],
    status: "active",
    progressPercent: 0.58,
    expiresAt: undefined,
  },
  {
    id: MOTIVATION_QUEST_IDS.STORY_CHAMPION,
    title: "Story Champion",
    description: "Read two decodable stories and record a retell.",
    type: "weekly",
    xpReward: 80,
    badgeId: MOTIVATION_REWARD_IDS.SPARK_BADGE_TWO,
    tasks: [
      {
        id: "34000000-0000-4000-8000-000000000553",
        description: "Read two decodable stories",
        progress: 1,
        completed: true,
      },
      {
        id: "34000000-0000-4000-8000-000000000554",
        description: "Record a retell with expression",
        progress: 0.25,
        completed: false,
      },
    ],
    status: "active",
    progressPercent: 0.63,
    expiresAt: undefined,
  },
  {
    id: MOTIVATION_QUEST_IDS.SPEED_STAR,
    title: "Speed Star",
    description: "Beat your fact fluency target twice in one week.",
    type: "daily",
    xpReward: 30,
    badgeId: undefined,
    tasks: [
      {
        id: "34000000-0000-4000-8000-000000000555",
        description: "Complete two speed drills under target time",
        progress: 0.5,
        completed: false,
      },
    ],
    status: "locked",
    progressPercent: 0.5,
    expiresAt: undefined,
  },
];

export const seedTimeBackLedger: TimeBackLedgerEntry[] = [
  {
    id: "34000000-0000-4000-8000-000000000561",
    studentId: "11111111-1111-4111-8111-111111111111",
    source: "daily_goal",
    minutesGranted: 15,
    grantedAt: ISO_NOW,
    expiresAt: undefined,
    consumedAt: undefined,
    note: "Completed daily XP goal",
  },
  {
    id: "34000000-0000-4000-8000-000000000562",
    studentId: "11111111-1111-4111-8111-111111111111",
    source: "quest",
    minutesGranted: 10,
    grantedAt: ISO_NOW,
    expiresAt: undefined,
    consumedAt: undefined,
    note: "Unlocked Shape Master quest reward",
  },
];

export const seedJoyBreaks: JoyBreak[] = [
  {
    id: JOY_BREAK_IDS.RAINBOW_BREATHING,
    title: "Rainbow Bubble Breaths",
    description: "Take colorful breaths to reset between activities.",
    durationSeconds: 120,
    assetIds: [ASSET_IDS.AUDIO_BREATHING],
    metadata: { category: "calming" },
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

export const seedDiagnosticProbes: DiagnosticProbe[] = [
  {
    id: DIAGNOSTIC_PROBE_IDS.MATH_SUBITIZE_DOTS,
    skillId: SKILL_IDS.MATH_PK_SUBITIZE_1_4,
    knowledgePointId: KNOWLEDGE_POINT_IDS.MATH_PK_SUBITIZE_SPOT,
    difficulty: 0.2,
    expectedLatencyMs: 4000,
    prompt: {
      stem: "How many dots do you see?",
      itemType: "choice_image",
      options: ["1", "2", "3", "4"],
      assetIds: [ASSET_IDS.IMAGE_TEN_FRAME],
      hints: ["Try to see the whole group, not count each dot"],
    },
    tags: ["math", "subitizing"],
  },
  {
    id: DIAGNOSTIC_PROBE_IDS.MATH_COUNT_TO_20_START,
    skillId: SKILL_IDS.MATH_K_COUNT_TO_20,
    knowledgePointId: KNOWLEDGE_POINT_IDS.MATH_K_COUNT_TO_20_ORAL,
    difficulty: 0.35,
    expectedLatencyMs: 6000,
    prompt: {
      stem: "Start at {n} and count up five numbers.",
      itemType: "tap_to_count",
      options: [],
      hints: ["Tap each number as you say it"],
    },
    tags: ["math", "counting"],
  },
  {
    id: DIAGNOSTIC_PROBE_IDS.MATH_ADD_WITHIN_10,
    skillId: SKILL_IDS.MATH_K_ADD_WITHIN_5,
    knowledgePointId: KNOWLEDGE_POINT_IDS.MATH_K_ADD_WITHIN_5_DRILL,
    difficulty: 0.5,
    expectedLatencyMs: 5000,
    prompt: {
      stem: "What is {a} + {b}?",
      itemType: "choice_text",
      options: ["5", "6", "7", "8"],
      hints: ["Try counting on from the bigger number"],
    },
    tags: ["math", "addition"],
  },
  {
    id: DIAGNOSTIC_PROBE_IDS.MATH_TIME_TO_HOUR,
    skillId: SKILL_IDS.MATH_1_TIME_TO_HOUR,
    knowledgePointId: KNOWLEDGE_POINT_IDS.MATH_1_TIME_TO_HOUR_READ,
    difficulty: 0.6,
    expectedLatencyMs: 7000,
    prompt: {
      stem: "What time does the clock show?",
      itemType: "choice_text",
      options: ["1:00", "3:00", "5:00", "7:00"],
      hints: ["Look at where the short hand is pointing"],
    },
    tags: ["math", "time"],
  },
];

export function getTopicsByDomain(domain: Skill["domain"]): Skill[] {
  return getSkillsByDomain(domain);
}

export function getTopicsByGrade(gradeBand: Skill["gradeBand"]): Skill[] {
  return getSkillsByGrade(gradeBand);
}

export function getTopicById(id: string): Skill | undefined {
  return getSkillById(id);
}

export function getKnowledgePointsByTopic(skillId: string): KnowledgePoint[] {
  return getKnowledgePointsBySkill(skillId);
}

export function getKnowledgePointById(id: string): KnowledgePoint | undefined {
  return seedKnowledgePoints.find((kp) => kp.id === id);
}

export function getExperiencesByKnowledgePoint(id: string): KnowledgePointExperience[] {
  return seedKnowledgePointExperiences.filter((experience) => experience.knowledgePointId === id);
}

export function getExperiencesForTopic(skillId: string): KnowledgePointExperience[] {
  return getExperiencesForSkill(skillId);
}

export function getSkillsByDomain(domain: Skill["domain"]): Skill[] {
  return seedSkills.filter((skill) => skill.domain === domain);
}

export function getSkillsByGrade(gradeBand: Skill["gradeBand"]): Skill[] {
  return seedSkills.filter((skill) => skill.gradeBand === gradeBand);
}

export function getSkillById(id: string): Skill | undefined {
  return seedSkills.find((skill) => skill.id === id);
}

export function getKnowledgePointsBySkill(skillId: string): KnowledgePoint[] {
  return seedKnowledgePoints.filter((kp) => kp.skillId === skillId);
}

export function getExperiencesForSkill(skillId: string): KnowledgePointExperience[] {
  const knowledgePointIds = new Set(
    getKnowledgePointsBySkill(skillId).map((knowledgePoint) => knowledgePoint.id),
  );
  return seedKnowledgePointExperiences.filter((experience) =>
    knowledgePointIds.has(experience.knowledgePointId),
  );
}

export function getDiagnosticProbeById(id: string): DiagnosticProbe | undefined {
  return seedDiagnosticProbes.find((probe) => probe.id === id);
}

export function getDiagnosticProbesByTopic(skillId: string): DiagnosticProbe[] {
  return getDiagnosticProbesBySkill(skillId);
}

export function getDiagnosticProbesBySkill(skillId: string): DiagnosticProbe[] {
  return seedDiagnosticProbes.filter((probe) => probe.skillId === skillId);
}

export function getMotivationLeagues(): MotivationLeague[] {
  return seedMotivationLeagues;
}

export function getMotivationLeagueById(id: string): MotivationLeague | undefined {
  return seedMotivationLeagues.find((league) => league.id === id);
}

export function getMotivationQuests(): MotivationQuest[] {
  return seedMotivationQuests;
}

export function getTimeBackLedgerEntries(studentId: string): TimeBackLedgerEntry[] {
  return seedTimeBackLedger.filter((entry) => entry.studentId === studentId);
}
