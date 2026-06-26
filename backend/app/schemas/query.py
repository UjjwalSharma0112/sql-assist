from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any

class QueryGenerateRequest(BaseModel):
    project_id: int
    question: str

class QueryAlternativeSchema(BaseModel):
    sql: str
    explanation: str

class QueryResponse(BaseModel):
    id: int
    project_id: int
    question: str
    generated_sql: str
    query_explanation: str
    affected_tables: str
    estimated_rows: Optional[int] = None
    estimated_cost: Optional[float] = None
    risk_level: str
    status: str
    executed: bool
    execution_time_ms: Optional[float] = None
    rows_returned: Optional[int] = None
    result_summary: Optional[str] = None
    created_at: datetime
    
    alternatives: Optional[List[QueryAlternativeSchema]] = None
    optimization_suggestions: Optional[List[str]] = None

    model_config = ConfigDict(
        from_attributes=True
    )

class QueryExecuteRequest(BaseModel):
    sql: str

class QueryExecuteResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    execution_time_ms: float
    rows_returned: int
    columns: List[str]
    data: List[Dict[str, Any]]
    estimated_rows: Optional[int] = None
    estimated_cost: Optional[float] = None
    transactional: Optional[bool] = False
