<template>
  <div class="chat-layout">
    <!-- 会话侧边栏 -->
    <aside class="conv-sidebar">
      <div class="sidebar-top">
        <el-button class="new-conv-btn" @click="newConversation" :disabled="loading">
          <el-icon><Plus /></el-icon>
          <span>新对话</span>
        </el-button>
      </div>
      <div class="conv-list">
        <div v-if="!conversations.length" class="conv-empty">暂无会话</div>
        <div
          v-for="c in conversations"
          :key="c.id"
          class="conv-item"
          :class="{ active: c.id === conversationId }"
          @click="switchConversation(c.id)"
        >
          <el-icon class="conv-icon"><ChatLineRound /></el-icon>
          <span class="conv-title">{{ c.title || '新对话' }}</span>
          <el-icon class="conv-edit" @click.stop="renameConversation(c)"><Edit /></el-icon>
          <el-icon class="conv-del" @click.stop="deleteConversation(c)"><Delete /></el-icon>
        </div>
      </div>
    </aside>

    <div class="chat-page">
    <!-- 顶栏：标题 -->
    <div class="chat-header">
      <div class="title-area">
        <el-icon class="title-icon"><ChatLineRound /></el-icon>
        <span class="title">FinPilot AI 助手</span>
        <span class="subtitle">分析持仓 · 诊断股基 · 解读财报 · 联网查询 · 闲聊</span>
      </div>
    </div>

    <!-- 消息区 -->
    <div ref="messagesRef" class="messages">
      <div v-if="!messages.length" class="empty-hint">
        <el-icon class="empty-icon"><ChatLineRound /></el-icon>
        <p>你好，我是 FinPilot AI 助手。</p>
        <p class="muted">可以直接和我聊天，或点下方按钮使用分析持仓 / 诊断 / 财报解读等功能。</p>
      </div>
      <ChatMessage
        v-for="(m, i) in messages"
        :key="i"
        :role="m.role"
        :content="m.content"
        :streaming="m.streaming"
        :tools="m.tools"
      />
    </div>

    <!-- 快捷按钮 -->
    <div class="quick-actions">
      <el-button size="small" round @click="quickMarketHotspots" :disabled="loading">
        <el-icon><TrendCharts /></el-icon><span>今日热点</span>
      </el-button>
      <el-button size="small" round @click="quickAnalyzePortfolio" :disabled="loading">
        <el-icon><Briefcase /></el-icon><span>分析我的持仓</span>
      </el-button>
      <el-button size="small" round @click="diagnosisDialog = true" :disabled="loading">
        <el-icon><Search /></el-icon><span>诊断基金/股票</span>
      </el-button>
      <el-button size="small" round @click="reportDialog = true" :disabled="loading">
        <el-icon><Document /></el-icon><span>分析财报</span>
      </el-button>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <textarea
        ref="textareaRef"
        v-model="input"
        class="input-box"
        rows="2"
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        @keydown.enter.exact.prevent="onEnter"
        :disabled="loading"
      ></textarea>
      <el-button
        type="primary"
        class="send-btn"
        :loading="loading"
        :disabled="!input.trim()"
        @click="onSend"
      >
        <el-icon v-if="!loading"><Promotion /></el-icon>
        <span>发送</span>
      </el-button>
    </div>

    <!-- 诊断对话框 -->
    <el-dialog v-model="diagnosisDialog" title="诊断基金/股票" width="420px">
      <el-form label-width="84px">
        <el-form-item label="类型">
          <el-radio-group v-model="diagForm.type">
            <el-radio value="stock">股票</el-radio>
            <el-radio value="fund">基金</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="代码/名称">
          <el-input v-model="diagForm.code" placeholder="如 600519 / 贵州茅台" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="diagnosisDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!diagForm.code.trim()" @click="confirmDiagnosis">开始诊断</el-button>
      </template>
    </el-dialog>

    <!-- 分析财报对话框 -->
    <el-dialog v-model="reportDialog" title="分析财报" width="440px">
      <el-form label-width="80px">
        <el-form-item label="股票名称" required>
          <el-input v-model="reportForm.name" placeholder="如 贵州茅台" />
        </el-form-item>
        <el-form-item label="股票代码" required>
          <el-input v-model="reportForm.code" placeholder="6 位数字，如 600519" />
        </el-form-item>
        <el-form-item label="财报上传">
          <div class="report-upload-row">
            <el-button @click="openUploadFromReport">
              <el-icon><Upload /></el-icon><span>上传PDF</span>
            </el-button>
            <span class="upload-suggest">如要保证财报准确性，建议上传财报</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!reportForm.name.trim() || !/^\d{6}$/.test(reportForm.code.trim())" @click="confirmReportAnalyze">
          开始分析
        </el-button>
      </template>
    </el-dialog>

    <!-- 上传财报对话框（复用组件，表单含文件/代码/年份/季度） -->
    <ReportUploadDialog
      v-model="uploadDialog"
      :initial-code="reportForm.code"
      :upload-fn="chatUploadFn"
      @success="onUploadSuccess"
    />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatLineRound, Plus, Briefcase, Search, Upload, Promotion, Delete, Edit, Document, TrendCharts,
} from '@element-plus/icons-vue'
import ChatMessage from '../components/ChatMessage.vue'
// 流式 SSE 在开发期绕开 Vite 代理直连后端：http-proxy 会把 SSE 响应缓冲到整批
// 才转发，导致 token "一口气"出现而非逐字。直连 8094（CORS 已放行 8093）即可逐块。
// 生产环境走 nginx（后端已设 X-Accel-Buffering: no），用相对地址。
const API_BASE = import.meta.env.DEV ? 'http://localhost:8094' : ''
import ReportUploadDialog from '../components/ReportUploadDialog.vue'
import { streamSSE } from '../utils/sse'
import request from '../utils/request'
import { getToken } from '../utils/auth'

