import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getEnrichmentStatus, getEnrichmentBrandStatus } from '../services/enrichmentService'
import './EnrichmentStatus.css'

const BUCKETS = [
  { key: 'done', label: 'Done', hint: 'Scraped ok / in batch output' },
  { key: 'left', label: 'Left', hint: 'Unpublished, not scraped ok yet' },
  { key: 'failed', label: 'Failed', hint: 'not_found / scrape failed' },
]

function SkuList({ items, emptyLabel, showReason }) {
  if (!items?.length) {
    return <p className="enrich-empty-skus">{emptyLabel}</p>
  }
  return (
    <ul className="enrich-sku-list">
      {items.map((row) => (
        <li key={`${row.productId || row.sku}-${row.status || ''}`}>
          <span className="enrich-sku-code">{row.sku}</span>
          {row.officialSku && row.officialSku !== row.sku ? (
            <span className="enrich-sku-meta">→ {row.officialSku}</span>
          ) : null}
          {row.nearMatch ? (
            <span className="enrich-sku-tag">near</span>
          ) : null}
          {showReason && row.reason ? (
            <span className="enrich-sku-reason" title={row.reason}>
              {row.reason}
            </span>
          ) : null}
          {row.title ? (
            <span className="enrich-sku-title" title={row.title}>
              {row.title}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

const EnrichmentStatus = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedBrand, setSelectedBrand] = useState(
    searchParams.get('brand') || ''
  )
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeBucket, setActiveBucket] = useState(
    searchParams.get('bucket') || 'left'
  )

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getEnrichmentStatus()
      setSummary(res.data || null)
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          'Failed to load enrichment status'
      )
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    if (!selectedBrand) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    getEnrichmentBrandStatus(selectedBrand)
      .then((res) => {
        if (!cancelled) setDetail(res.data || null)
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null)
          setError(
            err?.response?.data?.message ||
              err.message ||
              'Failed to load brand detail'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedBrand])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedBrand) params.set('brand', selectedBrand)
    if (selectedBrand && activeBucket) params.set('bucket', activeBucket)
    setSearchParams(params, { replace: true })
  }, [selectedBrand, activeBucket, setSearchParams])

  const brands = summary?.brands || []
  const totals = summary?.totals || { total: 0, done: 0, left: 0, failed: 0 }

  const openBrand = (key) => {
    setSelectedBrand(key)
    setActiveBucket('left')
  }

  const closeDetail = () => {
    setSelectedBrand('')
    setDetail(null)
  }

  return (
    <div className="enrich-status-page">
      <div className="enrich-status-header">
        <div className="breadcrumb">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="breadcrumb-link"
          >
            Dashboard
          </button>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">Enrichment status</span>
        </div>
        <div className="page-title-section">
          <h1>Enrichment status</h1>
          <p className="page-subtitle">
            Unpublished SKUs per brand — scraped (done) vs still left or failed
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            onClick={() => navigate('/new-listings')}
            className="btn-secondary"
          >
            New listings
          </button>
          <button type="button" onClick={loadSummary} className="btn-secondary">
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-back"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="enrich-status-counts">
        <div className="count-item">
          <span className="count-value">{totals.total}</span>
          <span className="count-label">In scope</span>
        </div>
        <div className="count-item count-done">
          <span className="count-value">{totals.done}</span>
          <span className="count-label">Done</span>
        </div>
        <div className="count-item count-left">
          <span className="count-value">{totals.left}</span>
          <span className="count-label">Left</span>
        </div>
        <div className="count-item count-failed">
          <span className="count-value">{totals.failed}</span>
          <span className="count-label">Failed</span>
        </div>
      </div>

      {error ? <div className="enrich-status-error">{error}</div> : null}

      <div className="enrich-status-table-wrap">
        {loading ? (
          <div className="enrich-status-loading">Loading enrichment status…</div>
        ) : (
          <table className="enrich-status-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Total</th>
                <th>Done</th>
                <th>Left</th>
                <th>Failed</th>
                <th>Batch</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {brands.map((row) => (
                <tr
                  key={row.key}
                  className={
                    selectedBrand === row.key ? 'is-selected' : undefined
                  }
                >
                  <td className="brand-cell">{row.brand}</td>
                  <td>{row.total}</td>
                  <td className="num-done">{row.done}</td>
                  <td className="num-left">{row.left}</td>
                  <td className="num-failed">{row.failed}</td>
                  <td className="batch-cell">
                    {row.batchPresent ? (
                      <span className="batch-ok" title={row.batchDir || ''}>
                        yes
                      </span>
                    ) : (
                      <span className="batch-missing">none</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-view"
                      onClick={() => openBrand(row.key)}
                    >
                      View SKUs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedBrand ? (
        <div className="enrich-detail-panel">
          <div className="enrich-detail-head">
            <div>
              <h2>{detail?.brand || selectedBrand}</h2>
              <p className="page-subtitle">
                {detail
                  ? `${detail.done} done · ${detail.left} left · ${detail.failed} failed`
                  : 'Loading…'}
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={closeDetail}>
              Close
            </button>
          </div>

          <div className="enrich-bucket-tabs">
            {BUCKETS.map((b) => (
              <button
                key={b.key}
                type="button"
                className={
                  activeBucket === b.key
                    ? `bucket-tab is-active bucket-${b.key}`
                    : `bucket-tab bucket-${b.key}`
                }
                onClick={() => setActiveBucket(b.key)}
                title={b.hint}
              >
                {b.label}
                <span className="bucket-count">
                  {detail?.[b.key] ?? '…'}
                </span>
              </button>
            ))}
          </div>

          <div className="enrich-detail-body">
            {detailLoading ? (
              <div className="enrich-status-loading">Loading SKUs…</div>
            ) : (
              <SkuList
                items={detail?.skus?.[activeBucket] || []}
                emptyLabel={`No ${activeBucket} SKUs for this brand.`}
                showReason={activeBucket === 'failed'}
              />
            )}
          </div>
        </div>
      ) : null}

      <p className="enrich-status-footnote">
        Scope: unpublished IMS products for Balmain, Titan, Timex, Tissot, Fossil,
        Casio, Seiko. Done = present in batch/scrape output with status ok. Failed =
        not_found / failed scrape. Left = unpublished not in the done set.
      </p>
    </div>
  )
}

export default EnrichmentStatus
