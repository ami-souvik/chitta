from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
import uuid


class UserCreate(BaseModel):
    id: str
    email: str
    name: Optional[str] = None


class FinanceEntryCreate(BaseModel):
    type: str  # income | expense
    amount: float
    category: str
    description: Optional[str] = None
    date: Optional[date] = None


class FinanceEntryOut(BaseModel):
    id: str
    user_id: str
    type: str
    amount: float
    category: str
    description: Optional[str]
    date: str
    created_at: str


class FinanceSummary(BaseModel):
    income: float
    expenses: float
    balance: float


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pending"
    priority: str = "medium"
    due_date: Optional[date] = None
    tags: Optional[List[str]] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    tags: Optional[List[str]] = None


class TaskOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[str]
    tags: Optional[List[str]]
    created_at: str
    updated_at: str


class HealthLogCreate(BaseModel):
    type: str
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    date: Optional[date] = None


class HealthLogOut(BaseModel):
    id: str
    user_id: str
    date: str
    type: str
    value: Optional[float]
    unit: Optional[str]
    notes: Optional[str]
    created_at: str


class HealthTodaySummary(BaseModel):
    sleep_hours: Optional[float]
    water_litres: Optional[float]
    mood: Optional[str]
    workout_streak: int


class JournalEntryCreate(BaseModel):
    content: str
    mood: Optional[str] = None
    tags: Optional[List[str]] = None
    date: Optional[date] = None


class JournalEntryOut(BaseModel):
    id: str
    user_id: str
    date: str
    content: str
    mood: Optional[str]
    tags: Optional[List[str]]
    created_at: str


class IdeaCreate(BaseModel):
    content: str
    type: str = "idea"


class IdeaOut(BaseModel):
    id: str
    user_id: str
    content: str
    type: str
    status: str
    created_at: str


class GraphNodeOut(BaseModel):
    id: str
    user_id: str
    label: str
    type: str
    source_id: Optional[str]
    source_table: Optional[str]
    neo4j_id: Optional[str]
    created_at: str


class GraphEdgeOut(BaseModel):
    id: str
    source: str
    target: str
    type: str
    explanation: Optional[str]


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = None
    session_id: Optional[str] = None


class IntentResult(BaseModel):
    intent: str
    domain: str
    extracted_data: dict = Field(default_factory=dict)
    confidence: float = 0.0
