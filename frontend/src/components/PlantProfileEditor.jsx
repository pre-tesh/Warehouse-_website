/**
 * PlantProfileEditor.jsx
 * Form for viewing and editing the active plant profile's ideal ranges.
 */
import { useState, useEffect } from 'react';
import { useSensor } from '../context/SensorContext';
import './PlantProfileEditor.css';

export default function PlantProfileEditor() {
  const { profile, updateProfile } = useSensor();
  const [draft, setDraft]   = useState(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Keep draft in sync when profile changes externally
  useEffect(() => setDraft(profile), [profile]);

  function setRange(field, index, value) {
    const newRange = [...draft[field]];
    newRange[index] = parseFloat(value) || 0;
    setDraft(prev => ({ ...prev, [field]: newRange }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateProfile(draft);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const ranges = [
    { field: 'ideal_temp',     label: 'Temperature', unit: '°C',  min: -10, max: 50 },
    { field: 'ideal_humidity', label: 'Humidity',    unit: '%',   min: 0,   max: 100 },
    { field: 'ideal_light',   label: 'Light',       unit: '%',   min: 0,   max: 100 },
    { field: 'ideal_soil',    label: 'Soil Moisture',unit: '%',  min: 0,   max: 100 },
  ];

  return (
    <div className="profile-editor">
      <div className="profile-editor__header">
        <div>
          <span className="profile-editor__plant-icon">🌿</span>
          <input
            className="profile-editor__plant-name"
            value={draft.plant_name}
            onChange={e => setDraft(prev => ({ ...prev, plant_name: e.target.value }))}
            placeholder="Plant name"
          />
        </div>
        <span className="profile-editor__subtitle">Active Plant Profile</span>
      </div>

      <form onSubmit={handleSave} className="profile-editor__form">
        {ranges.map(({ field, label, unit, min, max }) => (
          <div key={field} className="profile-editor__row">
            <label className="profile-editor__label">{label}</label>
            <div className="profile-editor__range-inputs">
              <div className="profile-editor__input-group">
                <span className="profile-editor__input-hint">Min</span>
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={0.5}
                  value={draft[field]?.[0] ?? ''}
                  onChange={e => setRange(field, 0, e.target.value)}
                  className="profile-editor__input"
                />
                <span className="profile-editor__input-unit">{unit}</span>
              </div>
              <span className="profile-editor__dash">→</span>
              <div className="profile-editor__input-group">
                <span className="profile-editor__input-hint">Max</span>
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={0.5}
                  value={draft[field]?.[1] ?? ''}
                  onChange={e => setRange(field, 1, e.target.value)}
                  className="profile-editor__input"
                />
                <span className="profile-editor__input-unit">{unit}</span>
              </div>
            </div>
          </div>
        ))}

        <button type="submit" className={`profile-editor__save ${saving ? 'saving' : ''} ${saved ? 'saved' : ''}`} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
