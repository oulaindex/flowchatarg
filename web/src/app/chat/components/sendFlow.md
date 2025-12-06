sequenceDiagram
    participant User
    participant UI
    participant Store
    participant API
    participant Backend
    participant Graph
    participant Agents
    participant RAG
    participant Tools

    User->>UI: 点击"背景调查"按钮
    UI->>Store: 调用setEnableBackgroundInvestigation(true)
    Store->>Store: 更新enableBackgroundInvestigation状态
    Store->>Store: 保存到localStorage

    User->>UI: 输入消息内容
    User->>UI: 点击发送按钮
    UI->>API: 调用chatStream(userMessage, params)
    Note over API: params包含enable_background_investigation=true

    API->>Backend: POST /api/chat/stream
    Note over Backend: 包含enable_background_investigation参数

    Backend->>Graph: 创建工作流输入
    Note over Graph: 设置enable_background_investigation=true

    Graph->>Agents: 执行coordinator节点
    Agents->>Agents: 协调任务分配

    alt enable_background_investigation为true
        Agents->>Agents: 执行background_investigator节点
        Agents->>RAG: 检索相关背景信息
        RAG-->>Agents: 返回背景调查结果
        Agents->>Agents: 整合背景信息到研究主题
    end

    Agents->>Agents: 执行planner节点
    Agents->>Agents: 生成研究计划

    loop 计划执行循环
        Agents->>Agents: 执行research_team节点
        Agents->>Agents: 分配任务给researcher/coder
        
        alt 需要研究
            Agents->>Tools: 调用研究工具
            Tools-->>Agents: 返回研究结果
        end
        
        alt 需要编码处理
            Agents->>Tools: 调用编码工具
            Tools-->>Agents: 返回处理结果
        end
        
        Agents->>Agents: 更新计划执行状态
    end

    Agents->>Agents: 执行reporter节点
    Agents->>Agents: 生成最终报告

    Graph-->>Backend: 流式返回事件
    Backend-->>API: Server-Sent Events流
    API-->>UI: 实时更新界面
    UI-->>User: 显示生成的内容
