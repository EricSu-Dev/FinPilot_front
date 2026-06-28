<template>
  <div class="chat-message" :class="role">
    <div class="avatar">
      <el-icon v-if="role === 'user'"><User /></el-icon>
      <el-icon v-else><TrendCharts /></el-icon>
    </div>
    <div class="bubble-wrap">
      <!-- 工具执行中的小状态条 -->
      <div v-if="tools.length" class="tool-chips">
        <span v-for="(t, i) in tools" :key="i" class="tool-chip" :class="{ running: !t.done }">
          <el-icon class="tool-icon"><Loading v-if="!t.done" /><CircleCheck v-else /></el-icon>
          {{ t.done ? '已完成' : '正在执行' }}：{{ labelOf(t) }}
        </span>
      </div>
      <div class="bubble" :class="{ empty: !content && !streaming }">
        <div v-if="content" class="markdown-body" v-html="rendered"></div>
        <span v-if="streaming" class="cursor">▋</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { User, TrendCharts, Loading, CircleCheck } from '@element-plus/icons-vue'

const props = defineProps({
  role: { type: String, default: 'assistant' }, // 'user' | 'assistant'
  content: { type: String, default: '' },
  streaming: { type: Boolean, default: false },
  // 工具执行状态：[{ tool, label, done }]
  tools: { type: Array, default: () => [] },
})

// 中文工具名映射，让状态条更友好。
const TOOL_LABELS = {
  diagnose_stock: '诊断股票',
  diagnose_fund: '诊断基金',
  analyze_my_portfolio: '分析持仓',
  query_uploaded_report: '财报问答',
  web_search_tool: '联网搜索',
}

const rendered = computed(() => {
  if (!props.content) return ''
  // marked 解析后用 DOMPurify 清洗，防止 XSS（assistant 输出原样 v-html 有风险）
  const html = marked.parse(props.content, { breaks: true })
  return DOMPurify.sanitize(html)
})

const labelOf = (t) => t.label || TOOL_LABELS[t.tool] || t.tool || '工具'
</script>

<style scoped>
.chat-message {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: flex-start;
}
.chat-message.user {
  flex-direction: row-reverse;
}
.avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #e2e8f0;
}
.chat-message.user .avatar {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
}
.chat-message.assistant .avatar {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
}
.bubble-wrap {
  max-width: 78%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.chat-message.user .bubble-wrap {
  align-items: flex-end;
}
.tool-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tool-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.1);
  color: #1e40af;
  border: 1px solid rgba(59, 130, 246, 0.3);
}
.tool-chip.running {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.35);
}
.tool-chip .tool-icon {
  font-size: 12px;
}
.bubble {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}
.chat-message.user .bubble {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff;
  border-top-right-radius: 4px;
}
.chat-message.assistant .bubble {
  background: #dbeafe;
  color: #1e293b;
  border: 1px solid #93c5fd;
  border-top-left-radius: 4px;
}
.bubble.empty {
  color: #64748b;
  font-style: italic;
}
.cursor {
  display: inline-block;
  margin-left: 2px;
  animation: blink 1s step-start infinite;
  color: #2563eb;
}
@keyframes blink {
  50% { opacity: 0; }
}

/* markdown 样式（浅蓝底气泡，深色文字） */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 12px 0 6px;
  font-weight: 600;
  color: #1e3a8a;
}
.markdown-body :deep(h1) { font-size: 18px; }
.markdown-body :deep(h2) { font-size: 16px; }
.markdown-body :deep(h3) { font-size: 15px; }
.markdown-body :deep(p) { margin: 6px 0; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { margin: 6px 0; padding-left: 22px; }
.markdown-body :deep(li) { margin: 2px 0; }
.markdown-body :deep(strong) { color: #1d4ed8; font-weight: 600; }
.markdown-body :deep(code) {
  background: #e0e7ff;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
  color: #3730a3;
}
.markdown-body :deep(pre) {
  background: #1e293b;
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}
.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: #e2e8f0;
}
.markdown-body :deep(blockquote) {
  border-left: 3px solid #3b82f6;
  margin: 6px 0;
  padding: 2px 12px;
  color: #475569;
}
.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
  display: block;
  overflow-x: auto;
  max-width: 100%;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #93c5fd;
  padding: 4px 8px;
}
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #93c5fd;
  margin: 10px 0;
}

@media (max-width: 768px) {
  .chat-message {
    gap: 8px;
    margin-bottom: 16px;
  }

  .avatar {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }

  .bubble-wrap {
    max-width: 88%;
  }

  .bubble {
    padding: 10px 12px;
    font-size: 14px;
    line-height: 1.6;
  }

  .markdown-body :deep(h1) { font-size: 16px; }
  .markdown-body :deep(h2) { font-size: 15px; }
  .markdown-body :deep(h3) { font-size: 14px; }
  .markdown-body :deep(ul),
  .markdown-body :deep(ol) { padding-left: 16px; }
}
</style>
