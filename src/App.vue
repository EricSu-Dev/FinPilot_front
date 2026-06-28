<template>
  <div class="app-wrapper">
    <!-- Dark Theme Navigation Bar -->
    <header class="app-header">
      <div class="header-container">
        <div class="logo-area">
          <el-icon class="logo-icon"><TrendCharts /></el-icon>
          <span class="logo-text">FinPilot</span>
          <span class="logo-subtext">AI金融分析平台</span>
        </div>
        
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          :ellipsis="false"
          background-color="#9a1620"
          text-color="#fce8eb"
          active-text-color="#ffffff"
          router
          class="nav-menu"
        >
          <el-menu-item index="/">
            <el-icon><ChatLineRound /></el-icon>
            <span>AI 助手</span>
          </el-menu-item>
          <el-menu-item index="/diagnosis">
            <el-icon><Cpu /></el-icon>
            <span>股票/基金诊断</span>
          </el-menu-item>
          <el-menu-item index="/portfolio">
            <el-icon><Briefcase /></el-icon>
            <span>我的持仓</span>
          </el-menu-item>
        </el-menu>

        <div class="user-area" v-if="username">
          <div class="user-trigger" @click="profileVisible = true" title="点击修改用户名 / 密码">
            <el-icon><User /></el-icon>
            <span class="user-name">{{ username }}</span>
          </div>
          <el-button text size="small" @click="handleLogout">登出</el-button>
        </div>
      </div>
    </header>

    <ProfileDialog v-model="profileVisible" @updated="handleProfileUpdated" />

    <!-- Main Content Area -->
    <main class="app-main">
      <div class="app-container">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUser, clearAuth, setAuth } from './utils/auth'
import ProfileDialog from './components/ProfileDialog.vue'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => route.path)

const username = ref('')
const profileVisible = ref(false)
const refreshUser = () => {
  username.value = getUser()?.username || ''
}
onMounted(refreshUser)
// 登录/登出后路由切换时刷新用户名显示
router.afterEach(refreshUser)

const handleLogout = () => {
  clearAuth()
  username.value = ''
  router.push('/login')
}

// 资料修改成功后用新 token/用户覆盖本地登录态并刷新右上角显示
const handleProfileUpdated = (data) => {
  if (data?.access_token && data?.user) {
    setAuth(data.access_token, data.user)
    refreshUser()
  }
}
</script>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--body-bg);
}

.app-header {
  background-color: var(--nav-bg);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-container {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 16px;
}

.logo-area {
  display: flex;
  align-items: center;
  color: var(--nav-text);
  font-weight: bold;
}

.logo-icon {
  font-size: 24px;
  color: #60a5fa;
  margin-right: 8px;
}

.logo-text {
  font-size: 20px;
  letter-spacing: 0.5px;
}

.logo-subtext {
  font-size: 12px;
  color: #fca5b0;
  margin-left: 6px;
  padding-left: 6px;
  border-left: 1px solid rgba(255, 255, 255, 0.3);
  font-weight: normal;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
  font-size: 14px;
  white-space: nowrap;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-trigger:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

.user-area .user-name {
  color: #e2e8f0;
}

.nav-menu {
  border-bottom: none;
  height: 60px;
}

.nav-menu :deep(.el-menu-item) {
  height: 60px;
  line-height: 60px;
  padding: 0 22px !important;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.nav-menu :deep(.el-menu-item:hover) {
  background-color: #741016 !important;
  color: #ffffff !important;
}

.nav-menu :deep(.el-menu-item.is-active) {
  border-bottom: 2px solid #ffffff !important;
  background-color: transparent !important;
}

.app-main {
  flex: 1;
}

/* Page Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .header-container {
    flex-direction: column;
    height: auto;
    padding: 8px 16px;
  }
  
  .logo-area {
    margin-bottom: 8px;
  }
  
  .nav-menu {
    width: 100%;
    display: flex;
    justify-content: space-around;
    height: auto;
  }
  
  .nav-menu :deep(.el-menu-item) {
    height: 48px;
    line-height: 48px;
    padding: 0 8px;
  }
}
</style>
