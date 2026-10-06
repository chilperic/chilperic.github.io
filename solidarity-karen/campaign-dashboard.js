(()=> {
  if (typeof Chart === "undefined") return;

  const $ = id => document.getElementById(id);
  const charts = {};

  const destroy = key => {
    if (charts[key]) {
      charts[key].destroy();
      delete charts[key];
    }
  };

  const css = name =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const median = values => {
    if (!values.length) return 0;
    const a = values.slice().sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };

  const options = () => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: "easeOutQuart" },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: { usePointStyle: true, boxWidth: 8, padding: 14, font: { size: 10 } }
      },
      tooltip: {
        backgroundColor: "rgba(17,16,21,.96)",
        padding: 11,
        cornerRadius: 10
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#756d65", font: { size: 9 }, maxTicksLimit: 7 }
      },
      y: {
        grid: { color: "rgba(117,109,101,.12)" },
        ticks: { color: "#756d65", font: { size: 9 } }
      }
    }
  });

  function renderStats(state) {
    const { metrics: m, euro } = state;
    const vals = m.pos.map(x => Number(x.amountCents || 0)).sort((a, b) => a - b);
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    $("homeMean").textContent = euro(mean / 100);
    $("homeMedian").textContent = euro(median(vals) / 100);
    $("homeEvents").textContent = String(m.rows.length);
  }

  function renderMomentum(state) {
    const { metrics: m, euro, dateFmt, t } = state;
    const el = $("homeMomentumChart");
    if (!el) return;
    destroy("momentum");

    const grouped = new Map();
    m.rows.forEach(x => {
      const day = String(x.date || "").slice(0, 10);
      if (!grouped.has(day)) grouped.set(day, 0);
      const signed = (x.status === "refunded" ? -1 : 1) * Number(x.amountCents || 0) / 100;
      grouped.set(day, grouped.get(day) + signed);
    });

    const rows = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const daily = rows.map(x => x[1]);
    const rolling = daily.map((_, i) => {
      const from = Math.max(0, i - 2);
      const slice = daily.slice(from, i + 1);
      return slice.reduce((s, v) => s + v, 0) / slice.length;
    });

    const ctx = el.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, "rgba(215,166,74,.26)");
    grad.addColorStop(1, "rgba(215,166,74,0)");

    const o = options();

    charts.momentum = new Chart(ctx, {
      type: "bar",
      data: {
        labels: rows.map(x => dateFmt(x[0])),
        datasets: [
          {
            label: t("dailyNet"),
            data: daily,
            backgroundColor: daily.map(v => v < 0 ? css("--red") : css("--green")),
            borderColor: css("--paper2"),
            borderWidth: 1,
            borderRadius: 7,
            order: 2
          },
          {
            type: "line",
            label: t("rollingAverage"),
            data: rolling,
            borderColor: css("--gold"),
            backgroundColor: grad,
            fill: true,
            tension: .38,
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 7,
            order: 1
          }
        ]
      },
      options: {
        ...o,
        plugins: {
          ...o.plugins,
          tooltip: {
            ...o.plugins.tooltip,
            callbacks: { label: x => x.dataset.label + ": " + euro(x.parsed.y) }
          }
        },
        scales: {
          x: o.scales.x,
          y: {
            ...o.scales.y,
            ticks: { ...o.scales.y.ticks, callback: v => euro(v) }
          }
        }
      }
    });

    const cutoff = Date.now() - 6 * 86400000;
    let recent = 0;
    m.rows.forEach(x => {
      const ts = new Date(String(x.date || "").slice(0, 10) + "T12:00:00").getTime();
      if (ts >= cutoff) {
        recent += (x.status === "refunded" ? -1 : 1) * Number(x.amountCents || 0);
      }
    });
    $("homeMomentumValue").textContent = (recent >= 0 ? "+" : "") + euro(recent / 100);

    const dates = m.pos
      .map(x => new Date(String(x.date || "").slice(0, 10) + "T12:00:00").getTime())
      .filter(Number.isFinite);
    const first = dates.length ? Math.min(...dates) : Date.now();
    const elapsed = Math.max(1, Math.floor((Date.now() - first) / 86400000) + 1);
    $("homeVelocity").textContent = euro(m.net / 100 / elapsed) + " / " + t("days");
  }

  function renderGrowth(state) {
    const { supporters, lang, t } = state;
    const el = $("homeGrowthChart");
    if (!el) return;
    destroy("growth");

    const rows = (supporters || [])
      .filter(x => x.firstDate)
      .slice()
      .sort((a, b) => String(a.firstDate).localeCompare(String(b.firstDate)));

    const grouped = new Map();
    rows.forEach(x => {
      const day = String(x.firstDate).slice(0, 10);
      grouped.set(day, (grouped.get(day) || 0) + 1);
    });

    let n = 0;
    const data = [...grouped.entries()].map(([day, count]) => ({ day, n: (n += count) }));

    const ctx = el.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, "rgba(71,107,140,.28)");
    grad.addColorStop(1, "rgba(71,107,140,0)");
    const o = options();

    charts.growth = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map(x => x.day),
        datasets: [{
          label: t("cumulativeSupporters"),
          data: data.map(x => x.n),
          borderColor: css("--blue"),
          backgroundColor: grad,
          fill: true,
          stepped: "after",
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 7
        }]
      },
      options: {
        ...o,
        plugins: { ...o.plugins, legend: { display: false } },
        scales: {
          x: {
            ...o.scales.x,
            ticks: {
              ...o.scales.x.ticks,
              callback: (_v, i) => {
                const raw = data[i]?.day;
                if (!raw) return "";
                try {
                  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" })
                    .format(new Date(raw + "T12:00:00"));
                } catch {
                  return raw;
                }
              }
            }
          },
          y: {
            ...o.scales.y,
            beginAtZero: true,
            ticks: { ...o.scales.y.ticks, precision: 0 }
          }
        }
      }
    });
  }

  function renderDistribution(state) {
    const { metrics: m } = state;
    const el = $("homeDistributionChart");
    if (!el) return;
    destroy("distribution");

    const vals = m.pos.map(x => Number(x.amountCents || 0) / 100).sort((a, b) => a - b);
    if (!vals.length) return;

    const max = Math.max(...vals);
    const bins = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(vals.length))));
    const step = Math.max(1, Math.ceil(max / bins));
    const counts = Array(bins).fill(0);

    vals.forEach(v => {
      counts[Math.min(bins - 1, Math.floor(v / step))]++;
    });

    const labels = counts.map((_, i) => "€" + (i * step) + "–" + ((i + 1) * step));
    const o = options();

    charts.distribution = new Chart(el, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: counts.map((_, i) => i % 2 ? css("--gold") : css("--red")),
          borderColor: css("--paper2"),
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: .76
        }]
      },
      options: {
        ...o,
        plugins: {
          ...o.plugins,
          legend: { display: false },
          tooltip: {
            ...o.plugins.tooltip,
            callbacks: { label: x => String(x.parsed.y) + " contribution" + (x.parsed.y === 1 ? "" : "s") }
          }
        },
        scales: {
          x: o.scales.x,
          y: {
            ...o.scales.y,
            beginAtZero: true,
            ticks: { ...o.scales.y.ticks, precision: 0 }
          }
        }
      }
    });
  }

  function renderSources(state) {
    const { metrics: m, euro } = state;
    const el = $("homeSourceChart");
    if (!el) return;
    destroy("sources");

    const grouped = new Map();
    m.rows
      .filter(x => x.status !== "refunded")
      .forEach(x => {
        const key = x.source || "manual";
        grouped.set(key, (grouped.get(key) || 0) + Number(x.amountCents || 0) / 100);
      });

    const keys = [...grouped.keys()];
    const labels = keys.map(k => ({
      manual: "Manual / bank / cash",
      paypal_pool: "PayPal Pool",
      paypal: "PayPal API"
    }[k] || k));
    const values = [...grouped.values()];

    charts.sources = new Chart(el, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [css("--paypal"), css("--red"), css("--green"), css("--gold"), css("--ink")],
          borderWidth: 0,
          borderRadius: 8,
          spacing: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        animation: { duration: 750, easing: "easeOutQuart" },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } }
          },
          tooltip: {
            backgroundColor: "rgba(17,16,21,.96)",
            padding: 11,
            cornerRadius: 10,
            callbacks: { label: x => x.label + ": " + euro(x.parsed) }
          }
        }
      }
    });
  }

  function renderActivity(state) {
    const { supporters, euro, dateFmt, t } = state;
    const wrap = $("recentActivity");
    if (!wrap) return;
    wrap.replaceChildren();

    (supporters || [])
      .slice()
      .sort((a, b) => String(b.lastDate || "").localeCompare(String(a.lastDate || "")))
      .slice(0, 8)
      .forEach(x => {
        const item = document.createElement("div");
        item.className = "activity-item";

        const left = document.createElement("div");
        const id = document.createElement("strong");
        const meta = document.createElement("span");
        const amount = document.createElement("b");

        id.textContent = x.supporterId || "S-????????";
        meta.textContent =
          (x.publicNameConsent && x.name ? x.name : t("anonymous")) +
          " · " + (x.eventCount || 0) + " " + t("events") +
          " · " + dateFmt(x.lastDate);
        amount.textContent = euro(Number(x.netCents || 0) / 100);

        left.append(id, meta);
        item.append(left, amount);
        wrap.append(item);
      });
  }

  function render(state) {
    if (!state) return;
    renderStats(state);
    renderMomentum(state);
    renderGrowth(state);
    renderDistribution(state);
    renderSources(state);
    renderActivity(state);
  }

  window.addEventListener("rb:campaign-data", e => render(e.detail));
  window.addEventListener("load", () => {
    if (window.RBCampaignState) setTimeout(() => render(window.RBCampaignState), 100);
  });
})();