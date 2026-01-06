import { useState } from 'react';
import type { Abnormality } from '../../types/analyzer';
import './AbnormalityTable.css';

interface AbnormalityTableProps {
  abnormalities: Abnormality[];
}

export default function AbnormalityTable({ abnormalities }: AbnormalityTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = ['all', ...new Set(abnormalities.map(a => a.category))];

  // Filter abnormalities
  const filteredAbnormalities = abnormalities.filter(abn => {
    const matchesSearch = abn.analyte.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || abn.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedAbnormalities = filteredAbnormalities.reduce((acc, abn) => {
    if (!acc[abn.category]) {
      acc[abn.category] = [];
    }
    acc[abn.category].push(abn);
    return acc;
  }, {} as Record<string, Abnormality[]>);

  return (
    <div className="abnormality-table">
      <div className="abnormality-header">
        <div className="header-left">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Abnormalities Detected ({abnormalities.length})</h3>
        </div>

        <div className="header-filters">
          <input
            type="text"
            placeholder="Search analyte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredAbnormalities.length === 0 ? (
        <div className="no-results">
          <p>No abnormalities match your search criteria</p>
        </div>
      ) : (
        <div className="abnormality-content">
          {Object.entries(groupedAbnormalities).map(([category, items]) => (
            <div key={category} className="category-group">
              <div className="category-header">
                <h4>{category}</h4>
                <span className="category-count">{items.length}</span>
              </div>

              <div className="abnormality-list">
                {items.map((abn, idx) => (
                  <div key={`${category}-${idx}`} className="abnormality-item">
                    <div className="abnormality-main">
                      <div className="abnormality-analyte">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        {abn.analyte}
                      </div>
                      <div className="abnormality-reason">{abn.reason}</div>
                    </div>

                    <div className="abnormality-details">
                      <div className="detail-item">
                        <span className="detail-label">Value:</span>
                        <span className="detail-value highlight">
                          {abn.value} {abn.unit}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Reference Range:</span>
                        <span className="detail-value">{abn.reference_range} {abn.unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
