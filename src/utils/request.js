// 统一的 axios 实例：自动带 JWT，401 时清登录态并跳登录页。
// 取代各页面裸用 axios 的写法，保证所有受保护请求都携带 token。

import axios from 'axios'
import { ElMessage } from 'element-plus'
import { clearAuth, getToken } from './auth'

const request = axios.create({
  baseURL: '/', // 走 Vite 代理：/api -> http://localhost:8094
  timeout: 60000,
})

// 请求拦截：附加 Authorization 头
request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截：401 统一登出并跳转
request.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response && error.response.status
    if (status === 401) {
      clearAuth()
      ElMessage.error('登录已过期，请重新登录')
      // 避免在登录页本身循环跳转
      if (!location.pathname.endsWith('/login')) {
        location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default request
