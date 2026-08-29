/**
 * Skill Bridge Platform - Skill Taxonomy & Category Management Engine
 * File: lib/taxonomy.js
 */

const { getDb, saveDb } = require('./db');

// Default database-driven taxonomy categories
const DEFAULT_CATEGORIES = [
  { id: 'cat_prog', name: 'Programming', slug: 'programming', description: 'Core software engineering & programming languages' },
  { id: 'cat_web', name: 'Web Development', slug: 'web-development', description: 'Frontend, backend, and full-stack web technologies' },
  { id: 'cat_db', name: 'Database', slug: 'database', description: 'Relational, NoSQL, and memory database management systems' },
  { id: 'cat_data', name: 'Data', slug: 'data', description: 'Data analysis, visualization, and business intelligence' },
  { id: 'cat_aiml', name: 'AI/ML', slug: 'ai-ml', description: 'Machine learning, deep learning, NLP, and computer vision' },
  { id: 'cat_devops', name: 'Cloud/DevOps', slug: 'cloud-devops', description: 'Cloud infrastructure, containerization, and deployment' },
  { id: 'cat_design', name: 'Design', slug: 'design', description: 'UI/UX design, wireframing, and visual assets' },
  { id: 'cat_biz', name: 'Business', slug: 'business', description: 'Communication, project management, and leadership' },
];

/**
 * Returns all active taxonomy categories
 */
function getSkillCategories() {
  const dbData = getDb();
  if (!dbData.skillCategories || dbData.skillCategories.length === 0) {
    dbData.skillCategories = DEFAULT_CATEGORIES;
    saveDb(dbData);
  }
  return dbData.skillCategories;
}

/**
 * Returns complete skill taxonomy with category details
 */
function getSkillTaxonomy() {
  const dbData = getDb();
  const categories = getSkillCategories();
  const rawSkills = dbData.skills || [];

  return rawSkills.map(skill => {
    const category = categories.find(c => c.name === skill.category || c.id === skill.categoryId) || {
      id: 'cat_gen',
      name: skill.category || 'General',
      slug: (skill.category || 'general').toLowerCase().replace(/\s+/g, '-'),
    };

    return {
      id: skill.id,
      name: skill.canonicalName || skill.name,
      slug: (skill.canonicalName || skill.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      categoryId: category.id,
      categoryName: category.name,
      description: skill.description || `${skill.canonicalName || skill.name} skill domain`,
      status: skill.status || 'ACTIVE',
      icon: skill.icon || 'Code',
      aliases: skill.aliases || [],
      parentSkillId: skill.parentSkillId || null,
      createdAt: skill.createdAt || new Date().toISOString(),
      updatedAt: skill.updatedAt || new Date().toISOString(),
    };
  });
}

/**
 * Retrieves a single taxonomy skill by ID or slug
 */
function getSkillByIdOrSlug(idOrSlug) {
  const taxonomy = getSkillTaxonomy();
  const normalized = (idOrSlug || '').toLowerCase().trim();
  return taxonomy.find(s => s.id === idOrSlug || s.slug === normalized || s.name.toLowerCase() === normalized);
}

/**
 * Admin: Create or update a taxonomy skill
 */
function saveTaxonomySkill(skillData) {
  const dbData = getDb();
  dbData.skills = dbData.skills || [];
  const now = new Date().toISOString();

  const existingIndex = dbData.skills.findIndex(s => s.id === skillData.id || s.canonicalName?.toLowerCase() === skillData.name?.toLowerCase());

  const categoryName = skillData.categoryName || skillData.category || 'Programming Languages';
  const slug = (skillData.name || 'skill').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (existingIndex >= 0) {
    dbData.skills[existingIndex] = {
      ...dbData.skills[existingIndex],
      name: skillData.name,
      canonicalName: skillData.name,
      category: categoryName,
      categoryId: skillData.categoryId,
      description: skillData.description,
      status: skillData.status || 'ACTIVE',
      icon: skillData.icon || 'Code',
      aliases: skillData.aliases || dbData.skills[existingIndex].aliases || [],
      parentSkillId: skillData.parentSkillId || null,
      updatedAt: now,
    };
  } else {
    const newSkill = {
      id: skillData.id || `skill_${slug.replace(/-/g, '_')}`,
      name: skillData.name,
      canonicalName: skillData.name,
      category: categoryName,
      categoryId: skillData.categoryId,
      description: skillData.description || '',
      status: skillData.status || 'ACTIVE',
      icon: skillData.icon || 'Code',
      aliases: skillData.aliases || [skillData.name.toLowerCase()],
      parentSkillId: skillData.parentSkillId || null,
      createdAt: now,
      updatedAt: now,
    };
    dbData.skills.push(newSkill);
  }

  saveDb(dbData);
  return getSkillByIdOrSlug(skillData.id || `skill_${slug.replace(/-/g, '_')}`);
}

module.exports = {
  getSkillCategories,
  getSkillTaxonomy,
  getSkillByIdOrSlug,
  saveTaxonomySkill,
};
