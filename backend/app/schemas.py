from typing import Literal

from pydantic import BaseModel, Field


Conclusion = Literal["SUPPORTED", "INFERRED", "CONFLICTED", "NEEDS_HUMAN_DECISION"]


class EvidenceRef(BaseModel):
    source_id: str
    location: str = "Unspecified"
    supporting_text: str = ""
    explanation: str = ""


class Requirement(BaseModel):
    id: str = ""
    description: str
    type: Literal["functional", "non-functional", "business-rule"] = "functional"
    priority: Literal["P0", "P1", "P2", "P3"] = "P2"
    confidence: float = Field(ge=0, le=1)
    classification: Conclusion = "INFERRED"
    rationale: str = ""
    evidence: list[EvidenceRef] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    related_conflict_ids: list[str] = Field(default_factory=list)


class Conflict(BaseModel):
    id: str = ""
    title: str
    severity: Literal["Critical", "High", "Medium", "Low"] = "Medium"
    source_a_id: str
    source_a_statement: str
    source_b_id: str
    source_b_statement: str
    impact: str
    why_it_matters: str
    requirement_ids: list[str] = Field(default_factory=list)
    status: Literal["NEEDS_HUMAN_DECISION", "RESOLVED"] = "NEEDS_HUMAN_DECISION"


class AnalysisResult(BaseModel):
    business_objectives: list[str] = Field(default_factory=list)
    problem_statement: str = ""
    stakeholders: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    requirements: list[Requirement] = Field(default_factory=list)
    conflicts: list[Conflict] = Field(default_factory=list)
    concise_summary: str = ""


class BRDNarrative(BaseModel):
    executive_summary: str
    business_objective: str
    problem_statement: str
    stakeholders: list[str] = Field(default_factory=list)
    proposed_solution: str
    business_rules: list[str] = Field(default_factory=list)
    user_stories: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


class AskCitation(BaseModel):
    requirement_id: str = ""
    evidence_id: str = ""
    source_id: str = ""
    explanation: str = ""


class AskResult(BaseModel):
    answer: str
    citations: list[AskCitation] = Field(default_factory=list)

