const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => [...document.querySelectorAll(selector)]

const state = {
  apiUrl: localStorage.getItem('pactApiUrl') || 'http://localhost:5000',
  tokens: {
    client: localStorage.getItem('pactClientToken') || '',
    artisan: localStorage.getItem('pactArtisanToken') || '',
  },
  identities: {
    client: JSON.parse(localStorage.getItem('pactClientIdentity') || 'null'),
    artisan: JSON.parse(localStorage.getItem('pactArtisanIdentity') || 'null'),
  },
  sockets: { client: null, artisan: null },
  checks: { connected: new Set(), sent: false, received: false, typing: false },
}

const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const apiPath = (path) => `${state.apiUrl.replace(/\/$/, '')}${path}`
const getToken = (slot) => state.tokens[slot] || ''

function setApiStatus(text, kind = '') {
  $('#apiState').textContent = text
  $('#apiDot').className = kind
}

function addLog(label, data, ok = true) {
  const log = $('#log')
  log.querySelector('.empty')?.remove()
  const row = document.createElement('div')
  row.className = `log-entry ${ok ? 'ok' : 'error'}`
  const stamp = document.createElement('time')
  stamp.textContent = time()
  const content = document.createElement('div')
  const heading = document.createElement('b')
  heading.textContent = label
  const body = document.createElement('pre')
  body.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  content.append(heading, body)
  row.append(stamp, content)
  log.prepend(row)
}

async function request(path, { method = 'GET', body, slot = 'none' } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (slot !== 'none' && getToken(slot)) headers.Authorization = `Bearer ${getToken(slot)}`
  try {
    const response = await fetch(apiPath(path), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = await response.json().catch(() => ({ message: 'Response was not JSON' }))
    addLog(`${method} ${path} · ${response.status}`, data, response.ok)
    return { ok: response.ok, data, status: response.status }
  } catch (error) {
    addLog(`${method} ${path} · network error`, error.message, false)
    return { ok: false, data: null }
  }
}

function saveSession(slot, token, user) {
  state.tokens[slot] = token
  state.identities[slot] = user || null
  localStorage.setItem(`pact${slot[0].toUpperCase() + slot.slice(1)}Token`, token)
  localStorage.setItem(`pact${slot[0].toUpperCase() + slot.slice(1)}Identity`, JSON.stringify(user || null))
  renderSessions()
}

function clearSession(slot) {
  disconnect(slot)
  state.tokens[slot] = ''
  state.identities[slot] = null
  localStorage.removeItem(`pact${slot[0].toUpperCase() + slot.slice(1)}Token`)
  localStorage.removeItem(`pact${slot[0].toUpperCase() + slot.slice(1)}Identity`)
  renderSessions()
}

function renderSessions() {
  for (const slot of ['client', 'artisan']) {
    const user = state.identities[slot]
    $(`#${slot}Identity`).textContent = user ? `${user.firstName} ${user.lastName} · ${user.email}` : 'No session saved'
    $(`#${slot}Token`).textContent = state.tokens[slot] ? `${state.tokens[slot].slice(0, 24)}…` : '—'
  }
}

function formObject(form) { return Object.fromEntries(new FormData(form).entries()) }

async function profile(slot) {
  const result = await request('/api/auth/me', { slot })
  if (result.ok) {
    const payload = result.data.data
    saveSession(slot, state.tokens[slot], payload.user || payload)
  }
}

function setRequestId(id) {
  if (!id) return
  $('#chatRequestId').value = id
  $('#priceRequestId').value = id
  addLog('Chat request ID set', id)
}

function updateChecklist() {
  const checks = [
    [state.checks.connected.size === 2, 'Both socket connections opened'],
    [state.checks.sent, 'Sender received confirmation'],
    [state.checks.received, 'Recipient received live message'],
    [state.checks.typing, 'Typing event received'],
  ]
  $('#socketChecklist').replaceChildren(...checks.map(([done, label]) => {
    const span = document.createElement('span')
    span.textContent = `${done ? '✓' : '○'} ${label}`
    if (done) span.className = 'done'
    return span
  }))
}

function socketUrl(token) {
  const endpoint = new URL(state.apiUrl)
  const protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${endpoint.host}/?token=${encodeURIComponent(token)}`
}

function addSocketEvent(slot, type, payload) {
  const box = $(`#${slot}Events`)
  box.querySelector('.empty')?.remove()
  const fragment = $('#eventTemplate').content.cloneNode(true)
  fragment.querySelector('time').textContent = time()
  fragment.querySelector('b').textContent = type
  fragment.querySelector('pre').textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
  box.prepend(fragment)
  addLog(`${slot} socket · ${type}`, payload)
}

function setSocketState(slot, text, connected = false) {
  $(`#${slot}SocketState`).textContent = text
  const button = $(`[data-socket="${slot}"]`)
  button.textContent = connected ? 'Disconnect' : 'Connect'
  button.classList.toggle('connected', connected)
}

function connect(slot) {
  if (state.sockets[slot]?.readyState === WebSocket.OPEN) return disconnect(slot)
  const token = getToken(slot)
  if (!token) return addLog(`${slot} socket`, `Save a ${slot} token before connecting.`, false)
  try {
    setSocketState(slot, 'Connecting…')
    const socket = new WebSocket(socketUrl(token))
    state.sockets[slot] = socket
    socket.onopen = () => setSocketState(slot, 'Connected', true)
    socket.onmessage = (event) => {
      let payload
      try { payload = JSON.parse(event.data) } catch { payload = event.data }
      const type = payload.type || 'message'
      if (type === 'connected') state.checks.connected.add(slot)
      if (type === 'message_sent') state.checks.sent = true
      if (type === 'new_message') state.checks.received = true
      if (type === 'typing') state.checks.typing = true
      updateChecklist()
      addSocketEvent(slot, type, payload)
    }
    socket.onerror = () => addSocketEvent(slot, 'error', 'WebSocket connection error')
    socket.onclose = (event) => {
      setSocketState(slot, 'Disconnected')
      addSocketEvent(slot, 'closed', { code: event.code, reason: event.reason || 'No reason supplied' })
    }
  } catch (error) { addLog(`${slot} socket`, error.message, false) }
}

function disconnect(slot) {
  const socket = state.sockets[slot]
  if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'Closed from tester')
  state.sockets[slot] = null
  setSocketState(slot, 'Disconnected')
}

