import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Card from '../components/common/Card';
import ImageGrid from '../components/reference/ImageGrid';
import ToastContainer from '../components/common/ToastContainer';
import { ProgressBar } from '../components/common/UIComponents';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { productApi, referenceApi } from '../services/api';
import './ReferenceImages.css';

const TOTAL_IMAGES = 20;
const CAPTURE_INTERVAL = 3000;
const ACTIVE_PHASES = new Set(['REQUESTING_CAMERA', 'CAMERA_READY', 'COLLECTING', 'UPLOADING', 'PAUSED_ON_ERROR']);

function cameraErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'Camera permission was denied. Allow camera access and try again.';
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') return 'No camera was found on this device.';
  if (error?.name === 'NotReadableError') return 'The camera is already in use by another application.';
  return error?.message || 'Unable to access the camera. Check your browser permissions.';
}

function wait(ms, timerRef) {
  return new Promise((resolve) => {
    const timer = { id: null, resolve };
    timer.id = window.setTimeout(() => {
      if (timerRef.current === timer) timerRef.current = null;
      resolve();
    }, ms);
    timerRef.current = timer;
  });
}

export default function ReferenceImagesPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productsLoading, setProductsLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [session, setSession] = useState(null);
  const [images, setImages] = useState([]);
  const [slots, setSlots] = useState(() => Object.fromEntries(Array.from({ length: TOTAL_IMAGES }, (_, index) => [index + 1, 'pending'])));
  const [phase, setPhase] = useState('IDLE');
  const [currentCapture, setCurrentCapture] = useState(0);
  const [retryNumber, setRetryNumber] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentError, setCurrentError] = useState('');
  const [viewingHistory, setViewingHistory] = useState(false);
  const [viewingSession, setViewingSession] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const stopRef = useRef(false);
  const mountedRef = useRef(false);
  const phaseRef = useRef(phase);
  const sessionIdRef = useRef(null);
  const delayRef = useRef(null);
  const { toasts, addToast, removeToast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const loadHistory = useCallback(async (productId) => {
    if (!productId) return;
    try {
      const result = await referenceApi.getProductSessions(productId);
      if (mountedRef.current) setHistory(result.sessions || []);
    } catch (error) {
      if (error.status === 401) {
        await logout().catch(() => {});
        navigate('/login', { replace: true });
      } else if (mountedRef.current) addToast(error.message || 'Unable to load collection history', 'error');
    }
  }, [addToast, logout, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    productApi.getProducts().then((result) => {
      if (mountedRef.current) setProducts(result.products || []);
    }).catch(async (error) => {
      if (error.status === 401) {
        await logout().catch(() => {});
        navigate('/login', { replace: true });
      } else if (mountedRef.current) addToast(error.message || 'Unable to load products', 'error');
    }).finally(() => { if (mountedRef.current) setProductsLoading(false); });
    return () => {
      mountedRef.current = false;
      stopRef.current = true;
      if (delayRef.current) {
        window.clearTimeout(delayRef.current.id);
        delayRef.current.resolve();
        delayRef.current = null;
      }
      stopCamera();
      if (sessionIdRef.current && ACTIVE_PHASES.has(phaseRef.current)) {
        referenceApi.cancelSession(sessionIdRef.current).catch(() => {});
      }
    };
  }, [addToast, logout, navigate, stopCamera]);

  useEffect(() => {
    if (!selectedProductId) return undefined;
    let active = true;
    referenceApi.getProductSessions(selectedProductId).then((result) => {
      if (active) setHistory(result.sessions || []);
    }).catch(async (error) => {
      if (!active) return;
      if (error.status === 401) {
        await logout().catch(() => {});
        navigate('/login', { replace: true });
      } else addToast(error.message || 'Unable to load collection history', 'error');
    });
    return () => { active = false; };
  }, [selectedProductId, addToast, logout, navigate]);

  const selectedProduct = products.find((product) => String(product.id) === String(selectedProductId));
  const capturedCount = images.length;
  const progressPercent = Math.round((capturedCount / TOTAL_IMAGES) * 100);

  const getFrameBlob = () => new Promise((resolve, reject) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      reject(new Error('Camera preview is not ready.'));
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not capture a camera frame.')), 'image/jpeg', 0.92);
  });

  const completeCollection = async (sessionId) => {
    try {
      const result = await referenceApi.completeSession(sessionId);
      if (!mountedRef.current) return true;
      setSession(result.session);
      setPhase('COMPLETED');
      setRetryNumber(null);
      stopCamera();
      addToast('All 20 reference images were saved. Dataset complete.', 'success');
      await loadHistory(selectedProductId);
      return true;
    } catch (error) {
      if (mountedRef.current) {
        setCurrentError(error.message || 'Unable to complete the collection.');
        setPhase('PAUSED_ON_ERROR');
        setRetryNumber(TOTAL_IMAGES + 1);
        addToast(error.message || 'Unable to complete the collection', 'error');
      }
      return false;
    }
  };

  const captureOne = async (sessionId, imageNumber) => {
    if (mountedRef.current) {
      setCurrentCapture(imageNumber);
      setSlots((previous) => ({ ...previous, [imageNumber]: 'capturing' }));
      setPhase('UPLOADING');
      setCurrentError('');
    }
    try {
      const blob = await getFrameBlob();
      const result = await referenceApi.captureImage(sessionId, imageNumber, blob);
      const savedImage = result.image;
      if (mountedRef.current) {
        setImages((previous) => [...previous.filter((image) => image.image_number !== imageNumber), savedImage].sort((a, b) => a.image_number - b.image_number));
        setSlots((previous) => ({ ...previous, [imageNumber]: 'saved' }));
        if (!stopRef.current) setPhase('COLLECTING');
      }
      return true;
    } catch (error) {
      if (stopRef.current) return false;
      // A timeout can occur after Python saved the file; reconcile before retrying that number.
      if (error.status === 409) {
        try {
          const result = await referenceApi.getSession(sessionId);
          const savedImage = result.session.images?.find((image) => image.image_number === imageNumber);
          if (savedImage) {
            if (mountedRef.current && !stopRef.current) {
              setImages((previous) => [...previous.filter((image) => image.image_number !== imageNumber), savedImage].sort((a, b) => a.image_number - b.image_number));
              setSlots((previous) => ({ ...previous, [imageNumber]: 'saved' }));
              setPhase('COLLECTING');
            }
            return true;
          }
        } catch { /* Report the original capture failure below. */ }
      }
      if (mountedRef.current) {
        setSlots((previous) => ({ ...previous, [imageNumber]: 'failed' }));
        setCurrentError(error.status === 502 || !error.status ? 'The image service could not save this frame. Retry this capture.' : error.message);
        setPhase('PAUSED_ON_ERROR');
        setRetryNumber(imageNumber);
        addToast(error.status === 401 ? 'Please log in again' : (error.message || 'Image capture failed'), 'error');
      }
      if (error.status === 401) {
        await logout().catch(() => {});
        navigate('/login', { replace: true });
      }
      return false;
    }
  };

  const runCaptureLoop = async (sessionId, firstNumber) => {
    let imageNumber = firstNumber;
    while (imageNumber <= TOTAL_IMAGES && !stopRef.current) {
      const saved = await captureOne(sessionId, imageNumber);
      if (!saved) return;
      if (stopRef.current) return;
      if (imageNumber === TOTAL_IMAGES) {
        await completeCollection(sessionId);
        return;
      }
      await wait(CAPTURE_INTERVAL, delayRef);
      imageNumber += 1;
    }
  };

  const handleStartCollection = async () => {
    if (!selectedProduct || ACTIVE_PHASES.has(phase)) {
      if (!selectedProduct) addToast('Select a product before starting collection', 'warning');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      addToast('Camera access requires a supported browser and HTTPS (localhost is allowed).', 'error');
      return;
    }
    setPhase('REQUESTING_CAMERA');
    setCurrentError('');
    stopRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (stopRef.current || !mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('CAMERA_READY');
      const result = await referenceApi.createSession(selectedProduct.id);
      sessionIdRef.current = result.session.id;
      if (stopRef.current || !mountedRef.current) {
        await referenceApi.cancelSession(result.session.id).catch(() => {});
        return;
      }
      setSession(result.session);
      setImages([]);
      setSlots(Object.fromEntries(Array.from({ length: TOTAL_IMAGES }, (_, index) => [index + 1, 'pending'])));
      setViewingHistory(false);
      setRetryNumber(null);
      await runCaptureLoop(result.session.id, 1);
    } catch (error) {
      stopCamera();
      setPhase('IDLE');
      const message = error.name?.startsWith('Not') || error.name === 'SecurityError'
        ? cameraErrorMessage(error)
        : error.status === 404 ? 'The selected product was not found.'
          : error.status === 401 ? 'Please log in again.'
            : error.status ? (error.message || 'Unable to start collection.')
              : 'The reference image service is unavailable.';
      setCurrentError(message);
      addToast(message, 'error');
      if (error.status === 401) {
        await logout().catch(() => {});
        navigate('/login', { replace: true });
      }
    }
  };

  const handleRetry = async () => {
    if (!sessionIdRef.current || retryNumber === null) return;
    if (retryNumber === TOTAL_IMAGES + 1) {
      await completeCollection(sessionIdRef.current);
      return;
    }
    stopRef.current = false;
    if (!cameraActive || !streamRef.current?.active) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCurrentError('Camera access requires a supported browser and HTTPS (localhost is allowed).');
        return;
      }
      try {
        setPhase('REQUESTING_CAMERA');
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
        });
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          await videoRef.current.play();
        }
      } catch (error) {
        setPhase('PAUSED_ON_ERROR');
        setCurrentError(cameraErrorMessage(error));
        addToast(cameraErrorMessage(error), 'error');
        return;
      }
    }
    setSlots((previous) => ({ ...previous, [retryNumber]: 'capturing' }));
    await runCaptureLoop(sessionIdRef.current, retryNumber);
  };

  const handleCancel = async () => {
    stopRef.current = true;
    if (delayRef.current) {
      window.clearTimeout(delayRef.current.id);
      delayRef.current.resolve();
      delayRef.current = null;
    }
    stopCamera();
    const sessionId = sessionIdRef.current;
    setPhase('CANCELLED');
    if (sessionId) {
      try {
        const result = await referenceApi.cancelSession(sessionId);
        setSession(result.session);
        await loadHistory(selectedProductId);
      } catch (error) {
        addToast(error.message || 'Collection stopped locally; server status could not be updated.', 'error');
      }
    }
    addToast('Collection cancelled. Saved images are preserved.', 'info');
  };

  const handleViewSession = async (historySession) => {
    try {
      const result = await referenceApi.getSession(historySession.id);
      setViewingSession(result.session);
      setViewingHistory(true);
    } catch (error) {
      addToast(error.message || 'Unable to load this collection', 'error');
    }
  };

  const handleNewCollection = () => {
    setSession(null);
    sessionIdRef.current = null;
    setImages([]);
    setCurrentCapture(0);
    setRetryNumber(null);
    setCurrentError('');
    setViewingSession(null);
    setViewingHistory(false);
    setSlots(Object.fromEntries(Array.from({ length: TOTAL_IMAGES }, (_, index) => [index + 1, 'pending'])));
    setPhase('IDLE');
    setSelectedProductId('');
  };

  const active = ACTIVE_PHASES.has(phase);
  const currentImages = viewingHistory ? (viewingSession?.images || []) : images;
  const currentSession = viewingHistory ? viewingSession : session;
  const currentProduct = selectedProduct;
  const visibleCount = viewingHistory ? (viewingSession?.captured_images || 0) : capturedCount;

  return <div className="reference-page">
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    <Breadcrumbs items={[{ label: 'Setup', path: '/setup' }, { label: 'Reference Images' }]} />
    <div className="page-title"><h1>Reference Image Collection</h1></div>
    <div className="page-body">
      <p className="reference-intro">Capture 20 normal product images to build an AI reference dataset.</p>
      <div className="row">
        <div className="col-12">
          <Card title="Select Product" menu={false}>
            {productsLoading ? <p>Loading your products…</p> : products.length === 0 ? (
              <div className="reference-empty">You do not have any products yet. <Link to="/setup">Set up a product</Link> before collecting reference images.</div>
            ) : <div className="reference-product-select">
              <label htmlFor="reference-product">Product</label>
              <select id="reference-product" className="select-sm" value={selectedProductId} disabled={active} onChange={(event) => {
                setSelectedProductId(event.target.value);
                setViewingHistory(false); setViewingSession(null); setSession(null); sessionIdRef.current = null; setImages([]); setHistory([]); setPhase('IDLE');
              }}>
                <option value="">Choose a product…</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.product_name} ({product.product_id})</option>)}
              </select>
              {selectedProduct && <div className="reference-product-details">
                <span><small>Product Name</small><strong>{selectedProduct.product_name}</strong></span>
                <span><small>Product ID</small><strong>{selectedProduct.product_id}</strong></span>
                <span><small>Product Type</small><strong>{selectedProduct.product_type}</strong></span>
                <span><small>Manufacturer</small><strong>{selectedProduct.manufacturer || '—'}</strong></span>
              </div>}
            </div>}
          </Card>
        </div>
      </div>

      {selectedProduct && <>
        <div className="row">
          <div className="col-8">
            <Card title="Camera Preview" menu={false}>
              {active || phase === 'COMPLETED' || phase === 'PAUSED_ON_ERROR' ? <div className="reference-video-wrap">
                <video ref={videoRef} className="reference-video" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="reference-canvas" />
                {!cameraActive && phase !== 'COMPLETED' && <div className="reference-video-overlay"><i className="fas fa-video" /><span>{phase === 'REQUESTING_CAMERA' ? 'Requesting camera…' : 'Camera is stopped'}</span></div>}
              </div> : <div className="reference-camera-placeholder"><i className="fas fa-camera" /><strong>Ready to collect reference images</strong><span>{selectedProduct.product_name} · {selectedProduct.product_id}</span></div>}
              <div className="reference-camera-actions">
                {phase === 'IDLE' || phase === 'CANCELLED' ? <button className="btn btn-primary" type="button" onClick={handleStartCollection} disabled={!selectedProduct || productsLoading}><i className="fas fa-camera" /> Start Collection</button> : null}
                {phase === 'PAUSED_ON_ERROR' && <button className="btn btn-primary" type="button" onClick={handleRetry}><i className="fas fa-redo" /> Retry Capture {retryNumber && retryNumber <= TOTAL_IMAGES ? `#${retryNumber}` : ''}</button>}
                {active && <button className="btn btn-outline" type="button" onClick={handleCancel}>Stop Camera / Cancel</button>}
                {phase === 'COMPLETED' && <button className="btn btn-primary" type="button" onClick={handleNewCollection}>Return to Product Selection</button>}
                {phase === 'CANCELLED' && <span className="reference-status cancelled">Collection cancelled; saved images retained.</span>}
                {phase === 'COLLECTING' && <span className="reference-status"><i className="fas fa-circle" /> Camera ready · next capture in about 3 seconds</span>}
                {phase === 'UPLOADING' && <span className="reference-status"><i className="fas fa-spinner fa-spin" /> Processing capture {currentCapture}…</span>}
                {phase === 'REQUESTING_CAMERA' && <span className="reference-status">Requesting camera access…</span>}
              </div>
              {currentError && <p className="reference-error" role="alert">{currentError}</p>}
            </Card>
          </div>
          <div className="col-4">
            <Card title="Collection Progress" menu={false}>
              <div className="reference-progress-head"><strong>{viewingHistory ? (viewingSession?.status || 'Collection') : 'Reference Image Collection'}</strong><span>{visibleCount} / {TOTAL_IMAGES}</span></div>
              <p className="reference-progress-product">Product: {selectedProduct.product_name}</p>
              <ProgressBar value={viewingHistory ? Math.round(((viewingSession?.captured_images || 0) / TOTAL_IMAGES) * 100) : progressPercent} color="var(--primary)" />
              <p className="reference-progress-percent">Progress: {viewingHistory ? Math.round(((viewingSession?.captured_images || 0) / TOTAL_IMAGES) * 100) : progressPercent}%</p>
              <p className="reference-progress-note">{active ? `Current capture: ${currentCapture || capturedCount + 1} of ${TOTAL_IMAGES}` : phase === 'COMPLETED' ? 'Dataset status: COMPLETE' : 'Capture interval: approximately 3 seconds'}</p>
            </Card>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <Card title={viewingHistory ? 'Saved Session Images' : 'Capture Slots'} menu={false}>
              <div className="reference-slots">
                {Array.from({ length: TOTAL_IMAGES }, (_, index) => {
                  const imageNumber = index + 1;
                  const image = currentImages.find((item) => item.image_number === imageNumber);
                  const slotStatus = image ? 'saved' : (viewingHistory ? 'pending' : (slots[imageNumber] || 'pending'));
                  return <div key={imageNumber} className={`reference-slot ${slotStatus}`}>
                    {image ? <img crossOrigin="use-credentials" src={referenceApi.imageUrl(currentSession?.id, image.id)} alt={`Reference image ${imageNumber}`} /> : <span className="reference-slot-number">{imageNumber}</span>}
                    <small>{image ? 'Saved' : slotStatus === 'capturing' ? 'Capturing…' : slotStatus === 'failed' ? 'Failed' : 'Pending'}</small>
                  </div>;
                })}
              </div>
              {phase === 'COMPLETED' && !viewingHistory && <div className="reference-complete-summary"><i className="fas fa-check-circle" /><div><strong>Dataset status: COMPLETE</strong><span>{currentProduct.product_name} · 20 images · {session?.completed_at ? new Date(session.completed_at).toLocaleString() : new Date().toLocaleString()}</span></div></div>}
            </Card>
          </div>
        </div>

        {(viewingHistory || phase === 'COMPLETED') && currentImages.length > 0 && <div className="row">
          <div className="col-12">
            <ImageGrid images={currentImages.map((image) => ({
              ...image,
              url: referenceApi.imageUrl(currentSession?.id, image.id),
              valid: true,
            }))} />
          </div>
        </div>}

        <div className="row">
          <div className="col-12">
            <Card title="Dataset History" menu={false}>
              {history.length === 0 ? <p className="reference-history-empty">No previous collections for this product.</p> : <div className="table-wrap"><table className="table"><thead><tr><th>Session</th><th>Images</th><th>Status</th><th>Date</th><th /></tr></thead><tbody>
                {history.map((item) => <tr key={item.id}><td>{item.id.slice(0, 8)}</td><td>{item.captured_images}/{TOTAL_IMAGES}</td><td><span className={`badge ${item.status === 'COMPLETE' ? 'badge-success' : item.status === 'CANCELLED' ? 'badge-warning' : 'badge-primary'}`}>{item.status}</span></td><td>{new Date(item.created_at).toLocaleString()}</td><td><button className="btn btn-sm btn-outline" type="button" disabled={active} onClick={() => handleViewSession(item)}>View images</button></td></tr>)}
              </tbody></table></div>}
              {viewingHistory && <button className="btn btn-outline reference-history-back" type="button" onClick={() => { setViewingHistory(false); setViewingSession(null); }}>Back to current collection</button>}
            </Card>
          </div>
        </div>
      </>}
    </div>
  </div>;
}
