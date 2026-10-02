import { COLORS } from '../utils/helpers';

const passed = [150, 172, 168, 185, 190, 140, 116];
const failed = [14, 16, 15, 19, 20, 17, 26];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const inspectionTrend = days.map((day, i) => ({ day, passed: passed[i], failed: failed[i] }));

export const rejectionThisWeek = days.map((day, i) => ({
  day,
  rate: Math.round((failed[i] / (passed[i] + failed[i])) * 1000) / 10,
}));
export const rejectionLastWeek = days.map((day, i) => ({ day, rate: [6.1, 5.8, 6.4, 5.9, 6.2, 6.0, 6.3][i] }));

export const pageStats = [
  { label: 'This Month', value: '1,248', color: COLORS.success, data: [2, 3, 7, 7, 9, 11, 9, 7, 9, 11, 9, 7, 5, 4, 9, 7, 5, 4, 10, 12] },
  { label: 'Last Month', value: '1,096', color: COLORS.warning, data: [5, 6, 7, 9, 15, 5, 6, 7, 9, 11, 7, 9, 11, 7, 9, 9, 3, 2, 8, 10] },
];

export const kpis = [
  {
    label: 'Inspections', value: '1,248', change: '10%', up: true, color: COLORS.primary, icon: 'fas fa-clipboard-check',
    data: [2, 2, 3, 9, 11, 9, 7, 20, 9, 7, 6, 5, 6, 9, 4, 9, 5, 3, 5, 9]
  },
  {
    label: 'Passed', value: '1,121', change: '8%', up: true, color: COLORS.success, icon: 'fas fa-check-circle',
    data: [5, 6, 9, 4, 9, 5, 3, 5, 9, 15, 3, 2, 2, 3, 9, 11, 9, 7, 20, 9]
  },
  {
    label: 'Failed', value: '127', change: '4%', up: true, color: COLORS.warning, icon: 'fas fa-times-circle',
    data: [2, 2, 3, 9, 11, 9, 7, 20, 9, 7, 6, 5, 6, 9, 4, 9, 5, 3, 5, 9]
  },
  {
    label: 'Rejection Rate', value: '10.2%', change: '1.2%', up: true, color: COLORS.warning, icon: 'fas fa-percentage',
    data: [3, 4, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12, 11, 13, 12]
  },
];

export const trendStats = [
  { label: 'Total', value: '1,248' },
  { label: 'Passed', value: '1,121' },
  { label: 'Failed', value: '127' },
  { label: 'Avg Score', value: '0.31' },
];

export const recentInspections = [
  { id: 'INS-1248', time: '10:44', product: 'Bottle', score: 0.82, threshold: 0.65 },
  { id: 'INS-1247', time: '10:43', product: 'Bottle', score: 0.18, threshold: 0.65 },
  { id: 'INS-1246', time: '10:42', product: 'Bottle', score: 0.21, threshold: 0.65 },
  { id: 'INS-1245', time: '10:40', product: 'Bottle', score: 0.71, threshold: 0.65 },
  { id: 'INS-1244', time: '10:38', product: 'Bottle', score: 0.24, threshold: 0.65 },
];

export const failureRegions = [
  { region: 'Top edge', count: 18, percentage: 38 },
  { region: 'Left surface', count: 12, percentage: 24 },
  { region: 'Cap seal', count: 8, percentage: 18 },
  { region: 'Bottom', count: 5, percentage: 12 },
  { region: 'Other', count: 3, percentage: 8 },
];

export const products = ['Bottle', 'Cable', 'Capsule', 'Carpet', 'Grid', 'Hazelnut', 'Leather', 'Metal Nut', 'Pill', 'Screw', 'Tile', 'Toothbrush', 'Transistor', 'Wood', 'Zipper'];

export const product = {
  id: 1,
  name: 'Bottle',
  type: 'Industrial Bottle',
  status: 'Ready',
};

export const referenceImages = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `ref_${String(i + 1).padStart(3, '0')}.png`,
  url: `/datasets/bottle/train/good/${String(i).padStart(3, '0')}.png`,
}));

export const trendData = inspectionTrend;

export const driftData = {
  yesterday: 8,
  today: 10,
  direction: 'up',
  status: 'normal',
  message: 'Quality metrics within steady-state tolerances.',
};

export const trainingLogs = [
  { time: '11:14:01', level: 'INFO', msg: 'Loading 25 reference images from dataset' },
  { time: '11:14:04', level: 'INFO', msg: 'Extracting WideResNet50 feature embeddings' },
  { time: '11:14:15', level: 'INFO', msg: 'Building PatchCore coreset memory bank' },
  { time: '11:14:28', level: 'INFO', msg: 'Calibrating decision threshold with multi-criteria optimization' },
  { time: '11:14:40', level: 'INFO', msg: 'Model checkpoint saved. Status: Ready.' },
];