const messages = ref([])
const input = ref('')
const loading = ref(false)
const messagesRef = ref(null)
const textareaRef = ref(null)
// conversationId: int | null。null 表示"新对话"（尚未发送，未落库）。
const conversationId = ref(null)
const conversations = ref([])

const diagnosisDialog = ref(false)
const diagForm = ref({ type: 'stock', code: '' })

const reportDialog = ref(false)
const reportForm = ref({ name: '', code: '' })

const uploadDialog = ref(false)

const CONV_KEY = 'finpilot_conversation'

function newConversation() {
  // 不删除已保存的会话，只是切到一个空白新对话；发送首条消息时后端会落库新会话。
  conversationId.value = null
  localStorage.removeItem(CONV_KEY)
  messages.value = []
}

async function loadConversations() {
  try {
    const res = await request.get('/api/chat/conversations')
    const d = res.data?.data || res.data
    conversations.value = Array.isArray(d) ? d : []
  } catch {
    // 静默失败：列表加载失败不应阻塞对话
  }
}

async function switchConversation(id) {
  if (loading.value || id === conversationId.value) return
  try {
    const res = await request.get(`/api/chat/conversations/${id}/messages`)
    const d = res.data?.data || res.data
    messages.value = (Array.isArray(d) ? d : []).map((m) => ({
      role: m.role,
      content: m.content,
      streaming: false,
      tools: [],
    }))
    conversationId.value = id
    localStorage.setItem(CONV_KEY, String(id))
    scrollToEnd()
  } catch (e) {
    ElMessage.error('加载会话失败：' + (e.response?.data?.msg || e.message))
  }
}

async function deleteConversation(c) {
  try {
    // 删除是不可逆的（连同消息一起 CASCADE 删），先二次确认，防误触。
    await ElMessageBox.confirm(
      `确定删除会话「${c.title || '新对话'}」吗？该会话的全部消息也会一并删除，且无法恢复。`,
      '删除会话',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )
  } catch (e) {
    // 用户点取消，不打扰
    return
  }
  try {
    await request.delete(`/api/chat/conversations/${c.id}`)
    // 若删的是当前会话，回到空白新对话
    if (c.id === conversationId.value) {
      newConversation()
    }
    await loadConversations()
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error('删除失败：' + (e.response?.data?.msg || e.message))
  }
}

async function renameConversation(c) {
  try {
    const { value } = await ElMessageBox.prompt('会话名称', '重命名会话', {
      inputValue: c.title || '新对话',
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValidator: (v) => (v && v.trim() ? true : '名称不能为空'),
    })
    await request.patch(`/api/chat/conversations/${c.id}`, { title: value.trim() })
    await loadConversations()
  } catch (e) {
    // 用户点取消时 ElMessageBox reject 的是 'cancel'，不算错误，不弹 toast
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error('重命名失败：' + (e?.response?.data?.msg || e?.message || e))
    }
  }
}

