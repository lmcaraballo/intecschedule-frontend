import { test, expect } from '@playwright/test';
import { storedSession, key, login, demoPassword } from './helpers';

const flat = (session: ReturnType<typeof storedSession>['session']) => ({student: session.student, ...session.schedule});
test.beforeEach(async ({context}) => {
  await context.route('**/api/user/login', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({studentId:'QA-STUDENT',password:demoPassword});
    expect(route.request().headers()['authorization']).toBeUndefined();
    await route.fulfill({json:{accessToken:'fictional-access-token',refreshToken:'fictional-refresh-token',tokenType:'bearer',expiresIn:900}});
  });
});

test('HTTP login and schedule use two POSTs and never persist credentials or tokens', async ({ page }) => {
  let requests=0;
  await page.route('**/api/schedule',async route=>{
    requests++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().postData()).toBeNull();
    expect(route.request().headers()['authorization']).toBe('Bearer fictional-access-token');
    expect(route.request().headers()['cookie']).toBeUndefined();
    await new Promise(resolve=>setTimeout(resolve,400));
    await route.fulfill({json:{...flat(storedSession().session),password:'backend-extra-must-be-stripped'}});
  });
  await page.goto('/');await expect(page.getByText('Estás en una versión de demostración')).toHaveCount(0);
  await login(page);await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/ahora$/);expect(requests).toBe(1);
  const raw=await page.evaluate(k=>localStorage.getItem(k),key);
  expect(raw).not.toMatch(/password|QA-only-fictional|backend-extra|source|token/i);
});

for(const code of ['INVALID_CREDENTIALS','PORTAL_UNAVAILABLE','SCHEDULE_NOT_FOUND','PORTAL_STRUCTURE_CHANGED','INVALID_RESPONSE','UNKNOWN_ERROR','AUTHENTICATION_REQUIRED']) {
  test(`HTTP ${code} keeps previous data and hides backend details`,async({page})=>{
    await page.goto('/');await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data:storedSession()});await page.reload();
    const previous=await page.evaluate(k=>localStorage.getItem(k),key);
    await page.route('**/api/schedule',route=>route.fulfill({status:503,json:{error:{code,message:'private-server-detail',stack:'private-stack'}}}));
    await login(page);await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(code);await expect(page.locator('body')).not.toContainText('private-');
    expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(previous);
    await page.getByRole('button',{name:'Continuar con horario guardado'}).click();await expect(page).toHaveURL(/\/ahora$/);
  });
}

test('malformed HTTP success and network failure are controlled on first use',async({page})=>{
  await page.goto('/');await page.route('**/api/schedule',route=>route.fulfill({json:{student:{id:'QA-STUDENT'}}}));
  await login(page);await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
  await page.unroute('**/api/schedule');await page.route('**/api/schedule',route=>route.abort('connectionfailed'));
  await login(page);await expect(page.getByRole('alert')).toContainText('portal');
});

test('two tabs: delayed older response never replaces the newer saved schedule',async({page,context})=>{
  const other=await context.newPage();
  const older=storedSession().session;older.schedule.fetchedAt=new Date(Date.now()-2000).toISOString();
  const newer=storedSession().session;newer.schedule.fetchedAt=new Date(Date.now()-1000).toISOString();newer.schedule.classes=[];
  let release!:()=>void;const waiting=new Promise<void>(resolve=>{release=resolve});
  await page.route('**/api/schedule',async route=>{await waiting;await route.fulfill({json:flat(older)})});
  await other.route('**/api/schedule',route=>route.fulfill({json:flat(newer)}));
  await page.goto('/');await other.goto('/');await login(page);
  await expect(page.getByRole('button',{name:'Consultando…'})).toBeVisible();
  await login(other);await expect(other).toHaveURL(/\/ahora$/);
  release();await expect(page.getByRole('alert')).toContainText('desactualizada');
  expect(JSON.parse((await page.evaluate(k=>localStorage.getItem(k),key))!).session).toEqual(newer);
  await page.getByRole('button',{name:'Continuar con horario guardado'}).click();
  await expect(page.getByRole('heading',{name:'Tu horario todavía no tiene clases'})).toBeVisible();await other.close();
});


