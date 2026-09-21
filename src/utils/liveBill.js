const roundRupee = (n) => Math.round(n);

export const formatElapsed = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

export const liveBill = (seconds, perHourRate = 210) => {
  const mins = Math.max(1, Math.ceil(seconds / 60));
  const billableHours = Math.max(1, Math.ceil(mins / 30) / 2);
  const base = roundRupee(billableHours * perHourRate);
  const platform = roundRupee(Math.max(50, base * 0.15));
  const gst = roundRupee((base + platform) * 0.18);
  return {
    billableHours,
    base,
    platform,
    gst,
    total: base + platform + gst,
    perHourRate,
  };
};

export const runElapsed = (startedAt, setSeconds) => {
  if (!startedAt) return undefined;
  const tick = () =>
    setSeconds(
      Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    );
  tick();
  const t = setInterval(tick, 1000);
  return () => clearInterval(t);
};