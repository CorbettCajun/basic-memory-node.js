# Compatibility Template

## Overview

This template provides a standardized format for documenting compatibility aspects between the Python and Node.js implementations of Basic Memory. Use this template when adding new features, modifying existing ones, or when conducting compatibility verification.

## Database Schema Compatibility

### Table: [TABLE_NAME]

| Field | Python Type | Node.js Type | Notes |
|-------|------------|--------------|-------|
| id | INTEGER | INTEGER | Primary key, auto-increment |
| ... | ... | ... | ... |

**Indexes:**
- ...

**Relationships:**
- ...

**Compatibility Status:** [✅ Fully Compatible / ⚠️ Partially Compatible / ❌ Incompatible]

**Known Issues:**
- ...

## API Compatibility

### Function/Method: [FUNCTION_NAME]

**Python Implementation:**
```python
def function_name(param1, param2="default"):
    """
    Function documentation
    """
    # Implementation details
```

**Node.js Implementation:**
```javascript
function functionName(param1, param2="default") {
    /**
     * Function documentation
     */
    // Implementation details
}
```

**Parameter Compatibility:**

| Parameter | Python Type | Node.js Type | Notes |
|-----------|------------|--------------|-------|
| param1 | str | string | ... |
| param2 | str | string | Optional in both implementations |

**Return Value Compatibility:**

| Python Return | Node.js Return | Compatible? |
|--------------|----------------|-------------|
| Dict[str, Any] | Object | ✅ Yes |

**Compatibility Status:** [✅ Fully Compatible / ⚠️ Partially Compatible / ❌ Incompatible]

**Known Issues:**
- ...

## Data Structure Compatibility

### Structure: [STRUCTURE_NAME]

**Python Structure:**
```python
{
    "id": 123,
    "title": "Example",
    "metadata": {
        "key": "value"
    }
}
```

**Node.js Structure:**
```javascript
{
    "id": 123,
    "title": "Example",
    "metadata": {
        "key": "value"
    }
}
```

**Field Compatibility:**

| Field | Python Type | Node.js Type | Notes |
|-------|------------|--------------|-------|
| id | int | number | ... |
| title | str | string | ... |
| metadata | Dict[str, Any] | Object | ... |

**Compatibility Status:** [✅ Fully Compatible / ⚠️ Partially Compatible / ❌ Incompatible]

**Known Issues:**
- ...

## Serialization/Deserialization Compatibility

### Format: [FORMAT_NAME]

**Description:**
Brief description of the serialization format (JSON, YAML, custom, etc.)

**Python Implementation:**
```python
# Serialization
def serialize(data):
    return json.dumps(data)

# Deserialization
def deserialize(string_data):
    return json.loads(string_data)
```

**Node.js Implementation:**
```javascript
// Serialization
function serialize(data) {
    return JSON.stringify(data);
}

// Deserialization
function deserialize(stringData) {
    return JSON.parse(stringData);
}
```

**Edge Cases:**
- Date/time handling
- Special characters
- Large integers
- Binary data

**Compatibility Status:** [✅ Fully Compatible / ⚠️ Partially Compatible / ❌ Incompatible]

**Known Issues:**
- ...

## File Structure Compatibility

### File: [FILE_TYPE]

**Python Implementation Path:**
`/path/to/python/implementation/file`

**Node.js Implementation Path:**
`/path/to/nodejs/implementation/file`

**Structure Comparison:**
- Organization of code
- Key functions/classes
- Entry points
- Configuration handling

**Compatibility Status:** [✅ Fully Compatible / ⚠️ Partially Compatible / ❌ Incompatible]

**Known Issues:**
- ...

## Verification Checklist

When implementing or modifying a feature, ensure:

- [ ] Database schema matches exactly (field names, types, relationships)
- [ ] API function signatures are compatible (parameter names, types, order)
- [ ] Return values match in structure and semantics
- [ ] Serialization/deserialization produces identical results
- [ ] Error handling follows the same patterns
- [ ] Tests validate cross-implementation compatibility
- [ ] Documentation is updated in both implementations

## Notes

- Always prioritize compatibility over language-specific optimizations
- Document any necessary workarounds for cross-language compatibility
- When in doubt, the Python implementation is the reference standard
- Raise issues early when compatibility challenges are identified
