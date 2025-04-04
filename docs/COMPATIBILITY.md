# Basic Memory Cross-Implementation Compatibility

This document provides a comprehensive guide to compatibility between the Python and Node.js implementations of Basic Memory. It consolidates information previously found in separate documents to provide a single source of truth for compatibility-related topics.

> **CRITICAL PRINCIPLE**: The Python implementation is considered the reference implementation and will not be modified. All adaptations will be made in the Node.js implementation to match the Python implementation exactly.

## Table of Contents

- [Overview](#overview)
- [Database Schema Compatibility](#database-schema-compatibility)
  - [Entity Model](#entity-model)
  - [Observation Model](#observation-model)
  - [Relation Model](#relation-model)
  - [Search Index](#search-index)
- [API Compatibility](#api-compatibility)
- [Performance Parity](#performance-parity)
- [Verification Procedures](#verification-procedures)
  - [Verification Tools](#verification-tools)
  - [Testing Protocols](#testing-protocols)
- [Implementation Status](#implementation-status)
- [Compatibility Template](#compatibility-template)

## Overview

The Basic Memory Node.js implementation must maintain exact compatibility with the Python implementation to ensure:

1. **Data Integrity**: Both implementations can use the same database without corruption

2. **Feature Parity**: All functionality available in Python is available in Node.js

3. **API Consistency**: Functions, parameters, and return values match exactly

4. **Cross-Implementation Verification**: Automated tests verify compatibility

## Database Schema Compatibility

### Entity Model

The Entity data structure is the fundamental building block of Basic Memory and must be fully compatible across implementations.

#### Required Fields for Compatibility

| Field Name | Python Type | Node.js Type | Description | Compatibility Notes |
|------------|-------------|--------------|-------------|---------------------|
| id | Integer | INTEGER | Primary key identifier | Must be auto-incrementing in both implementations |
| title | String | STRING | Title of the entity | Required in both implementations |
| permalink | String | STRING | Normalized path for URIs | Must be unique and consistent between implementations |
| file_path | String | STRING | Filesystem path to the source file | Must use consistent path formatting across platforms |
| entity_type | String | STRING | Type classification | Default to 'note' in Node.js |
| entity_metadata | JSON/Text | TEXT | Serialized metadata | Must be JSON-serializable in both implementations |
| created_at | TIMESTAMP | TIMESTAMP | Creation timestamp | Format must be compatible |
| updated_at | TIMESTAMP | TIMESTAMP | Last update timestamp | Format must be compatible |
| checksum | String | STRING | Content hash | Must use identical hashing algorithm |

#### Important Differences Between Implementations

- **Content Handling**:
  - Python: Stores content separately in files and does not include it directly in the Entity model
  - Node.js: Was initially including `content` and `raw_content` fields directly in the Entity model, now adapted to match Python

- **Type Fields**:
  - Python: Uses `entity_type` field
  - Node.js: Was using `type` field with a default value of 'note', now adapted to use `entity_type`

- **Metadata Handling**:
  - Python: Uses `entity_metadata` as JSON-serialized text
  - Node.js: Was using `attributes` field, now adapted to use `entity_metadata`

### Observation Model

Observations are used to store granular information about entities and were initially missing from the Node.js implementation.

#### Table: observation

| Field | Python Type | Node.js Type | Notes |
|-------|------------|--------------|-------|
| id | INTEGER | INTEGER | Primary key, auto-increment |
| entity_id | INTEGER | INTEGER | Foreign key to entities.id |
| content | TEXT | TEXT | Content of the observation |
| category | VARCHAR(255) | STRING | Category classification |
| context | TEXT | TEXT | JSON-serialized context information |
| tags | TEXT | TEXT | JSON-serialized array of tags |
| created_at | TIMESTAMP | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | TIMESTAMP | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Foreign key on `entity_id` referencing `entity.id`
- Index on `category` for faster filtering

**Implementation Notes:**
- The tags field must be serialized as a JSON array in both implementations
- The context field should use identical serialization for compatibility
- Timestamp formats must be identical across implementations

### Relation Model

Relations connect entities and provide the graph structure of Basic Memory.

#### Table: relation

| Field | Python Type | Node.js Type | Notes |
|-------|------------|--------------|-------|
| id | INTEGER | INTEGER | Primary key, auto-increment |
| source_id | INTEGER | INTEGER | Foreign key to source entity |
| target_id | INTEGER | INTEGER | Foreign key to target entity |
| relation_type | VARCHAR(255) | STRING | Type of relation (e.g., 'link', 'reference') |
| to_name | VARCHAR(255) | STRING | Target entity name at time of relation creation |
| context | TEXT | TEXT | JSON-serialized context information |
| created_at | TIMESTAMP | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | TIMESTAMP | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Foreign key on `source_id` referencing `entity.id`
- Foreign key on `target_id` referencing `entity.id`
- Composite index on (source_id, target_id, relation_type) for uniqueness

### Search Index

Search functionality requires special handling to ensure compatibility.

#### FTS5 Virtual Table for search_index

| Field | Python Type | Node.js Type | Notes |
|-------|------------|--------------|-------|
| rowid | INTEGER | INTEGER | References entity.id |
| title | TEXT | TEXT | Indexed title field |
| content | TEXT | TEXT | Indexed content field |
| tags | TEXT | TEXT | Indexed tags |

**Implementation Notes:**
- Both implementations should use the same FTS5 tokenizer for consistent search results
- Update triggers must be identical to ensure consistent indexing
- Search ranking algorithms should produce identical results

## API Compatibility

To ensure perfect API compatibility, the Node.js implementation follows these principles:

1. **Identical Function Names**: All public API functions have the same names

2. **Matching Parameters**: Parameter names, types, and order match exactly

3. **Equivalent Return Values**: Return value structures are identical

4. **Consistent Error Handling**: Error patterns and messages match

5. **Serialization Compatibility**: Data serialization produces identical results

### Entity API

- `createEntity(entityData)`: Creates a new entity

- `getEntity(permalink)`: Retrieves an entity by permalink

- `updateEntity(permalink, updates)`: Updates an entity

- `deleteEntity(permalink)`: Deletes an entity

- `getAllEntities(options)`: Retrieves all entities with filtering

### Observation API

- `createObservation(observationData)`: Creates a new observation

- `getObservation(id)`: Retrieves an observation by ID

- `getObservations(permalink, options)`: Gets observations for an entity

- `updateObservation(id, updates)`: Updates an observation

- `deleteObservation(id)`: Deletes an observation

### Relation API

- `createRelation(relationData)`: Creates a new relation

- `getRelation(id)`: Retrieves a relation by ID

- `getRelations(permalink, options)`: Gets relations for an entity

- `deleteRelation(id)`: Deletes a relation

### Search API

- `searchEntities(options)`: Searches for entities

- `searchObservations(options)`: Searches for observations

- `updateSearchIndex(permalink)`: Updates search indices for an entity

- `rebuildSearchIndices(options)`: Rebuilds all search indices

## Performance Parity

The Node.js implementation of Basic Memory has been optimized to achieve performance parity with the Python implementation. Detailed benchmarks show excellent performance across all core operations:

- **Search**: 8.65ms average response time with optimized FTS5 implementation
- **Entity Listing**: 4.76ms average with efficient indexing
- **Entity Retrieval**: 32.68ms average for retrieving 50 entities
- **Entity Creation**: 503.10ms average for creating 50 entities

Key optimizations include:
- SQLite FTS5 for full-text search
- Optimized database configuration
- Efficient query design
- Batch operation support

See [PERFORMANCE_PARITY.md](PERFORMANCE_PARITY.md) for complete details on the benchmark results and optimization strategies.

## Verification Procedures

To ensure cross-implementation compatibility, we've established a comprehensive verification system.

### Verification Tools

#### 1. Reference Data Generator

**Purpose**: Creates consistent, deterministic test datasets that can be used by both implementations.

**Location**: `/tests/compatibility/reference-data-generator.js`

**Features**:
- Generates entities, observations, and relations with consistent properties
- Uses deterministic seeding to ensure reproducibility
- Produces reference data in JSON format for both implementations to consume

#### 2. Schema Compatibility Validator

**Purpose**: Verifies that database schemas match between implementations.

**Location**: `/tests/compatibility/schema-validator.js`

**Features**:
- Extracts schema information from both implementations
- Compares table structures, column definitions, and relationships
- Reports any discrepancies that could lead to compatibility issues

#### 3. Data Integrity Verifier

**Purpose**: Ensures that both implementations produce identical data structures.

**Location**: `/tests/compatibility/data-integrity-verifier.js`

**Features**:
- Creates identical entities in both implementations
- Compares serialized output to verify compatibility
- Tests read/write operations for consistency

#### 4. API Compatibility Tests

**Purpose**: Validates that API functions behave identically.

**Location**: `/tests/compatibility/api-compatibility.test.js`

**Features**:
- Tests each API function with identical inputs
- Compares response structures and values
- Verifies error handling patterns match

### Testing Protocols

#### 1. Basic Compatibility Test

**Purpose**: Verify basic cross-implementation compatibility.

**Procedure**:
1. Generate reference data set
2. Import reference data into Node.js implementation
3. Export data from Node.js
4. Import exported data into Python implementation
5. Verify data integrity

#### 2. Round-Trip Test

**Purpose**: Ensure data survives multiple cross-implementation cycles.

**Procedure**:
1. Create entities in Python
2. Access and modify them in Node.js
3. Access and modify them again in Python
4. Verify data integrity throughout the process

#### 3. Migration Test

**Purpose**: Ensure data migrations work across implementations.

**Procedure**:
1. Create a database with an older schema using Node.js
2. Run migration script in Node.js to update the schema
3. Verify Python implementation can use the migrated database

## Implementation Status

| Category | Status | Progress |
|----------|--------|----------|
| Database Schema Compatibility | Complete | 100% |
| Entity Model Compatibility | Complete | 100% |
| Observation Model Compatibility | Complete | 100% |
| Relation Model Compatibility | Complete | 100% |
| Search Index Compatibility | Complete | 100% |
| API Compatibility | Complete | 100% |
| CLI Compatibility | Complete | 100% |
| Verification Test Suite | Complete | 100% |
| Performance Parity | Complete | 100% |

## Compatibility Template

When adding new features that require cross-implementation compatibility, use this template:

### Table: [TABLE_NAME]

| Field | Python Type | Node.js Type | Notes |
|-------|------------|--------------|-------|
| id | INTEGER | INTEGER | Primary key, auto-increment |
| ... | ... | ... | ... |

**Indexes:**
- ...

**Relationships:**
- ...

### API Function: [FUNCTION_NAME]

**Python Signature:**

```python
def function_name(param1, param2="default"):
    """
    Function docstring.
    """
    pass
```

**Node.js Signature:**

```javascript
async function functionName(param1, param2="default") {
  // Implementation
}
```

**Compatibility Requirements:**

- Parameter names and order must match

- Default values must be equivalent

- Return value structure must be identical

- Error handling patterns must be consistent

**Verification Tests:**

- Test identical inputs produce identical outputs

- Test edge cases behave consistently

- Test error conditions are handled similarly
