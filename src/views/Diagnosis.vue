<template>
  <div class="diagnosis-container">
    <!-- Form Card -->
    <div class="page-card search-card">
      <h2 class="page-title">
        <el-icon><Cpu /></el-icon> AI 智能诊断
      </h2>
      <el-form :inline="true" :model="form" class="search-form">
        <el-form-item label="代码">
          <el-input
            v-model="form.code"
            placeholder="例如: 600519 / 000001"
            clearable
            style="width: 220px;"
            @keyup.enter="handleAnalyze"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio-button label="stock">股票</el-radio-button>
            <el-radio-button label="fund">基金</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            icon="Search"
            @click="handleAnalyze"
          >
            开始诊断
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Loading / Progress Steps Card -->
    <div v-if="loading || currentStep > 0" class="page-card progress-card">
      <h3>分析进度</h3>
      <div class="steps-wrapper">
        <el-steps :active="currentStep" finish-status="success" align-center>
          <el-step title="拉取行情数据" :description="progressLogs[0] || '等待中...'" />
          <el-step title="模型诊断分析" :description="progressLogs[1] || '等待中...'" />
          <el-step title="风险指标评估" :description="progressLogs[2] || '等待中...'" />
        </el-steps>
      </div>
      <!-- Live Progress Text Console -->
      <div class="live-console" v-if="loading || (currentStep > 0 && !reportGenerated)">
        <div class="console-title">实时分析日志 (SSE 接收状态)：</div>
        <div class="console-body">
          <p v-for="(log, idx) in consoleLogs" :key="idx" class="console-line">
            <span class="console-time">[{{ formatTime() }}]</span> {{ log }}
          </p>
          <p class="console-line active-line" v-if="loading">
            <span class="blink">_</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Diagnosis Report Card -->
    <div v-if="reportGenerated" class="page-card report-card">
      <div class="report-header">
        <div class="report-meta">
          <span class="report-badge">{{ isFund ? '基金诊断报告' : '股票诊断报告' }}</span>
          <span class="report-name">{{ report.name || lastQueryCode }}</span>
          <span class="report-code">{{ lastQueryCode }}</span>
        </div>
        <el-button type="success" plain icon="Download" size="small" @click="exportReport">导出报告</el-button>
      </div>

      <!-- ===== 基金诊断：蚂蚁财富 5 段结构 ===== -->
      <template v-if="isFund">
        <!-- 核心诊断（置顶醒目） -->
        <div class="core-diagnosis-block" v-if="report.core_diagnosis">
          <div class="section-title"><el-icon><Star /></el-icon> 核心诊断</div>
          <div class="core-text">{{ report.core_diagnosis }}</div>
        </div>

        <!-- 业绩与波动 -->
        <div class="full-section performance-block" v-if="report.performance_volatility">
          <div class="section-title"><el-icon><TrendCharts /></el-icon> 业绩与波动</div>
          <div class="section-text">{{ cleanTable(report.performance_volatility) }}</div>
        </div>

        <!-- 持仓分析 -->
        <div class="full-section" v-if="report.holdings_analysis">
          <div class="section-title"><el-icon><PieChart /></el-icon> 持仓分析</div>
          <div class="section-text">{{ cleanTable(report.holdings_analysis) }}</div>
        </div>

        <!-- 费率与交易规则 -->
        <div class="full-section fee-block" v-if="report.fee_and_trading">
          <div class="section-title"><el-icon><Tickets /></el-icon> 费率与交易规则</div>
          <div class="section-text">{{ report.fee_and_trading }}</div>
        </div>

        <!-- 风险提示 -->
        <div class="full-section risk-block" v-if="report.risk_analysis">
          <div class="section-title"><el-icon><WarningFilled /></el-icon> 风险提示</div>
          <div class="section-text">{{ report.risk_analysis }}</div>
        </div>

        <!-- 投资建议与观察点 -->
        <div class="full-section advice-block" v-if="report.investment_advice">
          <div class="section-title"><el-icon><Aim /></el-icon> 投资建议与观察点</div>
          <div class="section-text">{{ report.investment_advice }}</div>
        </div>
      </template>

      <!-- ===== 股票诊断：7 维度结构（保持不变） ===== -->
      <template v-else>
        <!-- 一句话总结 (TL;DR) -->
        <div class="summary-section" v-if="report.summary">
          <div class="section-title"><el-icon><InfoFilled /></el-icon> 一句话总结</div>
          <div class="summary-text">{{ report.summary }}</div>
        </div>

        <!-- 公司业务概述 -->
        <div class="full-section" v-if="report.business_overview">
          <div class="section-title"><el-icon><OfficeBuilding /></el-icon> 公司业务概述</div>
          <div class="section-text">{{ report.business_overview }}</div>
        </div>

        <div class="report-grid">
          <!-- Fundamental Card -->
          <el-card shadow="never" class="grid-card">
            <template #header>
              <div class="card-header">
                <el-icon class="icon-fundamental"><TrendCharts /></el-icon>
                <span>基本面分析 (Fundamental)</span>
              </div>
            </template>
            <div class="card-content markdown-body">{{ report.fundamental || '暂无基本面分析数据' }}</div>
          </el-card>

          <!-- Technical Card -->
          <el-card shadow="never" class="grid-card">
            <template #header>
              <div class="card-header">
                <el-icon class="icon-technical"><DataLine /></el-icon>
                <span>技术面分析 (Technical)</span>
              </div>
            </template>
            <div class="card-content markdown-body">{{ report.technical || '暂无技术面分析数据' }}</div>
          </el-card>
        </div>

        <!-- 资金面分析 -->
        <div class="full-section" v-if="report.capital_flow">
          <div class="section-title"><el-icon><Money /></el-icon> 资金面分析</div>
          <div class="section-text">{{ report.capital_flow }}</div>
        </div>

        <!-- 综合诊断 -->
        <div class="full-section" v-if="report.comprehensive">
          <div class="section-title"><el-icon><DataAnalysis /></el-icon> 综合诊断</div>
          <div class="section-text">{{ report.comprehensive }}</div>
        </div>

        <!-- 风险提示 -->
        <div class="full-section risk-block" v-if="report.risk_analysis">
          <div class="section-title"><el-icon><WarningFilled /></el-icon> 风险提示</div>
          <div class="section-text">{{ report.risk_analysis }}</div>
        </div>

        <!-- 实操参考 -->
        <div class="full-section advice-block" v-if="report.practical_advice">
          <div class="section-title"><el-icon><Aim /></el-icon> 实操参考</div>
          <div class="section-text">{{ report.practical_advice }}</div>
        </div>
      </template>

      <!-- Risk Level Card (共用) -->
      <div class="risk-section">
        <div class="risk-label">系统评估风险等级：</div>
        <el-tag :type="getRiskTagType(report.risk_level)" effect="dark" size="large" class="risk-tag">
          {{ report.risk_level || '未知风险' }}
        </el-tag>
      </div>
    </div>

    <!-- Empty State -->
    <el-empty
      v-if="!loading && !reportGenerated"
      description="请输入股票或基金代码，点击开始诊断按钮进行 AI 分析"
      :image-size="120"
    />

    <!-- Sticky Bottom Disclaimer -->
    <footer class="disclaimer-footer">
      <div class="disclaimer-content">
        <el-icon class="disclaimer-icon"><Warning /></el-icon>
        <strong>免责声明：</strong>
        <span>{{ reportGenerated && report.disclaimer ? report.disclaimer : '本报告由 FinPilot AI 智能分析系统基于公开市场数据生成，仅供参考和学习讨论，不构成任何投资建议、收益承诺或交易指令。投资者据此操作，风险自担。市场有风险，投资需谨慎。' }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const form = reactive({
  code: '',
  type: 'stock'
})

const loading = ref(false)
const currentStep = ref(0)
const reportGenerated = ref(false)
const lastQueryCode = ref('')

const progressLogs = ref(['', '', ''])
const consoleLogs = ref([])

const report = reactive({
  // 标记：股票 or 基金
  target_type: 'stock',
  // 股票字段
  name: '',
  summary: '',
  business_overview: '',
  fundamental: '',
  technical: '',
  capital_flow: '',
  comprehensive: '',
  risk_analysis: '',
  practical_advice: '',
  risk_level: '',
  disclaimer: '',
  // 基金字段
  core_diagnosis: '',
  performance_volatility: '',
  holdings_analysis: '',
  fee_and_trading: '',
  investment_advice: '',
})

const isFund = computed(() => report.target_type === 'fund')

// 剥离 markdown 表格分隔行（如 |------|----------|------|），只保留表头与数据行
// 前端用纯文本渲染，分隔行只有 | - : 空白、无中文/字母/数字，影响美观故剔除
const cleanTable = (text) => {
  if (!text) return ''
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return true // 保留空行
      // 分隔行：由 | - : 空白 组成，且不含任何中文字母数字
      const isSeparator = /^[\s:|-]+$/.test(trimmed) && !/[一-龥a-zA-Z0-9]/.test(trimmed)
      return !isSeparator
    })
    .join('\n')
}

