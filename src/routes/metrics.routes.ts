/**
 * Metrics Routes
 * Exposes Prometheus-compatible metrics endpoint
 */

import { Router, Request, Response } from 'express';
import { MetricsService } from '../services/monitoring/MetricsService';

const router = Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const metricsService = MetricsService.getInstance();
    const metrics = await metricsService.getMetrics();
    
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

/**
 * GET /metrics/json
 * JSON format metrics for dashboards
 */
router.get('/json', async (req: Request, res: Response) => {
  try {
    const metricsService = MetricsService.getInstance();
    const metrics = await metricsService.getMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

export default router;
