/**
 * Skill Bridge Platform - Question Bank & Question Lifecycle Engine
 * File: lib/questions.js
 */

const { getDb, saveDb } = require('./db');

// Seed Question Bank across major skills (Python, SQL, JavaScript, React, Java, Data Analysis, Docker, etc.)
const SEED_QUESTIONS = [
  // --- PYTHON QUESTIONS ---
  {
    id: 'q_py_001',
    skillId: 'skill_python',
    topicId: 'fundamentals',
    dimension: 'Conceptual Knowledge',
    questionType: 'Single MCQ',
    question: 'Which data structure in Python is mutable and maintains insertion order?',
    options: ['tuple', 'list', 'frozenset', 'str'],
    correctAnswer: 'list',
    explanation: 'Lists in Python are mutable sequences that preserve insertion order.',
    difficulty: 'Easy',
    points: 1,
    timeLimit: 60,
    status: 'PUBLISHED',
  },
  {
    id: 'q_py_002',
    skillId: 'skill_python',
    topicId: 'intermediate',
    dimension: 'Problem Solving',
    questionType: 'Output prediction',
    question: 'What is the output of `[x * 2 for x in range(5) if x % 2 == 0]` in Python?',
    options: ['[0, 4, 8]', '[0, 2, 4, 6, 8]', '[2, 6]', '[0, 4]'],
    correctAnswer: '[0, 4, 8]',
    explanation: 'range(5) produces 0, 1, 2, 3, 4. Even numbers are 0, 2, 4. Multiplied by 2 yields 0, 4, 8.',
    difficulty: 'Medium',
    points: 2,
    timeLimit: 90,
    status: 'PUBLISHED',
  },
  {
    id: 'q_py_003',
    skillId: 'skill_python',
    topicId: 'advanced',
    dimension: 'Advanced Knowledge',
    questionType: 'Debugging',
    question: 'Identify the bug in this decorator function:\n```python\ndef my_decorator(func):\n    def wrapper(*args, **kwargs):\n        print("Executing")\n        return func\n    return wrapper\n```',
    options: [
      'wrapper does not call func(*args, **kwargs)',
      'wrapper missing return statement',
      '*args and **kwargs are invalid syntax',
      'my_decorator must accept self'
    ],
    correctAnswer: 'wrapper does not call func(*args, **kwargs)',
    explanation: 'The wrapper returns the function object `func` instead of executing `func(*args, **kwargs)` and returning its result.',
    difficulty: 'Hard',
    points: 3,
    timeLimit: 120,
    status: 'PUBLISHED',
  },
  {
    id: 'q_py_004',
    skillId: 'skill_python',
    topicId: 'coding',
    dimension: 'Practical Coding',
    questionType: 'Coding challenge',
    question: 'Write a Python function `remove_duplicates(lst)` that removes duplicate elements from a list while preserving original order.',
    options: [],
    correctAnswer: 'def remove_duplicates(lst):\n    seen = set()\n    res = []\n    for item in lst:\n        if item not in seen:\n            seen.add(item)\n            res.append(item)\n    return res',
    explanation: 'Using a hash set `seen` tracks visited items in O(1) time while building the result list in order.',
    difficulty: 'Hard',
    points: 4,
    timeLimit: 180,
    status: 'PUBLISHED',
    testCases: [
      { input: '[1, 2, 2, 3, 4, 4, 5]', expected: '[1, 2, 3, 4, 5]' },
      { input: "['a', 'b', 'a', 'c']", expected: "['a', 'b', 'c']" }
    ]
  },
  {
    id: 'q_py_005',
    skillId: 'skill_python',
    topicId: 'scenario',
    dimension: 'Real-world Scenario',
    questionType: 'Scenario-based question',
    question: 'You need to process a 10 GB log file on a machine with 4 GB RAM without running out of memory. What is the recommended Python approach?',
    options: [
      'Read file line-by-line using a generator or `for line in file:`',
      'Use `file.read().splitlines()` into memory',
      'Convert entire file to a list using `list(file)`',
      'Load into a pandas DataFrame without chunking'
    ],
    correctAnswer: 'Read file line-by-line using a generator or `for line in file:`',
    explanation: 'Iterating over a file object in Python streams line-by-line using chunked memory buffering.',
    difficulty: 'Expert',
    points: 4,
    timeLimit: 120,
    status: 'PUBLISHED',
  },

  // --- JAVASCRIPT QUESTIONS ---
  {
    id: 'q_js_001',
    skillId: 'skill_javascript',
    topicId: 'fundamentals',
    dimension: 'Conceptual Knowledge',
    questionType: 'Single MCQ',
    question: 'Which keyword creates a block-scoped variable that cannot be re-declared in the same scope?',
    options: ['let', 'var', 'global', 'define'],
    correctAnswer: 'let',
    explanation: '`let` and `const` are block-scoped and prevent duplicate variable declarations in the same scope.',
    difficulty: 'Easy',
    points: 1,
    timeLimit: 60,
    status: 'PUBLISHED',
  },
  {
    id: 'q_js_002',
    skillId: 'skill_javascript',
    topicId: 'intermediate',
    dimension: 'Problem Solving',
    questionType: 'Output prediction',
    question: 'What is the output of `console.log(typeof null, typeof undefined)`?',
    options: ['"object" "undefined"', '"null" "undefined"', '"object" "null"', '"undefined" "undefined"'],
    correctAnswer: '"object" "undefined"',
    explanation: 'In JS, typeof null returns "object" due to legacy implementation, while typeof undefined is "undefined".',
    difficulty: 'Medium',
    points: 2,
    timeLimit: 60,
    status: 'PUBLISHED',
  },
  {
    id: 'q_js_003',
    skillId: 'skill_javascript',
    topicId: 'async',
    dimension: 'Practical Coding',
    questionType: 'Code completion',
    question: 'Complete the async function to fetch data and return JSON:\n```js\nasync function getData(url) {\n  const res = await fetch(url);\n  return await ______;\n}\n```',
    options: ['res.json()', 'res.text()', 'JSON.stringify(res)', 'res.data'],
    correctAnswer: 'res.json()',
    explanation: '`res.json()` parses the HTTP response body stream as JSON asynchronously.',
    difficulty: 'Hard',
    points: 3,
    timeLimit: 90,
    status: 'PUBLISHED',
  },
  {
    id: 'q_js_004',
    skillId: 'skill_javascript',
    topicId: 'event-loop',
    dimension: 'Advanced Knowledge',
    questionType: 'Scenario-based question',
    question: 'In the JS event loop, in what order are Promise microtasks and setTimeout macrotasks executed?',
    options: [
      'All microtasks execute before the next macrotask in the queue',
      'Macrotasks always execute before microtasks',
      'They execute in strict FIFO order in a single combined queue',
      'Microtasks execute only when the browser window loses focus'
    ],
    correctAnswer: 'All microtasks execute before the next macrotask in the queue',
    explanation: 'The microtask queue is completely drained after the call stack clears and before picking the next task from the callback/macrotask queue.',
    difficulty: 'Expert',
    points: 4,
    timeLimit: 120,
    status: 'PUBLISHED',
  },

  // --- SQL QUESTIONS ---
  {
    id: 'q_sql_001',
    skillId: 'skill_sql',
    topicId: 'fundamentals',
    dimension: 'Conceptual Knowledge',
    questionType: 'Single MCQ',
    question: 'Which SQL clause is used to filter aggregated groups created by GROUP BY?',
    options: ['HAVING', 'WHERE', 'ORDER BY', 'FILTER'],
    correctAnswer: 'HAVING',
    explanation: 'HAVING filters results post-aggregation, whereas WHERE filters individual rows prior to aggregation.',
    difficulty: 'Easy',
    points: 1,
    timeLimit: 60,
    status: 'PUBLISHED',
  },
  {
    id: 'q_sql_002',
    skillId: 'skill_sql',
    topicId: 'joins',
    dimension: 'Problem Solving',
    questionType: 'Multiple-choice',
    question: 'Which JOIN types return all rows from the left table regardless of matching rows in the right table? (Select all that apply)',
    options: ['LEFT JOIN', 'LEFT OUTER JOIN', 'INNER JOIN', 'RIGHT JOIN'],
    correctAnswer: ['LEFT JOIN', 'LEFT OUTER JOIN'],
    explanation: 'LEFT JOIN and LEFT OUTER JOIN are synonymous in SQL and preserve all records from the left table.',
    difficulty: 'Medium',
    points: 2,
    timeLimit: 90,
    status: 'PUBLISHED',
  },

  // --- REACT QUESTIONS ---
  {
    id: 'q_react_001',
    skillId: 'skill_react',
    topicId: 'hooks',
    dimension: 'Conceptual Knowledge',
    questionType: 'Single MCQ',
    question: 'Which React hook should be used to run side-effects such as data fetching or DOM subscriptions?',
    options: ['useEffect', 'useState', 'useMemo', 'useContext'],
    correctAnswer: 'useEffect',
    explanation: '`useEffect` lets functional components perform side effects after rendering.',
    difficulty: 'Easy',
    points: 1,
    timeLimit: 60,
    status: 'PUBLISHED',
  },
];

