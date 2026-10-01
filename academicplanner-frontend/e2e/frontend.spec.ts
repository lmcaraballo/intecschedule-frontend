import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demoPassword, key, login, noOverflow, seed, storedSession } from './helpers';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.exposeFunction('qaErrors', () => errors);
});
test.afterEach(async ({ page }) => {
  if (!page.isClosed()) expect(await page.evaluate(() => (window as unknown as { qaErrors: () => Promise<string[]> }).qaErrors())).toEqual([]);
});

test('ambient breeze stays decorative and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const breeze = page.locator('.breeze-background');
  await expect(breeze).toBeVisible();
  await expect(breeze).toHaveAttribute('aria-hidden', 'true');
  await expect(breeze.locator('.breeze-leaf')).toHaveCount(9);
  expect(await breeze.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
  expect(await breeze.locator('.breeze-leaf').first().evaluate((element) => getComputedStyle(element).animationName)).toContain('breeze-drift');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(breeze).toBeHidden();

  const data = storedSession();
  data.preferences.reducedMotion = true;
  await seed(page, data);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/ahora');
  await expect(page.locator('.breeze-background')).toBeHidden();
});

test('access validation, Enter, repeated submission, privacy, reload and detail keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Identificación o matrícula')).toBeFocused();
  await page.getByLabel('Identificación o matrícula').fill('  QA-Á🐝  ');
  await page.getByLabel('Contraseña institucional', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Contraseña institucional', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Contraseña institucional', { exact: true }).fill(demoPassword);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Consultando…' })).toBeDisabled();
  await expect(page.getByLabel('Contraseña institucional', { exact: true })).toHaveValue('');
  await expect(page).toHaveURL(/\/ahora$/);
  const storage = await page.evaluate(() => ({ local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage), url: location.href }));
  expect(JSON.stringify(storage)).not.toMatch(/QA-only-fictional|password/);
  expect(JSON.parse(await page.evaluate(k => localStorage.getItem(k)!, key)).session.student.id).toBe('QA-Á🐝');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ahora', exact: true })).toBeVisible();
  await page.goto('/horario?date=2026-09-14');
  const opener = page.getByRole('button', { name: /Ver detalle:/ }).first();
  await opener.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: /Editar clase|Eliminar clase/ })).toHaveCount(0);
  await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog').evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
  await page.getByRole('button', { name: 'Cerrar detalle de clase' }).focus();
  await page.keyboard.press('Shift+Tab');
  expect(await page.getByRole('dialog').evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await opener.click();await page.goBack();await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const scenario of ['invalid-credentials', 'portal-unavailable', 'schedule-not-found', 'invalid-response']) {
  test(`preserves saved schedule on ${scenario}`, async ({ page }) => {
    await seed(page); await page.reload();
    const previous = await page.evaluate(k => localStorage.getItem(k), key);
    await page.getByText('Estás en una versión de demostración').click();
    await page.getByLabel('Resultado de la consulta').selectOption(scenario);
    await login(page);
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(previous);
    await page.getByRole('button', { name: 'Continuar con horario guardado' }).click();
    await expect(page.getByText('Mostrando tu último horario válido.')).toBeVisible();
  });
}

