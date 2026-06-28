// 流式 SSE 请求：走 fetch + ReadableStream 手动解析，带 JWT。
// 抽出来给对话首页用，后续 Diagnosis/Portfolio 页也可复用以消除重复的 SSE 解析。
//
// 与 @microsoft/fetch-event-source 风格一致，但保持极简、零额外依赖：
// 按 "\n\n" 切分事件块，每块解析 event: 与 data: 行，回调 onEvent(event, data)。

import { getToken } from './auth'

/**
 * 发起一个 SSE 流式 POST 请求。
 *
 * @param {string} url 请求地址（如 '/api/chat'）。
 * @param {object} body JSON 请求体。
 * @param {(event: string, data: any) => void} onEvent 每个 SSE 事件的回调。
 * @param {AbortSignal} [signal] 可选，用于取消。
 * @returns {Promise<void>} 流结束时 resolve；网络/HTTP 错误 reject。
 */
export async function streamSSE(url, body, onEvent, signal) {
  const token = getToken()
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!resp.ok) {
    // 非 2xx：尝试读出错误信封再抛
    let msg = `HTTP ${resp.status}`
    try {
      const data = await resp.json()
      msg = data.msg || msg
    } catch {
      // 忽略 JSON 解析失败
    }
    throw new Error(msg)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  // 把一个事件块解析成 {event, data}。data 可能是 JSON 也可能是纯文本。
  const parseBlock = (block) => {
    let event = 'message'
    const dataLines = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''))
      }
    }
    if (dataLines.length === 0) return null
    const raw = dataLines.join('\n')
    let data = raw
    try {
      data = JSON.parse(raw)
    } catch {
      // 纯文本 data 保持原样
    }
    return { event, data }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // 事件之间以空行分隔；按 "\n\n" 切出完整块逐个回调。
    let sep
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const parsed = parseBlock(block)
      if (parsed) onEvent(parsed.event, parsed.data)
    }
  }
  // 处理流尾部残留
  if (buffer.trim()) {
    const parsed = parseBlock(buffer)
    if (parsed) onEvent(parsed.event, parsed.data)
  }
}
