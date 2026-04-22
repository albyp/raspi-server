import React from 'react';
import { SiPihole } from "react-icons/si";

const LINKS = [
  { label: 'Home Assistant', url: 'http://raspi:8123', icon: '🏠' },
  { label: 'Code Server', url: 'http://localhost:8080', icon: '💻' },
  { label: 'Pihole', url: 'http://raspi/admin', icon: SiPihole },
];

export default function QuickLinks() {
  return (
    <div className="widget quick-links">
      <h2>Quick Links</h2>
      <div className="links-list">
        {LINKS.map((link, index) => {
          const Icon = typeof link.icon === 'string' ? null : link.icon;
          return (

              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-item"
            >
              <span className="link-icon">
                {Icon ? <Icon /> : link.icon}
              </span>
              <span className="link-label">{link.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