const formatTime = () => {
  const now = new Date()
  return now.toTimeString().split(' ')[0]
}

const getRiskTagType = (risk) => {
  if (!risk) return 'info'
  if (risk.includes('低')) return 'success'
  if (risk.includes('中')) return 'warning'
  if (risk.includes('高')) return 'danger'
  return 'danger'
}

// Parse standard SSE block content helper
const parseSseMessage = (messageEvent, messageData) => {
  let parsed = null
  try {
    parsed = JSON.parse(messageData)
  } catch (e) {
    // Silent fail for non-JSON content
  }

  // Handle error events emitted by the backend
  if (messageEvent === 'error') {
    const errInfo = parsed || {}
    const errMsg = errInfo.message || messageData
    const errNode = errInfo.node ? `[节点: ${errInfo.node}] ` : ''
    consoleLogs.value.push(`[ERROR] ${errNode}${errMsg}`)
    ElMessage.error(`后端诊断失败: ${errNode}${errMsg}`)
    loading.value = false
    return
  }

  // Handle node complete step states
  if (messageEvent === 'node_complete' || (parsed && parsed.node)) {
    const nodeInfo = parsed || JSON.parse(messageData)
    if (nodeInfo.node === 'fetch_data') {
      currentStep.value = 1
      progressLogs.value[0] = '数据拉取完成'
      progressLogs.value[1] = '开始大模型诊断分析...'
      consoleLogs.value.push('【节点完成】 fetch_data: 行情数据已拉取成功。')
    } else if (nodeInfo.node === 'analyze') {
      currentStep.value = 2
      progressLogs.value[1] = '模型分析完成'
      progressLogs.value[2] = '开始评估风险指标...'
      consoleLogs.value.push('【节点完成】 analyze: 大模型已生成评估见解。')
    } else if (nodeInfo.node === 'risk_check') {
      currentStep.value = 3
      progressLogs.value[2] = '风险评估完成'
      consoleLogs.value.push('【节点完成】 risk_check: 负面及风险指标计算完成。')
    }
  }
  // Handle diagnosis result block
  else if (messageEvent === 'analysis_result' || (parsed && (parsed.one_sentence_summary || parsed.fundamental_analysis || parsed.technical_analysis || parsed.business_overview || parsed.core_diagnosis || parsed.performance_volatility))) {
    const res = parsed || JSON.parse(messageData)

    // 推断类型：有 core_diagnosis 或 performance_volatility → 基金，否则 → 股票
    const detectedType = (res.core_diagnosis || res.performance_volatility || res.holdings_analysis || res.fee_and_trading) ? 'fund' : 'stock'
    report.target_type = detectedType

    // 共用字段
    report.name = res.name || ''
    report.risk_analysis = res.risk_analysis || ''
    report.risk_level = res.risk_level || ''
    report.disclaimer = res.disclaimer || ''

    if (detectedType === 'fund') {
      // 基金字段映射
      report.core_diagnosis = res.core_diagnosis || ''
      report.performance_volatility = res.performance_volatility || ''
      report.holdings_analysis = res.holdings_analysis || ''
      report.fee_and_trading = res.fee_and_trading || ''
      report.investment_advice = res.investment_advice || ''
    } else {
      // 股票字段映射（保持兼容新旧字段名）
      report.summary = res.one_sentence_summary || res.summary || ''
      report.business_overview = res.business_overview || ''
      report.fundamental = res.fundamental_analysis || res.fundamental || ''
      report.technical = res.technical_analysis || res.technical || ''
      report.capital_flow = res.capital_flow_analysis || ''
      report.comprehensive = res.comprehensive_diagnosis || ''
      report.practical_advice = res.practical_advice || ''
    }

    reportGenerated.value = true
    currentStep.value = 3
    progressLogs.value[2] = '报告已生成'
    consoleLogs.value.push(`【数据加载】 ${detectedType === 'fund' ? '基金' : '股票'}诊断报告解析成功！`)
  }
  // Raw plain text
  else {
    consoleLogs.value.push(`【数据片段】: ${messageData}`)
    if (!report.summary && !report.core_diagnosis) {
      report.summary = messageData
      reportGenerated.value = true
    } else if (isFund.value) {
      report.core_diagnosis += '\n' + messageData
    } else {
      report.summary += '\n' + messageData
    }
  }
}

