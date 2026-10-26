const test = require('node:test');
const assert = require('node:assert/strict');

process.env.PORT = '0';
const { server } = require('../server.js');

async function startServer() {
  if (server.listening) return server;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

test('ESP readings accept water state and website commands can set water', async (t) => {
  await startServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const espRes = await fetch(`${baseUrl}/api/esp/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      temp: 22.5,
      humidity: 60,
      soil: 45,
      light: 55,
      leds: [1, 0, 1],
      water: 1,
    }),
  });

  assert.equal(espRes.status, 200);
  const espJson = await espRes.json();
  assert.deepEqual(espJson, { ok: 1 });

  const actuatorRes = await fetch(`${baseUrl}/api/actuator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ water: true }),
  });

  assert.equal(actuatorRes.status, 200);
  const actuatorJson = await actuatorRes.json();
  assert.equal(actuatorJson.water, true);

  const getRes = await fetch(`${baseUrl}/api/actuator`);
  const getJson = await getRes.json();
  assert.equal(getJson.water, true);

  t.after(() => server.close());
});
