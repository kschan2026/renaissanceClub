import {
  $,
  $$
} from './utils.js';


export const dom = {};


let toastTimer = null;

let confirmResolver = null;


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

  dom.btnResetContent =
    $('#btn-reset-content');


  dom.clubTypeInputs =
    $$('input[name="clubType"]');

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
    $$('[data-add-block-type]');

  dom.blockInspector =
    $('#block-inspector');

  dom.blockInspectorContent =
    $('#block-inspector-content');

  dom.selectedBlockLabel =
    $('#selected-block-label');

  dom.btnBlockBack =
    $('#btn-block-send-back');

  dom.btnBlockFront =
    $('#btn-block-bring-front');

  dom.btnBlockDelete =
    $('#btn-block-delete');

  dom.btnLayoutReset =
    $('#btn-layout-reset');


  dom.poster =
    $('#poster-canvas');

  dom.posterWrapper =
    $('#poster-wrapper');

  dom.layoutCanvas =
    $('#layout-canvas');

  dom.previewStage =
    $('.preview-stage');

  dom.previewClubName =
    $('#preview-club-name');

  dom.previewClubType =
    $('#preview-club-type');

  dom.previewTeacher =
    $('#preview-teacher');

  dom.previewFooterMessage =
    $('#preview-footer-message');


  dom.zoomLabel =
    $('#zoom-label');

  dom.btnZoomIn =
    $('#btn-zoom-in');

  dom.btnZoomOut =
    $('#btn-zoom-out');


  dom.photoFileInput =
    $('#photo-file-input');


  dom.photoCropDialog =
    $('#photo-crop-dialog');

  dom.cropFrame =
    $('#crop-frame');

  dom.cropImage =
    $('#crop-image');

  dom.cropZoom =
    $('#crop-zoom');

  dom.btnClosePhotoDialog =
    $('#btn-close-photo-dialog');

  dom.btnCropCancel =
    $('#btn-crop-cancel');

  dom.btnCropApply =
    $('#btn-crop-apply');


  dom.cloudDialog =
    $('#cloud-dialog');

  dom.cloudProjectList =
    $('#cloud-project-list');

  dom.btnCloseCloudDialog =
    $('#btn-close-cloud-dialog');

  dom.filterChips =
    $$('[data-project-filter]');


  dom.confirmDialog =
    $('#confirm-dialog');

  dom.confirmTitle =
    $('#confirm-title');

  dom.confirmMessage =
    $('#confirm-message');

  dom.btnConfirmCancel =
    $('#btn-confirm-cancel');

  dom.btnConfirmOk =
    $('#btn-confirm-ok');


  dom.toast =
    $('#toast');


  dom.loadingOverlay =
    $('#loading-overlay');

  dom.loadingMessage =
    $('#loading-message');


  dom.layoutBlockTemplate =
    $('#layout-block-template');


  bindCommonDialogEvents();
}


function bindCommonDialogEvents() {

  dom.btnConfirmCancel.addEventListener(
    'click',
    () => resolveConfirm(false)
  );


  dom.btnConfirmOk.addEventListener(
    'click',
    () => resolveConfirm(true)
  );


  dom.confirmDialog.addEventListener(
    'cancel',
    event => {

      event.preventDefault();

      resolveConfirm(false);
    }
  );
}


export function showToast(
  message,
  type = ''
) {

  clearTimeout(
    toastTimer
  );


  dom.toast.hidden =
    false;


  dom.toast.textContent =
    message;


  dom.toast.className =
    'toast';


  if (
    type === 'success'
  ) {

    dom.toast.classList.add(
      'is-success'
    );
  }


  if (
    type === 'error'
  ) {

    dom.toast.classList.add(
      'is-error'
    );
  }


  toastTimer =
    setTimeout(
      () => {

        dom.toast.hidden =
          true;

      },
      3500
    );
}


export function showLoading(
  message = '처리 중입니다.'
) {

  dom.loadingMessage.textContent =
    message;


  dom.loadingOverlay.hidden =
    false;
}


export function hideLoading() {

  dom.loadingOverlay.hidden =
    true;
}


export function setSaveStatus(
  text,
  type = ''
) {

  dom.saveStatus.textContent =
    text;


  dom.saveStatus.className =
    'save-status';


  if (
    type === 'saving'
  ) {

    dom.saveStatus.classList.add(
      'is-saving'
    );
  }


  if (
    type === 'saved'
  ) {

    dom.saveStatus.classList.add(
      'is-saved'
    );
  }


  if (
    type === 'error'
  ) {

    dom.saveStatus.classList.add(
      'is-error'
    );
  }
}


export function confirmAction(
  title,
  message
) {

  return new Promise(
    resolve => {

      if (
        confirmResolver
      ) {

        confirmResolver(false);
      }


      confirmResolver =
        resolve;


      dom.confirmTitle.textContent =
        title;


      dom.confirmMessage.textContent =
        message;


      dom.confirmDialog.showModal();
    }
  );
}


function resolveConfirm(value) {

  if (
    dom.confirmDialog.open
  ) {

    dom.confirmDialog.close();
  }


  const resolver =
    confirmResolver;


  confirmResolver =
    null;


  if (
    resolver
  ) {

    resolver(value);
  }
}
