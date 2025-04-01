
import json
import sys
from pathlib import Path
from sqlalchemy import inspect

# Add the parent directory to the path so we can import basic_memory
sys.path.insert(0, 'C:/dev-env.local/local-mcp-services/modelcontextprotocol/mcp-integration/services/basic-memory')

from basic_memory.models.knowledge import Entity, Observation, Relation
from basic_memory.models.search import CREATE_SEARCH_INDEX
from basic_memory.db import get_or_create_db, DatabaseType
from basic_memory.config import ProjectConfig, AppConfig

async def get_schema():
    # Create a temporary database to inspect
    app_config = AppConfig()
    project_config = ProjectConfig("default", app_config.storage_path)
    
    engine, session_maker = await get_or_create_db(
        project_config.database_path, 
        DatabaseType.MEMORY
    )
    
    schema = {}
    
    # Get schema for each model
    for cls in [Entity, Observation, Relation]:
        table_name = cls.__tablename__
        mapper = inspect(cls)
        
        schema[table_name] = {
            "name": cls.__name__,
            "tableName": table_name,
            "fields": []
        }
        
        for column in mapper.columns:
            field_info = {
                "name": column.name,
                "type": str(column.type),
                "allowNull": column.nullable,
                "primaryKey": column.primary_key,
                "unique": column.unique,
                "defaultValue": column.default.arg if column.default else None
            }
            
            if column.foreign_keys:
                field_info["references"] = [{
                    "model": fk.column.table.name,
                    "key": fk.column.name
                } for fk in column.foreign_keys]
            
            schema[table_name]["fields"].append(field_info)
    
    # Add virtual search table info
    schema["search_index"] = {
        "name": "SearchIndex",
        "tableName": "search_index",
        "fields": [],
        "definition": str(CREATE_SEARCH_INDEX)
    }
    
    print(json.dumps(schema, default=str, indent=2))

# Run the async function
import asyncio
asyncio.run(get_schema())
    