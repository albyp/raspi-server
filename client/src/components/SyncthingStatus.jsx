import React from 'react';
import { SiSyncthing } from 'react-icons/si';
import { formatBytes, timeAgo, localUrl } from '../format';
import { usePrefs } from '../prefs';

const STATE_COLOR = {
  'up to date': 'green',
  idle: 'green',
  syncing: 'amber',
  scanning: 'amber',
  'sync-preparing': 'amber',
  'sync-waiting': 'amber',
  paused: 'grey',
  disconnected: 'red',
  error: 'red'
};

export default function SyncthingStatus({ data }) {
  const { redact } = usePrefs();
  if (!data) return <section className="widget">Loading Syncthing...</section>;

  if (!data.reachable || !data.folder) {
    return (
      <section className="widget syncthing">
        <h2>Syncthing</h2>
        <div className="widget-error">{data.error || 'Not reachable'}</div>
      </section>
    );
  }

  const { folder, devices } = data;
  const folderState = folder.paused ? 'paused' : folder.errors > 0 ? 'error' : folder.state;
  const connected = devices.filter(d => d.connected).length;

  return (
    <section className="widget syncthing">
      <h2>
        <a className="h2-link" href={localUrl({ port: 8384 })} target="_blank" rel="noopener noreferrer">
          <SiSyncthing /> {folder.label}
        </a>
        <span className="h2-meta">{connected}/{devices.length} peers connected</span>
      </h2>

      <div className="st-folder">
        <span className={`pill ${STATE_COLOR[folderState] || 'amber'}`}>{folderState}</span>
        <span className="muted">
          {folder.files.toLocaleString()} files · {formatBytes(folder.bytes)}
          {folder.needFiles > 0 && ` · ${folder.needFiles} to pull (${formatBytes(folder.needBytes)})`}
        </span>
      </div>
      {folder.errorList.length > 0 && (
        <ul className="st-errors">
          {folder.errorList.map((e, i) => <li key={i}><span className="mono">{e.path}</span>: {redact(e.error)}</li>)}
        </ul>
      )}

      <div className="st-devices">
        <div className="st-device self">
          <div className="st-device-head">
            <span className="dot green" />
            <span className="st-name">{data.thisDevice}</span>
            <span className="muted">this Pi · v{data.version?.replace(/^v/, '')}</span>
          </div>
        </div>
        {devices.map(d => (
          <div key={d.id} className="st-device">
            <div className="st-device-head">
              <span className={`dot ${STATE_COLOR[d.state]}`} />
              <span className="st-name">{d.name}</span>
              <span className={`pill small ${STATE_COLOR[d.state]}`}>{d.state}</span>
            </div>
            <div className="st-device-meta muted">
              {d.connected
                ? <>{d.connectionType?.replace(/-(client|server)$/, '')} · <span className="mono">{redact(d.address)}</span></>
                : <>last seen {timeAgo(d.lastSeen)}</>}
            </div>
            {d.completion != null && (
              <div className="bar" title={`${d.completion}% in sync`}>
                <div className={`fill ${d.completion < 100 ? 'amber' : ''}`} style={{ width: `${d.completion}%` }} />
              </div>
            )}
            {d.needItems > 0 && <div className="st-device-meta muted">{d.needItems} items behind · {formatBytes(d.needBytes)}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
