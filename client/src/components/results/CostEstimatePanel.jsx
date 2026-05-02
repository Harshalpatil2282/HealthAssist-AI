import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, AlertTriangle, Info, CreditCard, Loader, Database } from 'lucide-react';
import { formatCostRange, formatCurrency } from '../../utils/formatCurrency';
import ConfidenceScore from '../common/ConfidenceScore';
import { useApp } from '../../context/AppContext';
import { generateCostReport } from '../../utils/pdfExport';

/**
 * CostEstimatePanel — works with both old mock shape and new backend shape.
 * Backend shape (via adaptCostEstimate in api/index.js):
 *   { totalMin, totalMax, confidence, disclaimer, components[], riskFlags[], dataSources[], syntheticDataUsed }
 * Old mock shape fallback:
 *   { breakdown[], total: { min, max }, confidence, ... }
 */
function CostBar({ item, totalMin, totalMax }) {
  const itemMid   = (item.min + item.max) / 2;
  const totalMid  = (totalMin + totalMax) / 2;
  const percentage = totalMid > 0 ? Math.round((itemMid / totalMid) * 100) : 0;

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1">
        <div>
          <span className="text-sm text-text-secondary">{item.name || item.item}</span>
          {item.notes && (
            <p className="text-xs text-text-secondary/70 mt-0.5 leading-relaxed">{item.notes}</p>
          )}
        </div>
        <span className="cost-figure text-sm font-semibold text-text-primary ml-2 flex-shrink-0">
          {formatCostRange(item.min, item.max)}
        </span>
      </div>
      <div className="h-2 bg-border rounded-pill overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-pill transition-all duration-1000 score-bar-fill"
          style={{ width: `${percentage}%` }}
          aria-label={`${item.name}: ${percentage}% of total`}
        />
      </div>
    </div>
  );
}

export default function CostEstimatePanel({ costData }) {
  const [showCalculation, setShowCalculation] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF]  = useState(false);
  const { addToast, state } = useApp();

  if (!costData) return null;

  // Normalise: support both backend (new) and mock (old) shapes
  const isNewShape = costData.components != null;

  const components = isNewShape
    ? costData.components
    : (costData.breakdown || []).map(b => ({ name: b.item, min: b.min, max: b.max, notes: null }));

  const totalMin = isNewShape ? costData.totalMin : costData.total?.min ?? 0;
  const totalMax = isNewShape ? costData.totalMax : costData.total?.max ?? 0;
  const confidence = costData.confidence ?? 0;
  const riskFlags  = costData.riskFlags  || [];
  const dataSources = costData.dataSources || [];
  const disclaimer  = costData.disclaimer;
  const syntheticDataUsed = costData.syntheticDataUsed ?? true;

  const handleDownload = async () => {
    setIsGeneratingPDF(true);
    addToast({ type: 'success', title: 'Generating PDF…', message: 'Building your report — please wait.', duration: 3000 });
    try {
      await generateCostReport({
        costData,
        hospitals: state.results?.hospitals || [],
        searchQuery: state.searchQuery,
        searchLocation: state.searchLocation,
      });
      addToast({ type: 'success', title: 'PDF Downloaded', message: 'Your HealthAssist cost report has been saved.', duration: 4000 });
    } catch (err) {
      addToast({ type: 'error', message: 'PDF generation failed. Please try again.', duration: 4000 });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="bg-bg-card rounded-lg border border-border shadow-card">

      {/* Header */}
      <div className="p-5 border-b border-border">
        <h2 className="font-display font-bold text-lg text-text-primary mb-1">Treatment Cost Estimate</h2>
        <p className="text-xs text-text-secondary">{state.searchQuery || 'Healthcare cost breakdown'}</p>
        {syntheticDataUsed && (
          <div className="flex items-center gap-1 mt-1">
            <Database className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-amber-600">Based on CGHS/PMJAY benchmarks (synthetic)</span>
          </div>
        )}
      </div>

      {/* Confidence */}
      <div className="px-5 py-4 bg-bg-main border-b border-border">
        <ConfidenceScore value={confidence} size="sm" />
      </div>

      {/* Component breakdown */}
      <div className="p-5 space-y-4">
        {components.map((item, i) => (
          <CostBar key={i} item={item} totalMin={totalMin} totalMax={totalMax} />
        ))}
      </div>

      {/* Total */}
      <div className="mx-5 border-t-2 border-text-primary pt-4 pb-4">
        <div className="flex justify-between items-center">
          <span className="font-display font-bold text-text-primary">TOTAL ESTIMATE</span>
          <span className="cost-figure text-xl font-extrabold text-primary">
            {formatCostRange(totalMin, totalMax)}
          </span>
        </div>
      </div>

      {/* Risk flags */}
      {riskFlags.length > 0 && (
        <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-800">Risk Adjustments Applied</span>
          </div>
          {riskFlags.map((flag, i) => (
            <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
              <span className="text-amber-500 mt-0.5">•</span> {flag}
            </p>
          ))}
        </div>
      )}

      {/* How is this calculated */}
      <div className="mx-5 mb-4">
        <button
          onClick={() => setShowCalculation(!showCalculation)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
          aria-expanded={showCalculation}
        >
          <Info className="w-4 h-4" />
          How is this calculated?
          {showCalculation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showCalculation && (
          <div className="mt-3 bg-primary/5 rounded-lg p-3 animate-slide-down">
            <p className="text-xs text-text-secondary leading-relaxed">
              This estimate is built from 5 components: procedure cost, hospital stay, medications,
              pre-op diagnostics, and a contingency buffer. Costs are calibrated against{' '}
              <strong>CGHS 2022 rate schedules</strong> and <strong>PMJAY package rates</strong>,
              adjusted for hospital tier and city. Risk adjustments are applied for patient age and
              comorbidities.
            </p>
            {dataSources.length > 0 && (
              <p className="text-xs text-text-secondary mt-2">
                Sources: {dataSources.join(', ')}
              </p>
            )}
            {disclaimer && (
              <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                <p className="text-xs text-amber-800 font-medium">⚠️ {disclaimer}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-5 pt-0">
        <button
          onClick={handleDownload}
          disabled={isGeneratingPDF}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors text-sm disabled:opacity-60 disabled:cursor-wait"
          id="download-pdf-btn"
        >
          {isGeneratingPDF
            ? <><Loader className="w-4 h-4 animate-spin" /> Generating…</>
            : <><Download className="w-4 h-4" /> Download PDF Report</>}
        </button>
      </div>

      <div className="px-5 pb-4">
        <p className="text-xs text-text-secondary text-center">
          🔒 Planning estimate only. Verify costs directly with the hospital.
        </p>
      </div>
    </div>
  );
}
