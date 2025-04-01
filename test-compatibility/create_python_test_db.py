
import sqlite3
import os
import json
from datetime import datetime

# Database path
db_path = "C:/dev-env.local/local-mcp-services/modelcontextprotocol/mcp-integration/services/basic-memory-node.js/test-compatibility/python-test.db"

# Create database directory if it doesn't exist
os.makedirs(os.path.dirname(db_path), exist_ok=True)

# Connect to database and create tables
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create entity table
cursor.execute('''
CREATE TABLE entity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_metadata TEXT,
    content_type TEXT NOT NULL,
    permalink TEXT,
    file_path TEXT UNIQUE,
    checksum TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
)
''')

# Create indexes
cursor.execute('CREATE INDEX ix_entity_type ON entity(entity_type)')
cursor.execute('CREATE INDEX ix_entity_title ON entity(title)')
cursor.execute('CREATE INDEX ix_entity_created_at ON entity(created_at)')
cursor.execute('CREATE INDEX ix_entity_updated_at ON entity(updated_at)')
cursor.execute('CREATE INDEX ix_entity_permalink ON entity(permalink)')
cursor.execute('CREATE INDEX ix_entity_file_path ON entity(file_path)')

# Create observation table
cursor.execute('''
CREATE TABLE observation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    context TEXT,
    tags TEXT,
    FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE
)
''')

# Create indexes
cursor.execute('CREATE INDEX ix_observation_entity_id ON observation(entity_id)')
cursor.execute('CREATE INDEX ix_observation_category ON observation(category)')

# Create relation table
cursor.execute('''
CREATE TABLE relation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER NOT NULL,
    to_id INTEGER,
    to_name TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    context TEXT,
    FOREIGN KEY (from_id) REFERENCES entity(id) ON DELETE CASCADE,
    FOREIGN KEY (to_id) REFERENCES entity(id) ON DELETE CASCADE
)
''')

# Create indexes
cursor.execute('CREATE INDEX ix_relation_type ON relation(relation_type)')
cursor.execute('CREATE INDEX ix_relation_from_id ON relation(from_id)')
cursor.execute('CREATE INDEX ix_relation_to_id ON relation(to_id)')
cursor.execute('CREATE UNIQUE INDEX uix_relation_from_id_to_id ON relation(from_id, to_id, relation_type)')
cursor.execute('CREATE UNIQUE INDEX uix_relation_from_id_to_name ON relation(from_id, to_name, relation_type)')

# Create FTS5 virtual table for search
cursor.execute('''
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    id UNINDEXED,
    title,
    content_stems,
    content_snippet,
    permalink,
    file_path UNINDEXED,
    type UNINDEXED,
    from_id UNINDEXED,
    to_id UNINDEXED,
    relation_type UNINDEXED,
    entity_id UNINDEXED,
    category UNINDEXED,
    metadata UNINDEXED,
    created_at UNINDEXED,
    updated_at UNINDEXED,
    tokenize='unicode61 tokenchars 0x2F',
    prefix='1,2,3,4'
)
''')

# Insert test data
now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
metadata = json.dumps({"tag": "test"})

# Insert test entity
cursor.execute('''
INSERT INTO entity (
    title, entity_type, entity_metadata, content_type, 
    permalink, file_path, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (
    'Test Entity', 'note', metadata, 'text/markdown',
    'test-entity', '/test/test-entity.md', now, now
))

entity_id = cursor.lastrowid

# Insert test observation
cursor.execute('''
INSERT INTO observation (
    entity_id, content, category, tags
) VALUES (?, ?, ?, ?)
''', (
    entity_id, 'This is a test observation', 'note', json.dumps(['test'])
))

# Insert test relation
cursor.execute('''
INSERT INTO entity (
    title, entity_type, entity_metadata, content_type, 
    permalink, file_path, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (
    'Related Entity', 'note', metadata, 'text/markdown',
    'related-entity', '/test/related-entity.md', now, now
))

related_id = cursor.lastrowid

cursor.execute('''
INSERT INTO relation (
    from_id, to_id, to_name, relation_type
) VALUES (?, ?, ?, ?)
''', (
    entity_id, related_id, 'Related Entity', 'references'
))

# Commit changes and close
conn.commit()
conn.close()

print("Python test database initialized successfully")
  