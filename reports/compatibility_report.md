# Basic Memory Schema Compatibility Report

Generated: 4/1/2025, 9:10:44 AM

**Overall Compatibility:** ❌ Incompatible

## General Recommendations

- Add Observation model to Node.js implementation to store granular entity observations

## Missing Tables

### Tables in Python missing from Node.js

| Python Table | Mapped Node.js Name | Recommendation |
|--------------|---------------------|----------------|
| observation | observations | Table 'observation' exists in Python but not in Node.js (mapped name would be 'observations') |
| search_index | search_index | Table 'search_index' exists in Python but not in Node.js (mapped name would be 'search_index') |
| search_index_data | search_index_data | Table 'search_index_data' exists in Python but not in Node.js (mapped name would be 'search_index_data') |
| search_index_idx | search_index_idx | Table 'search_index_idx' exists in Python but not in Node.js (mapped name would be 'search_index_idx') |
| search_index_content | search_index_content | Table 'search_index_content' exists in Python but not in Node.js (mapped name would be 'search_index_content') |
| search_index_docsize | search_index_docsize | Table 'search_index_docsize' exists in Python but not in Node.js (mapped name would be 'search_index_docsize') |
| search_index_config | search_index_config | Table 'search_index_config' exists in Python but not in Node.js (mapped name would be 'search_index_config') |

## Table Compatibility

### entity (Python) ↔ entities (Node.js)

**Compatible:** ❌ No

#### Columns in Python missing from Node.js

| Python Column | Mapped Node.js Name | Recommendation |
|---------------|---------------------|----------------|
| entity_metadata | entity_metadata | Column 'entity_metadata' exists in Python table but not in Node.js (mapped name would be 'entity_metadata') |
| content_type | content_type | Column 'content_type' exists in Python table but not in Node.js (mapped name would be 'content_type') |
| checksum | checksum | Column 'checksum' exists in Python table but not in Node.js (mapped name would be 'checksum') |

#### Columns in Node.js missing from Python

| Node.js Column | Mapped Python Name | Recommendation |
|----------------|-------------------|----------------|
| content | content | Column 'content' exists in Node.js table but not in Python (mapped name would be 'content') |
| raw_content | raw_content | Column 'raw_content' exists in Node.js table but not in Python (mapped name would be 'raw_content') |
| type | relation_type | Column 'type' exists in Node.js table but not in Python (mapped name would be 'relation_type') |
| attributes | attributes | Column 'attributes' exists in Node.js table but not in Python (mapped name would be 'attributes') |
| last_modified | last_modified | Column 'last_modified' exists in Node.js table but not in Python (mapped name would be 'last_modified') |

#### Type Discrepancies

| Python Column | Node.js Column | Python Type | Node.js Type | Recommendation |
|---------------|----------------|-------------|-------------|----------------|
| created_at | createdAt | TIMESTAMP | DATETIME | Column types are incompatible: Python 'created_at' (TIMESTAMP) vs Node.js 'createdAt' (DATETIME) |
| updated_at | updatedAt | TIMESTAMP | DATETIME | Column types are incompatible: Python 'updated_at' (TIMESTAMP) vs Node.js 'updatedAt' (DATETIME) |

### relation (Python) ↔ links (Node.js)

**Compatible:** ❌ No

#### Columns in Python missing from Node.js

| Python Column | Mapped Node.js Name | Recommendation |
|---------------|---------------------|----------------|
| to_name | target_name | Column 'to_name' exists in Python table but not in Node.js (mapped name would be 'target_name') |
| context | context | Column 'context' exists in Python table but not in Node.js (mapped name would be 'context') |

#### Columns in Node.js missing from Python

| Node.js Column | Mapped Python Name | Recommendation |
|----------------|-------------------|----------------|
| attributes | attributes | Column 'attributes' exists in Node.js table but not in Python (mapped name would be 'attributes') |
| createdAt | created_at | Column 'createdAt' exists in Node.js table but not in Python (mapped name would be 'created_at') |
| updatedAt | updated_at | Column 'updatedAt' exists in Node.js table but not in Python (mapped name would be 'updated_at') |

## Detailed Table Structure

### Python Implementation Tables

#### entity

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| id | INTEGER | false | true |
| title | TEXT | true | false |
| entity_type | TEXT | true | false |
| entity_metadata | TEXT | false | false |
| content_type | TEXT | true | false |
| permalink | TEXT | false | false |
| file_path | TEXT | false | false |
| checksum | TEXT | false | false |
| created_at | TIMESTAMP | true | false |
| updated_at | TIMESTAMP | true | false |

