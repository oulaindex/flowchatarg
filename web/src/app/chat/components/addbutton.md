基于对代码的分析，我将制定一个详细的实施计划来添加"只查知识背景"按钮。以下是我的分析：

## 当前架构分析

1. **前端状态管理** (`web/src/core/store/settings-store.ts`):
   - 已有 `enableBackgroundInvestigation` 状态
   - 需要添加 `enableKnowledgeBackgroundOnly` 状态

2. **前端UI组件** (`web/src/app/chat/components/input-box.tsx`):
   - 已有"调研"按钮，使用 `setEnableBackgroundInvestigation`
   - 需要在investigation按钮右边添加新按钮

3. **API调用** (`web/src/core/api/chat.ts`):
   - `chatStream` 函数接收 `enable_background_investigation` 参数
   - 需要添加 `enable_knowledge_background_only` 参数

4. **后端请求模型** (`src/server/chat_request.py`):
   - `ChatRequest` 模型已有 `enable_background_investigation` 字段
   - 需要添加 `enable_knowledge_background_only` 字段

5. **后端工作流处理** (`src/server/app.py`):
   - `_astream_workflow_generator` 传递参数到工作流
   - 需要传递新参数

6. **工作流状态** (`src/graph/types.py`):
   - `State` 类已有 `enable_background_investigation` 字段
   - 需要添加 `enable_knowledge_background_only` 字段

7. **工作流节点** (`src/graph/nodes.py`):
   - `background_investigation_node`: 执行背景调查
   - `planner_node`: 生成计划
   - 需要修改逻辑，当 `enable_knowledge_background_only` 为true时，在背景调查后直接跳转到reporter

8. **工作流图** (`src/graph/builder.py`):
   - 当前流程: coordinator → background_investigator → planner → research_team → reporter
   - 需要修改: 当 `enable_knowledge_background_only` 为true时，流程应为: coordinator → background_investigator → reporter

## 详细实施计划