const handleAnalyze = async () => {
  if (!form.code.trim()) {
    ElMessage.warning('请输入股票或基金代码')
    return
  }

  // 6 位数字格式 + 联网验证代码真实存在（参考持仓 /api/portfolio/validate）
  if (!/^\d{6}$/.test(form.code.trim())) {
    ElMessage.warning('证券代码必须是 6 位数字')
    return
  }
  try {
    const res = await request.get('/api/diagnosis/validate', {
      params: { code: form.code.trim(), type: form.type },
    })
    const d = res.data?.data || res.data
    if (!d.valid) {
      ElMessage.warning(d.message || '代码无效，请检查')
      return
    }
  } catch (e) {
    ElMessage.error('代码校验失败：' + (e.response?.data?.msg || e.message))
    return
  }

  // Reset states
  loading.value = true
  currentStep.value = 1
  reportGenerated.value = false
  lastQueryCode.value = form.code.toUpperCase()
  progressLogs.value = ['正在拉取实时行情...', '等待开始...', '等待开始...']
  consoleLogs.value = ['已发起诊断请求，正在与后端建立连接...']

  // Reset all report fields
  report.target_type = form.type
  report.name = ''
  report.summary = ''
  report.business_overview = ''
  report.fundamental = ''
  report.technical = ''
  report.capital_flow = ''
  report.comprehensive = ''
  report.risk_analysis = ''
  report.practical_advice = ''
  report.risk_level = ''
  report.disclaimer = ''
  report.core_diagnosis = ''
  report.performance_volatility = ''
  report.holdings_analysis = ''
  report.fee_and_trading = ''
  report.investment_advice = ''

  try {
    const response = await fetch('/api/diagnosis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: form.code.trim(),
        type: form.type
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP 错误！状态码: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    consoleLogs.value.push('连接成功，开始读取 SSE 报文...')

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Split buffer by double newline characters representing SSE message blocks
      const messages = buffer.split(/\n\n|\r\n\r\n/)
      buffer = messages.pop() || '' // Keep trailing incomplete message in buffer

      for (const message of messages) {
        const lines = message.split(/\n|\r\n/)
        let messageEvent = ''
        let dataBuffer = []

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('event:')) {
            messageEvent = trimmed.substring(6).trim()
          } else if (trimmed.startsWith('data:')) {
            const dataVal = trimmed.substring(5).trim()
            dataBuffer.push(dataVal)
          }
        }

        // Parse and handle complete message data
        if (dataBuffer.length > 0) {
          const messageData = dataBuffer.join('\n')
          parseSseMessage(messageEvent, messageData)
        }
      }
    }

    // Process leftover buffer in case there is no final \n\n
    if (buffer.trim()) {
      const lines = buffer.split(/\n|\r\n/)
      let messageEvent = ''
      let dataBuffer = []

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed.startsWith('event:')) {
          messageEvent = trimmed.substring(6).trim()
        } else if (trimmed.startsWith('data:')) {
          const dataVal = trimmed.substring(5).trim()
          dataBuffer.push(dataVal)
        }
      }

      if (dataBuffer.length > 0) {
        const messageData = dataBuffer.join('\n')
        parseSseMessage(messageEvent, messageData)
      }
    }

    loading.value = false
    consoleLogs.value.push('连接已断开，数据流处理完毕。')

  } catch (error) {
    console.error(error)
    ElMessage.error(`分析请求失败: ${error.message}`)
    consoleLogs.value.push(`[ERROR] 诊断异常中断: ${error.message}`)
    loading.value = false
  }
}