function emitSocket(slot, type, data = {}) {
  const socket = state.sockets[slot]
  if (!socket || socket.readyState !== WebSocket.OPEN) return addLog(`${slot} socket`, 'Connect this socket first.', false)
  const requestId = $('#chatRequestId').value.trim()
  if (!requestId) return addLog(`${slot} socket`, 'Enter the accepted request ID first.', false)
  socket.send(JSON.stringify({ type, requestId, ...data }))
  addSocketEvent(slot, `sent: ${type}`, { requestId, ...data })
}

// Tab navigation
$$('.tabs button').forEach((button) => button.addEventListener('click', () => {
  $$('.tabs button').forEach((item) => item.classList.toggle('active', item === button))
  $$('.tab').forEach((item) => item.classList.toggle('active', item.id === button.dataset.tab))
}))

// Server setup
$('#apiUrl').value = state.apiUrl
$('#saveUrl').addEventListener('click', () => {
  state.apiUrl = $('#apiUrl').value.trim().replace(/\/$/, '')
  localStorage.setItem('pactApiUrl', state.apiUrl)
  setApiStatus('URL saved')
})
$('#checkApi').addEventListener('click', async () => {
  const result = await request('/api')
  setApiStatus(result.ok ? 'API reachable' : 'API unavailable', result.ok ? 'ok' : 'bad')
})

// Authentication
let registrationRole = 'client'
$$('[data-register]').forEach((button) => button.addEventListener('click', () => {
  registrationRole = button.dataset.register
  $$('[data-register]').forEach((item) => item.classList.toggle('active', item === button))
  $('#artisanFields').hidden = registrationRole !== 'artisan'
  $('#registerRole').textContent = registrationRole
  $('#registerForm [name="lastName"]').value = registrationRole === 'artisan' ? 'Artisan' : 'Client'
  $('#registerForm [name="email"]').placeholder = registrationRole === 'artisan' ? 'artisan@example.com' : 'client@example.com'
}))
$('#registerForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  const body = formObject(event.currentTarget)
  if (registrationRole === 'artisan') {
    body.services = body.services.split(',').map((service) => service.trim()).filter(Boolean)
    body.startingPrice = Number(body.startingPrice)
  }
  const result = await request(`/api/auth/signup/${registrationRole}`, { method: 'POST', body })
  const token = result.data?.data?.token
  if (result.ok && token) saveSession(registrationRole, token, result.data.data.user)
})
$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  const values = formObject(event.currentTarget)
  const result = await request('/api/auth/login', { method: 'POST', body: { email: values.email, password: values.password } })
  if (result.ok && result.data?.data?.token) saveSession(values.slot, result.data.data.token, result.data.data.user)
})
$$('[data-me]').forEach((button) => button.addEventListener('click', () => profile(button.dataset.me)))
$$('[data-clear]').forEach((button) => button.addEventListener('click', () => clearSession(button.dataset.clear)))