test('login failure prevents schedule access and exposes no server details',async({page})=>{
  let calls=0;
  await page.route('**/api/user/login',route=>route.fulfill({status:401,json:{error:{code:'INVALID_CREDENTIALS',message:'private-login-detail'}}}));
  await page.route('**/api/schedule',route=>{calls++;return route.abort()});
  await page.goto('/');await login(page);
  await expect(page.getByRole('alert')).toContainText('Revisa tu identificación');
  expect(calls).toBe(0);await expect(page.locator('body')).not.toContainText('private-login-detail');
  expect(await page.evaluate(()=>sessionStorage.length)).toBe(0);
});

test('twelve-class portal response renders days, week, blank professor and virtual location',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  const entries = [
    ['ICSG202','ALGORITMOS MALICIOSOS',2,'07:00','09:00','Aula'],
    ['IINF335','DISEÑO DE SOFTWARE',2,'10:00','14:00','Aula'],
    ['INGG214','ANÁLISIS DE DATOS EN INGENIERÍ',2,'14:00','16:00','Aula'],
    ['IINF325','ASEGURAMIENTO DE LA CALIDAD DE',2,'20:00','22:00','Aula'],
    ['IINF347','TENDENCIAS EN DESARROLLO DE SO',3,'16:00','19:00','Aula'],
    ['ICSG202','ALGORITMOS MALICIOSOS',4,'07:00','09:00','VIRTUAL'],
    ['IINF325','ASEGURAMIENTO DE LA CALIDAD DE',4,'12:00','14:00','AULA AJ-103'],
    ['INGG214','ANÁLISIS DE DATOS EN INGENIERÍ',4,'14:00','16:00','LABTI405'],
    ['IINF347L','LABORATORIO TENDENCIAS EN DESA',4,'19:00','22:00','Aula'],
    ['ICSG202L','LABORATORIO DE ALGORITMOS MALI',5,'07:00','09:00','Aula'],
    ['IINF325L','LABORATORIO ASEGURAMIENTO DE L',5,'18:00','21:00','Aula'],
    ['ICSG202L','LABORATORIO DE ALGORITMOS MALI',6,'07:00','08:00','VIRTUAL'],
  ] as const;
  const body={student:{id:'QA-STUDENT',isPino:false},fetchedAt:'2026-09-18T11:53:33.872305-04:00',
    classes:entries.map(([subjectCode,subjectName,day,startTime,endTime,location],i)=>({id:`qa-${i}`,subjectCode,subjectName,section:'QA',professor:'',day,startTime,endTime,location}))};
  await page.route('**/api/schedule',route=>route.fulfill({json:body}));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');await login(page);await expect(page).toHaveURL(/\/ahora$/);
  for(const [date,count] of [['2026-09-14',0],['2026-09-15',4],['2026-09-16',1],['2026-09-17',4],['2026-09-18',2],['2026-09-19',1]] as const){
    await page.goto(`/horario?date=${date}`);
    await expect(page.getByRole('button',{name:/Ver detalle:/})).toHaveCount(count);
  }
  await page.goto('/horario?date=2026-09-17');
  await page.getByRole('button',{name:/Ver detalle:.*ALGORITMOS MALICIOSOS/}).click();
  await expect(page.getByRole('dialog')).toContainText('ProfesorPor confirmar');
  await expect(page.getByRole('dialog')).toContainText('VIRTUAL');
  await page.keyboard.press('Escape');
  await page.goto('/horario?date=2026-09-14&view=week');
  await expect(page.getByRole('button',{name:/Ver detalle:/})).toHaveCount(12);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.screenshot({path:'../../backend-integration/horario-movil.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:'../../backend-integration/horario-desktop.png',fullPage:true});
  expect(await page.evaluate(()=>JSON.stringify({local:localStorage,session:sessionStorage}))).not.toMatch(/fictional-access|fictional-refresh|QA-only-fictional/);
  expect(errors).toEqual([]);
});


test('institutional email sends only the normalized student ID to login',async({page})=>{
  let received:unknown;
  await page.route('**/api/user/login',async route=>{
    received=route.request().postDataJSON();
    await route.fulfill({json:{accessToken:'fictional-token',tokenType:'bearer',expiresIn:900}});
  });
  const session=storedSession().session;session.student.id='1127998';
  await page.route('**/api/schedule',route=>route.fulfill({json:flat(session)}));
  await page.goto('/');
  await page.getByLabel('Identificación o matrícula').fill('  1127998@EST.INTEC.EDU.DO  ');
  await page.getByLabel('Contraseña institucional',{exact:true}).fill(demoPassword);
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(page).toHaveURL(/\/ahora$/);
  expect(received).toEqual({studentId:'1127998',password:demoPassword});
  expect(JSON.parse((await page.evaluate(k=>localStorage.getItem(k),key))!).session.student.id).toBe('1127998');
});

test('unsupported email is rejected before any backend request',async({page})=>{
  let calls=0;await page.route('**/api/**',route=>{calls++;return route.abort()});
  await page.goto('/');await page.getByLabel('Identificación o matrícula').fill('1127998@example.com');
  await page.getByLabel('Contraseña institucional',{exact:true}).fill(demoPassword);
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(page.getByLabel('Identificación o matrícula')).toHaveAttribute('aria-invalid','true');
  await expect(page.getByText('Usa tu matrícula o tu correo de estudiante @est.intec.edu.do.')).toBeVisible();
  expect(calls).toBe(0);
});

test('virtual meetings, Sunday and asynchronous components survive login and reload', async ({ page }) => {
  const session=storedSession().session;
  session.schedule.classes=[{...session.schedule.classes[0]!,id:'virtual-sunday',subjectName:'Encuentro virtual QA',day:7,startTime:'10:00',endTime:'11:00',location:'VIRTUAL'}];
  const response={...flat(session),unscheduledSubjects:[
    {id:'async',subjectCode:'QA-A',subjectName:'Trabajo autónomo QA',section:'01',reason:'asynchronous',location:'VIRTUAL'},
    {id:'unknown',subjectCode:'QA-U',subjectName:'Modalidad sin confirmar QA',section:'02',reason:'not_reported',location:'VIRTUAL'},
    {id:'pending',subjectCode:'QA-P',subjectName:'Encuentro pendiente QA',section:'03',reason:'to_be_announced'},
  ]};
  await page.route('**/api/schedule',route=>route.fulfill({json:response}));
  await page.goto('/');await login(page);await expect(page).toHaveURL(/\/ahora$/);
  await expect(page.getByText(/Asíncrona: el portal lo indica expresamente/)).toBeVisible();
  await expect(page.getByText(/puede ser asíncrona o tener un horario pendiente/)).toBeVisible();
  await expect(page.getByText(/Horario por anunciar:/)).toBeVisible();
  await page.goto('/horario?date=2026-09-20&view=week');
  await expect(page.getByLabel('Horario semanal de lunes a domingo')).toBeVisible();
  await expect(page.getByRole('button',{name:/Ver detalle: Encuentro virtual QA/})).toHaveCount(1);
  await expect(page.getByText('VIRTUAL · con horario programado')).toBeVisible();
  await page.getByRole('button',{name:/Ver domingo/}).click();
  await expect(page).toHaveURL(/date=2026-09-20/);
  await page.reload();await expect(page.getByRole('button',{name:/Ver detalle: Encuentro virtual QA/})).toHaveCount(1);
  await expect(page.getByText(/Trabajo autónomo QA/)).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('only asynchronous subjects do not claim the student has no registered classes', async ({ page }) => {
  const session=storedSession().session;session.schedule.classes=[];
  await page.route('**/api/schedule',route=>route.fulfill({json:{...flat(session),unscheduledSubjects:[{id:'async',subjectCode:'QA-A',subjectName:'Trabajo autónomo QA',section:'01',reason:'asynchronous'}]}}));
  await page.goto('/');await login(page);await expect(page).toHaveURL(/\/ahora$/);
  await expect(page.getByRole('heading',{name:'Hoy no hay encuentros con hora en tu horario.'})).toBeVisible();
  await expect(page.getByText('Tu horario no tiene clases registradas.')).toHaveCount(0);
  await expect(page.getByText(/Revisa las actividades y fechas de entrega/)).toBeVisible();
});
