import type { Issue, QACriterion } from '$lib/types';
import { HIGH_CONFIDENCE_THRESHOLD } from '$lib/config/constants';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReportData {
  issues: Issue[];
  criteria: QACriterion[];
  generatedAt: string;
}

export function generateReportData(
  issues: Issue[],
  criteria: QACriterion[]
): ReportData {
  return {
    issues,
    criteria,
    generatedAt: new Date().toISOString(),
  };
}

export function generateReportHTML(data: ReportData): string {
  const { issues, criteria, generatedAt } = data;

  const bySeverity = {
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  };

  const byStatus = {
    open: issues.filter((i) => i.status === 'open').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  };

  const complianceScore = criteria.length > 0
    ? Math.round((criteria.filter((c) => c.result === 'pass').length / criteria.length) * 100)
    : 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blueprint QA Report - Structured AI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #1a1a2e;
      margin-bottom: 10px;
    }
    h2 {
      color: #1a1a2e;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
    }
    .meta {
      color: #6b7280;
      font-size: 14px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .summary-card .label {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 5px;
    }
    .summary-card .value {
      color: #1a1a2e;
      font-size: 28px;
      font-weight: bold;
    }
    .compliance-high {
      border-left-color: #22c55e;
    }
    .compliance-medium {
      border-left-color: #eab308;
    }
    .compliance-low {
      border-left-color: #ef4444;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #f1f5f9;
      color: #374151;
      font-weight: 600;
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .severity-high {
      color: #dc2626;
    }
    .severity-medium {
      color: #d97706;
    }
    .severity-low {
      color: #2563eb;
    }
    .status-open {
      color: #2563eb;
    }
    .status-resolved {
      color: #16a34a;
    }
    .criterion-pass {
      background: #dcfce7;
      color: #166534;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .criterion-fail {
      background: #fee2e2;
      color: #991b1b;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .criterion-na {
      background: #f3f4f6;
      color: #6b7280;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    @media print {
      body { padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Blueprint QA Report</h1>
        <div class="logo">Structured AI</div>
      </div>
      <div class="meta">
        <p>Generated: ${new Date(generatedAt).toLocaleString()}</p>
        <p>Total Issues: ${issues.length}</p>
      </div>
    </div>

    <h2>Executive Summary</h2>
    <div class="summary">
      <div class="summary-card ${complianceScore >= HIGH_CONFIDENCE_THRESHOLD ? 'compliance-high' : complianceScore >= 60 ? 'compliance-medium' : 'compliance-low'}">
        <div class="label">Compliance Score</div>
        <div class="value">${complianceScore}%</div>
      </div>
      <div class="summary-card">
        <div class="label">Total Issues</div>
        <div class="value">${issues.length}</div>
      </div>
      <div class="summary-card">
        <div class="label">High Severity</div>
        <div class="value">${bySeverity.high}</div>
      </div>
      <div class="summary-card">
        <div class="label">Resolved</div>
        <div class="value">${byStatus.resolved}</div>
      </div>
    </div>

    <h2>Issues (${issues.length})</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Page</th>
          <th>Severity</th>
          <th>Category</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${issues.map(issue => `
          <tr>
            <td>${escapeHtml(issue.id)}</td>
            <td>${escapeHtml(issue.title)}</td>
            <td>${issue.page}</td>
            <td class="severity-${issue.severity}">${issue.severity.toUpperCase()}</td>
            <td>${escapeHtml(issue.category)}</td>
            <td class="status-${issue.status}">${issue.status.toUpperCase()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>QA Criteria (${criteria.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Page</th>
          <th>Criterion</th>
          <th>Result</th>
          <th>Summary</th>
        </tr>
      </thead>
      <tbody>
        ${criteria.map(c => `
          <tr>
            <td>Page ${c.page}</td>
            <td>${escapeHtml(c.name)}</td>
            <td><span class="criterion-${c.result === 'pass' ? 'pass' : c.result === 'fail' ? 'fail' : 'na'}">${c.result.toUpperCase()}</span></td>
            <td>${escapeHtml(c.summary)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <p style="margin-top: 40px; color: #6b7280; text-align: center; font-size: 12px;">
      Report generated by Structured AI Blueprint QA System
    </p>
  </div>
</body>
</html>
  `;
}

export function downloadReportHTML(html: string, filename: string = 'blueprint-qa-report.html') {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