function scrollToEnd() {
  nextTick(() => {
    const el = messagesRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function send(text) {
  const content = (text || '').trim()
  if (!content || loading.value) return
  input.value = ''
  // 用户气泡
  messages.value.push({ role: 'user', content, streaming: false, tools: [] })
  // assistant 占位：必须用 reactive() 包，否则下面 assistant.content += 改的是
  // 原始对象、绕过 Vue 的 proxy setter，不触发响应式——界面只在 loading 变化时
  // 才重渲染，导致 token 攒到最后一次性刷出（"一口气"现象）。
  const assistant = reactive({ role: 'assistant', content: '', streaming: true, tools: [] })
  messages.value.push(assistant)
  loading.value = true
  scrollToEnd()

  try {
    await streamSSE(
      `${API_BASE}/api/chat`,
      { message: content, conversation_id: conversationId.value || null },
      (ev, data) => {
        if (ev === 'start') {
          if (data && data.conversation_id) {
            const isNew = !conversationId.value
            conversationId.value = data.conversation_id
            localStorage.setItem(CONV_KEY, String(data.conversation_id))
            if (isNew) loadConversations()
          }
        } else if (ev === 'token') {
          assistant.content += data.content || ''
          scrollToEnd()
        } else if (ev === 'tool_start') {
          assistant.tools.push({ tool: data.tool, done: false })
          scrollToEnd()
        } else if (ev === 'tool_end') {
          for (let i = assistant.tools.length - 1; i >= 0; i--) {
            if (assistant.tools[i].tool === data.tool && !assistant.tools[i].done) {
              assistant.tools[i].done = true
              break
            }
          }
        } else if (ev === 'done') {
          assistant.streaming = false
        } else if (ev === 'error') {
          assistant.content += `\n\n> ⚠️ ${data.message || '生成失败'}`
          assistant.streaming = false
        }
      }
    )
  } catch (e) {
    assistant.content += `\n\n> ⚠️ 请求失败：${e.message}`
  } finally {
    assistant.streaming = false
    loading.value = false
    scrollToEnd()
  }
}

function onSend() {
  send(input.value)
}

function onEnter() {
  send(input.value)
}

function quickAnalyzePortfolio() {
  send('请分析我的当前持仓组合，看看是否合理')
}

function quickMarketHotspots() {
  send('请总结今日A股市场热点，包括涨幅榜板块、涨停股情况和大盘资金流向')
}

async function confirmDiagnosis() {
  const code = diagForm.value.code.trim()
  if (!code) return
  // 只做前端非空校验：输入可以是 6 位代码或名称。后端 diagnose 工具会自动
  // 解析名称→代码；查不到 agent 会回复"未找到"。不再预先联网验真，避免拖慢体验。
  const typeLabel = diagForm.value.type === 'fund' ? '基金' : '股票'
  diagnosisDialog.value = false
  diagForm.value.code = ''
  send(`请帮我诊断${typeLabel} ${code}`)
}

function confirmReportAnalyze() {
  const name = reportForm.value.name.trim()
  const code = reportForm.value.code.trim()
  if (!name || !/^\d{6}$/.test(code)) {
    ElMessage.warning('请填写股票名称和 6 位代码')
    return
  }
  // 发给 agent，它会调 analyze_financial_report(code, name)：先查向量库财报新旧，
  // 决定要不要补联网搜索，没有就纯搜索 + 提示上传。
  reportDialog.value = false
  reportForm.value = { name: '', code: '' }
  send(`请分析${name}（${code}）的财报`)
}

// 从"分析财报"对话框里点"上传财报PDF"：先关分析框，再开上传框（上传流程不变）。
function openUploadFromReport() {
  reportDialog.value = false
  uploadDialog.value = true
}

// 上传财报：由 ReportUploadDialog 调用，打 /api/chat/upload（带会话 id，后端把
// report_id 绑到当前会话）。返回 { report_id, chunks_count, conversation_id }。
async function chatUploadFn({ file, code, year, quarter }) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('code', code)
  if (year) fd.append('year', String(year))
  if (quarter) fd.append('quarter', String(quarter))
  fd.append('conversation_id', conversationId.value ? String(conversationId.value) : '')
  const token = getToken()
  const resp = await fetch('/api/chat/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const json = await resp.json()
  if (!resp.ok || json.code !== 0) {
    throw new Error(json.msg || `上传失败（${resp.status}）`)
  }
  return json.data
}

function onUploadSuccess(data) {
  // 上传时若还没有会话，后端会新建一个并把 report_id 绑上去，同时回传
  // conversation_id；这里保存下来，保证后续 /api/chat 提问用的是同一会话，
  // 财报问答工具才能取到 active_report_id。
  if (data && data.conversation_id) {
    conversationId.value = data.conversation_id
    localStorage.setItem(CONV_KEY, String(data.conversation_id))
  }
  const rid = data && data.report_id
  const chunks = data && data.chunks_count
  messages.value.push({
    role: 'assistant',
    content: `✅ 财报已上传并解析完成（${rid}，共 ${chunks} 个片段）。\n\n现在你可以直接问我关于这份财报的问题，比如“毛利率趋势”“营收增长情况”“现金流如何”等。`,
    streaming: false,
    tools: [],
  })
  scrollToEnd()
  ElMessage.success('财报上传成功')
  loadConversations() // 上传可能新建了会话，刷新侧边栏
}

onMounted(async () => {
  await loadConversations()
  // 恢复上次会话：localStorage 里的 id 若仍在该用户的会话列表中，就切回去。
  const stored = localStorage.getItem(CONV_KEY)
  if (stored && /^\d+$/.test(stored)) {
    const id = Number(stored)
    if (conversations.value.some((c) => c.id === id)) {
      await switchConversation(id)
    } else {
      // 旧值（如重启前的内存 uuid、或已被删）作废
      localStorage.removeItem(CONV_KEY)
    }
  }
})
</script>

<style scoped>
.chat-layout {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  height: calc(100vh - 60px);
  box-sizing: border-box;
  padding: 0 16px;
}
.conv-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  background: #fff;
  display: flex;
  flex-direction: column;
  padding: 12px 10px;
}
.sidebar-top {
  margin-bottom: 10px;
}
.new-conv-btn {
  width: 100%;
}
.conv-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.conv-empty {
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
  margin-top: 20px;
}
.conv-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: #334155;
  font-size: 13px;
  transition: background 0.15s;
}
.conv-item:hover {
  background: #f1f5f9;
}
.conv-item.active {
  background: #e0edff;
  color: #1e40af;
  font-weight: 500;
}
.conv-icon {
  font-size: 14px;
  flex-shrink: 0;
  color: #64748b;
}
.conv-item.active .conv-icon {
  color: #1e40af;
}
.conv-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-del,
.conv-edit {
  font-size: 13px;
  color: #cbd5e1;
  flex-shrink: 0;
  display: none;
}
.conv-item:hover .conv-del,
.conv-item:hover .conv-edit {
  display: inline-flex;
}
.conv-del:hover {
  color: #dc2626;
}
.conv-edit:hover {
  color: #2563eb;
}

.chat-page {
  flex: 1;
  min-width: 0;
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}
.title-area {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.title-icon {
  font-size: 22px;
  color: #3b82f6;
  align-self: center;
}
.title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}
.subtitle {
  font-size: 12px;
  color: #64748b;
}
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 4px;
  background: #f8fafc;
  border-radius: 8px;
  margin: 12px 0;
}
.empty-hint {
  text-align: center;
  color: #64748b;
  margin-top: 60px;
}
.empty-hint .empty-icon {
  font-size: 40px;
  color: #cbd5e1;
}
.empty-hint p {
  margin-top: 12px;
  font-size: 15px;
}
.empty-hint .muted {
  font-size: 13px;
  color: #94a3b8;
}
.quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-bottom: 10px;
}
.quick-actions .el-button {
  background: #fff;
  border-color: #cbd5e1;
  color: #334155;
}
.quick-actions .el-button:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}
.input-area {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.input-box {
  flex: 1;
  resize: none;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  outline: none;
  max-height: 120px;
  background: #fff;
  color: #334155;
}
.input-box:focus {
  border-color: #3b82f6;
}
.send-btn {
  height: 44px;
}
.upload-file-name {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 6px;
  color: #334155;
  font-size: 13px;
}
.upload-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
.report-upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.upload-suggest {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.6;
}
</style>
