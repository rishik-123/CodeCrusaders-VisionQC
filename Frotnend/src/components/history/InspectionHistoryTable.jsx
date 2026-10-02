import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { Badge } from '../common/UIComponents';
import { inspectionApi, productApi, API_BASE_URL } from '../../services/api';
import { formatDateTime } from '../../utils/helpers';

const PAGE_SIZE = 8;

export default function InspectionHistoryTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [inspectionsList, setInspectionsList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi.getProducts()
      .then((res) => {
        if (res.products) setProducts(res.products);
      })
      .catch(() => {});

    inspectionApi.getHistory({ limit: 100 })
      .then((res) => {
        const rawList = res.inspections || res.data?.inspections || (Array.isArray(res) ? res : []);
        if (Array.isArray(rawList)) {
          const mapped = rawList.map((r) => {
            const hUrl = r.heatmap_url || r.heatmap_path;
            const oUrl = r.overlay_url || r.overlay_path || hUrl;
            const scoreNum = Number(r.anomaly_score ?? r.score);
            const threshNum = Number(r.threshold_used ?? r.threshold ?? 39.39);
            return {
              id: r.inspection_id || r.id,
              time: r.created_at,
              product: r.product_name || `Product #${r.product_id || 1}`,
              productId: r.product_id || 1,
              score: !isNaN(scoreNum) ? scoreNum.toFixed(4) : '0.0000',
              threshold: !isNaN(threshNum) ? threshNum.toFixed(4) : '39.3900',
              result: r.decision || (r.is_defect ? 'FAIL' : 'PASS'),
              imageUrl: oUrl ? (oUrl.startsWith('http') ? oUrl : `${API_BASE_URL}${oUrl}`) : '',
              heatmapUrl: hUrl ? (hUrl.startsWith('http') ? hUrl : `${API_BASE_URL}${hUrl}`) : '',
            };
          });
          setInspectionsList(mapped);
        }
      })
      .catch((err) => console.error('Failed to load history:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return inspectionsList.filter((ins) => {
      const matchSearch =
        String(ins.product).toLowerCase().includes(search.toLowerCase()) ||
        String(ins.id).toLowerCase().includes(search.toLowerCase()) ||
        String(ins.score).includes(search);
      const matchStatus =
        statusFilter === 'All' || ins.result === statusFilter;
      const matchProduct =
        productFilter === 'All' || String(ins.productId) === String(productFilter);
      const matchDate =
        !dateFilter || (ins.time && ins.time.startsWith(dateFilter));
      return matchSearch && matchStatus && matchProduct && matchDate;
    });
  }, [inspectionsList, search, statusFilter, productFilter, dateFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Filters */}
      <div className="filter-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search inspections..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="All">All Status</option>
          <option value="PASS">PASS Only</option>
          <option value="FAIL">FAIL Only</option>
        </select>
        <select
          value={productFilter}
          onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
        >
          <option value="All">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.product_name || p.name || `Product #${p.id}`}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="form-control"
          style={{ width: 'auto' }}
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <Card title={`Inspections (${filtered.length})`}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Product</th>
                <th>Anomaly Score</th>
                <th>Threshold</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((ins) => {
                const resLabel = String(ins.result || (Number(ins.score) >= Number(ins.threshold) ? 'FAIL' : 'PASS')).toUpperCase();
                return (
                  <tr key={ins.id} onClick={() => setSelectedInspection(ins)} style={{ cursor: 'pointer' }}>
                    <td><strong>#{ins.id}</strong></td>
                    <td>{formatDateTime(ins.time)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{ins.product}</td>
                    <td><code>{ins.score}</code></td>
                    <td><code>{ins.threshold}</code></td>
                    <td>
                      <Badge type={resLabel === 'PASS' ? 'pass' : 'fail'}>
                        {resLabel}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: 32 }}>
                    {loading ? 'Loading real inspections...' : 'No inspections found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={page === i + 1 ? 'active' : ''}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedInspection && (
        <Modal
          title={`Inspection #${selectedInspection.id}`}
          onClose={() => setSelectedInspection(null)}
          footer={
            <>
              <button
                className="btn btn-outline"
                onClick={() => setSelectedInspection(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedInspection(null);
                  navigate(`/inspection/${selectedInspection.id}`);
                }}
              >
                View Full Details
              </button>
            </>
          }
        >
          <div className="row">
            <div className="col-6">
              <div className="heatmap-container" style={{ background: '#000', display: 'flex', justifyContent: 'center' }}>
                {selectedInspection.imageUrl ? (
                  <img src={selectedInspection.imageUrl} alt="Inspection" style={{ maxHeight: 260, objectFit: 'contain' }} />
                ) : (
                  <div className="empty-state"><p>No visual artifact</p></div>
                )}
              </div>
            </div>
            <div className="col-6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <span className="text-muted" style={{ fontSize: 12 }}>Anomaly Score</span>
                  <div style={{ fontSize: 32, fontWeight: 700, color: selectedInspection.result === 'PASS' ? 'var(--success)' : 'var(--danger)' }}>
                    {selectedInspection.score}
                  </div>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: 12 }}>Threshold</span>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedInspection.threshold}</div>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: 12 }}>Result</span>
                  <div>
                    <Badge type={selectedInspection.result === 'PASS' ? 'pass' : 'fail'} large>
                      {selectedInspection.result}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: 12 }}>Time</span>
                  <div style={{ fontSize: 13 }}>{formatDateTime(selectedInspection.time)}</div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

