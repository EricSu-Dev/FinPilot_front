<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-header">
        <el-icon class="logo-icon"><TrendCharts /></el-icon>
        <h2>FinPilot</h2>
        <p class="login-sub">AI 金融分析平台</p>
      </div>

      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" :rules="rules" ref="loginRef" label-width="0">
            <el-form-item prop="username">
              <el-input v-model="loginForm.username" placeholder="用户名" :prefix-icon="User" size="large" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="密码" :prefix-icon="Lock" size="large" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <el-button type="primary" size="large" :loading="submitting" style="width: 100%;" @click="handleLogin">
              登录
            </el-button>
            <div class="forgot-link">
              <el-link type="primary" :underline="false" @click="forgotVisible = true">忘记密码？</el-link>
            </div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form :model="registerForm" :rules="rules" ref="registerRef" label-width="0">
            <el-form-item prop="username">
              <el-input v-model="registerForm.username" placeholder="用户名（3-64 字符）" :prefix-icon="User" size="large" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="registerForm.password" type="password" placeholder="密码（至少 6 位）" :prefix-icon="Lock" size="large" show-password />
            </el-form-item>
            <el-button type="success" size="large" :loading="submitting" style="width: 100%;" @click="handleRegister">
              注册
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 忘记密码：按用户名直接重置（无额外校验，仅学习演示用） -->
    <el-dialog v-model="forgotVisible" title="重置密码" width="400px" :close-on-click-modal="false">
      <el-form :model="forgotForm" :rules="forgotRules" ref="forgotRef" label-width="0">
        <el-form-item prop="username">
          <el-input v-model="forgotForm.username" :prefix-icon="User" placeholder="要重置密码的用户名" />
        </el-form-item>
        <el-form-item prop="new_password">
          <el-input v-model="forgotForm.new_password" type="password" :prefix-icon="Lock" show-password placeholder="新密码（至少 6 位）" />
        </el-form-item>
        <el-form-item prop="confirm">
          <el-input v-model="forgotForm.confirm" type="password" :prefix-icon="Lock" show-password placeholder="再次输入新密码" @keyup.enter="handleReset" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="forgotVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetting" @click="handleReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, TrendCharts } from '@element-plus/icons-vue'
import request from '../utils/request'
import { setAuth } from '../utils/auth'

const router = useRouter()
const route = useRoute()

const activeTab = ref('login')
const submitting = ref(false)
const loginRef = ref(null)
const registerRef = ref(null)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', password: '' })

// 忘记密码
const forgotVisible = ref(false)
const resetting = ref(false)
const forgotRef = ref(null)
const forgotForm = reactive({ username: '', new_password: '', confirm: '' })
const forgotRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 64, message: '用户名长度 3-64', trigger: 'blur' },
  ],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirm: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_r, _v, cb) =>
        forgotForm.confirm === forgotForm.new_password
          ? cb()
          : cb(new Error('两次输入的密码不一致')),
      trigger: 'blur',
    },
  ],
}

const handleReset = async () => {
  if (!forgotRef.value) return
  await forgotRef.value.validate(async (valid) => {
    if (!valid) return
    resetting.value = true
    try {
      await request.post('/api/auth/reset-password', {
        username: forgotForm.username,
        new_password: forgotForm.new_password,
      })
      ElMessage.success('密码已重置，请用新密码登录')
      // 把用户名回填到登录框，方便直接登录
      loginForm.username = forgotForm.username
      loginForm.password = ''
      forgotVisible.value = false
      activeTab.value = 'login'
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.msg || err.message
      ElMessage.error(`重置失败: ${msg}`)
    } finally {
      resetting.value = false
    }
  })
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 64, message: '用户名长度 3-64', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const redirectAfter = () => {
  const redirect = route.query.redirect || '/'
  router.replace(redirect)
}

const handleLogin = async () => {
  if (!loginRef.value) return
  await loginRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const res = await request.post('/api/auth/login', { ...loginForm })
      const data = res.data?.data || res.data
      setAuth(data.access_token, data.user)
      ElMessage.success('登录成功')
      redirectAfter()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.msg || err.message
      ElMessage.error(`登录失败: ${msg}`)
    } finally {
      submitting.value = false
    }
  })
}

const handleRegister = async () => {
  if (!registerRef.value) return
  await registerRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await request.post('/api/auth/register', { ...registerForm })
      ElMessage.success('注册成功，即将自动登录')
      // 注册成功后直接登录
      const res = await request.post('/api/auth/login', { ...registerForm })
      const data = res.data?.data || res.data
      setAuth(data.access_token, data.user)
      redirectAfter()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.msg || err.message
      ElMessage.error(`注册失败: ${msg}`)
    } finally {
      submitting.value = false
    }
  })
}
</script>

<style scoped>
.login-wrapper {
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.login-card {
  width: 380px;
  background: #fff;
  border-radius: 12px;
  padding: 36px 32px 28px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 20px;
}

.login-header .logo-icon {
  font-size: 40px;
  color: #3b82f6;
}

.login-header h2 {
  margin: 8px 0 4px;
  font-size: 24px;
  color: #1e293b;
}

.login-sub {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.forgot-link {
  margin-top: 8px;
  text-align: right;
}
</style>
