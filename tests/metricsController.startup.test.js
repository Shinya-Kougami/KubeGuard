'use strict';

const os = require('os');

// Detecta identificadores de acceso de AWS sin duplicar la credencial del código.
const AWS_ACCESS_KEY = /(?:AKIA|ASIA)[A-Z0-9]{16}/;
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'];

function loadController() {
  let controller;
  jest.isolateModules(() => {
    controller = require('../src/controllers/metricsController');
  });
  return controller;
}

describe('Inicialización de metricsController (unitaria)', () => {
  let consoleSpies;

  beforeEach(() => {
    consoleSpies = CONSOLE_METHODS.map((method) =>
      jest.spyOn(console, method).mockImplementation(() => {})
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('anuncia la inicialización una sola vez al cargar el módulo', () => {
    loadController();

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls[0][0]).toMatch(/Iniciando controlador/);
  });

  test('reutiliza el controlador sin repetir el anuncio en importaciones sucesivas', () => {
    jest.isolateModules(() => {
      const first = require('../src/controllers/metricsController');
      const second = require('../src/controllers/metricsController');

      expect(second).toBe(first);
    });

    expect(console.log).toHaveBeenCalledTimes(1);
  });

  test('no expone identificadores de acceso de AWS en la consola al inicializar', () => {
    loadController();

    const exposesAccessKey = consoleSpies.some((spy) =>
      spy.mock.calls.some((args) => AWS_ACCESS_KEY.test(JSON.stringify(args)))
    );

    // La aserción booleana evita imprimir la credencial si la regresión falla.
    expect(exposesAccessKey).toBe(false);
  });

  test('mantiene las credenciales fuera de las exportaciones públicas', () => {
    const controller = loadController();

    expect(controller).toEqual({
      getMetrics: expect.any(Function),
      calculateHealthStatus: expect.any(Function),
      calculateCpuUsage: expect.any(Function)
    });
  });

  test('las consultas de métricas no repiten el anuncio ni incluyen credenciales', () => {
    const { getMetrics } = loadController();
    consoleSpies.forEach((spy) => spy.mockClear());
    jest.spyOn(os, 'totalmem').mockReturnValue(1024 * 1024);
    jest.spyOn(os, 'freemem').mockReturnValue(1024 * 1024);
    jest.spyOn(os, 'uptime').mockReturnValue(60);
    jest.spyOn(os, 'cpus').mockReturnValue([
      { times: { user: 0, nice: 0, sys: 0, idle: 100, irq: 0 } }
    ]);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    getMetrics({}, res);
    getMetrics({}, res);

    expect(res.status).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenNthCalledWith(1, 200);
    expect(res.status).toHaveBeenNthCalledWith(2, 200);
    expect(res.json).toHaveBeenCalledTimes(2);
    for (const [body] of res.json.mock.calls) {
      expect(Object.keys(body).sort()).toEqual([
        'cpu', 'health', 'memory', 'timestamp', 'uptimeSeconds'
      ]);
      expect(AWS_ACCESS_KEY.test(JSON.stringify(body))).toBe(false);
    }
    consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
