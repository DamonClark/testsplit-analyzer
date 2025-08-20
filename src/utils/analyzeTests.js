// Greedy balancing to estimate optimized parallel runtime and distribution

function sumDurationsMinutes(tests) {
  return tests.reduce((acc, t) => acc + t.durationMinutes, 0);
}

export function computeCurrentStats(tests) {
  const totalTests = tests.length;
  const totalMinutes = sumDurationsMinutes(tests);
  const currentRunners = Math.max(1, new Set(tests.map((t) => t.group).filter(Boolean)).size || 1);
  // If there are groups provided, current runtime is max group sum; otherwise assume sequential
  if (tests.some((t) => t.group != null)) {
    const byGroup = new Map();
    for (const t of tests) {
      const key = t.group ?? '0';
      byGroup.set(key, (byGroup.get(key) || 0) + t.durationMinutes);
    }
    const currentRuntime = Math.max(...Array.from(byGroup.values()));
    return { totalTests, currentRuntime: Number(currentRuntime.toFixed(1)), currentRunners };
  }
  return { totalTests, currentRuntime: Number(totalMinutes.toFixed(1)), currentRunners: 1 };
}

export function computeOptimizedDistribution(tests, desiredRunners = 6) {
  const runners = Math.max(1, desiredRunners);
  const sorted = [...tests].sort((a, b) => b.durationMinutes - a.durationMinutes);
  const bins = Array.from({ length: runners }, (_, i) => ({ runner: `Runner ${i + 1}`, tests: [], duration: 0 }));
  for (const t of sorted) {
    bins.sort((a, b) => a.duration - b.duration);
    bins[0].tests.push(t);
    bins[0].duration += t.durationMinutes;
  }
  const optimizedRuntime = Math.max(...bins.map((b) => b.duration));
  return {
    optimizedRuntime: Number(optimizedRuntime.toFixed(1)),
    optimizedRunners: runners,
    optimizedDistribution: bins.map((b) => ({
      runner: b.runner,
      tests: b.tests.length,
      duration: Number(b.duration.toFixed(1)),
    })),
  };
}

export function buildAnalysisFromTests(tests, desiredRunners = 6) {
  if (!Array.isArray(tests) || tests.length === 0) {
    throw new Error('No tests found in the uploaded file.');
  }
  const { totalTests, currentRuntime, currentRunners } = computeCurrentStats(tests);
  const { optimizedRuntime, optimizedRunners, optimizedDistribution } = computeOptimizedDistribution(
    tests,
    desiredRunners
  );
  const efficiencyGain = ((currentRuntime - optimizedRuntime) / currentRuntime) * 100;
  const slowestTests = [...tests]
    .sort((a, b) => b.durationMinutes - a.durationMinutes)
    .slice(0, 5)
    .map((t) => ({ name: t.name, duration: Number(t.durationMinutes.toFixed(1)) }));

  let currentDistribution;
  if (tests.some((testItem) => testItem.group != null)) {
    const totalsByGroup = tests.reduce((acc, testItem) => {
      const key = String(testItem.group ?? '1');
      acc[key] = (acc[key] || 0) + testItem.durationMinutes;
      return acc;
    }, {});
    currentDistribution = Object.entries(totalsByGroup).map(([key, minutes]) => ({
      runner: `Runner ${key}`,
      tests: tests.filter((t) => String(t.group ?? '1') === key).length,
      duration: Number(minutes.toFixed(1)),
    }));
  } else {
    currentDistribution = [{
      runner: 'Runner 1',
      tests: tests.length,
      duration: Number(sumDurationsMinutes(tests).toFixed(1)),
    }];
  }

  return {
    totalTests,
    currentRuntime,
    currentRunners,
    optimizedRuntime,
    optimizedRunners,
    efficiencyGain: Number(efficiencyGain.toFixed(1)),
    currentDistribution,
    optimizedDistribution,
    slowestTests,
  };
}


