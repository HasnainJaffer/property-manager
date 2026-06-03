// Shared icons + tiny chart primitives used by both prototypes.
// Stroke icons; 18px default. Use currentColor for theming.

window.Icon = function Icon({ name, size = 18, strokeWidth = 1.6, style }) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
    style: { flex: "0 0 auto", ...(style || {}) }, "aria-hidden": true,
  };
  switch (name) {
    case "grid":   return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case "home":   return <svg {...props}><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>;
    case "doc":    return <svg {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>;
    case "people": return <svg {...props}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c.6-3 3-4.6 5.5-4.6S14 17 14.6 20"/><circle cx="17" cy="9" r="2.6"/><path d="M15 20c.4-2 1.8-3.4 4-3.4 1.2 0 2.2.4 3 1"/></svg>;
    case "pound":  return <svg {...props}><path d="M16 7c-.5-1.5-2-2.5-3.8-2.5-2.4 0-4 1.7-4 4 0 1 .2 2 .5 3.2.4 1.4.3 2.8-1 4.3-.3.3-.5.5-.5 1H17"/><path d="M8 12h7"/></svg>;
    case "shield": return <svg {...props}><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "wrench": return <svg {...props}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6 2 2 6-6a4 4 0 0 0 5.4-5.4l-2.4 2.4-2-2z"/></svg>;
    case "team":   return <svg {...props}><circle cx="12" cy="7" r="3"/><circle cx="5"  cy="10" r="2.2"/><circle cx="19" cy="10" r="2.2"/><path d="M3 20c.6-2.4 2.6-3.6 5-3.6M16 16.4c2.4 0 4.4 1.2 5 3.6M7 20c.7-3 2.6-4.5 5-4.5s4.3 1.5 5 4.5"/></svg>;
    case "gear":   return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.1l-.3-2.4h-4l-.3 2.4a7 7 0 0 0-2 1.1l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.1l.3 2.4h4l.3-2.4a7 7 0 0 0 2-1.1l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>;
    case "bell":   return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "search": return <svg {...props}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></svg>;
    case "plus":   return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "chev":   return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevd":  return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "arrow":  return <svg {...props}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "warn":   return <svg {...props}><path d="M12 3 2.5 20h19z"/><path d="M12 10v5M12 17.5v.5"/></svg>;
    case "check":  return <svg {...props}><path d="m5 12 5 5L20 7"/></svg>;
    case "x":      return <svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case "moon":   return <svg {...props}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>;
    case "sun":    return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>;
    case "menu":   return <svg {...props}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case "trend":  return <svg {...props}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    case "dot":    return <svg {...props}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></svg>;
    case "filter": return <svg {...props}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case "ext":    return <svg {...props}><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/></svg>;
    case "clock":  return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "calendar":return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case "pin":    return <svg {...props}><path d="M12 2 9 9l-7 1 5 4-1 7 6-3 6 3-1-7 5-4-7-1z"/></svg>;
    default: return null;
  }
};

// Tiny sparkline. Pass values array + width/height; auto-scales.
window.Sparkline = function Sparkline({ values, width = 120, height = 32, color = "currentColor", fill, strokeWidth = 1.5, dot = true }) {
  const min = Math.min(...values, 0);
  const max = Math.max(...values, min + 1);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const areaD = d + ` L ${width} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      {fill && <path d={areaD} fill={fill} />}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {dot && <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />}
    </svg>
  );
};

// Mini bar chart for rent collection history
window.MiniBars = function MiniBars({ values, width = 220, height = 48, color = "currentColor", emphasizeLast = true, gap = 2 }) {
  const max = Math.max(...values, 1);
  const barW = (width - gap * (values.length - 1)) / values.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * (height - 2));
        const x = i * (barW + gap);
        const y = height - h;
        const op = emphasizeLast && i === values.length - 1 ? 1 : 0.55;
        return <rect key={i} x={x} y={y} width={barW} height={h} rx={1.5} fill={color} opacity={op} />;
      })}
    </svg>
  );
};

// Occupancy donut. value 0-100, two-stop arc.
window.Donut = function Donut({ value, size = 96, thickness = 9, color = "currentColor", track = "rgba(255,255,255,0.08)", label }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size/2} ${size/2})`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </g>
      {label && (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.26} fontWeight="600" fill="currentColor">{label}</text>
      )}
    </svg>
  );
};

// Format £
window.fmtGBP = (n, opts = {}) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return sign + "£" + abs.toLocaleString("en-GB", { maximumFractionDigits: 0, ...opts });
};
