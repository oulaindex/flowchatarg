sequenceDiagram
    participant User
    participant Frontend as "Frontend (Next.js)"
    participant Backend as "Backend API (FastAPI)"
    participant Coordinator as "Coordinator Agent"
    participant BgInvestigator as "Background Investigator Agent"
    participant SearchTool as "Search Tool (Tavily/etc)"
    participant Planner as "Planner Agent"

    Note over User, Frontend: "User clicks button to enable background investigation"
    User->>Frontend: "Toggle backgroundInvestigation state (True)"
    
    Note over User, Frontend: "User enters content and clicks Send"
    User->>Frontend: "Submit Message"
    
    activate Frontend
    Frontend->>Frontend: "Prepare Payload (include enable_background_investigation: true)"
    Frontend->>Backend: "POST /api/chat/stream"
    activate Backend
    
    Backend->>Backend: "Initialize Workflow (State include enable_background_investigation=True)"
    Backend->>Coordinator: "Start Graph Execution"
    activate Coordinator
    
    Coordinator->>Coordinator: "LLM Processing (Decide to handoff)"
    
    Note right of Coordinator: "Logic intercepts transition to 'planner'"
    Coordinator->>BgInvestigator: "Route to Background Investigator"
    deactivate Coordinator
    activate BgInvestigator
    
    BgInvestigator->>SearchTool: "Invoke Search (Query based on topic)"
    activate SearchTool
    SearchTool-->>BgInvestigator: "Return Search Results"
    deactivate SearchTool
    
    BgInvestigator->>BgInvestigator: "Update State (background_investigation_results)"
    BgInvestigator->>Planner: "Transition to Planner"
    deactivate BgInvestigator
    activate Planner
    
    Note right of Planner: "Planner sees background results in Context"
    Planner->>Planner: "Generate Plan"
    
    Planner-->>Backend: "Stream Events/Chunks"
    deactivate Planner
    
    Backend-->>Frontend: "SSE (Server-Sent Events) Stream"
    deactivate Backend
    
    Frontend-->>User: "Render Response"
    deactivate Frontend