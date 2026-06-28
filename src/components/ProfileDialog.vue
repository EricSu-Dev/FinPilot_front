<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="修改个人资料"
    width="420px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="92px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" :prefix-icon="User" placeholder="用户名（3-64 字符）" />
      </el-form-item>
      <el-divider content-position="left">修改密码（可选）</el-divider>
      <el-form-item label="原密码" prop="old_password">
        <el-input v-model="form.old_password" type="password" :prefix-icon="Lock" show-password placeholder="不改密码可留空" />
      </el-form-item>
      <el-form-item label="新密码" prop="new_password">
        <el-input v-model="form.new_password" type="password" :prefix-icon="Lock" show-password placeholder="至少 6 位" />
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirm">
        <el-input v-model="form.confirm" type="password" :prefix-icon="Lock" show-password placeholder="再次输入新密码" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import request from '../utils/request'
import { getUser } from '../utils/auth'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'updated'])

const formRef = ref(null)
const submitting = ref(false)
const form = reactive({
  username: '',
  old_password: '',
  new_password: '',
  confirm: '',
})

// 每次打开弹窗时，用当前用户名回填，清空密码字段
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.username = getUser()?.username || ''
      form.old_password = ''
      form.new_password = ''
      form.confirm = ''
    }
  }
)

const validateConfirm = (_rule, _value, callback) => {
  if (!form.new_password) {
    callback()
    return
  }
  if (form.new_password !== form.confirm) {
    callback(new Error('两次输入的新密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 64, message: '用户名长度 3-64', trigger: 'blur' },
  ],
  new_password: [{ min: 6, message: '密码至少 6 位', trigger: 'blur' }],
  confirm: [{ validator: validateConfirm, trigger: 'blur' }],
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    const current = getUser()?.username
    const usernameChanged = form.username && form.username !== current
    const wantChangePassword = !!form.new_password

    if (!usernameChanged && !wantChangePassword) {
      ElMessage.info('没有需要修改的内容')
      return
    }
    if (wantChangePassword && !form.old_password) {
      ElMessage.error('修改密码需填写原密码')
      return
    }

    const payload = {}
    if (usernameChanged) payload.username = form.username
    if (wantChangePassword) {
      payload.old_password = form.old_password
      payload.new_password = form.new_password
    }

    submitting.value = true
    try {
      const res = await request.put('/api/auth/me', payload)
      const data = res.data?.data || res.data
      emit('updated', data)
      ElMessage.success('修改成功')
      emit('update:modelValue', false)
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.msg || err.message
      ElMessage.error(`修改失败: ${msg}`)
    } finally {
      submitting.value = false
    }
  })
}
</script>
