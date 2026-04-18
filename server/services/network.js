import { exec } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';

const execAsync = promisify(exec);

export async function getNetworkInfo() {
  try {
    // Get Tailscale status
    let tailscaleInfo = { ip: null, status: 'disconnected' };
    try {
      const { stdout } = await execAsync('tailscale status --json');
      const status = JSON.parse(stdout);
      tailscaleInfo = {
        ip: status.TailscaleIPs ? status.TailscaleIPs[0] : null,
        status: status.BackendState === 'Running' ? 'connected' : 'disconnected'
      };
    } catch (error) {
      console.warn('Tailscale not available:', error.message);
    }

    // Get local IP
    const networkInterfaces = await si.networkInterfaces();
    const eth0 = networkInterfaces.find(iface => iface.iface === 'eth0' || iface.iface === 'en0');

    return {
      tailscaleIp: tailscaleInfo.ip,
      tailscaleStatus: tailscaleInfo.status,
      localIp: eth0 ? eth0.ip4 : null
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    return {
      tailscaleIp: null,
      tailscaleStatus: 'unknown',
      localIp: null
    };
  }
}