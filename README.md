# IoTaWatt

Athom Homey smart-home app to monitor energy usage from [IoTaWatt](https://iotawatt.com/) devices.

## AI Development Disclosure

This app was coded almost entirely with AI assistance and reviewed lightly. The architectural guidance was sound and provided by a developer with more than 30 years of experience.

## Features

- Discovers all CT input channels and Watt outputs from your IoTaWatt
- Each channel/output becomes an individual Homey energy device
- Reports both instantaneous power (W) and cumulative energy (kWh)
- Centralized polling — one HTTP request per interval regardless of device count
- Configurable polling interval (5–300 seconds) per device
- Editable IoTaWatt URL per device (supports multiple IoTaWatt instances)

### Capabilities

- `measure_power` — Instantaneous power reading in Watts
- `meter_power` — Cumulative energy in kWh (feeds Homey's Energy tab)

### Device Settings

- **IoTaWatt URL** — Base URL of your IoTaWatt (e.g. `http://192.168.1.100`)
- **Polling interval** — How often to fetch readings (5–300 seconds, default 30)

## Install

### From source (Homey CLI)

```bash
git clone https://github.com/glacial-engineering/homey-iotawatt.git
cd homey-iotawatt
homey app install
```

### Requirements

- Homey Pro with firmware ≥ 5.0.0
- [Homey CLI](https://apps.developer.homey.app/the-basics/getting-started/homey-cli) installed
- IoTaWatt accessible on the same network as your Homey Pro

## Setup

1. Install the app on your Homey Pro
2. Add a new device → IoTaWatt Energy Device
3. Enter your IoTaWatt URL (e.g. `http://iotawatt.local`)
4. Select which channels/outputs to add
5. Devices will start reporting power and energy readings immediately

## How It Works

- During pairing, the app fetches `/config.txt` from your IoTaWatt to discover available inputs (type CT) and outputs (unit Watts).
- Once paired, the driver polls `/feed/data.json` at the configured interval with both power (`IP`/`OP`) and energy (`IE`/`OE`) feed IDs in a single request.
- The polling interval is determined by the fastest setting across all devices sharing the same IoTaWatt URL.

## Changelog

- **1.0.1** — Added `meter_power` (cumulative kWh) via `/feed/data.json`. Single request now returns both power and energy. Updated author info.
- **1.0.0** — Initial release. CT input and Watt output discovery, centralized polling, editable URL setting.

## Development

```bash
# Run in dev mode (uninstalls on Ctrl+C)
homey app run --remote

# Install permanently
homey app install
```

## License

MIT
