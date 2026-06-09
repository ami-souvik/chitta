import json
import re
from services.gemini import call_gemma
from models.schemas import IntentResult

INTENT_SYSTEM_PROMPT = """
You are Chitta's intent classifier. Given a user message, output a JSON object with:
- intent: one of [log_finance, log_task, log_health, log_journal, dump_idea, query_finance, query_tasks, query_health, query_journal, query_mindgraph, morning_brief, general_chat]
- domain: one of [finance, tasks, health, journal, ideas, mindgraph, general]
- extracted_data: relevant structured data extracted from the message (amounts, dates, task titles, etc.)
- confidence: float 0-1

Output only valid JSON. No explanation.

Examples:
"spent 450 on lunch today" → {"intent": "log_finance", "domain": "finance", "extracted_data": {"type": "expense", "amount": 450, "category": "food", "description": "lunch"}, "confidence": 0.97}
"received 85000 salary" → {"intent": "log_finance", "domain": "finance", "extracted_data": {"type": "income", "amount": 85000, "category": "salary", "description": "salary"}, "confidence": 0.97}
"remind me to call Shreya tomorrow" → {"intent": "log_task", "domain": "tasks", "extracted_data": {"title": "Call Shreya", "due_date": "tomorrow"}, "confidence": 0.95}
"I've been feeling anxious about the demo" → {"intent": "dump_idea", "domain": "ideas", "extracted_data": {"content": "feeling anxious about the demo", "type": "worry"}, "confidence": 0.88}
"how much did I spend this week" → {"intent": "query_finance", "domain": "finance", "extracted_data": {"period": "this_week"}, "confidence": 0.96}
"slept 7 hours last night" → {"intent": "log_health", "domain": "health", "extracted_data": {"type": "sleep", "value": 7, "unit": "hours"}, "confidence": 0.97}
"today I felt sad because my presentation didn't go well" → {"intent": "log_journal", "domain": "journal", "extracted_data": {"mood": "bad"}, "confidence": 0.9}
"idea: build an AI tool for legal teams" → {"intent": "dump_idea", "domain": "ideas", "extracted_data": {"content": "build an AI tool for legal teams", "type": "idea"}, "confidence": 0.95}
"""


async def classify_intent(message: str) -> IntentResult:
    try:
        raw = await call_gemma(INTENT_SYSTEM_PROMPT, message, temperature=0.1)
        # Extract JSON from response
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            return IntentResult(intent="general_chat", domain="general")
        data = json.loads(match.group())
        return IntentResult(**data)
    except Exception:
        return IntentResult(intent="general_chat", domain="general")
