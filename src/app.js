'use strict';

const express = require('express');
const { getMetrics } = require('./controllers/metricsController');

const app = express();

app.disable('x-powered-by');

app.get('/api/metrics', getMetrics);

module.exports = app;
