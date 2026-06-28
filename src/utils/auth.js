// 登录态存取：token 与当前用户信息都放在 localStorage。
// 刻意保持极简，不引入 pinia/vuex，避免为单用户态加状态管理依赖。

const TOKEN_KEY = 'finpilot_token'
const USER_KEY = 'finpilot_user'

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY)
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const setAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user || {}))
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const isLoggedIn = () => !!getToken()
