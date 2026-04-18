import React from 'react';

export default function DockerStatus({ data }) {
  if (!data) return <div className="widget">Loading Docker status...</div>;

  const getStatusColor = (status, state) => {
    if (status.includes('Up') && state === 'running') return 'green';
    if (status.includes('Exited')) return 'red';
    return 'amber';
  };

  return (
    <div className="widget docker-status">
      <h2>Docker Containers</h2>
      {data.length === 0 ? (
        <div className="no-containers">No containers found</div>
      ) : (
        <div className="container-list">
          {data.map((container, index) => (
            <div key={index} className="container-item">
              <span className="container-name">{container.name}</span>
              <span className={`status-pill ${getStatusColor(container.status, container.state)}`}>
                {container.state}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}