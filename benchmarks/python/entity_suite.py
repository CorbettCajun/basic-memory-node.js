"""
Entity Operations Benchmark Suite for Python

This suite tests the performance of entity-related operations in the Python
implementation of Basic Memory to establish a baseline for comparison with
the Node.js implementation.
"""

import os
import sys
import time
import random
import string
from datetime import datetime

# Add the Python Basic Memory to the path
sys.path.append(os.path.abspath("../../../basic-memory/src"))

try:
    from basic_memory.api import entity
except ImportError:
    print("Error: Cannot import basic_memory.api.entity module")
    print("Make sure the Python implementation is available at ../../../basic-memory/src")
    sys.exit(1)

# Helper functions
def generate_id():
    """Generate a unique ID for testing"""
    timestamp = int(time.time() * 1000)
    random_suffix = random.randint(1000, 9999)
    return f"test-entity-{timestamp}-{random_suffix}"

def generate_test_entity(entity_id=None):
    """Generate test data for an entity"""
    if entity_id is None:
        entity_id = generate_id()
        
    return {
        "id": entity_id,
        "title": f"Test Entity {entity_id}",
        "type": "benchmark-test",
        "content": (
            f"This is a test entity created for benchmarking purposes. "
            f"It contains some lorem ipsum text to make it more realistic.\n\n"
            f"Lorem ipsum dolor sit amet, consectetur adipiscing elit. "
            f"Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "
            f"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris "
            f"nisi ut aliquip ex ea commodo consequat."
        ),
        "metadata": {
            "created": datetime.now().isoformat(),
            "tags": ["benchmark", "test", "entity"],
            "priority": random.randint(1, 5),
            "testValue": random.random()
        }
    }

# Define benchmarks
def bench_create_entity():
    """Benchmark creating an entity"""
    test_entity = generate_test_entity()
    return entity.create_or_update(test_entity)

def bench_get_entity_setup():
    """Setup for get entity benchmark"""
    test_entity = generate_test_entity()
    created_entity = entity.create_or_update(test_entity)
    return created_entity["id"]

def bench_get_entity(entity_id):
    """Benchmark retrieving an entity by ID"""
    return entity.get(entity_id)

def bench_update_entity_setup():
    """Setup for update entity benchmark"""
    test_entity = generate_test_entity()
    created_entity = entity.create_or_update(test_entity)
    return created_entity["id"]

def bench_update_entity(entity_id):
    """Benchmark updating an entity"""
    existing_entity = entity.get(entity_id)
    existing_entity["title"] = f"Updated: {existing_entity['title']}"
    existing_entity["metadata"]["updated"] = datetime.now().isoformat()
    existing_entity["metadata"]["testValue"] = random.random()
    return entity.create_or_update(existing_entity)

def bench_list_entities_setup():
    """Setup for list entities benchmark"""
    batch_size = 50
    prefix = f"batch-{int(time.time() * 1000)}"
    
    for i in range(batch_size):
        test_entity = generate_test_entity(f"{prefix}-{i}")
        test_entity["type"] = "benchmark-batch"
        entity.create_or_update(test_entity)
    
    return {"type": "benchmark-batch"}

def bench_list_entities(filter_params):
    """Benchmark listing entities with a filter"""
    return entity.list(filter_params)

def bench_list_entities_cleanup(filter_params):
    """Cleanup after list entities benchmark"""
    entities_list = entity.list(filter_params)
    for entity_item in entities_list:
        entity.delete(entity_item["id"])

def bench_delete_entity_setup():
    """Setup for delete entity benchmark"""
    test_entity = generate_test_entity()
    created_entity = entity.create_or_update(test_entity)
    return created_entity["id"]

def bench_delete_entity(entity_id):
    """Benchmark deleting an entity"""
    return entity.delete(entity_id)

def bench_get_entity_types_setup():
    """Setup for get entity types benchmark"""
    types = ["type1", "type2", "type3", "type4", "type5"]
    
    for type_name in types:
        for i in range(10):
            test_entity = generate_test_entity()
            test_entity["type"] = type_name
            entity.create_or_update(test_entity)

def bench_get_entity_types():
    """Benchmark getting entity types"""
    return entity.get_types()

def bench_batch_create_entities():
    """Benchmark creating multiple entities in a batch"""
    batch_size = 50
    entities = []
    
    for i in range(batch_size):
        test_entity = generate_test_entity()
        result = entity.create_or_update(test_entity)
        entities.append(result)
    
    return entities

def bench_update_metadata_setup():
    """Setup for update metadata benchmark"""
    test_entity = generate_test_entity()
    created_entity = entity.create_or_update(test_entity)
    return created_entity["id"]

def bench_update_metadata(entity_id):
    """Benchmark updating entity metadata"""
    metadata = {
        "updated": datetime.now().isoformat(),
        "testValue": random.random(),
        "tags": ["updated", "benchmark", "metadata"]
    }
    
    return entity.update_metadata(entity_id, metadata)

# Define suite
SUITE = {
    "name": "Entity Operations",
    "description": "Benchmarks for entity CRUD operations",
    "benchmarks": [
        {
            "name": "Create Entity",
            "iterations": 50,
            "fn": bench_create_entity
        },
        {
            "name": "Get Entity by ID",
            "iterations": 100,
            "setup": bench_get_entity_setup,
            "fn": bench_get_entity
        },
        {
            "name": "Update Entity",
            "iterations": 50,
            "setup": bench_update_entity_setup,
            "fn": bench_update_entity
        },
        {
            "name": "List Entities",
            "iterations": 20,
            "setup": bench_list_entities_setup,
            "fn": bench_list_entities,
            "cleanup": bench_list_entities_cleanup
        },
        {
            "name": "Delete Entity",
            "iterations": 50,
            "setup": bench_delete_entity_setup,
            "fn": bench_delete_entity
        },
        {
            "name": "Get Entity Types",
            "iterations": 20,
            "setup": bench_get_entity_types_setup,
            "fn": bench_get_entity_types
        },
        {
            "name": "Batch Create Entities (50)",
            "iterations": 5,
            "fn": bench_batch_create_entities
        },
        {
            "name": "Update Entity Metadata",
            "iterations": 50,
            "setup": bench_update_metadata_setup,
            "fn": bench_update_metadata
        }
    ]
}

# For direct execution
if __name__ == "__main__":
    print("This is a benchmark suite module intended to be run by benchmark_runner.py")
    print("Example usage: python benchmark_runner.py entity")