const exportReport = () => {
  const fundTitle = report.name ? `${report.name} (${lastQueryCode.value})` : lastQueryCode.value

  if (isFund.value) {
    const content = `FinPilot AI 基金诊断报告 ${fundTitle}
=======================================
【核心诊断】：
${report.core_diagnosis}

---------------------------------------
【业绩与波动】：
${report.performance_volatility}

---------------------------------------
【持仓分析】：
${report.holdings_analysis}

---------------------------------------
【费率与交易规则】：
${report.fee_and_trading}

---------------------------------------
【风险提示】：
${report.risk_analysis}

---------------------------------------
【投资建议与观察点】：
${report.investment_advice}

---------------------------------------
【系统评估风险等级】：
${report.risk_level}

=======================================
【免责声明】：
${report.disclaimer || '本报告由 AI 自动生成，不构成投资建议。'}
`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `FinPilot_FundDiagnosis_${lastQueryCode.value}.txt`
    link.click()
    URL.revokeObjectURL(url)
  } else {
    const content = `FinPilot AI 股票诊断报告 ${fundTitle}
=======================================
【一句话总结】：
${report.summary}

---------------------------------------
【公司业务概述】：
${report.business_overview}

---------------------------------------
【基本面分析】：
${report.fundamental}

---------------------------------------
【技术面分析】：
${report.technical}

---------------------------------------
【资金面分析】：
${report.capital_flow}

---------------------------------------
【综合诊断】：
${report.comprehensive}

---------------------------------------
【风险提示】：
${report.risk_analysis}

---------------------------------------
【实操参考】：
${report.practical_advice}

---------------------------------------
【系统评估风险等级】：
${report.risk_level}

=======================================
【免责声明】：
${report.disclaimer || '本报告由 AI 自动生成，不构成投资建议。'}
`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `FinPilot_StockDiagnosis_${lastQueryCode.value}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }
}
</script>

<style scoped>
.diagnosis-container {
  padding-bottom: 80px; /* Leave room for sticky disclaimer footer */
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  margin-top: 15px;
}

.steps-wrapper {
  padding: 24px 0;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
}

.live-console {
  background-color: #1e293b;
  border-radius: 6px;
  padding: 16px;
  color: #38bdf8;
  font-family: var(--mono, monospace);
  font-size: 13px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #334155;
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6);
}

.console-title {
  color: #94a3b8;
  margin-bottom: 8px;
  font-weight: bold;
}

.console-line {
  margin-bottom: 4px;
  line-height: 1.6;
}

.console-time {
  color: #64748b;
}

.active-line {
  display: inline-block;
  background-color: #38bdf8;
  width: 8px;
  height: 15px;
  vertical-align: middle;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  from, to { background-color: transparent }
  50% { background-color: #38bdf8 }
}

.report-card {
  border-top: 4px solid var(--primary-color);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-color);
}

.report-badge {
  background-color: #eff6ff;
  color: var(--primary-color);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: bold;
  margin-right: 8px;
}

.report-name {
  font-size: 16px;
  font-weight: bold;
  color: #1e3a8a;
  margin-right: 8px;
}

.report-code {
  font-size: 14px;
  font-weight: normal;
  color: #64748b;
}

.summary-section {
  background-color: #f8fafc;
  border: 1px solid var(--border-color);
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  line-height: 1.6;
}

/* 通用的全宽内容区块 */
.full-section {
  background-color: #f8fafc;
  border: 1px solid var(--border-color);
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  line-height: 1.8;
}

.full-section.risk-block {
  background-color: #fef2f2;
  border-color: #fecaca;
}

.full-section.advice-block {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
}

/* 基金专用样式 */

/* 核心诊断块：大字号、醒目置顶 */
.core-diagnosis-block {
  background-color: #eff6ff;
  border: 2px solid #3b82f6;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  line-height: 1.8;
}

.core-diagnosis-block .section-title {
  font-size: 18px;
  color: #1e3a8a;
}

.core-text {
  font-size: 16px;
  color: #1e3a8a;
  font-weight: 500;
}

/* 业绩与波动块：带淡色背景标识 */
.full-section.performance-block {
  background-color: #f0f9ff;
  border-color: #bae6fd;
}

.full-section.performance-block .section-title {
  color: #0369a1;
}

/* 费率与交易规则块：浅灰/淡橙背景 */
.full-section.fee-block {
  background-color: #fefce8;
  border-color: #fde68a;
}

.full-section.fee-block .section-title {
  color: #a16207;
}

.section-title {
  font-weight: bold;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.full-section.risk-block .section-title {
  color: #b91c1c;
}

.full-section.advice-block .section-title {
  color: #15803d;
}

.section-text {
  font-size: 14px;
  color: #475569;
  white-space: pre-wrap; /* 保留换行 */
}

.summary-text {
  font-size: 14px;
  color: #475569;
}

.report-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.grid-card {
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  align-items: center;
  font-weight: bold;
  color: #334155;
}

.card-header .el-icon {
  font-size: 18px;
  margin-right: 6px;
}

.icon-fundamental {
  color: #3b82f6;
}

.icon-technical {
  color: #f59e0b;
}

.card-content {
  font-size: 14px;
  line-height: 1.8;
  color: #475569;
  white-space: pre-wrap; /* Preserve formatting */
}

.risk-section {
  display: flex;
  align-items: center;
  background-color: #f8fafc;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.risk-label {
  font-weight: bold;
  font-size: 15px;
  color: #334155;
}

.risk-tag {
  font-weight: bold;
  letter-spacing: 1px;
}

.disclaimer-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 12px 24px;
  z-index: 999;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
}

.disclaimer-content {
  max-width: 1280px;
  margin: 0 auto;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  line-height: 1.6;
}

.disclaimer-icon {
  font-size: 16px;
  color: #eab308;
  margin-right: 8px;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .report-grid {
    grid-template-columns: 1fr;
  }
}
</style>
