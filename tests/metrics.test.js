'use strict';

const os = require('os');
const request = require('supertest');
const app = require('../src/app');
const {
  calculateHealthStatus,
  calculateCpuUsage
} = require('../src/controllers/metricsController');

const TOTAL = 16 * 1024 * 1024 * 1024; // 16 GB

/**
 * Simula el estado del host: porcentaje de RAM libre y de CPU ocupada.
 */
function mockHost({ freePercent, cpuBusyPercent, cores = 2 }) {
  jest.spyOn(os, 'totalmem').mockReturnValue(TOTAL);
  jest.spyOn(os, 'freemem').mockReturnValue(TOTAL * (freePercent / 100));
  jest.spyOn(os, 'uptime').mockReturnValue(3600.7);

  const cpu = {
    times: {
      user: cpuBusyPercent * 10,
      nice: 0,
      sys: 0,
      idle: (100 - cpuBusyPercent) * 10,
      irq: 0
    }
  };
  jest.spyOn(os, 'cpus').mockReturnValue(Array(cores).fill(cpu));
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/metrics', () => {
  test('responde 200 con la estructura esperada', async () => {
    mockHost({ freePercent: 80, cpuBusyPercent: 10 });

    const res = await request(app).get('/api/metrics');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.memory).toEqual({
      totalMB: 16384,
      freeMB: 13107,
      freePercent: 80
    });
    expect(res.body.cpu).toEqual({ cores: 2, usagePercent: 10 });
    expect(res.body.uptimeSeconds).toBe(3600);
  });

  test('estado HEALTHY con recursos holgados', async () => {
    mockHost({ freePercent: 80, cpuBusyPercent: 10 });
    const res = await request(app).get('/api/metrics');
    expect(res.body.health).toBe('HEALTHY');
  });

  test('estado CRITICAL cuando la RAM libre es < 10%', async () => {
    mockHost({ freePercent: 5, cpuBusyPercent: 10 });
    const res = await request(app).get('/api/metrics');
    expect(res.body.health).toBe('CRITICAL');
  });

  test('estado CRITICAL cuando la CPU supera el 90%', async () => {
    mockHost({ freePercent: 80, cpuBusyPercent: 95 });
    const res = await request(app).get('/api/metrics');
    expect(res.body.health).toBe('CRITICAL');
  });

  test('estado WARNING por RAM libre < 25%', async () => {
    mockHost({ freePercent: 20, cpuBusyPercent: 10 });
    const res = await request(app).get('/api/metrics');
    expect(res.body.health).toBe('WARNING');
  });

  test('estado WARNING por CPU > 75%', async () => {
    mockHost({ freePercent: 80, cpuBusyPercent: 80 });
    const res = await request(app).get('/api/metrics');
    expect(res.body.health).toBe('WARNING');
  });

  test('estado DEGRADED cuando la RAM libre está entre 25% y 50%', async () => {
    mockHost({ freePercent: 40, cpuBusyPercent: 10 });
    const res = await request(app).get('/api/metrics');
    expect(res.body.health).toBe('DEGRADED');
  });

  test('maneja memoria total 0 y CPU sin tiempos sin lanzar errores', async () => {
    jest.spyOn(os, 'totalmem').mockReturnValue(0);
    jest.spyOn(os, 'freemem').mockReturnValue(0);
    jest.spyOn(os, 'uptime').mockReturnValue(0);
    jest.spyOn(os, 'cpus').mockReturnValue([
      { times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }
    ]);

    const res = await request(app).get('/api/metrics');

    expect(res.statusCode).toBe(200);
    expect(res.body.memory.freePercent).toBe(0);
    expect(res.body.cpu.usagePercent).toBe(0);
    expect(res.body.health).toBe('CRITICAL');
  });

  test('devuelve 404 en rutas inexistentes', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.statusCode).toBe(404);
  });
});

describe('calculateHealthStatus (unitaria)', () => {
  test.each([
    [5, 10, 'CRITICAL'],
    [50, 95, 'CRITICAL'],
    [20, 10, 'WARNING'],
    [60, 80, 'WARNING'],
    [40, 10, 'DEGRADED'],
    [90, 5, 'HEALTHY']
  ])('RAM libre %i%%, CPU %i%% => %s', (mem, cpu, expected) => {
    expect(calculateHealthStatus(mem, cpu)).toBe(expected);
  });
});

describe('calculateCpuUsage (unitaria)', () => {
  test('calcula el porcentaje de uso a partir de los tiempos de CPU', () => {
    mockHost({ freePercent: 50, cpuBusyPercent: 30 });
    expect(calculateCpuUsage()).toBe(30);
  });
});
