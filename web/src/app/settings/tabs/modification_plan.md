# Modification Plan: Enforce Single-Step Plan for Knowledge Background Mode

## Overview
When `enable_knowledge_background_only` is enabled, the system should strictly limit the planning to 1 step, regardless of the user's `maxStepsOfPlan` setting. This ensures the researcher focuses on a single retrieval-and-answer cycle (RAG) rather than complex multi-step planning.

## Proposed Changes

### Backend Logic (`src/server/app.py`)
Modify the `chat_stream` endpoint to check for `enable_knowledge_background_only` in the request. If true, override `max_step_num` to `1` before initializing the workflow.

## Updated System Flow

The following sequence diagram illustrates the modified flow where the Backend API ensures the step limit is enforced.

```mermaid
sequenceDiagram
    autonumber
    participant Frontend as "Frontend (store.ts)"
    participant API as "Backend API (app.py)"
    participant Graph as "Graph Runner (builder.py)"
    participant PlannerNode as "Planner Node (nodes.py)"
    participant Template as "Template Engine (template.py)"
    participant LLM as "Big Model (LLM)"

    Note over Frontend: User sets 'maxStepsOfPlan' = 5<br/>enable_knowledge_background_only = True
    Frontend->>API: POST /api/chat/stream<br/>{"max_step_num": 5, "enable_knowledge_background_only": true, ...}
    
    activate API
    Note over API: Logic Check:<br/>if enable_knowledge_background_only:<br/>max_step_num = 1
    
    API->>API: Create workflow_config<br/>{"max_step_num": 1, ...}
    API->>Graph: graph.astream(inputs, config=workflow_config)
    activate Graph
    
    Graph->>PlannerNode: Invoke planner_node(state, config)
    activate PlannerNode
    
    PlannerNode->>PlannerNode: Extract max_step_num (Now 1)
    
    PlannerNode->>Template: apply_prompt_template("planner", ...)<br/>passes max_step_num=1
    activate Template
    
    Note right of Template: Load "planner.md"<br/>Replace {{ max_step_num }} with 1
    Template-->>PlannerNode: Returned formatted prompt
    deactivate Template
    
    PlannerNode->>LLM: invoke(messages=[..., "Limit to 1 step", ...])
    activate LLM
    Note right of LLM: Generates plan with <= 1 step
    LLM-->>PlannerNode: Returns JSON Plan (1 step)
    deactivate LLM
    
    PlannerNode->>Graph: Return Command(current_plan=...)
    deactivate PlannerNode
    
    Graph-->>API: Yield execution events
    deactivate Graph
    
    API-->>Frontend: Stream events (SSE)
    deactivate API
```
