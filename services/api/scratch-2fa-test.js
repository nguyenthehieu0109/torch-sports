
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generate } = require('otplib');

const API = 'http://localhost:3000/api';
const prisma = new PrismaClient();
const email = 'tmp-2fa-test@example.com';
const password = 'Test@12345';

const call = async (path, method = 'GET', body, token) => {
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};

(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.user.create({
    data: { email, firstName: 'Tmp', lastName: 'Test', passwordHash: await bcrypt.hash(password, 10), isVerified: true },
  });
  try {
    let r = await call('/auth/login', 'POST', { email, password });
    console.log('1 login (no 2FA)      ', r.status, !!r.json.data?.accessToken);
    const token = r.json.data.accessToken;

    r = await call('/auth/2fa/status', 'GET', null, token);
    console.log('2 status              ', r.status, JSON.stringify(r.json.data));
    r = await call('/auth/2fa/setup', 'POST', null, token);
    console.log('3 setup               ', r.status, r.json.data?.qrCode?.slice(0, 22));
    const secret = r.json.data.secret;

    r = await call('/auth/2fa/enable', 'POST', { code: '000000' }, token);
    console.log('4 enable wrong code   ', r.status, r.json.message);
    r = await call('/auth/2fa/enable', 'POST', { code: await generate({ secret }) }, token);
    console.log('5 enable right code   ', r.status, r.json.message);

    r = await call('/auth/login', 'POST', { email, password });
    console.log('6 login with 2FA      ', r.status, 'requires2FA=', r.json.data?.requires2FA, 'tokens=', !!r.json.data?.accessToken);
    const temp = r.json.data.tempToken;

    r = await call('/auth/2fa/status', 'GET', null, temp);
    console.log('7 tempToken as access ', r.status, '(expect 401)');
    r = await call('/auth/refresh', 'POST', { refreshToken: temp });
    console.log('8 tempToken refresh   ', r.status, '(expect 401)');
    r = await call('/auth/2fa/login', 'POST', { tempToken: temp, code: '000000' });
    console.log('9 2fa login wrong     ', r.status, r.json.message);
    r = await call('/auth/2fa/login', 'POST', { tempToken: temp, code: await generate({ secret }) });
    console.log('10 2fa login right    ', r.status, 'tokens=', !!r.json.data?.accessToken);
    const t2 = r.json.data.accessToken;

    r = await call('/auth/2fa/disable', 'POST', { password: 'sai', code: await generate({ secret }) }, t2);
    console.log('11 disable wrong pass ', r.status, r.json.message);
    r = await call('/auth/2fa/disable', 'POST', { password, code: await generate({ secret }) }, t2);
    console.log('12 disable ok         ', r.status, r.json.message);
    r = await call('/auth/login', 'POST', { email, password });
    console.log('13 login after disable', r.status, 'tokens=', !!r.json.data?.accessToken);
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
