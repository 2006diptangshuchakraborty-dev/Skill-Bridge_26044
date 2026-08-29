/**
 * SIH 2026 Test Fixtures & Seed Data
 * Contains full dataset: 50+ students, 10+ companies, 15+ opportunities, 30+ skills
 * Includes the 4 primary demo candidates and primary demo scenario opp_001.
 */

const primaryDemoStudents = [
  {
    id: 'stu_001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.edu',
    department: 'Computer Science',
    year: '4th Year',
    gpa: 8.9,
    skills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 3, evidenceLevel: 3, verification: 'Assessment Verified' },
      { name: 'SQL', canonicalName: 'SQL', proficiency: 2, evidenceLevel: 2, verification: 'Certificate' },
      { name: 'Data Analysis', canonicalName: 'Data Analysis', proficiency: 3, evidenceLevel: 4, verification: 'Project Verified' },
      { name: 'Statistics', canonicalName: 'Statistics', proficiency: 2, evidenceLevel: 2, verification: 'Coursework' },
      { name: 'Power BI', canonicalName: 'Power BI', proficiency: 2, evidenceLevel: 3, verification: 'Assessment' },
      { name: 'Tableau', canonicalName: 'Tableau', proficiency: 1, evidenceLevel: 2, verification: 'Certificate' },
      { name: 'Excel', canonicalName: 'Excel', proficiency: 3, evidenceLevel: 3, verification: 'Assessment' },
    ]
  },
  {
    id: 'stu_002',
    name: 'Priya Patel',
    email: 'priya.patel@example.edu',
    department: 'Information Technology',
    year: '4th Year',
    gpa: 9.4,
    skills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 4, evidenceLevel: 4, verification: 'Open Source / Capstone' },
      { name: 'SQL', canonicalName: 'SQL', proficiency: 3, evidenceLevel: 4, verification: 'Production DB' },
      { name: 'Data Analysis', canonicalName: 'Data Analysis', proficiency: 4, evidenceLevel: 4, verification: 'Published Research' },
      { name: 'Statistics', canonicalName: 'Statistics', proficiency: 3, evidenceLevel: 3, verification: 'NPTEL Elite' },
      { name: 'Power BI', canonicalName: 'Power BI', proficiency: 3, evidenceLevel: 3, verification: 'Microsoft Certified' },
      { name: 'Tableau', canonicalName: 'Tableau', proficiency: 3, evidenceLevel: 3, verification: 'Tableau Desktop Specialist' },
      { name: 'Excel', canonicalName: 'Excel', proficiency: 4, evidenceLevel: 4, verification: 'Financial Modeling' },
      { name: 'Machine Learning', canonicalName: 'Machine Learning', proficiency: 2, evidenceLevel: 3, verification: 'Hackathon Project' },
    ]
  },
  {
    id: 'stu_003',
    name: 'Rohan Verma',
    email: 'rohan.verma@example.edu',
    department: 'Data Science',
    year: '3rd Year',
    gpa: 7.8,
    skills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 2, evidenceLevel: 2, verification: 'Certificate' },
      // MISSING SQL (High Priority)
      { name: 'Data Analysis', canonicalName: 'Data Analysis', proficiency: 3, evidenceLevel: 3, verification: 'Project' },
      { name: 'Statistics', canonicalName: 'Statistics', proficiency: 2, evidenceLevel: 2, verification: 'Coursework' },
      { name: 'Power BI', canonicalName: 'Power BI', proficiency: 1, evidenceLevel: 2, verification: 'Certificate' },
      { name: 'Tableau', canonicalName: 'Tableau', proficiency: 1, evidenceLevel: 2, verification: 'Certificate' },
      { name: 'Excel', canonicalName: 'Excel', proficiency: 3, evidenceLevel: 3, verification: 'Assessment' },
      { name: 'Machine Learning', canonicalName: 'Machine Learning', proficiency: 1, evidenceLevel: 2, verification: 'Course' },
    ]
  },
  {
    id: 'stu_004',
    name: 'Ananya Sen',
    email: 'ananya.sen@example.edu',
    department: 'Electronics',
    year: '3rd Year',
    gpa: 8.1,
    skills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 1, evidenceLevel: 1, verification: 'Self-declared' }, // Beg < Int required
      { name: 'SQL', canonicalName: 'SQL', proficiency: 2, evidenceLevel: 2, verification: 'Certificate' },
      { name: 'Data Analysis', canonicalName: 'Data Analysis', proficiency: 2, evidenceLevel: 2, verification: 'Basic Project' }, // Int < Adv required
      { name: 'Statistics', canonicalName: 'Statistics', proficiency: 1, evidenceLevel: 1, verification: 'Self-declared' }, // Beg < Int required
      { name: 'Excel', canonicalName: 'Excel', proficiency: 2, evidenceLevel: 2, verification: 'Course' }, // Int < Adv required
      { name: 'Power BI', canonicalName: 'Power BI', proficiency: 1, evidenceLevel: 2, verification: 'Certificate' },
    ]
  }
];

