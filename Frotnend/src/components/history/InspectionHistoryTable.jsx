import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { Badge } from '../common/UIComponents';
import { inspections } from '../../data/mockData';
import { formatDateTime } from '../../utils/helpers';

const PAGE_SIZE = 8;

export default function InspectionHistoryTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedInspection, setSelectedInspection] = useState(null);

  const filtered = useMemo(() => {
    return inspections.filter((ins) => {
      const matchSearch =
        ins.product.toLowerCase().includes(search.toLowerCase()) ||
        ins.score.toString().includes(search);
      const matchStatus =
        statusFilter === 'All' || ins.result === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

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
        <select defaultValue="1">
          <option value="1">Bottle Cap</option>
        </select>
        <input type="date" className="form-control" style={{ width: 'auto' }} />
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
              {paginated.map((ins) => (
                <tr key={ins.id} onClick={() => setSelectedInspection(ins)}>
                  <td>{ins.id}</td>
                  <td>{formatDateTime(ins.time)}</td>
                  <td>{ins.product}</td>
                  <td>{ins.score}</td>
                  <td>{ins.threshold}</td>
                  <td>
                    <Badge type={ins.result === 'PASS' ? 'pass' : 'fail'}>
                      {ins.result}
                    </Badge>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: 32 }}>
                    No inspections found.
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
              <div className="heatmap-container">
                <img src={selectedInspection.imageUrl} alt="Inspection" />
                <div className="heatmap-overlay"></div>
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
