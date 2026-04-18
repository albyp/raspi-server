import React from 'react';

const LINKS = [
  { label: 'Home Assistant', url: 'http://localhost:8123', icon: '🏠' },
  { label: 'Code Server', url: 'http://localhost:8080', icon: '💻' },
  // Add more links as needed
];

export default function QuickLinks() {
  return (
    <div className="widget quick-links">
      <h2>Quick Links</h2>
      <div className="links-list">
        {LINKS.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-item"
          >
            <span className="link-icon">{link.icon}</span>
            <span className="link-label">{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}