// Generate 48 additional realistic students to exceed 50+ total students
const additionalStudents = [];
const departments = ['Computer Science', 'Information Technology', 'Data Science', 'Electronics', 'Mechanical', 'Civil'];
const firstNames = ['Vikram', 'Neha', 'Kabir', 'Sneha', 'Arjun', 'Isha', 'Dev', 'Pooja', 'Rahul', 'Aditi', 'Karan', 'Meera', 'Tarun', 'Anjali', 'Varun', 'Deepika', 'Manish', 'Kavita', 'Siddharth', 'Riya', 'Sameer', 'Tanvi', 'Abhishek', 'Shreya'];
const lastNames = ['Gupta', 'Mehta', 'Reddy', 'Nair', 'Singh', 'Chopra', 'Rao', 'Bose', 'Iyer', 'Deshmukh', 'Mishra', 'Joshi'];

let idCounter = 5;
for (let i = 0; i < 48; i++) {
  const fName = firstNames[i % firstNames.length];
  const lName = lastNames[i % lastNames.length];
  const dept = departments[i % departments.length];
  const idStr = idCounter < 10 ? `stu_00${idCounter}` : idCounter < 100 ? `stu_0${idCounter}` : `stu_${idCounter}`;
  idCounter++;

  additionalStudents.push({
    id: idStr,
    name: `${fName} ${lName}`,
    email: `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@example.edu`,
    department: dept,
    year: (i % 2 === 0) ? '4th Year' : '3rd Year',
    gpa: +(7.0 + (i % 25) * 0.1).toFixed(1),
    skills: [
      { name: 'Python', canonicalName: 'Python', proficiency: (i % 4) + 1, evidenceLevel: (i % 5) + 1 },
      { name: 'SQL', canonicalName: 'SQL', proficiency: ((i + 1) % 4) + 1, evidenceLevel: ((i + 1) % 5) + 1 },
      { name: 'React', canonicalName: 'React', proficiency: ((i + 2) % 4) + 1, evidenceLevel: ((i + 2) % 5) + 1 },
      { name: 'Node.js', canonicalName: 'Node.js', proficiency: (i % 3) + 1, evidenceLevel: (i % 4) + 1 },
      { name: 'Docker', canonicalName: 'Docker', proficiency: ((i + 1) % 3) + 1, evidenceLevel: 2 },
      { name: 'Excel', canonicalName: 'Excel', proficiency: 3, evidenceLevel: 3 },
    ]
  });
}

const allStudents = [...primaryDemoStudents, ...additionalStudents];

