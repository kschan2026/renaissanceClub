import {
  $,
  $$
} from './utils.js';


export const dom = {};


export function cacheDom() {

  dom.saveStatus =
    $('#save-status');


  dom.btnNew =
    $('#btn-new');

  dom.btnLoadCloud =
    $('#btn-load-cloud');

  dom.btnSaveDraft =
    $('#btn-save-draft');

  dom.btnSaveComplete =
    $('#btn-save-complete');


  dom.clubTypeInputs =
    $$(
      'input[name="clubType"]'
    );


  dom.clubName =
    $('#input-club-name');

  dom.teacher =
    $('#input-teacher');


  dom.activity1Title =
    $('#activity-1-title');

  dom.activity1Content =
    $('#activity-1-content');

  dom.activity1Count =
    $('#activity-1-count');


  dom.activity2Title =
    $('#activity-2-title');

  dom.activity2Content =
    $('#activity-2-content');

  dom.activity2Count =
    $('#activity-2-count');


  dom.btnAi =
    $('#btn-ai-improve-all');

  dom.btnAiUndo =
    $('#btn-ai-undo');


  dom.layoutToggle =
    $('#toggle-layout-edit');

  dom.layoutTools =
    $('#layout-tools');


  dom.blockAddButtons =
    $$(
      '[data-add-block-type]'
    );


  dom.blockInspector =
    $('#block-inspector');

  dom.blockInspectorContent =
    $('#block-inspector-content');

  dom.selectedBlockLabel =
    $('#selected-block-label');


  dom.poster =
    $('#poster-canvas');

  dom.posterWrapper =
    $('#poster-wrapper');

  dom.layoutCanvas =
    $('#layout-canvas');


  dom.previewClubName =
    $('#preview-club-name');

  dom.previewClubType =
    $('#preview-club-type');

  dom.previewTeacher =
    $('#preview-teacher');


  dom.previewStage =
    $('.preview-stage');


  dom.zoomLabel =
    $('#zoom-label');

  dom.btnZoomIn =
    $('#btn-zoom-in');

  dom.btnZoomOut =
    $('#btn-zoom-out');


  dom.photoFileInput =
    $('#photo-file-input');


  dom.layoutBlockTemplate =
    $('#layout-block-template');


  dom.toast =
    $('#toast');


  dom.loadingOverlay =
    $('#loading-overlay');

  dom.loadingMessage =
    $('#loading-message');
}
