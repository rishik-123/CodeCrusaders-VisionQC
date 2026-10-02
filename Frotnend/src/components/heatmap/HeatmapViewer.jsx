import Card from '../common/Card';

export default function HeatmapViewer({ imageUrl, showHeatmap = true }) {
  return (
    <Card title="Anomaly Heatmap">
      <div className="heatmap-container">
        <img src={imageUrl} alt="Inspection" />
        {showHeatmap && <div className="heatmap-overlay"></div>}
      </div>
      <div className="heatmap-legend">
        <span>Normal</span>
        <div className="legend-bar"></div>
        <span>Anomalous</span>
      </div>
    </Card>
  );
}
