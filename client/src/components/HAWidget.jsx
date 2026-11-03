import React from 'react';

// Read-only: the dashboard never calls HA services. Control devices in HA itself.
export default function HAWidget({ data }) {
  if (!data) return <div className="widget">Loading Home Assistant...</div>;

  if (!data.reachable) {
    return (
      <div className="widget ha-widget">
        <h2>Home Assistant</h2>
        <div className="ha-error">Not reachable</div>
        {data.error && <div className="error-details">{data.error}</div>}
      </div>
    );
  }

  return (
    <div className="widget ha-widget">
      <h2>Home Assistant</h2>
      <div className="ha-status">✓ Connected</div>
      {data.states?.length === 0 && (
        <div className="error-details">None of HA_ENTITY_IDS matched — set real entity IDs in .env</div>
      )}
      <div className="entity-list">
        {data.states && data.states.map((entity, index) => (
          <div key={index} className="entity-item">
            <span className="entity-name">{entity.attributes?.friendly_name || entity.entity_id}</span>
            <span className="entity-state">{entity.state}</span>
          </div>
        ))}
      </div>
    </div>
  );
}