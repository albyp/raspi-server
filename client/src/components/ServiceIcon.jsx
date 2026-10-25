import React from 'react';
import {
  SiPihole, SiQbittorrent, SiHomeassistant, SiJellyfin, SiTelegram, SiDocker,
  SiSyncthing, SiGrafana, SiPortainer, SiPlex, SiNginx, SiPostgresql, SiRedis,
  SiTailscale
} from 'react-icons/si';
import { FaWindows, FaLinux, FaApple, FaAndroid } from 'react-icons/fa';

const ICONS = [
  [/pihole|pi-hole/, SiPihole],
  [/qbittorrent/, SiQbittorrent],
  [/home-?assistant/, SiHomeassistant],
  [/jellyfin/, SiJellyfin],
  [/telegram/, SiTelegram],
  [/syncthing/, SiSyncthing],
  [/grafana/, SiGrafana],
  [/portainer/, SiPortainer],
  [/plex/, SiPlex],
  [/nginx/, SiNginx],
  [/postgres/, SiPostgresql],
  [/redis/, SiRedis],
];

export default function ServiceIcon({ hint = '' }) {
  const key = hint.toLowerCase();
  const Icon = ICONS.find(([re]) => re.test(key))?.[1] || SiDocker;
  return <Icon className="service-icon" aria-hidden="true" />;
}

const OS_ICONS = { windows: FaWindows, linux: FaLinux, iOS: FaApple, macOS: FaApple, android: FaAndroid };

export function OsIcon({ os }) {
  const Icon = OS_ICONS[os] || SiTailscale;
  return <Icon className="os-icon" title={os} aria-label={os} />;
}
