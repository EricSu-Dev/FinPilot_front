import { createRouter, createWebHistory } from 'vue-router'
import Chat from '../views/Chat.vue'
import Diagnosis from '../views/Diagnosis.vue'
import Portfolio from '../views/Portfolio.vue'
import Login from '../views/Login.vue'
import { isLoggedIn } from '../utils/auth'

const routes = [
  {
    // 对话首页作为落地页：整合持仓分析 / 诊断 / 财报解读 / 闲聊。
    // 需要登录——因为「分析我的持仓」要读当前用户持仓。
    path: '/',
    name: 'Chat',
    component: Chat,
    meta: { title: 'AI 助手 - FinPilot', requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登录 - FinPilot' }
  },
  {
    path: '/diagnosis',
    name: 'Diagnosis',
    component: Diagnosis,
    meta: { title: 'AI 诊断 - FinPilot' }
  },
  {
    path: '/portfolio',
    name: 'Portfolio',
    component: Portfolio,
    meta: { title: '我的持仓 - FinPilot', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  // 受保护路由未登录则跳登录页，并记录回跳地址
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && isLoggedIn()) {
    // 已登录访问登录页，默认回到对话首页
    next('/')
  } else {
    next()
  }
})

export default router
