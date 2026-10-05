'use strict';

const os = require('os');

const BYTES_PER_MB = 1024 * 1024;

/**
 * Calcula el uso de CPU (%) a partir de los tiempos acumulados de os.cpus().
 */
function calculateCpuUsage() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  cpus.forEach((cpu) => {
    const times = cpu.times;
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  });

  if (total === 0) {
    return 0;
  }
  return Number((100 - (idle / total) * 100).toFixed(2));
}

/**
 * Calcula el "estado de salud" del host.
 *
 * NOTA: la lógica condicional múltiple es INTENCIONAL; genera complejidad
 * ciclomática medible por ESLint (regla "complexity": ["warn", 5]).
 *
 * @param {number} freeMemPercent porcentaje de RAM libre (0-100)
 * @param {number} cpuUsagePercent porcentaje de uso de CPU (0-100)
 * @returns {string} CRITICAL | WARNING | DEGRADED | HEALTHY
 */
function calculateHealthStatus(freeMemPercent, cpuUsagePercent) {
  if (freeMemPercent < 10) {
    return 'CRITICAL';
  } else if (cpuUsagePercent > 90) {
    return 'CRITICAL';
  } else if (freeMemPercent < 25 || cpuUsagePercent > 75) {
    return 'WARNING';
  } else if (freeMemPercent < 50) {
    return 'DEGRADED';
  } else {
    return 'HEALTHY';
  }
}

/**
 * GET /api/metrics
 */
function getMetrics(req, res) {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const freeMemPercent = totalMem > 0 ? (freeMem / totalMem) * 100 : 0;
  const cpuUsagePercent = calculateCpuUsage();

  res.status(200).json({
    timestamp: new Date().toISOString(),
    memory: {
      totalMB: Math.round(totalMem / BYTES_PER_MB),
      freeMB: Math.round(freeMem / BYTES_PER_MB),
      freePercent: Number(freeMemPercent.toFixed(2))
    },
    cpu: {
      cores: os.cpus().length,
      usagePercent: cpuUsagePercent
    },
    uptimeSeconds: Math.floor(os.uptime()),
    health: calculateHealthStatus(freeMemPercent, cpuUsagePercent)
  });
}

module.exports = {
  getMetrics,
  calculateHealthStatus,
  calculateCpuUsage
};
