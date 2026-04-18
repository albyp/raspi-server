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

    return {
      cpu: Math.round(cpuLoad.currentLoad * 100) / 100,
      ram: {
        used: Math.round(mem.used / 1024 / 1024 / 1024 * 100) / 100, // GB
        total: Math.round(mem.total / 1024 / 1024 / 1024 * 100) / 100,
        percent: Math.round(mem.used / mem.total * 100)
      },
      disk: {
        used: Math.round(disk[0].used / 1024 / 1024 / 1024 * 100) / 100, // GB
        total: Math.round(disk[0].size / 1024 / 1024 / 1024 * 100) / 100,
        percent: Math.round(disk[0].use)
      },
      temp: temp ? Math.round(temp * 10) / 10 : null,
      uptime
    };
  } catch (error) {
    console.error('Error getting system info:', error);
    throw error;
  }
}