// 12 Companies (exceeds 10+)
const companies = [
  { id: 'comp_001', name: 'TechCorp Global', sector: 'Software & Analytics', verified: true, kycStatus: 'VERIFIED', location: 'Bengaluru' },
  { id: 'comp_002', name: 'FinTech Innovations', sector: 'Banking & Financial', verified: true, kycStatus: 'VERIFIED', location: 'Mumbai' },
  { id: 'comp_003', name: 'DataScale Labs', sector: 'AI / Data Science', verified: true, kycStatus: 'VERIFIED', location: 'Hyderabad' },
  { id: 'comp_004', name: 'CloudPeak Systems', sector: 'DevOps & Cloud', verified: true, kycStatus: 'VERIFIED', location: 'Pune' },
  { id: 'comp_005', name: 'NextGen HealthTech', sector: 'Healthcare IoT', verified: true, kycStatus: 'VERIFIED', location: 'Chennai' },
  { id: 'comp_006', name: 'EcoMobility Digital', sector: 'EV / Automotive', verified: true, kycStatus: 'VERIFIED', location: 'Gurugram' },
  { id: 'comp_007', name: 'CyberShield InfoSec', sector: 'Cybersecurity', verified: true, kycStatus: 'VERIFIED', location: 'Noida' },
  { id: 'comp_008', name: 'RetailWave Commerce', sector: 'E-Commerce', verified: true, kycStatus: 'VERIFIED', location: 'Bengaluru' },
  { id: 'comp_009', name: 'AeroDynamics AI', sector: 'Aerospace & Robotics', verified: true, kycStatus: 'VERIFIED', location: 'Bengaluru' },
  { id: 'comp_010', name: 'SmartGrid Energy', sector: 'CleanTech', verified: true, kycStatus: 'VERIFIED', location: 'Ahmedabad' },
  { id: 'comp_011', name: 'HyperFlow Networks', sector: 'Telecommunications', verified: false, kycStatus: 'PENDING', location: 'Kolkata' },
  { id: 'comp_012', name: 'QuantumByte Solutions', sector: 'DeepTech / Research', verified: false, kycStatus: 'PENDING', location: 'Hyderabad' },
];

