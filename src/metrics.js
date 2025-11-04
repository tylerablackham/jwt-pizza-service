const config = require("./config");
const os = require("os");

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

const requests = {};

function requestTracker(req, res, next) {
  const endpoint = `[${req.method}]`;
  requests[endpoint] = (requests[endpoint] || 0) + 1;
  requests["TOTAL"] = (requests["TOTAL"] || 0) + 1;
  next();
}

const pizzas = {
  numSold: 0,
  revenue: 0,
  failures: 0,
};

const latencies = {
  service: 0,
  pizzaCreation: 0,
};

function pizzaPurchase(successful, latency, numPizzas, cost) {
  if (!successful) {
    pizzas.failures++;
  }
  latencies.pizzaCreation =
    latency.pizzaCreation === 0
      ? latency
      : (latency + latencies.pizzaCreation) / 2;
  pizzas.numSold += numPizzas;
  pizzas.revenue += cost;
}

const auth = {
  activeUsers: 0,
  successes: 0,
  failures: 0,
};

function incActiveUsers() {
  auth.activeUsers++;
}

function decActiveUsers() {
  auth.activeUsers--;
}

function authSuccessTracker(req, res, next) {
  res.on("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      auth.successes++;
    } else {
      auth.failures++;
    }
  });
  next();
}

function latencyTracker(req, res, next) {
  const start = process.hrtime.bigint(); // high-precision timer

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const latency = Number(end - start) / 1_000_000;
    updateLatency(latency);
  });
  next();
}

function updateLatency(latency) {
  latency.service =
    latency.service === 0 ? latency : (latency + latency.service) / 2;
}

// every 10 seconds
setInterval(() => {
  const metrics = [];
  Object.keys(requests).forEach((endpoint) => {
    metrics.push(
      createMetric("requests", requests[endpoint], "1", "sum", "asInt", {
        endpoint,
      }),
    );
  });

  const cpuUsage = getCpuUsagePercentage();
  const memoryUsage = getMemoryUsagePercentage();
  metrics.push(
    createMetric("cpu_usage", cpuUsage, "%", "gauge", "asDouble", {
      type: "system",
    }),
  );
  metrics.push(
    createMetric("memory_usage", memoryUsage, "%", "gauge", "asDouble", {
      type: "system",
    }),
  );
  metrics.push(
    createMetric(
      "pizza_creation_failures",
      pizzas.failures,
      "1",
      "sum",
      "asInt",
      { type: "pizza" },
    ),
  );
  metrics.push(
    createMetric("active_users", auth.activeUsers, "1", "sum", "asInt", {
      type: "auth",
    }),
  );
  metrics.push(
    createMetric("request_latency", latencies.service, "s", "sum", "asDouble", {
      type: "latency",
    }),
  );
  metrics.push(
    createMetric(
      "pizza_latency",
      latencies.pizzaCreation,
      "s",
      "sum",
      "asDouble",
      {
        type: "latency",
      },
    ),
  );
  metrics.push(
    createMetric("pizzas_sold_per_min", pizzas.numSold, "1", "sum", "asInt", {
      type: "pizza",
    }),
  );
  metrics.push(
    createMetric(
      "pizza_revenue_per_min",
      pizzas.revenue,
      "BTC",
      "sum",
      "asDouble",
      {
        type: "pizza",
      },
    ),
  );
  metrics.push(
    createMetric(
      "auth_successes_per_min",
      auth.successes,
      "1",
      "sum",
      "asInt",
      {
        type: "auth",
      },
    ),
  );
  metrics.push(
    createMetric("auth_failures_per_min", auth.failures, "1", "sum", "asInt", {
      type: "auth",
    }),
  );

  sendMetricToGrafana(metrics);
}, 10_000);

function createMetric(
  metricName,
  metricValue,
  metricUnit,
  metricType,
  valueType,
  attributes,
) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  if (metricType === "sum") {
    metric[metricType].aggregationTemporality =
      "AGGREGATION_TEMPORALITY_CUMULATIVE";
    metric[metricType].isMonotonic = true;
  }

  return metric;
}

function sendMetricToGrafana(metrics) {
  const body = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  fetch(`${config.metrics.url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

module.exports = {
  requestTracker,
  pizzaPurchase,
  incActiveUsers,
  decActiveUsers,
  authSuccess: authSuccessTracker,
  latencyTracker,
};
