import { useRef } from 'react';
import { X, UploadCloud } from 'lucide-react';

const SCREENSHOT_CARDS = [
  { id: 1, date: 'Feb 05, 2026 10:08 PM', hasPreview: true, svg: '<g transform="translate(30,15)"><path d="M10,50 L60,40 L60,55 L10,60Z" fill="#E8C088" stroke="#B8935A" stroke-width="0.5"/><path d="M10,50 L30,30 L60,25 L60,40Z" fill="#D4A76A" stroke="#B8935A" stroke-width="0.5"/><circle cx="25" cy="45" r="2" fill="#8B7355"/><circle cx="45" cy="40" r="2" fill="#8B7355"/></g>' },
  { id: 2, date: 'Feb 05, 2026 10:08 PM', hasPreview: true, svg: '<g transform="translate(20,10)"><path d="M20,50 L80,35 L80,55 L20,65Z" fill="#E8C088" stroke="#B8935A" stroke-width="0.5"/><path d="M20,50 L50,25 L80,20 L80,35Z" fill="#D4A76A" stroke="#B8935A" stroke-width="0.5"/><circle cx="35" cy="48" r="1.5" fill="#8B7355"/><circle cx="55" cy="42" r="1.5" fill="#8B7355"/><circle cx="70" cy="38" r="1.5" fill="#8B7355"/></g>' },
  { id: 3, date: 'Feb 05, 2026 10:09 PM', hasPreview: true, svg: '<g transform="translate(35,15)"><path d="M10,45 L50,35 L50,50 L10,55Z" fill="#E8C088" stroke="#B8935A" stroke-width="0.5"/><path d="M10,45 L30,25 L50,20 L50,35Z" fill="#D4A76A" stroke="#B8935A" stroke-width="0.5"/><circle cx="20" cy="42" r="1.5" fill="#8B7355"/><circle cx="38" cy="37" r="1.5" fill="#8B7355"/></g>' },
  { id: 4, date: 'Feb 05, 2026 10:09 PM', hasPreview: true, svg: '<g transform="translate(30,12)"><path d="M10,48 L55,38 L55,52 L10,58Z" fill="#E8C088" stroke="#B8935A" stroke-width="0.5"/><path d="M10,48 L30,28 L55,22 L55,38Z" fill="#D4A76A" stroke="#B8935A" stroke-width="0.5"/><circle cx="22" cy="46" r="2" fill="#8B7355"/><circle cx="40" cy="40" r="2" fill="#8B7355"/></g>' },
  { id: 5, date: 'Feb 05, 2026 10:09 PM', hasPreview: true, svg: '<g transform="translate(10,5)"><path d="M15,55 L85,35 L85,60 L15,70Z" fill="#E8C088" stroke="#B8935A" stroke-width="0.5"/><path d="M15,55 L45,20 L85,12 L85,35Z" fill="#D4A76A" stroke="#B8935A" stroke-width="0.5"/><circle cx="45" cy="45" r="6" fill="#8B7355" stroke="#6B5645" stroke-width="0.5"/><circle cx="30" cy="52" r="2" fill="#6B86B8"/><circle cx="60" cy="40" r="2" fill="#6B86B8"/><circle cx="75" cy="35" r="2" fill="#6B86B8"/></g>' },
  { id: 6, date: 'Feb 05, 2026 10:09 PM', hasPreview: true, svg: '<g transform="translate(8,3)"><path d="M15,55 L90,32 L90,58 L15,72Z" fill="#E8C088" stroke="#B8935A" stroke-width="0.5"/><path d="M15,55 L48,18 L90,8 L90,32Z" fill="#D4A76A" stroke="#B8935A" stroke-width="0.5"/><circle cx="50" cy="42" r="5" fill="#8B7355" stroke="#6B5645" stroke-width="0.5"/><circle cx="25" cy="55" r="2" fill="#6B86B8"/><circle cx="38" cy="50" r="2" fill="#6B86B8"/><circle cx="65" cy="38" r="2" fill="#6B86B8"/><circle cx="80" cy="32" r="2" fill="#6B86B8"/></g>' },
  { id: 7, date: 'Feb 05, 2026 10:09 PM', hasPreview: false },
  { id: 8, date: 'Feb 05, 2026 10:08 PM', hasPreview: false },
  { id: 9, date: 'Feb 05, 2026 10:08 PM', hasPreview: false },
];

export default function ScreenshotModal({
  open,
  activeTab,
  onClose,
  onTabChange,
  onPickScreenshot,
  onPickPlaceholder,
  onUpload,
  replaceItemId = null,
  onCaptureFromCad = null,
  inline = false,
}) {
  const fileInputRef = useRef(null);

  const handleOverlayClick = (e) => {
    if (e.target.id === 'screenshotModal' || e.target.classList.contains('modal-overlay')) onClose();
  };

  const handleCardClick = (card) => {
    if (card.hasPreview && card.svg) {
      const svgHtml = `<svg viewBox="0 0 120 80" class="screenshot-thumb">${card.svg}</svg>`;
      onPickScreenshot(svgHtml);
    } else {
      onPickPlaceholder();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onUpload(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onUpload(ev.target.result);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  if (!open) return null;

  return (
    <div
      className={`modal-overlay open${inline ? ' modal-overlay-inline' : ''}`}
      id="screenshotModal"
      onClick={inline ? undefined : handleOverlayClick}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab${activeTab === 'existing' ? ' modal-tab-active' : ''}`}
              data-tab="existing"
              onClick={() => onTabChange('existing')}
            >
              Use existing images
            </button>
            <button
              type="button"
              className={`modal-tab${activeTab === 'upload' ? ' modal-tab-active' : ''}`}
              data-tab="upload"
              onClick={() => onTabChange('upload')}
            >
              Upload new
            </button>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X className="modal-close-icon" size={18} />
          </button>
        </div>

        {activeTab === 'existing' && (
          <div className="modal-body modal-tab-content active" id="tab-existing">
            {replaceItemId != null && onCaptureFromCad && (
              <div className="modal-retake-cad-row">
                <button
                  type="button"
                  className="modal-capture-cad-btn"
                  onClick={() => { onClose(); onCaptureFromCad(replaceItemId); }}
                >
                  Capture from CAD (retake)
                </button>
              </div>
            )}
            <h3 className="modal-section-title">CAD Screenshots</h3>
            <div className="screenshot-grid" data-flow-anchor="pick">
              {SCREENSHOT_CARDS.map((card) => (
                <div
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  className="screenshot-card"
                  data-img={card.id}
                  onClick={() => handleCardClick(card)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCardClick(card)}
                >
                  <div className="screenshot-card-header">
                    <span className="screenshot-card-title">Operation 2</span>
                    <span className="screenshot-card-date">{card.date}</span>
                  </div>
                  <div className={`screenshot-card-preview${!card.hasPreview ? ' screenshot-card-preview-empty' : ''}`}>
                    {card.hasPreview && (
                      <svg viewBox="0 0 120 80" className="screenshot-thumb" dangerouslySetInnerHTML={{ __html: card.svg }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="modal-body modal-tab-content active" id="tab-upload">
            <div
              className="upload-dropzone"
              id="uploadDropzone"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
              onDrop={handleDrop}
            >
              <UploadCloud className="upload-dropzone-icon" size={32} />
              <p className="upload-dropzone-text">Drag and drop files here</p>
              <p className="upload-dropzone-subtext">or</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="upload-browse-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse files
              </button>
              <p className="upload-dropzone-hint">Supports PNG, JPG, SVG up to 10MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