for (const width of [320,375,390,430,768,1024,1280,1440]) {
  test(`responsive routes and long data at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const data = storedSession();
    data.session.schedule.classes[0]!.subjectCode = 'X'.repeat(250);
    data.session.schedule.classes[0]!.subjectName = 'Asignatura muy larga Á🐝 '.repeat(20);
    data.session.schedule.classes[0]!.section = '';
    data.session.schedule.classes[0]!.professor = '';
    data.session.schedule.classes[0]!.location = '';
    await seed(page, data);
    for (const path of ['/', '/ahora', '/horario?date=2026-09-14', '/horario?date=2026-09-14&view=week', '/horario?date=2026-09-14&view=month', '/mas', '/eventos']) {
      await page.goto(path);await expect(page.locator('main')).toBeVisible();await noOverflow(page);
    }
    await page.goto('/horario?date=2026-09-14');
    await page.getByRole('button', { name: /Ver detalle:/ }).first().click();
    const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(d => d.scrollWidth - d.clientWidth)).toBeLessThanOrEqual(1);
    await expect(dialog).toContainText('Sección por confirmar');
    await page.keyboard.press('Escape');
  });
}

test('accessible screens, both themes, keyboard focus and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page);
  for (const theme of ['day', 'night']) {
    await page.evaluate(({key,theme}) => { const data=JSON.parse(localStorage.getItem(key)!);data.preferences.theme=theme;localStorage.setItem(key,JSON.stringify(data)); },{key,theme});
    for (const path of ['/', '/ahora', '/horario?date=2026-09-14', '/horario?date=2026-09-14&view=week', '/horario?date=2026-09-14&view=month', '/mas', '/eventos']) {
      await page.goto(path);await expect(page.locator('main')).toBeVisible();
      expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    }
    await page.goto('/horario?date=2026-09-14');await page.getByRole('button',{name:/Ver detalle:/}).first().click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.getByRole('dialog').evaluate(d=>getComputedStyle(d).animationName)).toBe('none');
    await page.keyboard.press('Escape');
  }
  await page.goto('/');await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Saltar al contenido'})).toBeFocused();
  expect(await page.getByRole('link',{name:'Saltar al contenido'}).evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
});

test('monthly schedule and expanded preferences persist and control startup', async ({ page }) => {
  await seed(page);
  await page.goto('/mas');
  await page.getByLabel(/Pantalla al iniciar/).selectOption('schedule');
  await page.getByLabel(/Vista predeterminada del horario/).selectOption('month');
  await page.getByLabel(/Densidad del horario/).selectOption('compact');
  await page.getByLabel(/Tamaño del texto/).selectOption('large');
  await page.getByText('Contraste reforzado', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true');

  await page.goto('/horario?date=2026-09-14');
  await expect(page.getByRole('button', { name: 'Mes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const month = page.getByRole('region', { name: /Horario mensual de septiembre de 2026/i });
  await expect(month).toBeVisible();
  const monthDay = month.getByRole('button', { name: /lunes, 14 de septiembre.*clases.*Cálculo diferencial/i });
  await expect(monthDay).toBeVisible();
  await monthDay.hover();
  await expect(monthDay.locator('.month-day__preview')).toBeVisible();
  await expect(monthDay.locator('.month-day__preview')).toContainText('Cálculo diferencial');
  await expect(monthDay.locator('.month-day__preview')).toContainText('AULA AJ-203');
  await page.mouse.move(0, 0);
  await monthDay.focus();
  await expect(monthDay.locator('.month-day__preview')).toBeVisible();
  await monthDay.click();
  await expect(page).toHaveURL(/view=day/);
  await expect(page.getByRole('heading', { name: /lunes, 14 de septiembre/i })).toBeVisible();

  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar con horario guardado' }).click();
  await expect(page).toHaveURL(/\/horario$/);
  await expect(page.getByRole('button', { name: 'Mes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).preferences, key);
  expect(saved).toMatchObject({ startPage: 'schedule', defaultScheduleView: 'month', scheduleDensity: 'compact', textSize: 'large', highContrast: true });
});

test('corrupt storage, unsupported version, null classes and changes in another tab', async ({ page, context }) => {
  await page.goto('/');
  for (const raw of ['{abc','{}',JSON.stringify({...storedSession(),version:0}),JSON.stringify({...storedSession(),session:{student:{id:'qa',isPino:false},schedule:{classes:null,fetchedAt:'wrong'}}})]) {
    await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw});await page.goto('/ahora');
    await expect(page).toHaveURL(/\/$/);await expect(page.getByText(/No pudimos leer el horario guardado/)).toBeVisible();
  }
  await seed(page);await page.goto('/ahora');
  const other=await context.newPage();await other.goto('/');await other.evaluate(k=>localStorage.removeItem(k),key);
  await expect(page).toHaveURL(/\/$/);await other.close();
});

test('PWA cold reopen offline, deep links, detail and reconnection', async ({ page, context }) => {
  await seed(page);await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.close();const reopened=await context.newPage();
  await reopened.goto('/ahora');await expect(reopened.getByRole('heading',{name:'Ahora',exact:true})).toBeVisible();
  await expect(reopened.getByText('Sin conexión',{exact:true})).toBeVisible();
  await reopened.goto('/horario?date=2026-09-14&view=week');
  await reopened.getByRole('button',{name:/Ver detalle:/}).first().click();await expect(reopened.getByRole('dialog')).toBeVisible();
  await reopened.keyboard.press('Escape');await context.setOffline(false);
  await expect(reopened.getByText('Sin conexión',{exact:true})).toHaveCount(0);
  await reopened.close();
});

test('empty schedule and twenty overlapping classes remain usable', async ({ page }) => {
  const data=storedSession();data.session.schedule.classes=[];await seed(page,data);await page.goto('/ahora');
  await expect(page.getByRole('heading',{name:'Tu horario todavía no tiene clases'})).toBeVisible();
  const full=storedSession();full.session.schedule.classes=Array.from({length:20},(_,i)=>({...full.session.schedule.classes[0]!,id:`qa-${i}`,subjectName:`Asignatura ${i}`}));
  await seed(page,full);await page.goto('/horario?date=2026-09-14&view=week');
  await expect(page.getByRole('button',{name:/Ver detalle:/})).toHaveCount(20);await noOverflow(page);
  await page.getByRole('button',{name:'Ver detalle: Asignatura 19, 8:00 a. m.',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Asignatura 19');
});

test('service worker does not intercept API navigation',async({page})=>{
  await page.goto('/');await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  const response=await page.goto('/api/academic/schedule');
  expect(response?.fromServiceWorker()).toBe(false);
});

test('Google Calendar demo synchronizes without duplicates and supports personal event CRUD', async ({ page }) => {
  await seed(page);
  await page.goto('/eventos');
  await page.getByRole('button', { name: 'Conectar Google Calendar' }).click();
  await expect(page.getByRole('heading', { name: 'Próximos eventos' })).toBeVisible();

  await page.getByRole('button', { name: 'Sincronizar horario' }).click();
  await expect(page.getByRole('status')).toContainText('Horario sincronizado');
  await expect(page.getByText('Clase sincronizada').first()).toBeVisible();
  await page.getByRole('button', { name: 'Sincronizar horario' }).click();
  await expect(page.getByRole('status')).toContainText(/No se duplicaron [1-9]/);

  await page.getByLabel('Título').fill('Preparar exposición QA');
  await page.getByLabel('Fecha').fill('2026-10-08');
  await page.getByLabel('Inicio', { exact: true }).fill('16:00');
  await page.getByLabel('Fin', { exact: true }).fill('17:00');
  await page.getByLabel(/Lugar/).fill('Biblioteca');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  await expect(page.getByRole('heading', { name: 'Preparar exposición QA' })).toBeVisible();

  const personalCard = page.getByRole('listitem').filter({ hasText: 'Preparar exposición QA' });
  await personalCard.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Título').fill('Preparar exposición final QA');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('heading', { name: 'Preparar exposición final QA' })).toBeVisible();

  const updatedCard = page.getByRole('listitem').filter({ hasText: 'Preparar exposición final QA' });
  await updatedCard.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Preparar exposición final QA' })).toHaveCount(0);
});

for (const width of [320,390,640,768,1440]) {
  test(`200% font reflow, touch targets and short viewport at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:450});await seed(page);
    for (const route of ['/','/ahora','/horario?date=2026-09-14','/horario?date=2026-09-14&view=week','/horario?date=2026-09-14&view=month','/mas']) {
      await page.goto(route);await page.locator('main').waitFor();
      await page.evaluate(()=>document.documentElement.style.fontSize='200%');
      await noOverflow(page);
      const undersized=await page.locator('button, .primary-nav a').evaluateAll(elements=>elements.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<24||r.height<24)}).map(e=>e.textContent));
      expect(undersized).toEqual([]);
    }
    await page.goto('/horario?date=2026-09-14');await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    await page.getByRole('button',{name:/Ver detalle:/}).first().click();
    const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(d=>d.scrollWidth-d.clientWidth)).toBeLessThanOrEqual(1);
    await expect(page.getByRole('button',{name:'Cerrar detalle de clase'})).toBeInViewport();
    await page.keyboard.press('Escape');
  });
}

