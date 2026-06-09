export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface FinanceEntry {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface HealthLog {
  id: string;
  user_id: string;
  date: string;
  type: "workout" | "sleep" | "water" | "weight" | "mood" | "steps";
  value: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  content: string;
  mood: "great" | "good" | "neutral" | "bad" | "awful" | null;
  tags: string[] | null;
  created_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  content: string;
  type: "idea" | "worry" | "goal" | "observation" | "question";
  status: "raw" | "processed" | "archived";
  created_at: string;
}

export interface GraphNode {
  id: string;
  user_id: string;
  label: string;
  type: "idea" | "worry" | "goal" | "journal_theme" | "finance_goal" | "health_goal" | "task_cluster";
  source_id: string | null;
  source_table: string | null;
  neo4j_id: string | null;
  created_at: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "relates_to" | "conflicts_with" | "supports" | "caused_by" | "part_of";
  explanation: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  domain?: string;
  created_at: string;
}

export type FinanceCategory =
  | "food" | "transport" | "housing" | "utilities" | "entertainment"
  | "health" | "shopping" | "education" | "salary" | "freelance"
  | "investment" | "other";

export type MoodType = "great" | "good" | "neutral" | "bad" | "awful";
