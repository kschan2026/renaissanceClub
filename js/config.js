export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz5FpPe6BD8ikxSgIK2r5AQ9vkmh-np5WJshqNA4JlHVgCJENSFkA4oemhLkFnOMtk4/exec';


export const CONFIG = Object.freeze({

  TARGET_ACTIVITY_LENGTH: 200,

  GRID_COLUMNS: 12,
  GRID_ROWS: 48,

  GRID_COLUMN_GAP: 7,
  GRID_ROW_GAP: 6,

  MAX_IMAGE_DIMENSION: 1800,

  IMAGE_JPEG_QUALITY: 0.88,

  PREVIEW: Object.freeze({

    MIN_ZOOM: 0.35,

    MAX_ZOOM: 1.2,

    ZOOM_STEP: 0.05,

    DRAFT_PIXEL_RATIO: 1.5,

    COMPLETE_PIXEL_RATIO: 2,

    DOWNLOAD_PIXEL_RATIO: 3
  }),

  STORAGE: Object.freeze({

    DB_NAME:
      'club-exhibition-editor-v3',

    DB_VERSION:
      1,

    STORE_NAME:
      'drafts',

    DRAFT_KEY:
      'current',

    AUTO_SAVE_DELAY:
      700
  }),

  LIBRARIES: Object.freeze({

    HTML_TO_IMAGE:
      'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',

    JSPDF:
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js'
  })
});
