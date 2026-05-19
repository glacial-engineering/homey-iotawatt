'use strict';

const Homey = require('homey');
const IoTaWattClient = require('../../lib/IoTaWattClient');

class EnergyDeviceDriver extends Homey.Driver {
  async onInit() {
    this.pollers = new Map(); // url -> { client, timer, interval }
  }

  startPolling(url, interval) {
    if (this.pollers.has(url)) {
      const poller = this.pollers.get(url);
      if (poller.interval === interval) return;
      this.homey.clearInterval(poller.timer);
    }

    const client = new IoTaWattClient(url);
    const poll = () => this._poll(url, client);
    const timer = this.homey.setInterval(poll, interval * 1000);
    this.pollers.set(url, { client, timer, interval });
    poll();
  }

  _devicesForUrl(url) {
    return this.getDevices().filter((d) => d.getIotawattUrl() === url);
  }

  stopPollingIfUnused(url) {
    if (this._devicesForUrl(url).length === 0 && this.pollers.has(url)) {
      this.homey.clearInterval(this.pollers.get(url).timer);
      this.pollers.delete(url);
      this.log('Stopped polling', url, '(no devices)');
    }
  }

  recalculateInterval(url) {
    const devices = this._devicesForUrl(url);
    if (devices.length === 0) return;
    const fastest = Math.min(...devices.map((d) => d.pollInterval || 30));
    this.startPolling(url, fastest);
  }

  async _poll(url, client) {
    const devices = this._devicesForUrl(url);
    if (devices.length === 0) return;

    const feedIds = [];
    const deviceFeedMap = [];
    for (const device of devices) {
      const data = device.getData();
      const name = device.getIotawattName();
      if (!name) {
        this.error('Device missing iotawattName:', data.id);
        continue;
      }
      const powerFeed = data.type === 'input' ? `IP${name}` : `OP${name}`;
      const energyFeed = data.type === 'input' ? `IE${name}` : `OE${name}`;
      feedIds.push(powerFeed, energyFeed);
      deviceFeedMap.push({ device, powerFeed, energyFeed });
    }

    if (feedIds.length === 0) return;

    try {
      const feedData = await client.getFeedData(feedIds);
      for (const { device, powerFeed, energyFeed } of deviceFeedMap) {
        device.updateFromFeed(feedData[powerFeed], feedData[energyFeed]);
      }
    } catch (err) {
      this.error('Poll failed for', url, err.message);
      for (const device of devices) {
        device.setUnavailable('IoTaWatt unreachable').catch(this.error);
      }
    }
  }

  async onPair(session) {
    let iotawattUrl = '';

    session.setHandler('login', async (data) => {
      iotawattUrl = data.username;
      this.log('Pairing: testing connection to', iotawattUrl);

      const client = new IoTaWattClient(iotawattUrl);
      const config = await client.getConfig();
      this.log('Pairing: connected, inputs:', config.inputs?.length, 'outputs:', config.outputs?.length);

      return true;
    });

    session.setHandler('list_devices', async () => {
      this.log('Pairing: listing devices from', iotawattUrl);
      const client = new IoTaWattClient(iotawattUrl);
      const config = await client.getConfig();
      const devices = [];

      if (Array.isArray(config.inputs)) {
        for (const input of config.inputs) {
          if (input && input.type === 'CT') {
            devices.push({
              name: input.name,
              data: {
                id: `input-${input.channel}`,
                channel: input.channel,
                iotawattName: input.name,
                type: 'input',
              },
              settings: {
                iotawattUrl,
              },
            });
          }
        }
      }

      if (Array.isArray(config.outputs)) {
        for (const output of config.outputs) {
          if (output.units === 'Watts') {
            devices.push({
              name: output.name,
              data: {
                id: `output-${output.name}`,
                outputName: output.name,
                iotawattName: output.name,
                type: 'output',
              },
              settings: {
                iotawattUrl,
              },
            });
          }
        }
      }

      this.log('Pairing: found', devices.length, 'devices');
      return devices;
    });
  }

  async onUninit() {
    for (const [, poller] of this.pollers) {
      this.homey.clearInterval(poller.timer);
    }
    this.pollers.clear();
  }
}

module.exports = EnergyDeviceDriver;