/**
 * Returns complete question bank from database
 */
function getQuestionBank() {
  const dbData = getDb();
  if (!dbData.questions || dbData.questions.length === 0) {
    dbData.questions = SEED_QUESTIONS;
    saveDb(dbData);
  }
  return dbData.questions;
}

/**
 * Retrieves questions filtered by skillId and status
 */
function getQuestionsForSkill(skillId, options = {}) {
  const bank = getQuestionBank();
  const { status = 'PUBLISHED', minDifficulty, limit } = options;

  let filtered = bank.filter(q => q.skillId === skillId);
  if (status) {
    filtered = filtered.filter(q => q.status === status);
  }

  if (limit && limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Save or update a question in the bank (Admin action)
 */
function saveQuestion(questionData) {
  const dbData = getDb();
  dbData.questions = dbData.questions || [];
  const now = new Date().toISOString();

  const existingIndex = dbData.questions.findIndex(q => q.id === questionData.id);

  const cleanQuestion = {
    id: questionData.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    skillId: questionData.skillId,
    topicId: questionData.topicId || 'general',
    dimension: questionData.dimension || 'Conceptual Knowledge',
    questionType: questionData.questionType || 'Single MCQ',
    question: questionData.question,
    options: questionData.options || [],
    correctAnswer: questionData.correctAnswer,
    explanation: questionData.explanation || '',
    difficulty: questionData.difficulty || 'Medium',
    points: questionData.points || (questionData.difficulty === 'Expert' ? 4 : questionData.difficulty === 'Hard' ? 3 : questionData.difficulty === 'Medium' ? 2 : 1),
    timeLimit: questionData.timeLimit || 90,
    status: questionData.status || 'DRAFT',
    testCases: questionData.testCases || [],
    createdAt: existingIndex >= 0 ? dbData.questions[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    dbData.questions[existingIndex] = cleanQuestion;
  } else {
    dbData.questions.push(cleanQuestion);
  }

  saveDb(dbData);
  return cleanQuestion;
}

/**
 * AI Question Draft Generator simulation (Admin Review -> Approve -> Publish)
 */
function generateAiQuestionDraft(skillId, topic, difficulty = 'Medium') {
  const now = new Date().toISOString();
  const draftId = `ai_q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const draft = {
    id: draftId,
    skillId,
    topicId: topic || 'ai_generated',
    dimension: 'Problem Solving',
    questionType: 'Single MCQ',
    question: `[AI Generated Draft] What is the expected behavior of ${skillId.replace('skill_', '')} when handling asynchronous operations under high concurrency?`,
    options: [
      'Maintains non-blocking execution via event dispatchers',
      'Blocks thread execution synchronously',
      'Raises unhandled rejection exception immediately',
      'Requires explicit memory allocation'
    ],
    correctAnswer: 'Maintains non-blocking execution via event dispatchers',
    explanation: 'Asynchronous event loops utilize non-blocking IO operations and callback queues.',
    difficulty,
    points: difficulty === 'Hard' ? 3 : 2,
    timeLimit: 90,
    status: 'DRAFT',
    isAiGenerated: true,
    createdAt: now,
    updatedAt: now,
  };

  saveQuestion(draft);
  return draft;
}

module.exports = {
  getQuestionBank,
  getQuestionsForSkill,
  saveQuestion,
  generateAiQuestionDraft,
};
