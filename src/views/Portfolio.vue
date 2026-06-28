<template>
  <div class="portfolio-container">
    <!-- Summary Header Cards -->
    <div class="summary-row">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="summary-label">总资产 (当前市值)</div>
            <div class="summary-value">¥ {{ formatDecimal(summaryData.totalMarketValue) }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="summary-label">持仓成本</div>
            <div class="summary-value">¥ {{ formatDecimal(summaryData.totalCost) }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="summary-label">持仓盈亏</div>
            <div :class="['summary-value', summaryData.totalPnl >= 0 ? 'text-rise' : 'text-fall']">
              {{ summaryData.totalPnl >= 0 ? '+' : '' }}{{ formatDecimal(summaryData.totalPnl) }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="summary-label">盈亏比例</div>
            <div :class="['summary-value', summaryData.totalPnlPct >= 0 ? 'text-rise' : 'text-fall']">
              {{ summaryData.totalPnlPct >= 0 ? '+' : '' }}{{ (summaryData.totalPnlPct * 100).toFixed(2) }}%
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- Main Table Card -->
    <div class="page-card table-card">
      <div class="table-actions">
        <h2 class="table-title">我的持仓列表</h2>
        <div class="btn-group">
          <el-button type="primary" icon="Plus" @click="openAddDialog">
            新增持仓
          </el-button>
        </div>
      </div>

      <el-table
        :data="holdings"
        stripe
        border
        style="width: 100%; margin-top: 15px;"
        v-loading="tableLoading"
      >
        <el-table-column prop="name" label="名称" align="center" width="130" />
        <el-table-column prop="code" label="代码" align="center" width="110">
          <template #default="scope">
            <el-tag size="small" type="info">{{ scope.row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" align="center" width="100">
          <template #default="scope">
            <el-tag size="small" :type="scope.row.type === 'stock' ? '' : 'warning'">
              {{ scope.row.type === 'stock' ? '股票' : '基金' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="shares" label="持仓量" align="right" />
        <el-table-column prop="cost_price" label="成本价" align="right">
          <template #default="scope">
            ¥ {{ formatDecimal(scope.row.cost_price) }}
          </template>
        </el-table-column>
        <el-table-column prop="latest_price" label="当前价" align="right">
          <template #default="scope">
            ¥ {{ formatDecimal(scope.row.latest_price) }}
          </template>
        </el-table-column>
        
        <!-- PNL Amount -->
        <el-table-column label="盈亏金额" align="right">
          <template #default="scope">
            <span :class="getPnlClass(scope.row.pnl)">
              {{ scope.row.pnl >= 0 ? '+' : '' }}{{ formatDecimal(scope.row.pnl) }}
            </span>
          </template>
        </el-table-column>

        <!-- PNL Ratio -->
        <el-table-column label="盈亏比例" align="right">
          <template #default="scope">
            <span :class="getPnlClass(scope.row.pnl_pct)">
              {{ scope.row.pnl_pct >= 0 ? '+' : '' }}{{ (scope.row.pnl_pct * 100).toFixed(2) }}%
            </span>
          </template>
        </el-table-column>

        <!-- Operations -->
        <el-table-column label="操作" align="center" width="160">
          <template #default="scope">
            <el-button size="small" icon="Edit" @click="openEditDialog(scope.row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" icon="Delete" @click="handleDelete(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Add/Edit Holding Dialog -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.mode === 'add' ? '新增持仓' : '编辑持仓'"
      width="450px"
      destroy-on-close
    >
      <el-form :model="dialog.form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="代码" prop="code">
          <el-input v-model="dialog.form.code" placeholder="例如: 600519" :disabled="dialog.mode === 'edit'" @blur="handleCodeBlur" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="dialog.form.name"
            :placeholder="dialog.form.type === 'stock' ? '输入代码后自动带出' : '例如: 沪深300ETF'"
            :disabled="dialog.mode === 'edit' || dialog.form.type === 'stock'"
          />
        </el-form-item>
        <el-form-item label="类型" prop="type" v-if="dialog.mode === 'add'">
          <el-select v-model="dialog.form.type" placeholder="请选择持仓资产类型" style="width: 100%;" @change="handleTypeChange">
            <el-option label="股票" value="stock" />
            <el-option label="基金" value="fund" />
          </el-select>
        </el-form-item>
        <el-form-item label="持仓量" prop="shares">
          <el-input-number v-model="dialog.form.shares" :min="1" :precision="0" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="成本价" prop="cost_price">
          <el-input-number v-model="dialog.form.cost_price" :min="0.001" :precision="4" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="dialog.submitting" @click="submitForm">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

// Holdings State
const holdings = ref([])
const tableLoading = ref(false)
const formRef = ref(null)

// Summary fields computed / fetched from server
const summaryData = reactive({
  totalCost: 0,
  totalMarketValue: 0,
  totalPnl: 0,
  totalPnlPct: 0
})

// Dialog State
const dialog = reactive({
  visible: false,
  mode: 'add',
  submitting: false,
  form: {
    id: null,
    code: '',
    name: '',
    type: 'stock',
    shares: 100,
    cost_price: 10.0
  }
})

// Validation Rules
const rules = {
  code: [{ required: true, message: '请输入持仓代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入持仓名称', trigger: 'blur' }],
  shares: [{ required: true, message: '请输入持仓数量', trigger: 'blur' }],
  cost_price: [{ required: true, message: '请输入成本价格', trigger: 'blur' }]
}

// Utilities
const formatDecimal = (val) => {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

const getPnlClass = (val) => {
  if (!val) return 'text-flat'
  return val > 0 ? 'text-rise' : 'text-fall'
}

// Fetch holdings
const fetchHoldings = async () => {
  tableLoading.value = true
  try {
    const res = await request.get('/api/portfolio')
    
    let rawData = null
    if (res.data && res.data.code === 0 && res.data.data) {
      rawData = res.data.data
    } else {
      rawData = res.data?.data || res.data
    }

    if (rawData) {
      holdings.value = rawData.rows || []
      
      // Update Summary Fields from server calculations
      summaryData.totalCost = rawData.total_cost ?? 0
      summaryData.totalMarketValue = rawData.total_market_value ?? 0
      summaryData.totalPnl = rawData.total_pnl ?? 0
      summaryData.totalPnlPct = rawData.total_pnl_pct ?? 0
    }
  } catch (error) {
    console.error(error)
    ElMessage.error(`获取持仓列表失败: ${error.message}`)
    
    // Setup dummy holdings matching the schema
    holdings.value = [
      { id: 1, name: '贵州茅台', code: '600519', type: 'stock', shares: 10, cost_price: 1500.0, latest_price: 1600.0, cost_value: 15000.0, market_value: 16000.0, pnl: 1000.0, pnl_pct: 0.0667 },
      { id: 2, name: '招商银行', code: '600036', type: 'stock', shares: 100, cost_price: 32.5, latest_price: 31.2, cost_value: 3250.0, market_value: 3120.0, pnl: -130.0, pnl_pct: -0.0400 }
    ]
    summaryData.totalCost = 18250.0
    summaryData.totalMarketValue = 19120.0
    summaryData.totalPnl = 870.0
    summaryData.totalPnlPct = 0.0477
  } finally {
    tableLoading.value = false
  }
}

// 代码失焦校验：股票自动带出名称（只读），基金不校验、名称手输
const handleCodeBlur = async () => {
  if (dialog.mode !== 'add' || dialog.form.type !== 'stock') return
  const code = dialog.form.code.trim()
  if (!code) return
  try {
    const res = await request.get('/api/portfolio/validate', { params: { code, type: 'stock' } })
    const d = res.data?.data || res.data
    if (d.valid) {
      dialog.form.name = d.name || ''
    } else {
      ElMessage.warning(d.message || '代码校验失败')
      dialog.form.name = ''
    }
  } catch (e) {
    ElMessage.error('代码校验出错: ' + (e.response?.data?.msg || e.message))
  }
}

// 切换类型时清空名称：股票等失焦自动带出，基金手输
const handleTypeChange = () => {
  dialog.form.name = ''
}

// Add/Edit trigger
const openAddDialog = () => {
  dialog.mode = 'add'
  dialog.form.id = null
  dialog.form.code = ''
  dialog.form.name = ''
  dialog.form.type = 'stock'
  dialog.form.shares = 10
  dialog.form.cost_price = 100.0
  dialog.visible = true
}

const openEditDialog = (row) => {
  dialog.mode = 'edit'
  dialog.form.id = row.id
  dialog.form.code = row.code
  dialog.form.name = row.name
  dialog.form.type = row.type
  dialog.form.shares = row.shares
  dialog.form.cost_price = row.cost_price
  dialog.visible = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    dialog.submitting = true
    try {
      if (dialog.mode === 'add') {
        const payload = {
          code: dialog.form.code.trim(),
          name: dialog.form.name.trim(),
          type: dialog.form.type,
          shares: Number(dialog.form.shares),
          cost_price: Number(dialog.form.cost_price),
        }
        await request.post('/api/portfolio', payload)
        ElMessage.success('持仓记录已新增')
      } else {
        // Edit Mode: PUT only accepts shares and cost_price per spec
        const payload = {
          shares: Number(dialog.form.shares),
          cost_price: Number(dialog.form.cost_price)
        }
        await request.put(`/api/portfolio/${dialog.form.id}`, payload)
        ElMessage.success('持仓记录已修改')
      }
      dialog.visible = false
      fetchHoldings()
    } catch (error) {
      console.error(error)
      const detail = error.response?.data?.data
      const msg = (Array.isArray(detail) && detail[0]?.msg) ? detail[0].msg : (error.response?.data?.msg || error.message)
      ElMessage.error(`操作失败: ${msg}`)
    } finally {
      dialog.submitting = false
    }
  })
}

const handleDelete = (id) => {
  ElMessageBox.confirm(
    '确定要删除此持仓记录吗？',
    '警告',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await request.delete(`/api/portfolio/${id}`)
      ElMessage.success('持仓记录已删除')
      fetchHoldings()
    } catch (error) {
      console.error(error)
      ElMessage.error(`删除失败: ${error.message}`)
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchHoldings()
})
</script>

<style scoped>
.portfolio-container {
  padding-bottom: 24px;
}

.summary-row {
  margin-bottom: 24px;
}

.summary-card {
  text-align: center;
  border-top: 3px solid var(--primary-color);
}

.summary-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
}

.summary-value {
  font-size: 20px;
  font-weight: bold;
  color: #1e293b;
}

.table-card {
  border-radius: 8px;
}

.table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px;
}

.table-title {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.btn-group {
  display: flex;
  gap: 12px;
}

/* Analysis Dialog styling */
.analysis-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.analysis-progress {
  display: flex;
  align-items: center;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 12px 16px;
  border-radius: 6px;
  color: #1e3a8a;
  font-size: 14px;
}

.progress-spinner {
  font-size: 18px;
  margin-right: 8px;
}

.analysis-report-box {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 20px;
  min-height: 350px;
  max-height: 520px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
}

.report-structured {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rep-card {
  border: 1px solid var(--border-color);
}

.rep-card-header {
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rep-card-header .el-icon {
  font-size: 18px;
}

.color-blue { color: #3b82f6; }
.color-orange { color: #f59e0b; }

.rep-card-body {
  white-space: pre-wrap;
  font-size: 13.5px;
  color: #475569;
  line-height: 1.6;
}

.rep-risk-bar {
  background-color: #fff;
  border: 1px solid var(--border-color);
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
}

.risk-label {
  font-weight: bold;
}

.holdings-diagnosis-section {
  margin-top: 8px;
}

.holdings-diagnosis-section .section-title {
  font-weight: bold;
  font-size: 15px;
  margin-bottom: 8px;
  color: #1e293b;
  border-left: 3px solid var(--primary-color);
  padding-left: 8px;
}

.rep-disclaimer {
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  color: #f56c6c;
  font-size: 12px;
  padding: 12px;
  border-radius: 4px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.rep-disclaimer .el-icon {
  font-size: 16px;
  margin-top: 1px;
  flex-shrink: 0;
}

.report-raw-text {
  white-space: pre-wrap;
}

.placeholder-report {
  color: #94a3b8;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  text-align: center;
  font-style: italic;
}
</style>
