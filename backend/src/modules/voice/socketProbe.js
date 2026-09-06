/**
 * Fast Service Connectivity Probe (Phase 6.5)
 * Probes whether a local or remote HTTP endpoint's TCP port is listening within ~250ms.
 * Prevents Express request threads from hanging for 10-12 seconds when the Indic python runtime is offline.
 */

import net from 'net';

const probeCache = new Map();

/**
 * Checks if the endpoint's host and port are accepting TCP connections.
 * Caches positive/negative results for 2.5 seconds to minimize socket churn.
 *
 * @param {string} endpointUrl - e.g. "http://127.0.0.1:8001/tts"
 * @param {number} timeoutMs - Socket connect timeout in ms (default 250ms)
 * @returns {Promise<boolean>}
 */
export async function isServiceReachable(endpointUrl, timeoutMs = 250) {
  if (!endpointUrl) return false;

  const now = Date.now();
  const cached = probeCache.get(endpointUrl);
  if (cached && now - cached.timestamp < 2500) {
    return cached.alive;
  }

  let host = '127.0.0.1';
  let port = 80;

  try {
    const parsed = new URL(endpointUrl);
    host = parsed.hostname || '127.0.0.1';
    port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
  } catch (e) {
    return false;
  }

  const alive = await new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const cleanup = (isAlive) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(isAlive);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => cleanup(true));
    socket.once('timeout', () => cleanup(false));
    socket.once('error', () => cleanup(false));

    try {
      socket.connect(port, host);
    } catch (err) {
      cleanup(false);
    }
  });

  probeCache.set(endpointUrl, { alive, timestamp: now });
  return alive;
}
