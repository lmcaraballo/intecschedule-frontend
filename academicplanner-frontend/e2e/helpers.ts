import { expect, type Page } from '@playwright/test';
import { createMockSession } from '../src/mocks/academicSession';

export const key = 'academicplanner:data:v1';
export const demoPassword = 'QA-only-fictional-123';
export function storedSession() {
  return { version: 1, session: createMockSession('QA-STUDENT'), preferences: { theme: 'day' } };
}
export async function seed(page: Page, stored = storedSession()) {
  await page.goto('/');
  await page.evaluate(({ key, stored }) => localStorage.setItem(key, JSON.stringify(stored)), { key, stored });
}
export async function login(page: Page) {
  await page.getByLabel('Identificación o matrícula').fill('QA-STUDENT');
  await page.getByLabel('Contraseña institucional', { exact: true }).fill(demoPassword);
  await page.getByRole('button', { name: /^(Continuar|Volver a intentar)$/ }).click();
}
export async function noOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
}
