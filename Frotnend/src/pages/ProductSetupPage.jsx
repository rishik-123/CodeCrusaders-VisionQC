import { useState } from 'react';
import Breadcrumbs from '../components/layout/Breadcrumbs';

const PRODUCT_TYPES = [
  'bottle',
  'cable',
  'capsule',
  'carpet',
  'grid',
  'hazelnut',
  'leather',
  'metal_nut',
  'MVtecAD',
  'pill',
  'screw',
  'tile',
  'toothbrush',
  'transistor',
  'wood',
  'zipper',
];

const UNITS = ['mm', 'cm', 'inches'];

export default function ProductSetupPage() {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    productName: '',
    productType: '',
    productID: '',
    manufacturer: '',
    description: '',
    material: '',
    length: '',
    width: '',
    height: '',
    unit: 'mm',
    color: '',
    colorPicker: '#2bb3c0',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.productName.trim()) {
      newErrors.productName = 'Product Name is required';
    }
    if (!formData.productType) {
      newErrors.productType = 'Product Type is required';
    }
    if (!formData.productID.trim()) {
      newErrors.productID = 'Product ID is required';
    }
    if (!formData.manufacturer.trim()) {
      newErrors.manufacturer = 'Manufacturer name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevious = () => {
    if (step === 2) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCompleteSetup = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setFormData({
      productName: '',
      productType: '',
      productID: '',
      manufacturer: '',
      description: '',
      material: '',
      length: '',
      width: '',
      height: '',
      unit: 'mm',
      color: '',
      colorPicker: '#2bb3c0',
    });
    setErrors({});
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Breadcrumbs title="Product Setup" trail={['Setup']} />

      <div className="page-body">
        {/* Step Progress Header (DAdmin Style) */}
        <div style={styles.wizardHeaderContainer}>
          <div
            style={{
              ...styles.wizardTab,
              background: step === 1 ? 'var(--primary)' : step > 1 ? '#2bb3c0' : '#8e9499',
            }}
            onClick={() => {
              if (step === 2) setStep(1);
            }}
          >
            <span style={styles.stepNumber}>
              {step > 1 ? <i className="fas fa-check" style={{ fontSize: 32 }} /> : '1'}
            </span>
            <span style={styles.stepTitle}>Identification</span>
            {step === 1 && <div style={styles.activePointer} />}
          </div>

          <div
            style={{
              ...styles.wizardTab,
              background: step === 2 ? 'var(--primary)' : step > 2 ? '#2bb3c0' : '#8e9499',
              cursor: step >= 2 ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (step === 2 || (step === 1 && validateStep1())) setStep(2);
            }}
          >
            <span style={styles.stepNumber}>
              {step > 2 ? <i className="fas fa-check" style={{ fontSize: 32 }} /> : '2'}
            </span>
            <span style={styles.stepTitle}>Review Details</span>
            {step === 2 && <div style={styles.activePointer} />}
          </div>

          <div
            style={{
              ...styles.wizardTab,
              background: step === 3 ? 'var(--primary)' : '#8e9499',
            }}
          >
            <span style={styles.stepNumber}>3</span>
            <span style={styles.stepTitle}>Completed</span>
            {step === 3 && <div style={styles.activePointer} />}
          </div>
        </div>

        {/* Wizard Main Card */}
        <div className="card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
          {/* STEP 1: Product Identification */}
          {step === 1 && (
            <div style={{ padding: '30px 35px' }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, color: 'var(--heading)', fontWeight: 600, marginBottom: 6 }}>
                  Product Identification
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                  Enter the basic information and specifications of the product you want to inspect.
                </p>
                <div style={{ height: 1, background: 'var(--border)', marginTop: 16 }} />
              </div>

              <form onSubmit={(e) => e.preventDefault()}>
                {/* Basic Information Section */}
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Basic Information
                </h3>

                <div style={styles.grid3Col}>
                  {/* Product Name */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Product Name <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="productName"
                      value={formData.productName}
                      onChange={handleChange}
                      placeholder="Enter product name"
                      style={{
                        ...styles.input,
                        borderColor: errors.productName ? 'var(--danger)' : 'var(--border)',
                      }}
                    />
                    {errors.productName && <span style={styles.errorText}>{errors.productName}</span>}
                  </div>

                  {/* Product Type */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Product Type <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      name="productType"
                      value={formData.productType}
                      onChange={handleChange}
                      style={{
                        ...styles.input,
                        borderColor: errors.productType ? 'var(--danger)' : 'var(--border)',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">-- Select Product Type --</option>
                      {PRODUCT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.productType && <span style={styles.errorText}>{errors.productType}</span>}
                  </div>

                  {/* Product ID */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Product ID <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="productID"
                      value={formData.productID}
                      onChange={handleChange}
                      placeholder="Enter unique product ID"
                      style={{
                        ...styles.input,
                        borderColor: errors.productID ? 'var(--danger)' : 'var(--border)',
                      }}
                    />
                    {errors.productID && <span style={styles.errorText}>{errors.productID}</span>}
                  </div>

                  {/* Manufacturer */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Manufacturer <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleChange}
                      placeholder="Enter manufacturer name"
                      style={{
                        ...styles.input,
                        borderColor: errors.manufacturer ? 'var(--danger)' : 'var(--border)',
                      }}
                    />
                    {errors.manufacturer && <span style={styles.errorText}>{errors.manufacturer}</span>}
                  </div>

                  {/* Material */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Material</label>
                    <input
                      type="text"
                      name="material"
                      value={formData.material}
                      onChange={handleChange}
                      placeholder="Enter product material"
                      style={styles.input}
                    />
                  </div>

                  {/* Empty cell for layout balance */}
                  <div style={styles.formGroup} />

                  {/* Description - Spans full width */}
                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe the product and its intended use"
                      style={{ ...styles.input, resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* Product Specifications Section */}
                <div style={{ marginTop: 24, marginBottom: 28 }}>
                  <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Product Specifications
                  </h3>

                  <div style={styles.grid3Col}>
                    {/* Dimensions Container - Spans 2 columns */}
                    <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                      <label style={styles.label}>Product Dimensions (Length × Width × Height & Unit)</label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          type="number"
                          name="length"
                          value={formData.length}
                          onChange={handleChange}
                          placeholder="Length"
                          style={{ ...styles.input, flex: 1 }}
                        />
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>×</span>
                        <input
                          type="number"
                          name="width"
                          value={formData.width}
                          onChange={handleChange}
                          placeholder="Width"
                          style={{ ...styles.input, flex: 1 }}
                        />
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>×</span>
                        <input
                          type="number"
                          name="height"
                          value={formData.height}
                          onChange={handleChange}
                          placeholder="Height"
                          style={{ ...styles.input, flex: 1 }}
                        />
                        <select
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          style={{ ...styles.input, width: 90, background: '#fff', cursor: 'pointer' }}
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Product Color */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Product Color</label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          type="text"
                          name="color"
                          value={formData.color}
                          onChange={handleChange}
                          placeholder="Enter product color"
                          style={{ ...styles.input, flex: 1 }}
                        />
                        <input
                          type="color"
                          name="colorPicker"
                          value={formData.colorPicker}
                          onChange={(e) => {
                            handleChange(e);
                            if (!formData.color) {
                              setFormData((prev) => ({ ...prev, color: e.target.value }));
                            }
                          }}
                          style={{
                            width: 42,
                            height: 42,
                            padding: 2,
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            cursor: 'pointer',
                            background: '#fff',
                          }}
                          title="Pick Color"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation */}
                <div style={styles.buttonFooter}>
                  <div />
                  <button
                    type="button"
                    onClick={handleNext}
                    style={styles.btnPrimary}
                  >
                    Next Step <i className="fas fa-arrow-right" style={{ marginLeft: 8 }} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Review Product Details */}
          {step === 2 && (
            <div style={{ padding: '30px 35px' }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, color: 'var(--heading)', fontWeight: 600, marginBottom: 6 }}>
                  Review Product Details
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                  Verify your product information before completing the setup.
                </p>
                <div style={{ height: 1, background: 'var(--border)', marginTop: 16 }} />
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 30 }}>
                {/* Basic Information Card */}
                <div style={styles.summaryBox}>
                  <div style={styles.summaryBoxHeader}>
                    <i className="fas fa-info-circle" style={{ color: 'var(--primary)', marginRight: 10 }} />
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--heading)' }}>Basic Information</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={styles.editBtn}
                    >
                      <i className="fas fa-pencil-alt" style={{ marginRight: 4 }} /> Edit
                    </button>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Product Name:</span>
                      <strong style={styles.reviewValue}>{formData.productName || '—'}</strong>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Product Type:</span>
                      <span style={{ ...styles.reviewValue, display: 'inline-block', background: 'rgba(43,179,192,0.1)', color: 'var(--primary)', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>
                        {formData.productType || '—'}
                      </span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Product ID:</span>
                      <strong style={styles.reviewValue}>{formData.productID || '—'}</strong>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Manufacturer:</span>
                      <span style={styles.reviewValue}>{formData.manufacturer || '—'}</span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Material:</span>
                      <span style={styles.reviewValue}>{formData.material || 'N/A'}</span>
                    </div>
                    <div style={{ ...styles.reviewRow, borderBottom: 'none' }}>
                      <span style={styles.reviewLabel}>Description:</span>
                      <span style={{ ...styles.reviewValue, whiteSpace: 'pre-wrap' }}>
                        {formData.description || 'No description provided.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Product Specifications Card */}
                <div style={styles.summaryBox}>
                  <div style={styles.summaryBoxHeader}>
                    <i className="fas fa-cogs" style={{ color: 'var(--primary)', marginRight: 10 }} />
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--heading)' }}>Product Specifications</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={styles.editBtn}
                    >
                      <i className="fas fa-pencil-alt" style={{ marginRight: 4 }} /> Edit
                    </button>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Dimensions (L × W × H):</span>
                      <strong style={styles.reviewValue}>
                        {formData.length || formData.width || formData.height
                          ? `${formData.length || 0} × ${formData.width || 0} × ${formData.height || 0} ${formData.unit}`
                          : 'Not specified'}
                      </strong>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Selected Unit:</span>
                      <span style={styles.reviewValue}>{formData.unit}</span>
                    </div>
                    <div style={{ ...styles.reviewRow, borderBottom: 'none' }}>
                      <span style={styles.reviewLabel}>Product Color:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={styles.reviewValue}>{formData.color || 'Not specified'}</span>
                        {formData.colorPicker && (
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: formData.colorPicker,
                              border: '1px solid #ccc',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div style={styles.buttonFooter}>
                <button
                  type="button"
                  onClick={handlePrevious}
                  style={styles.btnSecondary}
                >
                  <i className="fas fa-arrow-left" style={{ marginRight: 8 }} /> Previous
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSetup}
                  style={styles.btnSuccess}
                >
                  <i className="fas fa-check-circle" style={{ marginRight: 8 }} /> Complete Setup
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Completed */}
          {step === 3 && (
            <div style={{ padding: '60px 35px', textAlign: 'center' }}>
              {/* Circular Success Badge */}
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  background: 'rgba(0,147,120,0.12)',
                  color: 'var(--teal)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 44,
                  marginBottom: 24,
                }}
              >
                <i className="fas fa-check" />
              </div>

              <h2 style={{ fontSize: 26, color: 'var(--heading)', fontWeight: 700, marginBottom: 12 }}>
                Product Successfully Registered!
              </h2>

              <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.6 }}>
                Your product information has been saved successfully and is ready for the next stage of the VisionQC inspection workflow.
              </p>

              {/* Registered Product Summary Card */}
              <div
                style={{
                  maxWidth: 480,
                  margin: '0 auto 36px',
                  background: 'var(--page-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '20px 24px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>Product Name</span>
                  <strong style={{ color: 'var(--heading)', fontSize: 14 }}>{formData.productName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>Product ID</span>
                  <strong style={{ color: 'var(--heading)', fontSize: 14 }}>{formData.productID}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>Product Type</span>
                  <span
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {formData.productType}
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleReset}
                  style={styles.btnPrimary}
                >
                  <i className="fas fa-redo" style={{ marginRight: 8 }} /> Back to Product Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Internal Inline Styles following VisionQC & DAdmin aesthetic
const styles = {
  wizardHeaderContainer: {
    display: 'flex',
    gap: 15,
    flexWrap: 'wrap',
  },
  wizardTab: {
    flex: 1,
    minWidth: 200,
    height: 70,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    position: 'relative',
    borderRadius: 4,
    transition: 'background 0.3s ease',
    userSelect: 'none',
  },
  stepNumber: {
    fontSize: 50,
    fontWeight: 700,
    lineHeight: 1,
    marginRight: 14,
    fontFamily: 'var(--font)',
    opacity: 0.95,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 400,
    whiteSpace: 'nowrap',
    letterSpacing: '0.3px',
  },
  activePointer: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '10px solid transparent',
    borderRight: '10px solid transparent',
    borderTop: '10px solid var(--primary)',
    zIndex: 2,
  },
  grid3Col: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px 24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--heading)',
    marginBottom: 8,
  },
  input: {
    height: 42,
    padding: '0 14px',
    fontSize: 14,
    color: 'var(--text)',
    background: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: 4,
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  errorText: {
    color: 'var(--danger)',
    fontSize: 12,
    marginTop: 5,
  },
  buttonFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 20,
    borderTop: '1px solid var(--border)',
  },
  btnPrimary: {
    height: 42,
    padding: '0 24px',
    background: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'opacity 0.2s',
  },
  btnSecondary: {
    height: 42,
    padding: '0 24px',
    background: '#ffffff',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  },
  btnSuccess: {
    height: 42,
    padding: '0 24px',
    background: 'var(--teal)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  },
  summaryBox: {
    background: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  summaryBoxHeader: {
    padding: '14px 20px',
    background: 'var(--header-bg)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px dashed var(--border)',
    fontSize: 13,
  },
  reviewLabel: {
    color: 'var(--muted)',
    fontWeight: 500,
  },
  reviewValue: {
    color: 'var(--heading)',
    fontWeight: 500,
    textAlign: 'right',
  },
};
