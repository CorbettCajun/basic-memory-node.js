# Schema Migration Guide

## Purpose

This migration script ensures 100% database schema compatibility between the Node.js and Python implementations of Basic Memory.

## Changes Implemented

### 1. Entity Table Updates

- Added `entity_metadata` column (JSONB)
- Added `content_type` column (String)
- Added `checksum` column (String)

### 2. New Tables

- `observations`: Stores granular entity observations
- Search Index Tables:
  - `search_index`
  - `search_index_data`
  - `search_index_idx`
  - `search_index_content`
  - `search_index_docsize`
  - `search_index_config`

### 3. Performance Optimizations

- Added indexes on `permalink` and `entity_id`

## Migration Strategy

- Uses Sequelize transaction for atomic updates
- Provides rollback mechanism
- Automatically detects and applies changes

## Compatibility Verification

1. Matches Python implementation schema exactly
2. Preserves existing data
3. Supports bidirectional data access

## How to Run

```bash
node src/db/migrations/20250402_align_python_schema.js
```

## Rollback

If migration causes issues, use the built-in rollback method.

## Troubleshooting

- Ensure database is backed up before migration
- Check console logs for detailed error information
- Verify schema after migration using comparison tools

## Version Compatibility

- Tested with Node.js v23.6.0
- Compatible with Basic Memory Python implementation
