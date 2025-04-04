/**
 * Schema models for entity markdown files.
 * Directly mirrors the Python Pydantic models from basic_memory/markdown/schemas.py
 */

import { z } from 'zod';

/**
 * Represents an observation about an entity.
 */
export const ObservationSchema = z.object({
  category: z.string().optional().default('Note'),
  content: z.string(),
  tags: z.array(z.string()).optional().default([]),
  context: z.string().optional(),
}).transform((obs) => ({
  ...obs,
  toString() {
    let obsString = `- [${obs.category}] ${obs.content}`;
    if (obs.context) {
      obsString += ` (${obs.context})`;
    }
    return obsString;
  }
}));

/**
 * Represents a relation between entities.
 */
export const RelationSchema = z.object({
  type: z.string(),
  target: z.string(),
  context: z.string().optional(),
}).transform((rel) => ({
  ...rel,
  toString() {
    let relString = `- ${rel.type} [[${rel.target}]]`;
    if (rel.context) {
      relString += ` (${rel.context})`;
    }
    return relString;
  }
}));

/**
 * Required frontmatter fields for an entity.
 */
export const EntityFrontmatterSchema = z.object({
  metadata: z.record(z.string(), z.any()).default({}),
}).transform((frontmatter) => ({
  ...frontmatter,
  get tags() {
    return frontmatter.metadata.tags || [];
  },
  get title() {
    return frontmatter.metadata.title || null;
  }
}));

/**
 * Complete entity combining frontmatter, content, and metadata.
 */
export const EntityMarkdownSchema = z.object({
  frontmatter: EntityFrontmatterSchema,
  content: z.string().optional(),
  observations: z.array(ObservationSchema).default([]),
  relations: z.array(RelationSchema).default([]),
  created: z.date().optional(),
  modified: z.date().optional(),
});

export const createObservation = (data) => ObservationSchema.parse(data);
export const createRelation = (data) => RelationSchema.parse(data);
export const createEntityFrontmatter = (data) => EntityFrontmatterSchema.parse(data);
export const createEntityMarkdown = (data) => EntityMarkdownSchema.parse(data);
