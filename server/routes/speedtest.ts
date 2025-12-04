import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { freeboxApi } from '../services/freeboxApi.js';

const execAsync = promisify(exec);
const router = Router();

interface PingResult {
  target: string;
  latency: number;
  jitter: number;
  packetLoss: number;
}

interface ConnectionStatus {
  rate_down: number;
  rate_up: number;
  bandwidth_down: number;
  bandwidth_up: number;
  state: string;
  type: string;
  media: string;
}

// Parse ping output to extract latency stats
function parsePingOutput(output: string): { avg: number; mdev: number; loss: number } {
  try {
    // Parse packet loss (e.g., "0% packet loss")
    const lossMatch = output.match(/(\d+(?:\.\d+)?)% packet loss/);
    const loss = lossMatch ? parseFloat(lossMatch[1]) : 0;

    // Parse latency stats (e.g., "rtt min/avg/max/mdev = 5.123/10.456/15.789/2.345 ms")
    const rttMatch = output.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
    if (rttMatch) {
      return {
        avg: parseFloat(rttMatch[2]),
        mdev: parseFloat(rttMatch[4]),
        loss
      };
    }

    // macOS format: "round-trip min/avg/max/stddev = 5.123/10.456/15.789/2.345 ms"
    const macMatch = output.match(/round-trip min\/avg\/max\/stddev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
    if (macMatch) {
      return {
        avg: parseFloat(macMatch[2]),
        mdev: parseFloat(macMatch[4]),
        loss
      };
    }

    return { avg: 0, mdev: 0, loss: 100 };
  } catch {
    return { avg: 0, mdev: 0, loss: 100 };
  }
}

// GET /api/speedtest/ping - Run ping test to measure latency and jitter
router.get('/ping', asyncHandler(async (req, res) => {
  const target = (req.query.target as string) || '8.8.8.8'; // Google DNS as default
  const count = Math.min(parseInt(req.query.count as string) || 10, 20); // Max 20 pings

  try {
    // Run ping command
    const { stdout } = await execAsync(`ping -c ${count} ${target}`, {
      timeout: 30000
    });

    const stats = parsePingOutput(stdout);

    const result: PingResult = {
      target,
      latency: Math.round(stats.avg * 100) / 100,
      jitter: Math.round(stats.mdev * 100) / 100,
      packetLoss: stats.loss
    };

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[Speedtest] Ping failed:', error);
    res.json({
      success: false,
      error: {
        code: 'ping_failed',
        message: 'Impossible de mesurer la latence'
      }
    });
  }
}));

// GET /api/speedtest/bandwidth - Get current bandwidth from Freebox API
router.get('/bandwidth', asyncHandler(async (_req, res) => {
  try {
    const connectionResult = await freeboxApi.getConnectionStatus();

    if (connectionResult.success && connectionResult.result) {
      const conn = connectionResult.result as ConnectionStatus;
      res.json({
        success: true,
        result: {
          // Current rates (bytes/s -> bits/s -> Gbps)
          downloadRate: (conn.rate_down * 8) / 1_000_000_000,
          uploadRate: (conn.rate_up * 8) / 1_000_000_000,
          // Max bandwidth (bits/s -> Gbps)
          downloadMax: conn.bandwidth_down / 1_000_000_000,
          uploadMax: conn.bandwidth_up / 1_000_000_000,
          // Connection state
          state: conn.state,
          type: conn.type,
          media: conn.media
        }
      });
    } else {
      res.json({
        success: false,
        error: {
          code: 'connection_error',
          message: 'Impossible de récupérer les informations de connexion'
        }
      });
    }
  } catch (error) {
    console.error('[Speedtest] Bandwidth check failed:', error);
    res.json({
      success: false,
      error: {
        code: 'bandwidth_error',
        message: 'Erreur lors de la récupération du débit'
      }
    });
  }
}));

// POST /api/speedtest/run - Run a full speedtest
router.post('/run', asyncHandler(async (req, res) => {
  const { pingTarget = '8.8.8.8', samples = 10 } = req.body;

  try {
    // Step 1: Ping test
    let pingResult: PingResult = {
      target: pingTarget,
      latency: 0,
      jitter: 0,
      packetLoss: 0
    };

    try {
      const { stdout } = await execAsync(`ping -c 10 ${pingTarget}`, { timeout: 15000 });
      const stats = parsePingOutput(stdout);
      pingResult = {
        target: pingTarget,
        latency: Math.round(stats.avg * 100) / 100,
        jitter: Math.round(stats.mdev * 100) / 100,
        packetLoss: stats.loss
      };
    } catch {
      console.log('[Speedtest] Ping failed, continuing with bandwidth test');
    }

    // Step 2: Collect bandwidth samples
    const downloadSamples: number[] = [];
    const uploadSamples: number[] = [];
    let maxDownload = 0;
    let maxUpload = 0;

    const sampleCount = Math.min(samples, 15);

    for (let i = 0; i < sampleCount; i++) {
      const connectionResult = await freeboxApi.getConnectionStatus();

      if (connectionResult.success && connectionResult.result) {
        const conn = connectionResult.result as ConnectionStatus;
        const downloadGbps = (conn.rate_down * 8) / 1_000_000_000;
        const uploadGbps = (conn.rate_up * 8) / 1_000_000_000;

        downloadSamples.push(downloadGbps);
        uploadSamples.push(uploadGbps);

        // Track maximums (max bandwidth)
        if (conn.bandwidth_down / 1_000_000_000 > maxDownload) {
          maxDownload = conn.bandwidth_down / 1_000_000_000;
        }
        if (conn.bandwidth_up / 1_000_000_000 > maxUpload) {
          maxUpload = conn.bandwidth_up / 1_000_000_000;
        }
      }

      // Small delay between samples
      if (i < sampleCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Calculate averages and peaks
    const avgDownload = downloadSamples.length > 0
      ? downloadSamples.reduce((a, b) => a + b, 0) / downloadSamples.length
      : 0;
    const avgUpload = uploadSamples.length > 0
      ? uploadSamples.reduce((a, b) => a + b, 0) / uploadSamples.length
      : 0;
    const peakDownload = downloadSamples.length > 0
      ? Math.max(...downloadSamples)
      : 0;
    const peakUpload = uploadSamples.length > 0
      ? Math.max(...uploadSamples)
      : 0;

    res.json({
      success: true,
      result: {
        timestamp: Date.now(),
        ping: pingResult,
        download: {
          average: Math.round(avgDownload * 1000) / 1000,
          peak: Math.round(peakDownload * 1000) / 1000,
          max: Math.round(maxDownload * 100) / 100,
          samples: downloadSamples.map(v => Math.round(v * 1000) / 1000)
        },
        upload: {
          average: Math.round(avgUpload * 1000) / 1000,
          peak: Math.round(peakUpload * 1000) / 1000,
          max: Math.round(maxUpload * 100) / 100,
          samples: uploadSamples.map(v => Math.round(v * 1000) / 1000)
        }
      }
    });
  } catch (error) {
    console.error('[Speedtest] Test failed:', error);
    res.json({
      success: false,
      error: {
        code: 'test_failed',
        message: 'Erreur lors du test de débit'
      }
    });
  }
}));

export default router;