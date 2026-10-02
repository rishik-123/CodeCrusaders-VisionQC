// ─── Product ────────────────────────────────
export const product = {
  id: 1,
  name: 'Bottle Cap',
  modelStatus: 'Ready', // Ready | Training | Not Trained
  threshold: 0.65,
  createdAt: '2026-09-15',
  description: 'Standard 28mm plastic bottle cap – blue variant',
};

// ─── Reference Images ───────────────────────
export const referenceImages = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  url: `https://picsum.photos/seed/bottlecap${i + 1}/300/300`,
  valid: true,
  uploadedAt: new Date(2026, 8, 15 + Math.floor(i / 5), 9 + i % 5).toISOString(),
}));

// ─── Inspections ────────────────────────────
const names = ['Bottle Cap'];
const generateScore = (pass) => {
  if (pass) return +(Math.random() * 0.45 + 0.1).toFixed(2);
  return +(Math.random() * 0.35 + 0.65).toFixed(2);
};

export const inspections = Array.from({ length: 30 }, (_, i) => {
  const pass = i % 5 !== 0; // ~80% pass
  const score = generateScore(pass);
  const d = new Date(2026, 9, 1, 8 + Math.floor(i / 3), (i * 7) % 60);
  return {
    id: i + 1,
    time: d.toISOString(),
    product: names[0],
    score,
    threshold: 0.65,
    result: pass ? 'PASS' : 'FAIL',
    imageUrl: `https://picsum.photos/seed/inspect${i + 1}/400/400`,
    heatmapUrl: `https://picsum.photos/seed/heat${i + 1}/400/400`,
    feedbackGiven: i < 5,
    feedbackType: i < 3 ? 'confirmed' : i < 5 ? 'false_alarm' : null,
    feedbackNotes: i < 5 ? 'Checked by QC team' : '',
  };
});

// ─── Trend Data (7 days) ────────────────────
export const trendData = [
  { day: 'Mon', inspections: 42, passed: 36, failed: 6, rate: 14.3 },
  { day: 'Tue', inspections: 55, passed: 48, failed: 7, rate: 12.7 },
  { day: 'Wed', inspections: 38, passed: 34, failed: 4, rate: 10.5 },
  { day: 'Thu', inspections: 61, passed: 52, failed: 9, rate: 14.8 },
  { day: 'Fri', inspections: 47, passed: 42, failed: 5, rate: 10.6 },
  { day: 'Sat', inspections: 33, passed: 30, failed: 3, rate: 9.1 },
  { day: 'Sun', inspections: 29, passed: 26, failed: 3, rate: 10.3 },
];

// ─── Dashboard Totals ───────────────────────
export const dashboardStats = {
  totalInspections: 305,
  passed: 268,
  failed: 37,
  rejectionRate: 12.1,
  avgAnomalyScore: 0.34,
};

// ─── Sparkline data ─────────────────────────
export const sparklines = {
  totalInspections: [22, 28, 35, 42, 55, 38, 61, 47, 33, 29],
  passed:           [18, 24, 30, 36, 48, 34, 52, 42, 30, 26],
  failed:           [4, 4, 5, 6, 7, 4, 9, 5, 3, 3],
  rejectionRate:    [18, 14, 14, 14, 13, 11, 15, 11, 9, 10],
  avgScore:         [0.38, 0.35, 0.32, 0.34, 0.31, 0.36, 0.33, 0.30, 0.35, 0.34],
};

// ─── Failure Regions ────────────────────────
export const failureRegions = [
  { region: 'Top Edge',        count: 12, percentage: 32 },
  { region: 'Side Surface',    count: 9,  percentage: 24 },
  { region: 'Thread Area',     count: 7,  percentage: 19 },
  { region: 'Center Logo',     count: 5,  percentage: 14 },
  { region: 'Bottom Ring',     count: 4,  percentage: 11 },
];

// ─── Drift Values ───────────────────────────
export const driftData = {
  today: 10.2,
  yesterday: 4.8,
  direction: 'up',       // up | down | stable
  status: 'warning',     // normal | warning | critical
  message: 'Rejection rate has increased significantly compared to yesterday',
};

// ─── Chat Q&A ───────────────────────────────
export const chatSamples = [
  {
    question: 'Why did rejection increase today?',
    answer: 'The rejection rate increased from 4.8% to 10.2% today. Analysis shows 63% of failures are concentrated in the "Top Edge" region. This may indicate a die-cutting alignment issue that started after the morning shift change at 08:30.',
    metrics: [
      { label: 'Rejection Rate Today', value: '10.2%' },
      { label: 'Rejection Rate Yesterday', value: '4.8%' },
      { label: 'Top Failure Region', value: 'Top Edge (32%)' },
    ],
  },
  {
    question: 'Which product has the most failures?',
    answer: 'Bottle Cap currently has the highest failure count with 37 failures out of 305 inspections (12.1% rejection rate). The primary defect regions are Top Edge and Side Surface, accounting for 56% of all failures.',
    metrics: [
      { label: 'Total Failures', value: '37' },
      { label: 'Rejection Rate', value: '12.1%' },
      { label: 'Primary Defect', value: 'Top Edge' },
    ],
  },
  {
    question: 'Should I retrain the model?',
    answer: 'Based on the current drift indicator (+5.4% change), retraining is recommended. The model was last trained on Sep 15 with 25 reference images. Adding 5-10 more recent good samples before retraining would improve accuracy, especially for the Thread Area region where false positives have increased.',
    metrics: [
      { label: 'Drift Change', value: '+5.4%' },
      { label: 'Last Trained', value: 'Sep 15, 2026' },
      { label: 'Reference Images', value: '25' },
    ],
  },
  {
    question: 'What is the average anomaly score this week?',
    answer: 'The average anomaly score this week is 0.34, which is within normal range. However, scores have been trending upward since Thursday (0.38 average), suggesting gradual quality drift. Products inspected during the evening shift show 18% higher anomaly scores on average.',
    metrics: [
      { label: 'Weekly Avg Score', value: '0.34' },
      { label: 'Thursday Avg', value: '0.38' },
      { label: 'Evening Shift Δ', value: '+18%' },
    ],
  },
];

export const suggestedQuestions = [
  'Why did rejection increase today?',
  'Which product has the most failures?',
  'Should I retrain the model?',
  'What is the average anomaly score this week?',
];

// ─── Training Logs ──────────────────────────
export const trainingLogs = [
  { time: '10:23:01', level: 'INFO',    msg: 'Starting model training for "Bottle Cap"' },
  { time: '10:23:02', level: 'INFO',    msg: 'Loading 25 reference images...' },
  { time: '10:23:04', level: 'INFO',    msg: 'Preprocessing images: resize to 256×256, normalize' },
  { time: '10:23:08', level: 'INFO',    msg: 'Extracting feature embeddings (layer 4)...' },
  { time: '10:23:15', level: 'INFO',    msg: 'Computing multivariate Gaussian distribution' },
  { time: '10:23:18', level: 'INFO',    msg: 'Fitting anomaly score distribution (μ=0.12, σ=0.08)' },
  { time: '10:23:22', level: 'INFO',    msg: 'Validating model on holdout set (5 images)...' },
  { time: '10:23:26', level: 'SUCCESS', msg: 'Validation passed — mean score 0.11, all below threshold' },
  { time: '10:23:28', level: 'INFO',    msg: 'Saving model artifacts to storage...' },
  { time: '10:23:30', level: 'SUCCESS', msg: 'Model training complete. Status: Ready ✓' },
];
