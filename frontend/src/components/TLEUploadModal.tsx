import React, { useState } from 'react';
import { X, Upload, CheckCircle, FileText } from 'lucide-react';
import { api } from '../services/api';

interface TLEUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TLEUploadModal: React.FC<TLEUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('STARLINK-30145');
  const [objectType, setObjectType] = useState('DEBRIS');
  const [line1, setLine1] = useState(
    '1 54321U 22150A   24095.50000000  .00001234  00000-0  12345-3 0  9991'
  );
  const [line2, setLine2] = useState(
    '2 54321  51.6420 215.1230 0007890  45.1230 315.1230 15.48912345123456'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.uploadTLE(name, line1, line2, objectType);
      onSuccess();
      onClose();
    } catch (err) {
      alert('Failed to upload TLE data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-space-800 border border-gray-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Import Two-Line Element (TLE) Data
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-gray-300 mb-1">Object Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-space-900 border border-gray-700 rounded p-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Object Type</label>
            <select
              value={objectType}
              onChange={(e) => setObjectType(e.target.value)}
              className="w-full bg-space-900 border border-gray-700 rounded p-2 text-gray-200 focus:outline-none"
            >
              <option value="DEBRIS">Debris Object</option>
              <option value="SATELLITE">Target Satellite</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 mb-1">TLE Line 1</label>
            <textarea
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              rows={2}
              className="w-full bg-space-900 border border-gray-700 rounded p-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">TLE Line 2</label>
            <textarea
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              rows={2}
              className="w-full bg-space-900 border border-gray-700 rounded p-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-700 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-space-700 hover:bg-space-600 text-gray-300 text-xs font-semibold rounded-lg"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow"
            >
              {isSubmitting ? 'INGESTING...' : 'INGEST TLE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
