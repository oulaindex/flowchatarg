sequenceDiagram
    autonumber
    participant Frontend as "Frontend (general-tab.tsx / store)"
    participant API as "Backend API (app.py)"
    participant Graph as "Graph Runner (builder.py)"
    participant PlannerNode as "Planner Node (nodes.py)"
    participant Template as "Template Engine (template.py)"
    participant LLM as "Big Model (LLM)"

    Note over Frontend: User sets 'maxStepsOfPlan' (maxStepNum)
    Frontend->>API: POST /api/chat/stream<br/>{"max_step_num": N, ...}
    
    activate API
    API->>API: Create workflow_config<br/>{"max_step_num": N, ...}
    API->>Graph: graph.astream(inputs, config=workflow_config)
    activate Graph
    
    Graph->>PlannerNode: Invoke planner_node(state, config)
    activate PlannerNode
    
    PlannerNode->>PlannerNode: Extract max_step_num from config
    
    PlannerNode->>Template: apply_prompt_template("planner", ...)<br/>passes max_step_num=N
    activate Template
    
    Note right of Template: Load "planner.md"<br/>Replace {{ max_step_num }} with N
    Template-->>PlannerNode: Returned formatted prompt
    deactivate Template
    
    PlannerNode->>LLM: invoke(messages=[system_prompt_with_limit, ...])
    activate LLM
    Note right of LLM: Generates plan with <= N steps<br/>based on prompt instruction
    LLM-->>PlannerNode: Returns JSON Plan
    deactivate LLM
    
    PlannerNode->>Graph: Return Command(current_plan=...)
    deactivate PlannerNode
    
    Graph-->>API: Yield execution events
    deactivate Graph
    
    API-->>Frontend: Stream events (SSE)
    deactivate API