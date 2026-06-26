import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List
from app.utils.prompt_builder import build_generation_prompt

class QueryAlternative(BaseModel):
    sql: str
    explanation: str

class GeminiQueryResponse(BaseModel):
    primary_query: str
    explanation: str
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    risk_explanation: str
    affected_tables: List[str]
    alternatives: List[QueryAlternative]
    optimization_suggestions: List[str]

def generate_query_info(
    db_type: str,
    schema_summary: str,
    relationship_summary: str,
    question: str
) -> GeminiQueryResponse:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set. Please set it in your .env file.")

    client = genai.Client(api_key=api_key)
    prompt = build_generation_prompt(db_type, schema_summary, relationship_summary, question)

    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiQueryResponse,
            temperature=0.1,
        ),
    )

    data = json.loads(response.text)
    return GeminiQueryResponse(**data)