test('refresh during loading, detail deep link, missing route and Pino off',async({page})=>{
  await page.goto('/');await login(page);await expect(page.getByRole('button',{name:'Consultando…'})).toBeVisible();
  await page.reload();await expect(page.getByRole('button',{name:'Continuar',exact:true})).toBeEnabled();
  await page.waitForTimeout(2500);expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
  const data=storedSession();data.session.student.isPino=false;await seed(page,data);
  await page.goto('/horario?date=2026-09-14&class=mat-01-mon');await expect(page.getByRole('dialog')).toBeVisible();
  await page.reload();await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('¿Primera vez en este edificio?')).toHaveCount(0);
  await page.keyboard.press('Escape');await page.goto('/ruta-que-no-existe');await expect(page).toHaveURL(/\/$/);
});

test('manually corrupted storage is ignored on refocus and untrusted text stays text',async({page})=>{
  const data=storedSession();data.session.schedule.classes[0]!.subjectName='<img src=x onerror="window.qaInjection=true">';
  await seed(page,data);await page.goto('/horario?date=2026-09-14');
  await expect(page.getByText(data.session.schedule.classes[0]!.subjectName,{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>Reflect.get(window,'qaInjection'))).toBeUndefined();
  await page.evaluate(k=>{localStorage.setItem(k,'{broken');window.dispatchEvent(new Event('focus'))},key);
  await expect(page).toHaveURL(/\/$/);await expect(page.getByText(/No pudimos leer el horario guardado/)).toBeVisible();
});