**Indexes:**

- ix_entity_file_path: (file_path)
- ix_entity_permalink: (permalink)
- ix_entity_updated_at: (updated_at)
- ix_entity_created_at: (created_at)
- ix_entity_title: (title)
- ix_entity_type: (entity_type)
- sqlite_autoindex_entity_1: UNIQUE (file_path)

#### observation

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| id | INTEGER | false | true |
| entity_id | INTEGER | true | false |
| content | TEXT | true | false |
| category | TEXT | true | false |
| context | TEXT | false | false |
| tags | TEXT | false | false |

**Indexes:**

- ix_observation_category: (category)
- ix_observation_entity_id: (entity_id)

**Foreign Keys:**

- entity_id → entity(id) [ON DELETE: CASCADE]

#### relation

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| id | INTEGER | false | true |
| from_id | INTEGER | true | false |
| to_id | INTEGER | false | false |
| to_name | TEXT | true | false |
| relation_type | TEXT | true | false |
| context | TEXT | false | false |

**Indexes:**

- uix_relation_from_id_to_name: UNIQUE (from_id, to_name, relation_type)
- uix_relation_from_id_to_id: UNIQUE (from_id, to_id, relation_type)
- ix_relation_to_id: (to_id)
- ix_relation_from_id: (from_id)
- ix_relation_type: (relation_type)

**Foreign Keys:**

- to_id → entity(id) [ON DELETE: CASCADE]
- from_id → entity(id) [ON DELETE: CASCADE]

#### search_index

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| id |  | false | false |
| title |  | false | false |
| content_stems |  | false | false |
| content_snippet |  | false | false |
| permalink |  | false | false |
| file_path |  | false | false |
| type |  | false | false |
| from_id |  | false | false |
| to_id |  | false | false |
| relation_type |  | false | false |
| entity_id |  | false | false |
| category |  | false | false |
| metadata |  | false | false |
| created_at |  | false | false |
| updated_at |  | false | false |

#### search_index_data

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| id | INTEGER | false | true |
| block | BLOB | false | false |

#### search_index_idx

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| segid |  | true | true |
| term |  | true | false |
| pgno |  | false | false |

**Indexes:**

- sqlite_autoindex_search_index_idx_1: UNIQUE (segid, term)

#### search_index_content

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| id | INTEGER | false | true |
| c0 |  | false | false |
| c1 |  | false | false |
| c2 |  | false | false |
| c3 |  | false | false |
| c4 |  | false | false |
| c5 |  | false | false |
| c6 |  | false | false |
| c7 |  | false | false |
| c8 |  | false | false |
| c9 |  | false | false |
| c10 |  | false | false |
| c11 |  | false | false |
| c12 |  | false | false |
| c13 |  | false | false |
| c14 |  | false | false |

#### search_index_docsize

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| id | INTEGER | false | true |
| sz | BLOB | false | false |

#### search_index_config

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| k |  | true | true |
| v |  | false | false |

**Indexes:**

- sqlite_autoindex_search_index_config_1: UNIQUE (k)

### Node.js Implementation Tables

#### entities

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| id | INTEGER | false | true |
| title | VARCHAR(255) | true | false |
| permalink | VARCHAR(255) | true | false |
| content | TEXT | true | false |
| raw_content | TEXT | true | false |
| type | VARCHAR(255) | true | false |
| attributes | TEXT | false | false |
| file_path | VARCHAR(255) | false | false |
| last_modified | DATETIME | true | false |
| createdAt | DATETIME | true | false |
| updatedAt | DATETIME | true | false |

**Indexes:**

- entities_title: (title)
- entities_type: (type)
- entities_permalink: UNIQUE (permalink)
- sqlite_autoindex_entities_1: UNIQUE (permalink)

#### links

| Column | Type | NOT NULL | Primary Key |
|--------|------|----------|-------------|
| id | INTEGER | false | true |
| source_id | INTEGER | true | false |
| target_id | INTEGER | true | false |
| type | VARCHAR(255) | true | false |
| attributes | TEXT | false | false |
| createdAt | DATETIME | true | false |
| updatedAt | DATETIME | true | false |

**Indexes:**

- links_type: (type)
- links_target_id: (target_id)
- links_source_id: (source_id)

**Foreign Keys:**

- target_id → entities(id) [ON DELETE: NO ACTION]
- source_id → entities(id) [ON DELETE: NO ACTION]

