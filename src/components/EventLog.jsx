
import React from 'react';

export default function EventLog({ logs }) {
  return (
    <div className="panel event-log" id="event-log">
      <div className="panel-title">Event Log</div>
      <div className="log-entries">
        {logs.map((entry) => (
          <div className={`log-entry log-${entry.type}`} key={entry.id}>
            <span className="log-time">{entry.time}</span>
            <span className="log-msg">{entry.msg}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="log-entry">
            <span className="log-msg" style={{ color: 'var(--text-dim)' }}>
              Waiting for events...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
