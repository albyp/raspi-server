import si from 'systeminformation';

// Tailscale details now come from services/tailscale.js (LocalAPI socket)
export async function getNetworkInfo() {
  try {
    const networkInterfaces = await si.networkInterfaces();
    const lan = networkInterfaces
      .filter(iface => /^(eth|en|wlan|wl)/.test(iface.iface) && iface.ip4)
      .map(iface => ({ iface: iface.iface, ip: iface.ip4, type: iface.type }));

    return {
      localIp: lan.find(i => i.iface.startsWith('eth'))?.ip || lan[0]?.ip || null,
      interfaces: lan
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    return { localIp: null, interfaces: [] };
  }
}
