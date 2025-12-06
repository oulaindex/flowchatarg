# Implementation Plan: Knowledge Background Only Feature

## 1. Frontend Implementation

### 1.1 State Management
**File:** [web/src/core/store/settings-store.ts](cci:7://file:///e:/deer-flow/web/src/core/store/settings-store.ts:0:0-0:0)

- Add `enableKnowledgeBackgroundOnly` to `DEFAULT_SETTINGS` and [SettingsState](cci:2://file:///e:/deer-flow/web/src/core/store/settings-store.ts:26:0-41:2).
- Implement `setEnableKnowledgeBackgroundOnly` function.

### 1.2 API Client
**File:** [web/src/core/api/chat.ts](cci:7://file:///e:/deer-flow/web/src/core/api/chat.ts:0:0-0:0)

- Update [chatStream](cci:1://file:///e:/deer-flow/web/src/core/api/chat.ts:39:0-93:1) function signature and body to include `enable_knowledge_background_only`.

### 1.3 UI Components
**File:** [web/src/app/chat/components/input-box.tsx](cci:7://file:///e:/deer-flow/web/src/app/chat/components/input-box.tsx:0:0-0:0)

- Import `setEnableKnowledgeBackgroundOnly` and `useSettingsStore`.
- Add a new `Button` inside the toolbar (using an icon like `BookOpen`).
- Configure button click handler to toggle `enableKnowledgeBackgroundOnly` and ensure priority (e.g., disable other modes when active).

## 2. Backend Implementation

### 2.1 Request Model
**File:** [src/server/chat_request.py](cci:7://file:///e:/deer-flow/src/server/chat_request.py:0:0-0:0)

- Add `enable_knowledge_background_only: Optional[bool]` field to [ChatRequest](cci:2://file:///e:/deer-flow/src/server/chat_request.py:29:0-81:5) class.

### 2.2 Graph State
**File:** [src/graph/types.py](cci:7://file:///e:/deer-flow/src/graph/types.py:0:0-0:0)

- Add `enable_knowledge_background_only: Annotated[bool, lambda a, b: b] = False` to [State](cci:2://file:///e:/deer-flow/src/graph/types.py:14:0-44:74) class.

### 2.3 Graph Nodes
**File:** [src/graph/nodes.py](cci:7://file:///e:/deer-flow/src/graph/nodes.py:0:0-0:0)

**[coordinator_node](cci:1://file:///e:/deer-flow/src/graph/nodes.py:432:0-699:5) logic update:**
- Modify the routing logic at the end of the (legacy and clarification) branches.
- If `state.get("enable_knowledge_background_only")` is True, set `goto = "background_investigator"`, overriding default planner routing.

**[background_investigation_node](cci:1://file:///e:/deer-flow/src/graph/nodes.py:181:0-237:5) logic update:**
- Add import: `from src.rag.ragflow import RAGFlowProvider`
- Inject logic at the start of the function:
   ```python
   if state.get("enable_knowledge_background_only"):
       # 1. Retrieve
       query = state.get("clarified_research_topic") or state.get("research_topic")
       provider = RAGFlowProvider()
       docs = provider.query_relevant_documents(query, state.get("resources", []))
       
       # 2. Summarize
       context = "\n\n".join([f"doc: {d.title}\n{c.content}" for d in docs for c in d.chunks])
       llm = get_llm_by_type("basic")
       messages = [
           {"role": "system", "content": "Generate a report based directly on the provided knowledge background."},
           {"role": "user", "content": f"Query: {query}\n\nContext:\n{context}"}
       ]
       response = llm.invoke(messages)
       
       # 3. Terminate
       return Command(
           update={"final_report": response.content},
           goto="__end__"
       )