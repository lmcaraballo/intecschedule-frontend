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

test('bottom navigation stays tactile, above content and clear at the page end', async ({ page }) => {
  await page.setViewportSize({ width: 954, height: 911 });
  await seed(page);
  await page.goto('/ahora');
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const active = nav.getByRole('link', { name: 'Ahora', exact: true });
  const header = page.locator('.app-shell--academic .site-header');
  const themeControls = page.getByRole('group', { name: 'Apariencia' });
  expect(await header.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await header.locator('.brand__mark').evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await themeControls.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  await expect(nav).toBeVisible();
  expect(await nav.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
  expect(await nav.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await active.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await active.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');

  const centerIsNavigation = await active.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return Boolean(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest('.primary-nav'));
  });
  expect(centerIsNavigation).toBe(true);

  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const clearance = await page.evaluate(() => {
    const navRect = document.querySelector('.primary-nav')!.getBoundingClientRect();
    const footerRect = document.querySelector('.site-footer')!.getBoundingClientRect();
    return navRect.top - footerRect.bottom;
  });
  expect(clearance).toBeGreaterThanOrEqual(8);
});

test('day schedule controls read as one compact tactile workspace', async ({ page }) => {
  await page.setViewportSize({ width: 954, height: 911 });
  await seed(page);
  await page.goto('/horario?date=2026-10-01&view=day');
  const viewSwitch = page.getByRole('group', { name: 'Vista del horario' });
  const activeView = viewSwitch.getByRole('button', { name: 'Día', exact: true });
  const dayPicker = page.getByRole('group', { name: 'Seleccionar día' });
  const selectedDay = dayPicker.getByRole('button', { name: /jueves, 1 de octubre/i });

  expect(await viewSwitch.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await activeView.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await dayPicker.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  await expect(selectedDay).toHaveAttribute('aria-pressed', 'true');
  expect(await selectedDay.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  const scheduleCard = page.locator('.day-schedule .class-card').first();
  expect(await scheduleCard.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  await scheduleCard.hover();
  expect(await scheduleCard.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');

  await page.goto('/ahora');
  const nowHero = page.locator('.now-hero');
  await expect(nowHero).toBeVisible();
  await expect(nowHero.getByText(/Estudiante · tu espacio académico/)).toBeVisible();
  expect(await nowHero.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await nowHero.locator('.day-status').evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await nowHero.getByRole('link', { name: /Ver horario/ }).evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  const nowCard = page.locator('.now-page .class-card').first();
  expect(await nowCard.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await nowCard.locator('.class-card__top > svg').evaluate((element) => getComputedStyle(element).borderRadius)).toBe('50%');
});

test('campus model keeps controls out of the map caption and reports the active camera', async ({ page }) => {
  await page.setViewportSize({ width: 954, height: 911 });
  await seed(page);
  await page.goto('/ahora');
  const controls = page.getByRole('group', { name: 'Controles de la maqueta 3D' });
  await expect(controls.getByRole('button', { name: /Enfocar/ })).toBeEnabled();
  await expect(controls.getByRole('button', { name: /Enfocar/ })).toHaveAttribute('aria-pressed', 'true');

  const map = page.locator('.campus-3d-map');
  await map.scrollIntoViewIfNeeded();
  const mapBox = await map.boundingBox();
  expect(mapBox).not.toBeNull();
  await page.mouse.click(mapBox!.x + mapBox!.width * 0.5, mapBox!.y + mapBox!.height * 0.42);
  const expandedPreview = page.getByRole('dialog', { name: /Explorando/ });
  await expect(expandedPreview).toBeVisible();
  await expect(expandedPreview.getByRole('button', { name: 'Cerrar vista ampliada' })).toBeFocused();
  expect(await expandedPreview.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
  const navigationIsCovered = await page.evaluate(() => {
    const navigation = document.querySelector('.primary-nav')!.getBoundingClientRect();
    return Boolean(document.elementFromPoint(
      navigation.left + navigation.width / 2,
      navigation.top + navigation.height / 2,
    )?.closest('.campus-preview--expanded'));
  });
  expect(navigationIsCovered).toBe(true);
  const popup = page.locator('.campus-popup');
  await expect(popup).toBeVisible();
  await expect(popup.locator('.popup-code')).not.toHaveText('');
  await expect(popup.locator('.popup-body > .popup-facilities > li')).toHaveCount(3);
  const [popupContentBox, mapShellBox] = await Promise.all([
    popup.locator('.maplibregl-popup-content').boundingBox(),
    page.locator('.campus-3d-map-shell').boundingBox(),
  ]);
  expect(popupContentBox).not.toBeNull();
  expect(mapShellBox).not.toBeNull();
  expect(popupContentBox!.x).toBeGreaterThanOrEqual(mapShellBox!.x - 2);
  expect(popupContentBox!.y).toBeGreaterThanOrEqual(mapShellBox!.y - 2);
  expect(popupContentBox!.x + popupContentBox!.width).toBeLessThanOrEqual(mapShellBox!.x + mapShellBox!.width + 2);
  expect(popupContentBox!.y + popupContentBox!.height).toBeLessThanOrEqual(mapShellBox!.y + mapShellBox!.height + 2);
  const moreFacilities = popup.locator('.popup-more');
  await expect(moreFacilities.locator('summary')).toHaveText(/Ver \d+ espacios más/);
  const closeButtonBox = await popup.getByRole('button', { name: /Close popup|Cerrar/ }).boundingBox();
  expect(closeButtonBox).not.toBeNull();
  expect(closeButtonBox!.width).toBeGreaterThanOrEqual(36);
  expect(closeButtonBox!.height).toBeGreaterThanOrEqual(36);
  await moreFacilities.locator('summary').click();
  expect(await moreFacilities.locator('.popup-facilities--more > li').count()).toBeGreaterThan(0);
  await expect.poll(() => popup.locator('.popup-body').evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(expandedPreview).toHaveCount(0);

  await controls.getByRole('button', { name: 'Ver campus completo' }).click();
  await expect(controls.getByRole('button', { name: 'Ver campus completo' })).toHaveAttribute('aria-pressed', 'true');
  await expect(controls.getByRole('button', { name: /Enfocar/ })).toHaveAttribute('aria-pressed', 'false');
  const overlap = await page.evaluate(() => {
    const controlsRect = document.querySelector('.campus-map-controls')!.getBoundingClientRect();
    const captionRect = document.querySelector('.campus-map-instructions')!.getBoundingClientRect();
    return Math.max(0, Math.min(controlsRect.right, captionRect.right) - Math.max(controlsRect.left, captionRect.left))
      * Math.max(0, Math.min(controlsRect.bottom, captionRect.bottom) - Math.max(controlsRect.top, captionRect.top));
  });
  expect(overlap).toBe(0);
});

test('More keeps settings compact and provides clear control feedback', async ({ page }) => {
  await page.setViewportSize({ width: 954, height: 911 });
  await seed(page);
  await page.goto('/mas');
  const tabs = page.getByRole('tablist', { name: 'Secciones de Más' });
  await expect(tabs.getByRole('tab', { name: /Preferencias/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: /Inicio y horario/ })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /Apariencia y accesibilidad/ })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('body').evaluate((element) => element.scrollHeight)).toBeLessThan(1250);

  await page.getByRole('button', { name: /Apariencia y accesibilidad/ }).click();
  const themeAuto = page.getByLabel('Tema visual').getByRole('button', { name: 'Auto', exact: true });
  await themeAuto.click();
  await expect(themeAuto).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Ciclo diario del tema automático')).toContainText('Auto acompaña la hora');
  await expect(page.getByLabel('Ciclo diario del tema automático').locator('[aria-current="true"]')).toHaveCount(1);
  expect(await themeAuto.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  await page.getByText('Contraste reforzado', { exact: true }).click();
  await expect(page.getByRole('switch', { name: /Contraste reforzado/ })).toBeChecked();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');

  await tabs.getByRole('tab', { name: /Calendario INTEC/ }).click();
  await expect(page.getByRole('heading', { name: 'Año académico 2026–2027' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tus datos, bajo tu control' })).toHaveCount(0);
  await tabs.getByRole('tab', { name: /Privacidad/ }).click();
  await expect(page.getByRole('heading', { name: 'Tus datos, bajo tu control' })).toBeVisible();
});

test('automatic theme shows the current phase and the manual control slides between day and night', async ({ page }) => {
  const data = storedSession();
  data.preferences.theme = 'auto';
  await seed(page, data);
  await page.goto('/ahora');

  const controls = page.getByRole('group', { name: 'Apariencia' });
  const auto = controls.getByRole('button', { name: 'Auto', exact: true });
  const toggle = controls.locator('.theme-toggle');
  await expect(controls).toHaveAttribute('data-mode', 'auto');
  await expect(controls).toHaveAttribute('data-phase', /morning|day|sunset|night/);
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAttribute('aria-label', /Tema automático: (mañana|día|atardecer|noche)/);

  await toggle.click();
  await expect(controls).toHaveAttribute('data-mode', /day|night/);
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  const firstManualPosition = await toggle.evaluate((element) => getComputedStyle(element).transform);

  await toggle.click();
  const secondManualPosition = await toggle.evaluate((element) => getComputedStyle(element).transform);
  expect(secondManualPosition).not.toBe(firstManualPosition);

  await auto.click();
  await expect(controls).toHaveAttribute('data-mode', 'auto');
  await expect(toggle).toHaveAttribute('aria-label', /Tema automático:/);
});

test('access validation, Enter, repeated submission, privacy, reload and detail keyboard', async ({ page }) => {
  await page.goto('/');
  for (const selector of ['.welcome', '.access-card', '.continue-button']) {
    expect(await page.locator(selector).evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  }
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
  await page.getByRole('button', { name: /Apariencia y accesibilidad/ }).click();
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
  await expect(page.getByRole('heading', { name: 'Mis eventos personales' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Personales/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /Fechas INTEC/ }).click();
  await expect(page.locator('.event-card')).toHaveCount(8);
  await expect(page.getByRole('button', { name: /Mostrar \d+ eventos más/ })).toBeVisible();

  await page.getByRole('tab', { name: /Mi horario/ }).click();
  await page.getByRole('button', { name: 'Enviar clases a Google' }).click();
  await expect(page.getByRole('status')).toContainText('Horario sincronizado');
  await expect(page.getByText('Clase sincronizada').first()).toBeVisible();
  await page.getByRole('button', { name: 'Enviar clases a Google' }).click();
  await expect(page.getByRole('status')).toContainText(/No se duplicaron [1-9]/);

  await page.getByRole('tab', { name: /Personales/ }).click();
  await page.getByRole('button', { name: 'Nueva actividad' }).click();
  await page.getByLabel('Título').fill('Preparar exposición QA');
  await page.getByLabel('Fecha').fill('2026-10-08');
  await page.getByLabel('Inicio', { exact: true }).fill('16:00');
  await page.getByLabel('Fin', { exact: true }).fill('15:00');
  await expect(page.getByText('La hora de fin debe ser posterior a la de inicio.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear evento' })).toBeDisabled();
  await page.getByLabel('Fin', { exact: true }).fill('17:00');
  await page.getByText('Añadir detalles opcionales').click();
  await page.getByLabel(/Lugar/).fill('Biblioteca');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  await expect(page.getByRole('heading', { name: 'Preparar exposición QA' })).toBeVisible();

  const personalCard = page.getByRole('listitem').filter({ hasText: 'Preparar exposición QA' });
  expect(await personalCard.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
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
