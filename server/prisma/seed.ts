import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLE_TYPES = [
  'Architect',
  'Engineer',
  'Tester',
  'Data Specialist',
  'Delivery Manager',
  'DevOps Engineer',
  'UX Researcher',
] as const;

const SKILLS = [
  'TypeScript',
  'JavaScript',
  'React',
  'Node.js',
  'Python',
  'Java',
  'SQL',
  'AWS',
  'Docker',
  'Kubernetes',
  'GraphQL',
  'REST API Design',
  'CI/CD',
  'Agile',
  'Test Automation',
  'Machine Learning',
  'Data Modelling',
  'System Design',
  'Performance Testing',
  'Security',
  'User Interviews',
  'Usability Testing',
  'Wireframing',
] as const;

interface CandidateSeed {
  name: string;
  role: string;
  skills: string[];
  availabilityBand: number;
  workloadIndicator: number;
  businessUnit: string;
}

const CANDIDATES: CandidateSeed[] = [
  // Architects (3)
  {
    name: 'Sipho Ndlovu',
    role: 'Architect',
    skills: ['System Design', 'AWS', 'Docker', 'TypeScript', 'REST API Design'],
    availabilityBand: 80,
    workloadIndicator: 2,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Priya Naidoo',
    role: 'Architect',
    skills: ['System Design', 'Java', 'Kubernetes', 'Security', 'GraphQL'],
    availabilityBand: 50,
    workloadIndicator: 4,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'James van der Merwe',
    role: 'Architect',
    skills: ['System Design', 'AWS', 'Python', 'Data Modelling', 'CI/CD'],
    availabilityBand: 30,
    workloadIndicator: 6,
    businessUnit: 'Digital Platforms',
  },

  // Engineers (6)
  {
    name: 'Thandi Mokoena',
    role: 'Engineer',
    skills: ['TypeScript', 'React', 'Node.js', 'GraphQL', 'REST API Design'],
    availabilityBand: 90,
    workloadIndicator: 1,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Raj Patel',
    role: 'Engineer',
    skills: ['JavaScript', 'React', 'Node.js', 'Docker', 'CI/CD'],
    availabilityBand: 70,
    workloadIndicator: 3,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Lerato Dlamini',
    role: 'Engineer',
    skills: ['Python', 'Java', 'SQL', 'REST API Design'],
    availabilityBand: 100,
    workloadIndicator: 0,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Michael Chen',
    role: 'Engineer',
    skills: ['TypeScript', 'React', 'AWS', 'Docker', 'Kubernetes', 'CI/CD'],
    availabilityBand: 60,
    workloadIndicator: 4,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Fatima Hassan',
    role: 'Engineer',
    skills: ['Java', 'SQL', 'AWS', 'Security'],
    availabilityBand: 40,
    workloadIndicator: 5,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'David Okonkwo',
    role: 'Engineer',
    skills: ['TypeScript', 'Node.js', 'GraphQL', 'Docker'],
    availabilityBand: 85,
    workloadIndicator: 2,
    businessUnit: 'Digital Platforms',
  },

  // Testers (4)
  {
    name: 'Nomusa Zulu',
    role: 'Tester',
    skills: ['Test Automation', 'JavaScript', 'CI/CD', 'Performance Testing'],
    availabilityBand: 75,
    workloadIndicator: 2,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Aisha Mohammed',
    role: 'Tester',
    skills: ['Test Automation', 'Python', 'SQL', 'Security'],
    availabilityBand: 90,
    workloadIndicator: 1,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Bongani Mthembu',
    role: 'Tester',
    skills: ['Test Automation', 'TypeScript', 'Performance Testing', 'Agile'],
    availabilityBand: 50,
    workloadIndicator: 3,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Sarah Johnson',
    role: 'Tester',
    skills: ['Test Automation', 'Java', 'CI/CD', 'REST API Design', 'Docker'],
    availabilityBand: 20,
    workloadIndicator: 7,
    businessUnit: 'Digital Platforms',
  },

  // Data Specialists (4)
  {
    name: 'Kagiso Molefe',
    role: 'Data Specialist',
    skills: ['Python', 'SQL', 'Machine Learning', 'Data Modelling'],
    availabilityBand: 65,
    workloadIndicator: 3,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Wei Zhang',
    role: 'Data Specialist',
    skills: ['Python', 'Machine Learning', 'AWS', 'Data Modelling', 'SQL'],
    availabilityBand: 80,
    workloadIndicator: 2,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Zanele Khumalo',
    role: 'Data Specialist',
    skills: ['SQL', 'Data Modelling', 'Python', 'TypeScript'],
    availabilityBand: 45,
    workloadIndicator: 5,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Ahmed Osman',
    role: 'Data Specialist',
    skills: ['Machine Learning', 'Python', 'Docker', 'Kubernetes'],
    availabilityBand: 95,
    workloadIndicator: 1,
    businessUnit: 'Digital Platforms',
  },

  // Delivery Managers (3)
  {
    name: 'Lisa Govender',
    role: 'Delivery Manager',
    skills: ['Agile', 'CI/CD', 'REST API Design'],
    availabilityBand: 70,
    workloadIndicator: 4,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Tumelo Mashaba',
    role: 'Delivery Manager',
    skills: ['Agile', 'Security', 'System Design'],
    availabilityBand: 55,
    workloadIndicator: 6,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Rachel Williams',
    role: 'Delivery Manager',
    skills: ['Agile', 'Test Automation', 'Performance Testing'],
    availabilityBand: 100,
    workloadIndicator: 0,
    businessUnit: 'Digital Platforms',
  },

  // DevOps Engineers (2)
  {
    name: 'Vuyo Sithole',
    role: 'DevOps Engineer',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Python'],
    availabilityBand: 75,
    workloadIndicator: 3,
    businessUnit: 'Digital Platforms',
  },
  {
    name: 'Kenji Nakamura',
    role: 'DevOps Engineer',
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'Security', 'AWS'],
    availabilityBand: 60,
    workloadIndicator: 4,
    businessUnit: 'Digital Platforms',
  },

  // UX Researchers (1) — non-matching candidate for scoring verification
  {
    name: 'Olga Petrova',
    role: 'UX Researcher',
    skills: ['User Interviews', 'Usability Testing', 'Wireframing'],
    availabilityBand: 85,
    workloadIndicator: 1,
    businessUnit: 'Digital Platforms',
  },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data (idempotent)
  await prisma.candidateSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.roleType.deleteMany();

  // Seed role types
  const roleTypes = await Promise.all(
    ROLE_TYPES.map((name) =>
      prisma.roleType.create({ data: { name } })
    )
  );
  console.log(`Created ${roleTypes.length} role types`);

  // Seed skills
  const skills = await Promise.all(
    SKILLS.map((name) =>
      prisma.skill.create({ data: { name } })
    )
  );
  console.log(`Created ${skills.length} skills`);

  // Build skill name -> id lookup
  const skillMap = new Map(skills.map((s) => [s.name, s.id]));

  // Seed candidates with their skills
  for (const candidateData of CANDIDATES) {
    const candidate = await prisma.candidate.create({
      data: {
        name: candidateData.name,
        role: candidateData.role,
        availabilityBand: candidateData.availabilityBand,
        workloadIndicator: candidateData.workloadIndicator,
        businessUnit: candidateData.businessUnit,
        skills: {
          create: candidateData.skills.map((skillName) => ({
            skill: { connect: { id: skillMap.get(skillName)! } },
          })),
        },
      },
    });
    console.log(`Created candidate: ${candidate.name} (${candidate.role})`);
  }

  console.log(`\nSeed complete:`);
  console.log(`  - ${ROLE_TYPES.length} role types`);
  console.log(`  - ${SKILLS.length} skills`);
  console.log(`  - ${CANDIDATES.length} candidates`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