```markdown
# "只查知识背景"功能实施计划

## 1. 前端修改

### 1.1 状态管理 (`web/src/core/store/settings-store.ts`)
- 在 `SettingsState.general` 中添加 `enableKnowledgeBackgroundOnly: boolean` 字段
- 在 `DEFAULT_SETTINGS.general` 中添加 `enableKnowledgeBackgroundOnly: false`
- 添加 `setEnableKnowledgeBackgroundOnly(value: boolean)` 函数
- 更新 `getChatStreamSettings()` 函数，将新状态包含在返回的设置中

### 1.2 翻译文件 (`web/messages/zh.json`)
- 在 `chat.inputBox` 下添加:
  ```json
  "knowledgeBackgroundOnly": "只查知识背景",
  "knowledgeBackgroundOnlyTooltip": {
    "title": "只查知识背景模式：{status}",
    "description": "启用后，DeepResearch 将只进行背景调查并基于调查结果直接生成总结，不执行后续研究计划。"
  }
  ```

### 1.3 UI组件 (`web/src/app/chat/components/input-box.tsx`)
- 在investigation按钮右侧添加新按钮:
  ```tsx
  <Tooltip
    className="max-w-60"
    title={
      <div>
        <h3 className="mb-2 font-bold">
          {t("knowledgeBackgroundOnlyTooltip.title", {
            status: knowledgeBackgroundOnly ? t("on") : t("off"),
          })}
        </h3>
        <p>{t("knowledgeBackgroundOnlyTooltip.description")}</p>
      </div>
    }
  >
    <Button
      className={cn(
        "rounded-2xl",
        knowledgeBackgroundOnly && "!border-brand !text-brand",
      )}
      variant="outline"
      onClick={() => setEnableKnowledgeBackgroundOnly(!knowledgeBackgroundOnly)}
    >
      <BookOpen /> {t("knowledgeBackgroundOnly")}
    </Button>
  </Tooltip>
  ```
- 需要导入 `BookOpen` 图标或使用现有图标
- 从store中获取 `knowledgeBackgroundOnly` 状态

### 1.4 API调用 (`web/src/core/api/chat.ts`)
- 更新 `chatStream` 函数的 `params` 类型，添加 `enable_knowledge_background_only: boolean` 字段
- 在函数调用中传递该参数

### 1.5 Store调用 (`web/src/core/store/store.ts`)
- 在 `sendMessage` 函数中，从 `getChatStreamSettings()` 获取 `enableKnowledgeBackgroundOnly` 设置
- 传递给 `chatStream` 函数

## 2. 后端修改

### 2.1 请求模型 (`src/server/chat_request.py`)
- 在 `ChatRequest` 类中添加:
  ```python
  enable_knowledge_background_only: Optional[bool] = Field(
      False, description="Whether to only get background investigation without full research plan"
  )
  ```

### 2.2 工作流状态 (`src/graph/types.py`)
- 在 `State` 类中添加:
  ```python
  enable_knowledge_background_only: Annotated[bool, lambda a, b: b] = False
  ```

### 2.3 工作流处理 (`src/server/app.py`)
- 在 `_astream_workflow_generator` 函数中，将 `enable_knowledge_background_only` 参数传递给工作流输入

### 2.4 工作流节点修改 (`src/graph/nodes.py`)

#### 2.4.1 `background_investigation_node` 函数
- 保持现有逻辑不变，继续执行背景调查

#### 2.4.2 `planner_node` 函数
- 修改逻辑：当 `enable_knowledge_background_only` 为true时，直接跳转到reporter
- 添加检查:
  ```python
  if state.get("enable_knowledge_background_only", False):
      # 只查知识背景模式，直接生成报告
      return Command(
          update={
              "messages": [AIMessage(content="背景调查完成，直接生成总结", name="planner")],
              **preserve_state_meta_fields(state),
          },
          goto="reporter",
      )
  ```

#### 2.4.3 `coordinator_node` 函数
- 在决定跳转到哪个节点时，考虑 `enable_knowledge_background_only` 状态
- 修改背景调查路由逻辑

### 2.5 工作流图 (`src/graph/builder.py`)
- 可能需要添加条件边来处理新的流程
- 或者通过节点内部的逻辑控制流程

## 3. 测试计划

### 3.1 前端测试
- 验证新按钮显示正确
- 验证按钮点击切换状态
- 验证状态保存到localStorage

### 3.2 后端测试
- 验证API接收新参数
- 验证工作流正确处理新参数
- 验证只查知识背景模式跳过计划循环

### 3.3 集成测试
- 完整流程测试：启用"只查知识背景"模式，发送消息，验证只返回背景调查总结
- 与现有功能兼容性测试：同时启用"调研"和"只查知识背景"时的行为

## 4. 文件修改清单

1. `web/src/core/store/settings-store.ts` - 添加新状态和函数
2. `web/messages/zh.json` - 添加翻译文本
3. `web/src/app/chat/components/input-box.tsx` - 添加新按钮
4. `web/src/core/api/chat.ts` - 更新API参数
5. `web/src/core/store/store.ts` - 传递新参数
6. `src/server/chat_request.py` - 添加请求字段
7. `src/graph/types.py` - 添加状态字段
8. `src/server/app.py` - 传递参数到工作流
9. `src/graph/nodes.py` - 修改节点逻辑
10. `src/graph/builder.py` - 可能修改工作流图

## 5. 注意事项

1. **互斥逻辑**: "只查知识背景"和"调研"可能互斥或可以同时启用，同时启用时"只查知识背景"优先
2. **图标选择**: 为新按钮选择与"调研"一样的图标
3. **错误处理**: 确保新功能有适当的错误处理
4. **向后兼容**: 确保现有功能不受影响
5. **状态持久化**: 确保用户设置正确保存和恢复
```

这个计划涵盖了从前端到后端的完整修改，包括具体的文件路径和函数级别细节。实施时需要按照顺序逐步进行，确保每个修改都经过测试。