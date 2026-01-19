import React from 'react';

// SettingsModal component with theme support including auto mode
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasPrice: string;
  mpg: string;
  theme: 'light' | 'dark' | 'auto';
  contrast: 'medium' | 'high';
  primaryColor: string;
  onSave: (next: { gasPrice: string; mpg: string; theme: 'light' | 'dark' | 'auto'; contrast: 'medium' | 'high'; primaryColor: string; }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  gasPrice,
  mpg,
  theme,
  contrast,
  primaryColor,
  onSave,
}) => {
  const [localGasPrice, setLocalGasPrice] = React.useState(gasPrice);
  const [localMpg, setLocalMpg] = React.useState(mpg);
  const [localTheme, setLocalTheme] = React.useState<'light' | 'dark' | 'auto'>(theme);
  const [localContrast, setLocalContrast] = React.useState<'medium' | 'high'>(contrast);
  const [localPrimary, setLocalPrimary] = React.useState(primaryColor);

  React.useEffect(() => {
    if (isOpen) {
      setLocalGasPrice(gasPrice);
      setLocalMpg(mpg);
      setLocalTheme(theme);
      setLocalContrast(contrast);
      setLocalPrimary(primaryColor);
    }
  }, [isOpen, gasPrice, mpg, theme, contrast, primaryColor]);

  const handleSave = () => {
    onSave({ gasPrice: localGasPrice, mpg: localMpg, theme: localTheme, contrast: localContrast, primaryColor: localPrimary });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal-content">
        <header className="modal-header">
          <div className="modal-header-row">
            <div className="modal-title-wrapper">
              <h2 className="modal-title">Settings</h2>
              <p className="modal-subtitle">Personalize your experience</p>
            </div>
            <button className="modal-close-button" onClick={onClose} aria-label="Close settings">
              <span className="material-icons">close</span>
            </button>
          </div>
        </header>

        <main className="modal-main">
          <div className="input-grid">
            <div className="input-field-group">
              <label className="input-field-label" htmlFor="settings-gas">Default Gas Price</label>
              <div className="input-field-container">
                <div className="input-field-icon"><span className="material-icons" aria-hidden>local_gas_station</span></div>
                <input id="settings-gas" className="input-field-input" type="number" step="0.01" min="0" value={localGasPrice} onChange={(e) => setLocalGasPrice(e.target.value)} />
                <div className="input-field-unit"><span className="input-field-unit-text">$/gal</span></div>
              </div>
            </div>

            <div className="input-field-group">
              <label className="input-field-label" htmlFor="settings-mpg">Default Efficiency</label>
              <div className="input-field-container">
                <div className="input-field-icon"><span className="material-icons" aria-hidden>speed</span></div>
                <input id="settings-mpg" className="input-field-input" type="number" step="0.1" min="0" value={localMpg} onChange={(e) => setLocalMpg(e.target.value)} />
                <div className="input-field-unit"><span className="input-field-unit-text">MPG</span></div>
              </div>
            </div>

            <div className="input-field-group">
              <label className="input-field-label" htmlFor="settings-theme">Theme</label>
              <div className="input-field-container">
                <div className="input-field-icon"><span className="material-icons" aria-hidden>palette</span></div>
                <select id="settings-theme" className="input-field-input" value={localTheme} onChange={(e) => setLocalTheme(e.target.value as 'light' | 'dark' | 'auto')}>
                  <option value="auto">Auto (System)</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            <div className="input-field-group">
              <label className="input-field-label" htmlFor="settings-contrast">Contrast</label>
              <div className="input-field-container">
                <div className="input-field-icon"><span className="material-icons" aria-hidden>contrast</span></div>
                <select id="settings-contrast" className="input-field-input" value={localContrast} onChange={(e) => setLocalContrast(e.target.value as 'medium' | 'high')}>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="input-field-group">
              <label className="input-field-label" htmlFor="settings-primary">Primary Color</label>
              <div className="input-field-container">
                <div className="input-field-icon"><span className="material-icons" aria-hidden>invert_colors</span></div>
                <input id="settings-primary" className="input-field-input" type="color" value={localPrimary} onChange={(e) => setLocalPrimary(e.target.value)} />
              </div>
            </div>
          </div>
        </main>

        <footer className="modal-footer">
          <button className="modal-footer-button clear" onClick={onClose} aria-label="Cancel">Cancel</button>
          <button className="modal-footer-button export" onClick={handleSave} aria-label="Save settings">Save</button>
        </footer>
      </div>
    </div>
  );
};
