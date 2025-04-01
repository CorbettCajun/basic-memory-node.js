# Data Structure Compatibility Specification

This document provides a comprehensive analysis of the data structures used in both the Python and Node.js implementations of Basic Memory, with the goal of ensuring full compatibility between them.

## Core Data Structures

### Entity

The Entity data structure is the fundamental building block of Basic Memory and must be fully compatible across implementations.

#### Required Fields for Compatibility

| Field Name | Python Type | Node.js Type | Description | Compatibility Notes |
|------------|-------------|--------------|-------------|---------------------|
| id | Integer | INTEGER | Primary key identifier | Must be auto-incrementing in both implementations |
| title | String | STRING | Title of the entity | Required in both implementations |
| permalink | String | STRING | Normalized path for URIs | Must be unique and consistent between implementations |
| file_path | String | STRING | Filesystem path to the source file | Must use consistent path formatting across platforms |

#### Important Differences Between Implementations

- **Content Handling**:
  - Python: Stores content separately in files and does not include it directly in the Entity model
  - Node.js: Currently includes `content` and `raw_content` fields directly in the Entity model
  
- **Type Fields**:
  - Python: Uses `entity_type` field
  - Node.js: Uses `type` field with a default value of 'note'
  
- **Metadata Handling**:
  - Python: Uses `entity_metadata` as a JSON field
  - Node.js: Uses `attributes` field with JSON string conversion

### Relations

Relations connect entities in the knowledge graph and must maintain consistent semantics.

#### Required Fields for Compatibility

| Field Name | Python Name | Node.js Name | Python Type | Node.js Type | Description | Compatibility Notes |
|------------|-------------|--------------|-------------|--------------|-------------|---------------------|
| id | id | id | Integer | INTEGER | Primary key identifier | Must be auto-incrementing in both implementations |
| source | from_id | source_id | Integer (FK) | INTEGER (FK) | Source entity ID | Foreign key to Entity table |
| target | to_id | target_id | Integer (FK) | INTEGER (FK) | Target entity ID | Foreign key to Entity table |
| type | relation_type | type | String | STRING | Relation type | Name mismatch between implementations |
| target name | to_name | n/a | String | n/a | Named target | Not currently in Node.js implementation |

#### Important Differences Between Implementations

- **Model Naming**:
  - Python: Named `Relation`
  - Node.js: Named `Link`
  
- **Field Naming**:
  - Python: Uses `from_id` and `to_id`
  - Node.js: Uses `source_id` and `target_id`
  
- **Missing Fields in Node.js**:
  - `to_name` - Used in Python for relations to entities that might not exist yet
  - `context` - Contextual information about the relation

### Observations

The Observation model, which exists in the Python implementation, captures atomic facts or notes about an entity.

#### Required Fields for Compatibility

| Field Name | Python Type | Description | Compatibility Notes |
|------------|-------------|-------------|---------------------|
| id | Integer | Primary key identifier | Not currently implemented in Node.js |
| entity_id | Integer (FK) | Parent entity ID | Foreign key to Entity table |
| content | Text | Observation content | Main text content of the observation |
| category | String | Category of observation | Used for grouping observations |
| context | Text | Context or source | Optional context information |
| tags | JSON | Associated tags | List of string tags |

#### Implementation Status

- **Python**: Fully implemented
- **Node.js**: Not currently implemented - this is a significant missing component

## Search Considerations

### Full-Text Search

Both implementations should support full-text search capabilities:

- **Python**: Uses SQLite FTS5 virtual table `search_index`
- **Node.js**: Does not currently implement a search index

### Search Index Fields

For compatibility, a search index should include these fields:

| Field | Description | Indexing Recommendation |
|-------|-------------|-------------------------|
| title | Entity title | Indexed for full-text search |
| content | Entity content | Indexed for full-text search |
| permalink | Normalized path | Indexed for path-based lookup |
| type | Entity type | Used for filtering |

## File System Synchronization

Both implementations should maintain consistent behavior when synchronizing with the file system:

### Requirements for Compatibility

1. **File Paths**: Must use consistent path normalization
2. **File Formats**: Must support common Markdown with front matter
3. **Metadata Extraction**: Must extract the same metadata fields from front matter
4. **Content Parsing**: Must handle Markdown content consistently
5. **Permalink Generation**: Must generate identical permalinks for the same content
6. **Change Detection**: Should detect and handle changes consistently

## Recommendations for Achieving Compatibility

1. **Align Data Models**:
   - Rename fields in the Node.js implementation to match Python naming conventions
   - Add missing fields and models (particularly Observation)
   - Ensure consistent default values and constraints

2. **Implement Missing Components**:
   - Add the Observation model to Node.js
   - Implement a search index in Node.js
   - Support `to_name` field for relations to non-existent entities

3. **Filesystem Compatibility**:
   - Ensure consistent path handling across platforms
   - Normalize file path storage to use forward slashes
   - Use the same approach for file change detection

4. **Schema Verification**:
   - Run the schema compatibility verification tool regularly during development
   - Add automated tests that verify database operations across implementations

## Compatibility Verification Process

To maintain data structure compatibility, follow this process during development:

1. **Before Implementing New Features**:
   - Review the Python implementation's data model
   - Document the required fields and relationships
   - Design the Node.js implementation to match

2. **During Implementation**:
   - Use the schema compatibility verification tool to check for issues
   - Address any compatibility warnings or errors immediately
   - Write tests that verify identical behavior

3. **After Implementation**:
   - Verify database read/write operations produce identical results
   - Test cross-implementation data access
   - Update this specification with any new findings or requirements

## Next Steps for Development

1. **Implement Observation Model**:
   - Add the Observation model to the Node.js implementation
   - Ensure it maintains compatibility with the Python implementation
   - Implement the necessary repository and service methods

2. **Align Field Naming**:
   - Update field names in the Node.js implementation to match Python
   - Add missing fields like `to_name` for relations

3. **Enhance Search Capabilities**:
   - Implement a search index in the Node.js implementation
   - Ensure consistent indexing and search behavior

By following these specifications and implementing the missing components, we can ensure full data structure compatibility between the Python and Node.js implementations of Basic Memory.
