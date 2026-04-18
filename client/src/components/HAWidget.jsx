import React from 'react';

async function toggleEntity(entity) {
  const domain = entity.entity_id.split('.')[0];
  const service = entity.state === 'on' ? 'turn_off' : 'turn_on';
  await fetch('/api/ha/service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, service, entity_id: entity.entity_id })
  });
}

const TOGGLEABLE = ['light', 'switch'];

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
      <div className="entity-list">
        {data.states && data.states.map((entity, index) => (
          <div key={index} className="entity-item">
            <span className="entity-name">{entity.attributes?.friendly_name || entity.entity_id}</span>
            <span className="entity-state">{entity.state}</span>
            {TOGGLEABLE.includes(entity.entity_id.split('.')[0]) && (
              <button className="toggle-btn" onClick={() => toggleEntity(entity)}>
                Toggle
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}