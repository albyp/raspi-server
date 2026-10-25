import si from 'systeminformation';
import fs from 'fs';
import os from 'os';

export async function getSystemInfo() {
  try {
    // Get CPU, RAM, disk info
    const [cpuLoad, mem, disk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize()
    ]);

    // Get CPU temperature (Raspberry Pi specific)
    let temp = null;
    try {
      const tempData = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
      temp = parseInt(tempData) / 1000;
    } catch (error) {
      console.warn('Could not read CPU temperature:', error.message);
    }

    // Get uptime
    const uptime = os.uptime();

    // Inside the container '/' is the overlay, which sits on the Pi's root fs
    const root = disk.find(d => d.mount === '/') || disk[0];

    return {
      cpu: Math.round(cpuLoad.currentLoad * 100) / 100,
      ram: {
        used: Math.round(mem.active / 1024 / 1024 / 1024 * 100) / 100, // GB — active only, matches htop
        total: Math.round(mem.total / 1024 / 1024 / 1024 * 100) / 100,
        percent: Math.round(mem.active / mem.total * 100)
      },
      disk: {
        used: Math.round(root.used / 1024 / 1024 / 1024 * 100) / 100, // GB
        total: Math.round(root.size / 1024 / 1024 / 1024 * 100) / 100,
        percent: Math.round(root.use)
      },
      temp: temp ? Math.round(temp * 10) / 10 : null,
      load: os.loadavg().map(l => Math.round(l * 100) / 100),
      cores: os.cpus().length,
      uptime
    };
  } catch (error) {
    console.error('Error getting system info:', error);
    throw error;
  }
}