'use strict';

const Homey = require('homey');

class EnergyDevice extends Homey.Device {
  async onInit() {
    this.pollInterval = this.getSetting('pollInterval') || 30;
    const url = this.getSetting('iotawattUrl');

    this.log('Initializing with URL:', url, 'interval:', this.pollInterval);
    this.driver.recalculateInterval(url);
  }

  getIotawattName() {
    return this.getData().iotawattName;
  }

  getIotawattUrl() {
    return this.getSetting('iotawattUrl');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('iotawattUrl')) {
      const oldUrl = oldSettings.iotawattUrl;
      const newUrl = newSettings.iotawattUrl;
      this.log('URL changed from', oldUrl, 'to', newUrl);
      this.driver.recalculateInterval(newUrl);
      this.driver.stopPollingIfUnused(oldUrl);
    }
    if (changedKeys.includes('pollInterval')) {
      this.pollInterval = newSettings.pollInterval;
      this.log('Poll interval changed to', this.pollInterval);
      this.driver.recalculateInterval(this.getIotawattUrl());
    }
  }

  updateFromFeed(watts, kwh) {
    try {
      if (watts !== null && !Number.isNaN(watts)) {
        this.setCapabilityValue('measure_power', watts).catch(this.error);
      }
      if (kwh !== null && !Number.isNaN(kwh)) {
        this.setCapabilityValue('meter_power', kwh).catch(this.error);
      }
      this.setAvailable().catch(this.error);
    } catch (err) {
      this.error('Update failed:', err.message);
      this.setUnavailable('IoTaWatt data error').catch(this.error);
    }
  }

  async onUninit() {
    this.driver.stopPollingIfUnused(this.getIotawattUrl());
  }
}

module.exports = EnergyDevice;
