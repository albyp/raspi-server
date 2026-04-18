import { useState, useEffect, useRef } from 'react';

const POLL_INTERVAL = 10000;

function secondsAgo(ts) {
  if (!ts) return null;
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ${s % 60}s ago`;
}

export default function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [failCount, setFailCount] = useState(0);
  const lastUpdatedTsRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const newData = await response.json();
        setData(newData);
        setError(null);
        setFailCount(0);
        lastUpdatedTsRef.current = Date.now();
        setLastUpdated(secondsAgo(lastUpdatedTsRef.current));
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.message);
        setFailCount(prev => prev + 1);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const pollInterval = setInterval(fetchData, POLL_INTERVAL);
    const tickInterval = setInterval(() => {
      setLastUpdated(secondsAgo(lastUpdatedTsRef.current));
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, []);

  return { data, loading, error, lastUpdated, isStale: failCount >= 3 };
}