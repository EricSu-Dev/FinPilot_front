<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="上传财报 PDF"
    width="440px"
    :close-on-click-modal="false"
  >
    <el-form label-width="80px" class="upload-form">
      <el-form-item label="财报文件" required>
        <div class="file-pick">
          <el-button @click="pickFile" :disabled="loading">
            <el-icon><Upload /></el-icon>
            <span>选择 PDF</span>
          </el-button>
          <span v-if="file" class="file-name">
            <el-icon><Document /></el-icon>{{ file.name }}
          </span>
          <span v-else class="file-hint">未选择文件</span>
          <input
            ref="fileInputRef"
            type="file"
            accept="application/pdf"
            style="display:none"
            @change="onFilePicked"
          />
        </div>
      </el-form-item>

      <el-form-item label="股票代码" required>
        <el-input v-model="form.code" placeholder="必填，6 位数字，如 300308" :disabled="loading" />
      </el-form-item>

      <el-form-item label="年份">
        <el-select v-model="form.year" placeholder="选择年份" clearable :disabled="loading">
          <el-option v-for="y in yearOptions" :key="y" :label="String(y)" :value="y" />
        </el-select>
      </el-form-item>

      <el-form-item label="季度">
        <el-select v-model="form.quarter" placeholder="选择季度" clearable :disabled="loading">
          <el-option label="一季度" :value="1" />
          <el-option label="半年度" :value="2" />
          <el-option label="三季度" :value="3" />
          <el-option label="全年度" :value="4" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close" :disabled="loading">取消</el-button>
      <el-button type="primary" :loading="loading" :disabled="!canSubmit" @click="submit">
        上传并解析
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Document } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // 由父组件传入的预填代码（如从"分析财报"对话框带过来），开窗时填入代码栏。
  initialCode: { type: String, default: '' },
  // uploadFn({ file, code, year, quarter }) -> Promise<{ report_id, chunks_count }>
  // 由父组件提供，决定打 /api/chat/upload 还是 /api/report/upload。
  uploadFn: { type: Function, required: true },
})
const emit = defineEmits(['update:modelValue', 'success'])

const file = ref(null)
const fileInputRef = ref(null)
const loading = ref(false)
const form = reactive({ code: '', year: null, quarter: null })

// 对话框打开时，把父组件传入的 initialCode 预填到代码栏，省得用户重输。
watch(
  () => props.modelValue,
  (v) => {
    if (v && props.initialCode) {
      form.code = props.initialCode
    }
  }
)

// 年份下拉：当前年份往前到 2015。当前是 2026。
const currentYear = 2026
const yearOptions = Array.from({ length: currentYear - 2015 + 1 }, (_, i) => currentYear - i)

const canSubmit = computed(
  () => !!file.value && /^\d{6}$/.test(form.code.trim())
)

function pickFile() {
  fileInputRef.value && fileInputRef.value.click()
}

function onFilePicked(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  if (f.type !== 'application/pdf') {
    ElMessage.error('上传文件只能是 PDF 格式')
    e.target.value = ''
    return
  }
  if (f.size / 1024 / 1024 >= 30) {
    ElMessage.error('上传文件大小不能超过 30MB')
    e.target.value = ''
    return
  }
  file.value = f
  e.target.value = '' // 允许重复选同一文件
}

function close() {
  emit('update:modelValue', false)
}

function reset() {
  file.value = null
  form.code = ''
  form.year = null
  form.quarter = null
}

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  try {
    const result = await props.uploadFn({
      file: file.value,
      code: form.code.trim(),
      year: form.year,
      quarter: form.quarter,
    })
    emit('success', result)
    reset()
    emit('update:modelValue', false)
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.upload-form {
  margin-top: 4px;
}
.file-pick {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.file-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #334155;
  font-size: 13px;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 6px;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-hint {
  color: #94a3b8;
  font-size: 13px;
}
</style>