// Artisan directory
function displayArtisans(artisans) {
  const box = $('#artisanResults')
  if (!artisans?.length) { box.textContent = 'No verified artisans matched this search.'; box.className = 'empty'; return }
  box.replaceChildren(...artisans.map((artisan) => {
    const card = document.createElement('div'); card.className = 'artisan'
    const name = document.createElement('strong'); name.textContent = `${artisan.firstName} ${artisan.lastName}`
    const detail = document.createElement('span'); detail.textContent = `${artisan.services.join(', ')} · ₦${artisan.startingPrice} · ${artisan.state}, ${artisan.city}`
    const choose = document.createElement('button'); choose.textContent = 'Use for service request'; choose.onclick = () => { $('#jobArtisanId').value = artisan.id; $$('.tabs button').find((tab) => tab.dataset.tab === 'jobs').click() }
    card.append(name, detail, choose); return card
  }))
}
$('#listArtisans').addEventListener('click', async () => { const result = await request('/api/artisans', { slot: 'client' }); if (result.ok) displayArtisans(result.data.data.artisans) })
$('#filterForm').addEventListener('submit', async (event) => { event.preventDefault(); const query = new URLSearchParams(Object.entries(formObject(event.currentTarget)).filter(([, value]) => value)); const result = await request(`/api/artisans/filter?${query}`, { slot: 'client' }); if (result.ok) displayArtisans(result.data.data.artisans) })

// Job flow
$('#jobForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const body = formObject(event.currentTarget); const artisanId = body.artisanId; delete body.artisanId; body.client_price = Number(body.client_price)
  const result = await request(`/api/artisans/${artisanId}/requests`, { method: 'POST', body, slot: 'client' })
  const job = result.data?.data?.job
  if (result.ok && job?.id) $('#jobId').value = job.id
})
$('#jobActionForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const jobId = formObject(event.currentTarget).jobId
  const result = await request(`/api/jobs/${jobId}/accept`, { method: 'PATCH', slot: 'artisan' })
  const requestId = result.data?.data?.request?._id || result.data?.data?.job?.request
  if (result.ok && requestId) setRequestId(requestId)
})
$('#cancelJob').addEventListener('click', async () => { const jobId = $('#jobId').value.trim(); if (!jobId) return; await request(`/api/jobs/${jobId}/cancel`, { method: 'PATCH', slot: 'client' }) })

function showAgreement(agreement, fallback) {
  const output = $('#agreementOutput')
  output.textContent = agreement || fallback || 'No agreement draft is available yet.'
  output.classList.toggle('empty', !agreement)
}

$('#priceForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  const values = formObject(event.currentTarget)
  const result = await request(`/api/requests/${values.requestId}/price`, {
    method: 'PATCH',
    body: { price: Number(values.price) },
    slot: values.slot,
  })
  if (result.ok) {
    const data = result.data.data
    if (data.pricesMatch) showAgreement(data.agreement, data.agreementError)
    else showAgreement('', 'Price proposal saved. Waiting for the other participant to enter the same amount.')
  }
})

$('#retryAgreement').addEventListener('click', async () => {
  const requestId = $('#priceRequestId').value.trim()
  if (!requestId) return addLog('Agreement draft', 'Enter an accepted request ID first.', false)
  const result = await request(`/api/requests/${requestId}/agreement`, {
    method: 'POST',
    slot: $('#priceForm [name="slot"]').value,
  })
  if (result.ok) showAgreement(result.data.data?.agreement)
})

// Socket lab
$$('[data-socket]').forEach((button) => button.addEventListener('click', () => connect(button.dataset.socket)))
$$('[data-send]').forEach((form) => form.addEventListener('submit', (event) => { event.preventDefault(); const text = formObject(event.currentTarget).text.trim(); if (text) emitSocket(form.dataset.send, 'message', { text }); event.currentTarget.reset() }))
$$('[data-typing]').forEach((button) => button.addEventListener('click', () => emitSocket(button.dataset.typing, 'typing')))
$$('[data-stop]').forEach((button) => button.addEventListener('click', () => emitSocket(button.dataset.stop, 'stop_typing')))
$('#loadHistory').addEventListener('click', async () => { const id = $('#chatRequestId').value.trim(); if (!id) return; await request(`/api/requests/${id}/messages`, { slot: 'client' }) })

// Custom endpoint tester
$('#customForm').addEventListener('submit', async (event) => { event.preventDefault(); const values = formObject(event.currentTarget); let body; if (values.body.trim()) { try { body = JSON.parse(values.body) } catch { return addLog('Custom request', 'The JSON body is not valid.', false) } } await request(values.path, { method: values.method, body, slot: values.slot }) })
$('#clearLog').addEventListener('click', () => { $('#log').innerHTML = '<p class="empty">Console cleared.</p>' })

renderSessions()
updateChecklist()
