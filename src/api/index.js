/**
 * API Module Index
 * 
 * Exports all API functions from the Basic Memory Node.js implementation.
 * This provides an identical API surface to the Python implementation.
 */

import { 
  createOrUpdateEntity,
  getEntity,
  deleteEntity,
  listEntities,
  getEntityTypes,
  updateEntityMetadata
} from './entity.js';

import {
  createRelation,
  getRelations,
  deleteRelation,
  getRelationTypes,
  findRelatedEntities
} from './relation.js';

import {
  createObservation,
  getObservations,
  getObservation,
  updateObservation,
  deleteObservation,
  getObservationCategories
} from './observation.js';

import {
  searchEntities,
  searchObservations,
  updateSearchIndex,
  rebuildSearchIndices
} from './search.js';

import * as contentExtractor from '../utils/content-extractor.js';

// Export entity functions
export const entity = {
  createOrUpdate: createOrUpdateEntity,
  get: getEntity,
  delete: deleteEntity,
  list: listEntities,
  getTypes: getEntityTypes,
  updateMetadata: updateEntityMetadata
};

// Export relation functions
export const relation = {
  create: createRelation,
  get: getRelations,
  delete: deleteRelation,
  getTypes: getRelationTypes,
  findRelated: findRelatedEntities
};

// Export observation functions
export const observation = {
  create: createObservation,
  get: getObservations,
  getById: getObservation,
  update: updateObservation,
  delete: deleteObservation,
  getCategories: getObservationCategories
};

// Export search functions
export const search = {
  entities: searchEntities,
  observations: searchObservations,
  updateIndex: updateSearchIndex,
  rebuildIndices: rebuildSearchIndices
};

// Export content extraction utilities
export const content = contentExtractor;

// Version information
export const version = '0.10.0';

// Export everything as a default object for CommonJS compatibility
export default {
  entity,
  relation,
  observation,
  search,
  content,
  version
};
