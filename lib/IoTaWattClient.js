'use strict';

const http = require('http');
const https = require('https');

class IoTaWattClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  fetchJson(path) {
    const url = new URL(path, this.baseUrl);
    const client = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn, val) => {
        if (!settled) {
          settled = true;
          fn(val);
        }
      };

      const hardTimeout = setTimeout(() => {
        req.destroy();
        settle(reject, new Error(`Request to ${url.toString()} timed out after 10s`));
      }, 10000);

      const req = client.get(url.toString(), (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          clearTimeout(hardTimeout);
          try {
            settle(resolve, JSON.parse(data));
          } catch (err) {
            settle(reject, new Error(`Failed to parse JSON from ${url.toString()}: ${err.message}`));
          }
        });
      });

      req.on('error', (err) => {
        clearTimeout(hardTimeout);
        settle(reject, new Error(`Request to ${url.toString()} failed: ${err.message}`));
      });
    });
  }

  async getConfig() {
    return this.fetchJson('/config.txt');
  }

  async getFeedList() {
    return this.fetchJson('/feed/list.json');
  }

  async getFeedData(feedIds) {
    const now = Math.floor(Date.now() / 5000) * 5000;
    const ids = feedIds.join(',');
    const path = `/feed/data.json?id=${ids}&start=${now}&end=${now}&interval=5&skipmissing=0&limitinterval=1`;
    const result = await this.fetchJson(path);
    if (!Array.isArray(result) || !Array.isArray(result[0])) {
      throw new Error('Unexpected feed response format');
    }
    const values = result[0];
    const map = {};
    for (let i = 0; i < feedIds.length; i++) {
      map[feedIds[i]] = values[i] !== undefined ? parseFloat(values[i]) : null;
    }
    return map;
  }
}

module.exports = IoTaWattClient;
