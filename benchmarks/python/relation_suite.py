"""
Relation Operations Benchmark Suite for Python

This suite tests the performance of relation-related operations in the Python
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
    from basic_memory.api import entity, relation
except ImportError:
    print("Error: Cannot import basic_memory.api.relation module")
    print("Make sure the Python implementation is available at ../../../basic-memory/src")
    sys.exit(1)

# Helper functions
def generate_id():
    """Generate a unique ID for testing"""
    timestamp = int(time.time() * 1000)
    random_suffix = random.randint(1000, 9999)
    return f"test-entity-{timestamp}-{random_suffix}"


def generate_test_entities():
    """Generate test entities for relation testing"""
    source_id = generate_id()
    target_id = generate_id()
    
    source_entity = entity.create({
        "id": source_id,
        "title": f"Source Entity {source_id}",
        "content": f"Test content for source entity {source_id}",
        "entity_type": "note",
        "permalink": f"test-source-{source_id}"
    })
    
    target_entity = entity.create({
        "id": target_id,
        "title": f"Target Entity {target_id}",
        "content": f"Test content for target entity {target_id}",
        "entity_type": "note",
        "permalink": f"test-target-{target_id}"
    })
    
    return source_entity, target_entity


# Define benchmarks
def bench_create_relation():
    """Benchmark creating a relation"""
    source_entity, target_entity = generate_test_entities()
    
    return relation.create({
        "source_id": source_entity["id"],
        "target_id": target_entity["id"],
        "relation_type": "link"
    })


def bench_get_relations_setup():
    """Setup for get relations benchmark"""
    source_entity, target_entity = generate_test_entities()
    
    new_relation = relation.create({
        "source_id": source_entity["id"],
        "target_id": target_entity["id"],
        "relation_type": "link"
    })
    
    return {
        "source_id": source_entity["id"],
        "target_id": target_entity["id"],
        "relation_id": new_relation["id"]
    }


def bench_get_relations(data):
    """Benchmark getting relations for an entity"""
    return relation.get_relations_for_entity(data["source_id"])


def bench_get_outgoing_relations(data):
    """Benchmark getting outgoing relations for an entity"""
    return relation.get_outgoing_relations(data["source_id"])


def bench_get_incoming_relations(data):
    """Benchmark getting incoming relations for an entity"""
    return relation.get_incoming_relations(data["target_id"])


def bench_delete_relation(data):
    """Benchmark deleting a relation"""
    return relation.delete(data["relation_id"])


def bench_cleanup_entities(data):
    """Cleanup test entities"""
    entity.delete(data["source_id"])
    entity.delete(data["target_id"])


def bench_batch_create_relations():
    """Benchmark creating multiple relations in a batch"""
    entities = []
    for i in range(20):
        entity_id = generate_id()
        entities.append(entity.create({
            "id": entity_id,
            "title": f"Test Entity {entity_id}",
            "content": f"Test content for entity {entity_id}",
            "entity_type": "note",
            "permalink": f"test-{entity_id}"
        }))
    
    results = []
    center_entity = entities[0]
    
    # Create relations from center entity to all others
    for i in range(1, len(entities)):
        results.append(relation.create({
            "source_id": center_entity["id"],
            "target_id": entities[i]["id"],
            "relation_type": "link"
        }))
    
    # Cleanup
    for e in entities:
        entity.delete(e["id"])
    
    return results


def bench_get_relation_types_setup():
    """Setup for get relation types benchmark"""
    types = ["link", "reference", "dependency", "citation", "parent-child"]
    entities = []
    relations = []
    
    # Create two entities for each relation type
    for rel_type in types:
        source_id = generate_id()
        target_id = generate_id()
        
        source_entity = entity.create({
            "id": source_id,
            "title": f"Source Entity {source_id}",
            "content": f"Test content for source entity {source_id}",
            "entity_type": "note",
            "permalink": f"test-source-{source_id}"
        })
        
        target_entity = entity.create({
            "id": target_id,
            "title": f"Target Entity {target_id}",
            "content": f"Test content for target entity {target_id}",
            "entity_type": "note",
            "permalink": f"test-target-{target_id}"
        })
        
        entities.append(source_entity)
        entities.append(target_entity)
        
        # Create relation with the current type
        new_relation = relation.create({
            "source_id": source_entity["id"],
            "target_id": target_entity["id"],
            "relation_type": rel_type
        })
        
        relations.append(new_relation)
    
    return {"entities": entities, "relations": relations}


def bench_get_relation_types():
    """Benchmark getting relation types"""
    return relation.get_relation_types()


def bench_get_relation_types_cleanup(data):
    """Cleanup after get relation types benchmark"""
    for e in data["entities"]:
        entity.delete(e["id"])


# Define suite
SUITE = {
    "name": "Relation Operations",
    "description": "Benchmarks for relation CRUD operations",
    "benchmarks": [
        {
            "name": "Create Relation",
            "function": bench_create_relation,
            "iterations": 100
        },
        {
            "name": "Get Relations for Entity",
            "setup": bench_get_relations_setup,
            "function": bench_get_relations,
            "cleanup": bench_cleanup_entities,
            "iterations": 100
        },
        {
            "name": "Get Outgoing Relations",
            "setup": bench_get_relations_setup,
            "function": bench_get_outgoing_relations,
            "cleanup": bench_cleanup_entities,
            "iterations": 100
        },
        {
            "name": "Get Incoming Relations",
            "setup": bench_get_relations_setup,
            "function": bench_get_incoming_relations,
            "cleanup": bench_cleanup_entities,
            "iterations": 100
        },
        {
            "name": "Delete Relation",
            "setup": bench_get_relations_setup,
            "function": bench_delete_relation,
            "cleanup": bench_cleanup_entities,
            "iterations": 100
        },
        {
            "name": "Batch Create Relations (20)",
            "function": bench_batch_create_relations,
            "iterations": 20
        },
        {
            "name": "Get Relation Types",
            "setup": bench_get_relation_types_setup,
            "function": bench_get_relation_types,
            "cleanup": bench_get_relation_types_cleanup,
            "iterations": 50
        }
    ]
}

if __name__ == "__main__":
    from benchmark_runner import run_suite
    results = run_suite(SUITE)
    print(results)
