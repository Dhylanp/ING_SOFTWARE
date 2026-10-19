// Prueba E2E de HU19/HU21 en Chrome real: Service Worker + IndexedDB + sincronización automática.
// No es parte de `npm test` (necesita API + MySQL + build de producción). Uso: ver GUIA_SPRINT3.md, sección 7.4.
//   mkdir -p /tmp/e2e && cd /tmp/e2e && npm init -y && npm install playwright-core   (fuera del proyecto)
//   cp <repo>/docs/sprint3/prueba_offline_chrome.mjs /tmp/e2e/ && node prueba_offline_chrome.mjs
import { chromium } from 'playwright-core'

const WEB = 'http://localhost:4173'
const ok = (cond, msg) => { console.log(`[${cond ? 'OK ' : 'FALLA'}] ${msg}`); if (!cond) process.exitCode = 1 }

const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const ctx = await browser.newContext()
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('  pageerror:', e.message))

// 1. login real como administrativo (rol 1)
await page.goto(WEB + '/login')
await page.getByRole('button', { name: 'Admin Administrador' }).click()
await page.getByPlaceholder('Ej: 12345678').fill('11111111')
await page.getByPlaceholder('Contraseña').fill('Clave1234')
await page.locator('button[type=submit]').click()
await page.waitForURL('**/interconsultas')
ok(true, 'login con API real')

// 2. Service Worker activo y controlando la página
await page.evaluate(() => navigator.serviceWorker.ready)
await page.reload()
const controlado = await page.evaluate(() => Boolean(navigator.serviceWorker.controller))
ok(controlado, 'Service Worker registrado y controlando la página')
const caches_ = await page.evaluate(() => caches.keys())
ok(caches_.includes('interconsultas-shell-v1'), `cache del shell: ${caches_.join(', ')}`)

// 3. abrir Registrar con conexión para dejar catálogos en caché
await page.goto(WEB + '/interconsultas/registrar')
await page.locator('select[name=idHospital] option').nth(1).waitFor({ state: 'attached' })
await page.locator('select[name=idEspecialidad] option').nth(1).waitFor({ state: 'attached' })

// 4. sin conexión: la app recarga desde el Service Worker
await ctx.setOffline(true)
await page.reload()
await page.locator('select[name=idHospital] option').nth(1).waitFor({ state: 'attached' })
ok(true, 'sin conexión la pantalla Registrar recarga desde caché (shell + catálogos)')
ok(await page.getByText(/Sin conexión/).isVisible(), 'aviso "Sin conexión" visible')

// 5. registrar sin conexión
await page.locator('input[name=rut]').fill('12345678-5')
await page.getByText('Paciente Prueba').waitFor()
await page.locator('select[name=idHospital]').selectOption({ index: 1 })
await page.locator('select[name=idEspecialidad]').selectOption({ index: 1 })
await page.locator('textarea[name=descripcion]').fill('Registrada sin conexión desde Chrome')
await page.locator('form button[type=submit]').click()
await page.getByText('Guardado sin conexión').waitFor()
ok(true, 'aviso "Guardado sin conexión"')
await page.locator('.swal2-confirm').click().catch(() => {})
const pendientes = await page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('interconsultas-offline')
  r.onsuccess = () => {
    const db = r.result
    const store = [...db.objectStoreNames].find((n) => n.includes('registro') || n.includes('pendiente')) || db.objectStoreNames[0]
    const q = db.transaction(store).objectStore(store).getAll()
    q.onsuccess = () => res(q.result)
  }
  r.onerror = () => res(null)
}))
ok(Array.isArray(pendientes) && pendientes.length === 1, `IndexedDB guarda 1 pendiente (uuidLocal=${pendientes?.[0]?.uuidLocal})`)

// 6. vuelve la conexión: sincroniza solo
await ctx.setOffline(false)
await page.getByText(/Conexión restablecida|Sincronizado/).first().waitFor({ timeout: 15000 }).catch(() => {})
await page.waitForTimeout(3000)
const resto = await page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('interconsultas-offline')
  r.onsuccess = () => {
    const db = r.result
    const store = [...db.objectStoreNames].find((n) => n.includes('registro') || n.includes('pendiente')) || db.objectStoreNames[0]
    const q = db.transaction(store).objectStore(store).getAll()
    q.onsuccess = () => res(q.result.map((x) => x.estado))
  }
}))
ok(resto.length > 0 && resto.every((e) => e === 'sincronizado'), `al volver la conexión se sincroniza solo (estado local: ${resto})`)
await page.screenshot({ path: 'offline_final.png', fullPage: true })
await browser.close()
