// Vẽ biểu đồ trang quản trị bằng Chart.js tự host (public/vendor/chartjs). Dữ liệu lấy từ thuộc tính data-chart (JSON).
(() => {
  if (!window.Chart) return;
  const css = getComputedStyle(document.documentElement);
  const v = (name, fb) => (css.getPropertyValue(name) || '').trim() || fb;
  const brand = v('--brand', '#f05123');
  const ink = v('--ink', '#1d2129');
  const line = v('--line', '#e5e7eb');
  window.Chart.defaults.color = ink;
  window.Chart.defaults.borderColor = line;
  window.Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';

  document.querySelectorAll('canvas[data-chart]').forEach((el) => {
    let cfg;
    try {
      cfg = JSON.parse(el.dataset.chart);
    } catch {
      return;
    }
    const doughnut = cfg.type === 'doughnut';
    const money = /USD/.test(cfg.label || '');
    new window.Chart(el, {
      type: cfg.type,
      data: {
        labels: cfg.labels,
        datasets: [
          {
            label: cfg.label,
            data: cfg.data,
            backgroundColor: doughnut ? ['#16a34a', '#dc2626', '#0ea5e9'] : brand,
            borderRadius: doughnut ? 0 : 6,
            maxBarThickness: 42,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: cfg.horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: doughnut, position: 'bottom' },
          tooltip: { callbacks: money ? { label: (c) => ` $${Number(c.parsed.y).toFixed(2)}` } : {} },
        },
        scales: doughnut
          ? {}
          : {
              [cfg.horizontal ? 'x' : 'y']: { beginAtZero: true, ticks: { precision: 0, callback: money ? (x) => `$${x}` : undefined } },
            },
      },
    });
  });
})();
