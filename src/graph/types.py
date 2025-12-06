# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT


from dataclasses import field
import operator
from typing import Annotated

from langgraph.graph import MessagesState

from src.prompts.planner_model import Plan
from src.rag import Resource


class State(MessagesState):
    """State for the agent system, extends MessagesState with next field."""

    # Runtime Variables
    locale: Annotated[str, lambda a, b: b] = "en-US"
    research_topic: Annotated[str, lambda a, b: b] = ""
    clarified_research_topic: Annotated[str, lambda a, b: b] = (
        ""  # Complete/final clarified topic with all clarification rounds
    )
    observations: Annotated[list[str], operator.add] = []
    resources: Annotated[list[Resource], operator.add] = []
    plan_iterations: Annotated[int, operator.add] = 0
    current_plan: Annotated[Plan | str, lambda a, b: b] = None
    final_report: Annotated[str, lambda a, b: b] = ""
    auto_accepted_plan: Annotated[bool, lambda a, b: b] = False
    enable_background_investigation: Annotated[bool, lambda a, b: b] = True
    enable_knowledge_background_only: Annotated[bool, lambda a, b: b] = False
    background_investigation_results: Annotated[str, lambda a, b: b] = None

    # Clarification state tracking (disabled by default)
    enable_clarification: Annotated[bool, lambda a, b: b] = (
        False  # Enable/disable clarification feature (default: False)
    )
    clarification_rounds: Annotated[int, operator.add] = 0
    clarification_history: Annotated[list[str], operator.add] = field(default_factory=list)
    is_clarification_complete: Annotated[bool, lambda a, b: b] = False
    max_clarification_rounds: Annotated[int, lambda a, b: b] = (
        3  # Default: 3 rounds (only used when enable_clarification=True)
    )

    # Workflow control
    goto: Annotated[str, lambda a, b: b] = "planner"  # Default next node
