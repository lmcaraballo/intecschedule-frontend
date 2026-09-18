import { test, expect } from '@playwright/test';
import { storedSession, key, login, demoPassword } from './helpers';

test('HTTP transport sends one POST, receives data and never persists credentials', async ({ page }) => {
  let requests=0;
  await page.route('**/api/academic/schedule',async route=>{
    requests++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({studentId:'QA-STUDENT',password:demoPassword});
    expect(route.request().headers()['cookie']).toBeUndefined();
    await new Promise(resolve=>setTimeout(resolve,400));
    await route.fulfill({json:{...storedSession().session,source:{status:'ok'},password:'backend-extra-must-be-stripped'}});
  });
  await page.goto('/');await expect(page.getByText('Estás en una versión de demostración')).toHaveCount(0);
  await login(page);await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/ahora$/);expect(requests).toBe(1);
  const raw=await page.evaluate(k=>localStorage.getItem(k),key);
  expect(raw).not.toMatch(/password|QA-only-fictional|backend-extra|source/);
});

for(const code of ['INVALID_CREDENTIALS','PORTAL_UNAVAILABLE','SCHEDULE_NOT_FOUND','PORTAL_STRUCTURE_CHANGED','INVALID_RESPONSE','UNKNOWN_ERROR']) {
  test(`HTTP ${code} keeps previous data and hides backend details`,async({page})=>{
    await page.goto('/');await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data:storedSession()});await page.reload();
    const previous=await page.evaluate(k=>localStorage.getItem(k),key);
    await page.route('**/api/academic/schedule',route=>route.fulfill({status:503,json:{error:{code,message:'private-server-detail',stack:'private-stack'}}}));
    await login(page);await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(code);await expect(page.locator('body')).not.toContainText('private-');
    expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(previous);
    await page.getByRole('button',{name:'Continuar con horario guardado'}).click();await expect(page).toHaveURL(/\/ahora$/);
  });
}

test('malformed HTTP success and network failure are controlled on first use',async({page})=>{
  await page.goto('/');await page.route('**/api/academic/schedule',route=>route.fulfill({json:{student:{id:'QA-STUDENT'}}}));
  await login(page);await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
  await page.unroute('**/api/academic/schedule');await page.route('**/api/academic/schedule',route=>route.abort('connectionfailed'));
  await login(page);await expect(page.getByRole('alert')).toContainText('portal');
});