// 16 Opportunities (exceeds 15+), starting with primary demo opp_001
const opportunities = [
  {
    id: 'opp_001',
    title: 'Data Analyst Intern',
    companyId: 'comp_001',
    company: 'TechCorp Global',
    location: 'Bengaluru (Hybrid)',
    type: 'Internship',
    stipend: '₹35,000 / month',
    duration: '6 Months',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 2, category: 'Programming' },
      { name: 'SQL', canonicalName: 'SQL', proficiency: 2, category: 'Database' },
      { name: 'Data Analysis', canonicalName: 'Data Analysis', proficiency: 3, category: 'Analytics' },
      { name: 'Statistics', canonicalName: 'Statistics', proficiency: 2, category: 'Analytics' }
    ],
    preferredSkills: [
      { name: 'Power BI', canonicalName: 'Power BI', proficiency: 1, category: 'Visualization' },
      { name: 'Tableau', canonicalName: 'Tableau', proficiency: 1, category: 'Visualization' },
      { name: 'Excel', canonicalName: 'Excel', proficiency: 3, category: 'Analytics' },
      { name: 'Machine Learning', canonicalName: 'Machine Learning', proficiency: 1, category: 'AI/ML' }
    ]
  },
  {
    id: 'opp_002',
    title: 'Frontend React Developer Intern',
    companyId: 'comp_001',
    company: 'TechCorp Global',
    location: 'Bengaluru (Remote)',
    type: 'Internship',
    stipend: '₹30,000 / month',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'React', canonicalName: 'React', proficiency: 2 },
      { name: 'JavaScript', canonicalName: 'JavaScript', proficiency: 2 },
      { name: 'TypeScript', canonicalName: 'TypeScript', proficiency: 2 }
    ],
    preferredSkills: [
      { name: 'Node.js', canonicalName: 'Node.js', proficiency: 1 },
      { name: 'Docker', canonicalName: 'Docker', proficiency: 1 }
    ]
  },
  {
    id: 'opp_003',
    title: 'Backend Node.js & Cloud Engineer',
    companyId: 'comp_004',
    company: 'CloudPeak Systems',
    location: 'Pune',
    type: 'Full-Time Placement',
    stipend: '₹8,50,000 / annum',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Node.js', canonicalName: 'Node.js', proficiency: 3 },
      { name: 'PostgreSQL', canonicalName: 'PostgreSQL', proficiency: 2 },
      { name: 'Docker', canonicalName: 'Docker', proficiency: 2 }
    ],
    preferredSkills: [
      { name: 'AWS', canonicalName: 'AWS', proficiency: 2 },
      { name: 'TypeScript', canonicalName: 'TypeScript', proficiency: 2 }
    ]
  },
  {
    id: 'opp_004',
    title: 'Machine Learning Research Intern',
    companyId: 'comp_003',
    company: 'DataScale Labs',
    location: 'Hyderabad',
    type: 'Internship',
    stipend: '₹45,000 / month',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 3 },
      { name: 'Machine Learning', canonicalName: 'Machine Learning', proficiency: 3 },
      { name: 'Statistics', canonicalName: 'Statistics', proficiency: 3 }
    ],
    preferredSkills: [
      { name: 'PyTorch', canonicalName: 'PyTorch', proficiency: 2 },
      { name: 'Docker', canonicalName: 'Docker', proficiency: 1 }
    ]
  },
  {
    id: 'opp_005',
    title: 'Financial Analytics Associate',
    companyId: 'comp_002',
    company: 'FinTech Innovations',
    location: 'Mumbai',
    type: 'Full-Time Placement',
    stipend: '₹10,00,000 / annum',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'SQL', canonicalName: 'SQL', proficiency: 3 },
      { name: 'Excel', canonicalName: 'Excel', proficiency: 4 },
      { name: 'Data Analysis', canonicalName: 'Data Analysis', proficiency: 3 }
    ],
    preferredSkills: [
      { name: 'Power BI', canonicalName: 'Power BI', proficiency: 2 },
      { name: 'Python', canonicalName: 'Python', proficiency: 2 }
    ]
  },
  {
    id: 'opp_006',
    title: 'Cloud DevOps Specialist',
    companyId: 'comp_004',
    company: 'CloudPeak Systems',
    location: 'Pune',
    type: 'Full-Time Placement',
    stipend: '₹9,00,000 / annum',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Docker', canonicalName: 'Docker', proficiency: 3 },
      { name: 'AWS', canonicalName: 'AWS', proficiency: 3 }
    ],
    preferredSkills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 2 },
      { name: 'Git', canonicalName: 'Git', proficiency: 3 }
    ]
  },
  {
    id: 'opp_007',
    title: 'Full Stack Web Developer',
    companyId: 'comp_008',
    company: 'RetailWave Commerce',
    location: 'Bengaluru',
    type: 'Full-Time Placement',
    stipend: '₹7,50,000 / annum',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'React', canonicalName: 'React', proficiency: 2 },
      { name: 'Node.js', canonicalName: 'Node.js', proficiency: 2 },
      { name: 'SQL', canonicalName: 'SQL', proficiency: 2 }
    ],
    preferredSkills: [
      { name: 'Docker', canonicalName: 'Docker', proficiency: 1 },
      { name: 'TypeScript', canonicalName: 'TypeScript', proficiency: 2 }
    ]
  },
  {
    id: 'opp_008',
    title: 'AI Computer Vision Engineer',
    companyId: 'comp_009',
    company: 'AeroDynamics AI',
    location: 'Bengaluru',
    type: 'Full-Time Placement',
    stipend: '₹14,00,000 / annum',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 3 },
      { name: 'Machine Learning', canonicalName: 'Machine Learning', proficiency: 3 },
      { name: 'PyTorch', canonicalName: 'PyTorch', proficiency: 3 }
    ],
    preferredSkills: [
      { name: 'Docker', canonicalName: 'Docker', proficiency: 2 },
      { name: 'AWS', canonicalName: 'AWS', proficiency: 2 }
    ]
  },
  {
    id: 'opp_009',
    title: 'Business Intelligence Trainee',
    companyId: 'comp_005',
    company: 'NextGen HealthTech',
    location: 'Chennai',
    type: 'Internship',
    stipend: '₹25,000 / month',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Power BI', canonicalName: 'Power BI', proficiency: 2 },
      { name: 'SQL', canonicalName: 'SQL', proficiency: 2 }
    ],
    preferredSkills: [
      { name: 'Excel', canonicalName: 'Excel', proficiency: 3 },
      { name: 'Tableau', canonicalName: 'Tableau', proficiency: 1 }
    ]
  },
  {
    id: 'opp_010',
    title: 'Cybersecurity Analyst Intern',
    companyId: 'comp_007',
    company: 'CyberShield InfoSec',
    location: 'Noida',
    type: 'Internship',
    stipend: '₹28,000 / month',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 2 },
      { name: 'Docker', canonicalName: 'Docker', proficiency: 2 }
    ],
    preferredSkills: [
      { name: 'AWS', canonicalName: 'AWS', proficiency: 1 }
    ]
  },
  {
    id: 'opp_011',
    title: 'CleanTech Data Specialist',
    companyId: 'comp_010',
    company: 'SmartGrid Energy',
    location: 'Ahmedabad',
    type: 'Internship',
    stipend: '₹30,000 / month',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 2 },
      { name: 'Data Analysis', canonicalName: 'Data Analysis', proficiency: 2 }
    ],
    preferredSkills: [
      { name: 'Statistics', canonicalName: 'Statistics', proficiency: 2 }
    ]
  },
  {
    id: 'opp_012',
    title: 'EV Firmware Test Engineer',
    companyId: 'comp_006',
    company: 'EcoMobility Digital',
    location: 'Gurugram',
    type: 'Full-Time Placement',
    stipend: '₹8,00,000 / annum',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 2 },
      { name: 'Git', canonicalName: 'Git', proficiency: 2 }
    ],
    preferredSkills: [
      { name: 'Docker', canonicalName: 'Docker', proficiency: 1 }
    ]
  },
  {
    id: 'opp_013',
    title: 'E-Commerce Database Administrator',
    companyId: 'comp_008',
    company: 'RetailWave Commerce',
    location: 'Bengaluru',
    type: 'Full-Time Placement',
    stipend: '₹9,50,000 / annum',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'PostgreSQL', canonicalName: 'PostgreSQL', proficiency: 3 },
      { name: 'SQL', canonicalName: 'SQL', proficiency: 3 }
    ],
    preferredSkills: [
      { name: 'AWS', canonicalName: 'AWS', proficiency: 2 }
    ]
  },
  {
    id: 'opp_014',
    title: 'Junior Mobile & Web QA',
    companyId: 'comp_001',
    company: 'TechCorp Global',
    location: 'Bengaluru',
    type: 'Internship',
    stipend: '₹22,000 / month',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'JavaScript', canonicalName: 'JavaScript', proficiency: 2 },
      { name: 'Git', canonicalName: 'Git', proficiency: 2 }
    ],
    preferredSkills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 1 }
    ]
  },
  {
    id: 'opp_015',
    title: 'NLP Conversational AI Intern',
    companyId: 'comp_003',
    company: 'DataScale Labs',
    location: 'Hyderabad',
    type: 'Internship',
    stipend: '₹40,000 / month',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Python', canonicalName: 'Python', proficiency: 3 },
      { name: 'Machine Learning', canonicalName: 'Machine Learning', proficiency: 2 }
    ],
    preferredSkills: [
      { name: 'PyTorch', canonicalName: 'PyTorch', proficiency: 2 },
      { name: 'Docker', canonicalName: 'Docker', proficiency: 1 }
    ]
  },
  {
    id: 'opp_016',
    title: 'Backend API Architect',
    companyId: 'comp_002',
    company: 'FinTech Innovations',
    location: 'Mumbai',
    type: 'Full-Time Placement',
    stipend: '₹16,00,000 / annum',
    status: 'ACTIVE',
    requiredSkills: [
      { name: 'Node.js', canonicalName: 'Node.js', proficiency: 4 },
      { name: 'PostgreSQL', canonicalName: 'PostgreSQL', proficiency: 3 },
      { name: 'Docker', canonicalName: 'Docker', proficiency: 3 }
    ],
    preferredSkills: [
      { name: 'AWS', canonicalName: 'AWS', proficiency: 3 },
      { name: 'TypeScript', canonicalName: 'TypeScript', proficiency: 3 }
    ]
  }
];

// 32 Canonical Skills
const skills = [
  'Python', 'SQL', 'Data Analysis', 'Statistics', 'Power BI', 'Tableau',
  'Excel', 'Machine Learning', 'React', 'Node.js', 'PostgreSQL',
  'JavaScript', 'TypeScript', 'Docker', 'AWS', 'Git', 'PyTorch',
  'TensorFlow', 'MongoDB', 'Java', 'C++', 'Kubernetes', 'Linux',
  'GraphQL', 'Next.js', 'Tailwind CSS', 'FastAPI', 'Django',
  'Kafka', 'Redis', 'CI/CD', 'Cybersecurity'
];

module.exports = {
  students: allStudents,
  primaryDemoStudents,
  companies,
  opportunities,
  skills,
  applications: [],
  feedbackReports: [],
  alerts: [],
  primaryDemoOpportunity: opportunities[0],
};
