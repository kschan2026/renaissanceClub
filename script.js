'use strict';

/**
 * 동아리 전시자료 제작 웹앱 - script.js
 * Code.gs v3 / 새 index.html / 새 style.css 기준
 */

const APPS_SCRIPT_URL = '여기에_배포된_APPS_SCRIPT_웹앱_URL_입력';

const APP_CONFIG = Object.freeze({
  TARGET_ACTIVITY_LENGTH: 200,

  GRID_COLUMNS: 12,
  GRID_ROWS: 48,
  GRID_COLUMN_GAP: 7,
  GRID_ROW_GAP: 6,

  MAX_IMAGE_DIMENSION: 1800,
  IMAGE_JPEG_QUALITY: 0.88,

  DRAFT_PREVIEW_PIXEL_RATIO: 1.5,
  COMPLETE_PREVIEW_PIXEL_RATIO: 2,
  DOWNLOAD_PIXEL_RATIO: 3,

  MIN_PREVIEW_ZOOM: 0.35,
  MAX_PREVIEW_ZOOM: 1.2,
  PREVIEW_ZOOM_STEP: 0.05,

  HTML_TO_IMAGE_URL:
    'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',

  JSPDF_URL:
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',

  LOCAL_DB_NAME: 'club-exhibition-editor-v3',
  LOCAL_DB_VERSION: 1,
  LOCAL_STORE_NAME: 'drafts',
  LOCAL_DRAFT_KEY: 'current',

  AUTO_SAVE_DELAY: 700
});


/* =========================================================
   기본 데이터
========================================================= */

function createDefaultActivities() {
  return [
    {
      id: 'activity_1',
      title: '',
      content: ''
    },
    {
      id: 'activity_2',
      title: '',
      content: ''
    }
  ];
}


function createDefaultBlocks() {
  return [

    {
      id: 'activity_1_title',
      type: 'activityTitle',
      activityId: 'activity_1',

      x: 1,
      y: 1,
      w: 12,
      h: 3,

      z: 1,
      locked: true
    },

    {
      id: 'activity_1_content',
      type: 'activityContent',
      activityId: 'activity_1',

      x: 1,
      y: 5,
      w: 6,
      h: 12,

      z: 1,
      locked: true
    },

    {
      id: 'activity_1_photo_1_block',
      type: 'photo',
      slotId: 'activity_1_photo_1',

      x: 8,
      y: 5,
      w: 5,
      h: 6,

      z: 1,
      locked: true
    },

    {
      id: 'activity_1_photo_2_block',
      type: 'photo',
      slotId: 'activity_1_photo_2',

      x: 8,
      y: 12,
      w: 5,
      h: 6,

      z: 1,
      locked: true
    },

    {
      id: 'activity_2_title',
      type: 'activityTitle',
      activityId: 'activity_2',

      x: 1,
      y: 20,
      w: 12,
      h: 3,

      z: 1,
      locked: true
    },

    {
      id: 'activity_2_photo_1_block',
      type: 'photo',
      slotId: 'activity_2_photo_1',

      x: 1,
      y: 24,
      w: 5,
      h: 6,

      z: 1,
      locked: true
    },

    {
      id: 'activity_2_photo_2_block',
      type: 'photo',
      slotId: 'activity_2_photo_2',

      x: 1,
      y: 31,
      w: 5,
      h: 6,

      z: 1,
      locked: true
    },

    {
      id: 'activity_2_content',
      type: 'activityContent',
      activityId: 'activity_2',

      x: 7,
      y: 24,
      w: 6,
      h: 13,

      z: 1,
      locked: true
    }
  ];
}


function createEmptyState() {
  return {
    id: null,

    type: 'autonomous',

    clubName: '',
    teacherName: '',

    activities: createDefaultActivities(),

    blocks: createDefaultBlocks(),

    photos: [],

    status: 'draft',

    createdAt: null,
    updatedAt: null,

    selectedBlockId: null,

    layoutEditing: false,

    aiUndoSnapshot: null
  };
}


/* =========================================================
   전역 상태
========================================================= */

let state = createEmptyState();

let previewZoom = 0.5;

let currentPhotoSlot = null;

let currentCropSlot = null;

let cropWorkingState = null;

let cropPointerState = null;

let layoutPointerState = null;

let isDirty = false;

let autoSaveTimer = null;

let toastTimer = null;

let confirmResolver = null;

let projectFilter = 'all';

let cachedProjects = [];


const dom = {};


/* =========================================================
   초기화
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  init
);


async function init() {
  cacheDom();

  bindEvents();

  const restored =
    await restoreLocalDraft();


  if (restored) {
    state =
      normalizeLoadedState(
        restored
      );

    showToast(
      '브라우저에 임시 저장된 작업을 복구했습니다.',
      'success'
    );
  }


  applyStateToEditor();

  renderAll();


  requestAnimationFrame(
    fitPreviewToWindow
  );


  setSaveStatus(
    restored
      ? '브라우저 임시저장 복구'
      : '새 작업',

    restored
      ? 'saved'
      : ''
  );
}


/* =========================================================
   DOM
========================================================= */

function cacheDom() {

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


  dom.btnAiImproveAll =
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

  dom.previewClubName =
    $('#preview-club-name');

  dom.previewClubType =
    $('#preview-club-type');

  dom.previewTeacher =
    $('#preview-teacher');

  dom.previewStage =
    $('.preview-stage');

  dom.previewFooterMessage =
    $('#preview-footer-message');

  dom.btnZoomOut =
    $('#btn-zoom-out');

  dom.btnZoomIn =
    $('#btn-zoom-in');

  dom.zoomLabel =
    $('#zoom-label');


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
}


/* =========================================================
   이벤트
========================================================= */

function bindEvents() {

  dom.btnNew.addEventListener(
    'click',
    handleNewProject
  );


  dom.btnLoadCloud.addEventListener(
    'click',
    openCloudDialog
  );


  dom.btnSaveDraft.addEventListener(
    'click',
    () => saveProject(false)
  );


  dom.btnSaveComplete.addEventListener(
    'click',
    () => saveProject(true)
  );


  dom.btnResetContent.addEventListener(
    'click',
    resetContentOnly
  );


  dom.clubTypeInputs.forEach(
    input => {
      input.addEventListener(
        'change',
        handleBasicInfoChange
      );
    }
  );


  dom.clubName.addEventListener(
    'input',
    handleBasicInfoChange
  );


  dom.teacher.addEventListener(
    'input',
    handleBasicInfoChange
  );


  [
    dom.activity1Title,
    dom.activity1Content,
    dom.activity2Title,
    dom.activity2Content
  ].forEach(
    input => {
      input.addEventListener(
        'input',
        handleActivityInput
      );
    }
  );


  dom.btnAiImproveAll.addEventListener(
    'click',
    improveAllActivities
  );


  dom.btnAiUndo.addEventListener(
    'click',
    undoAiImprove
  );


  dom.layoutToggle.addEventListener(
    'change',
    handleLayoutEditingToggle
  );


  dom.blockAddButtons.forEach(
    button => {

      button.addEventListener(
        'click',
        () => {
          addBlock(
            button.dataset.addBlockType
          );
        }
      );
    }
  );


  dom.btnBlockBack.addEventListener(
    'click',
    sendSelectedBlockBack
  );


  dom.btnBlockFront.addEventListener(
    'click',
    bringSelectedBlockFront
  );


  dom.btnBlockDelete.addEventListener(
    'click',
    deleteSelectedBlock
  );


  dom.btnLayoutReset.addEventListener(
    'click',
    resetLayout
  );


  dom.btnZoomOut.addEventListener(
    'click',
    () => {
      setPreviewZoom(
        previewZoom -
        APP_CONFIG.PREVIEW_ZOOM_STEP
      );
    }
  );


  dom.btnZoomIn.addEventListener(
    'click',
    () => {
      setPreviewZoom(
        previewZoom +
        APP_CONFIG.PREVIEW_ZOOM_STEP
      );
    }
  );


  dom.photoFileInput.addEventListener(
    'change',
    handlePhotoFileInput
  );


  bindBasicPhotoCards();


  dom.btnClosePhotoDialog.addEventListener(
    'click',
    closeCropDialog
  );


  dom.btnCropCancel.addEventListener(
    'click',
    closeCropDialog
  );


  dom.btnCropApply.addEventListener(
    'click',
    applyCrop
  );


  dom.cropZoom.addEventListener(
    'input',
    handleCropZoom
  );


  dom.cropFrame.addEventListener(
    'pointerdown',
    startCropDrag
  );


  window.addEventListener(
    'pointermove',
    handleCropDrag
  );


  window.addEventListener(
    'pointerup',
    endCropDrag
  );


  dom.btnCloseCloudDialog.addEventListener(
    'click',
    () => {
      dom.cloudDialog.close();
    }
  );


  dom.filterChips.forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          projectFilter =
            button.dataset.projectFilter;


          dom.filterChips.forEach(
            chip => {

              chip.classList.toggle(
                'is-active',
                chip === button
              );
            }
          );


          renderCloudProjectList();
        }
      );
    }
  );


  dom.btnConfirmCancel.addEventListener(
    'click',
    () => {
      resolveConfirm(false);
    }
  );


  dom.btnConfirmOk.addEventListener(
    'click',
    () => {
      resolveConfirm(true);
    }
  );


  dom.confirmDialog.addEventListener(
    'cancel',
    event => {

      event.preventDefault();

      resolveConfirm(false);
    }
  );


  dom.photoCropDialog.addEventListener(
    'cancel',
    event => {

      event.preventDefault();

      closeCropDialog();
    }
  );


  window.addEventListener(
    'resize',
    debounce(
      fitPreviewToWindow,
      120
    )
  );


  window.addEventListener(
    'beforeunload',
    event => {

      if (!isDirty) {
        return;
      }

      event.preventDefault();

      event.returnValue = '';
    }
  );
}


/* =========================================================
   기본 사진 카드 이벤트
========================================================= */

function bindBasicPhotoCards() {

  $$('.photo-editor-card').forEach(
    card => {

      const slotId =
        card.dataset.photoSlot;


      const previewButton =
        card.querySelector(
          '[data-photo-select]'
        );


      const captionInput =
        card.querySelector(
          '[data-photo-caption]'
        );


      const cropButton =
        card.querySelector(
          '[data-photo-crop]'
        );


      const removeButton =
        card.querySelector(
          '[data-photo-remove]'
        );


      previewButton.addEventListener(
        'click',
        () => {
          choosePhoto(slotId);
        }
      );


      captionInput.addEventListener(
        'input',
        () => {

          const photo =
            ensurePhotoRecord(
              slotId
            );


          photo.caption =
            captionInput.value;


          markDirty();

          renderAll();
        }
      );


      cropButton.addEventListener(
        'click',
        () => {
          openCropDialog(slotId);
        }
      );


      removeButton.addEventListener(
        'click',
        () => {
          removePhoto(slotId);
        }
      );


      previewButton.addEventListener(
        'dragover',
        event => {

          event.preventDefault();

          previewButton.classList.add(
            'is-dragover'
          );
        }
      );


      previewButton.addEventListener(
        'dragleave',
        () => {

          previewButton.classList.remove(
            'is-dragover'
          );
        }
      );


      previewButton.addEventListener(
        'drop',
        event => {

          event.preventDefault();


          previewButton.classList.remove(
            'is-dragover'
          );


          const file =
            event.dataTransfer?.files?.[0];


          if (file) {
            processPhotoFile(
              slotId,
              file
            );
          }
        }
      );
    }
  );
}


/* =========================================================
   기본 정보
========================================================= */

function handleBasicInfoChange() {

  state.type =
    getSelectedClubType();


  state.clubName =
    dom.clubName.value;


  state.teacherName =
    dom.teacher.value;


  markDirty();

  renderAll();
}


function handleActivityInput() {

  const activity1 =
    getActivity(
      'activity_1'
    );


  const activity2 =
    getActivity(
      'activity_2'
    );


  activity1.title =
    dom.activity1Title.value;


  activity1.content =
    dom.activity1Content.value;


  activity2.title =
    dom.activity2Title.value;


  activity2.content =
    dom.activity2Content.value;


  updateActivityCounts();

  markDirty();

  renderAll();
}


function getSelectedClubType() {

  return (
    dom.clubTypeInputs.find(
      input => input.checked
    )?.value ||
    'autonomous'
  );
}


function applyStateToEditor() {

  dom.clubTypeInputs.forEach(
    input => {

      input.checked =
        input.value ===
        state.type;
    }
  );


  dom.clubName.value =
    state.clubName ||
    '';


  dom.teacher.value =
    state.teacherName ||
    '';


  const activity1 =
    getActivity(
      'activity_1'
    );


  const activity2 =
    getActivity(
      'activity_2'
    );


  dom.activity1Title.value =
    activity1?.title ||
    '';


  dom.activity1Content.value =
    activity1?.content ||
    '';


  dom.activity2Title.value =
    activity2?.title ||
    '';


  dom.activity2Content.value =
    activity2?.content ||
    '';


  dom.layoutToggle.checked =
    Boolean(
      state.layoutEditing
    );


  updateActivityCounts();

  updateLayoutToolState();
}


function updateActivityCounts() {

  dom.activity1Count.textContent =
    `${dom.activity1Content.value.length}자`;


  dom.activity2Count.textContent =
    `${dom.activity2Content.value.length}자`;
}


/* =========================================================
   전체 렌더링
========================================================= */

function renderAll() {

  renderPosterHeader();

  renderBlocks();

  renderBasicPhotoCards();

  renderBlockInspector();

  updateLayoutToolState();

  updateAiUndoButton();
}


function renderPosterHeader() {

  dom.poster.dataset.clubType =
    state.type;


  dom.poster.dataset.layoutEditing =
    String(
      Boolean(
        state.layoutEditing
      )
    );


  dom.previewClubName.textContent =
    state.clubName ||
    '';


  dom.previewClubType.textContent =
    state.type ===
    'creative'
      ? '창체동아리'
      : '자율동아리';


  dom.previewTeacher.textContent =
    state.teacherName ||
    '';


  dom.previewFooterMessage.textContent =
    state.layoutEditing
      ? '블록을 선택한 뒤 이동하거나 크기를 조절할 수 있습니다.'
      : '입력한 내용이 실시간으로 반영됩니다.';
}


/* =========================================================
   블록 렌더링
========================================================= */

function renderBlocks() {

  dom.layoutCanvas.innerHTML =
    '';


  state.blocks.forEach(
    block => {

      dom.layoutCanvas.appendChild(
        createBlockElement(
          block
        )
      );
    }
  );
}


function createBlockElement(block) {

  const fragment =
    dom.layoutBlockTemplate
      .content
      .cloneNode(true);


  const element =
    fragment.querySelector(
      '.layout-block'
    );


  const content =
    fragment.querySelector(
      '.layout-block__content'
    );


  element.dataset.blockId =
    block.id;


  element.dataset.blockType =
    block.type;


  element.style.setProperty(
    '--block-x',
    block.x
  );


  element.style.setProperty(
    '--block-y',
    block.y
  );


  element.style.setProperty(
    '--block-w',
    block.w
  );


  element.style.setProperty(
    '--block-h',
    block.h
  );


  element.style.setProperty(
    '--block-z',
    block.z || 1
  );


  if (
    state.selectedBlockId ===
    block.id
  ) {

    element.classList.add(
      'is-selected'
    );
  }


  renderBlockContent(
    block,
    content
  );


  element.addEventListener(
    'click',
    event => {

      if (
        !state.layoutEditing
      ) {
        return;
      }


      if (
        event.target.closest(
          '.layout-block__move-handle, .layout-block__resize-handle'
        )
      ) {
        return;
      }


      selectBlock(
        block.id
      );
    }
  );


  element
    .querySelector(
      '.layout-block__move-handle'
    )
    .addEventListener(
      'pointerdown',
      event => {

        startBlockDrag(
          event,
          block.id
        );
      }
    );


  element
    .querySelector(
      '.layout-block__resize-handle'
    )
    .addEventListener(
      'pointerdown',
      event => {

        startBlockResize(
          event,
          block.id
        );
      }
    );


  if (
    block.type === 'photo' ||
    block.type === 'photo-caption'
  ) {

    const frame =
      content.querySelector(
        '.poster-photo-block__frame'
      );


    if (frame) {

      frame.addEventListener(
        'click',
        event => {

          if (
            state.layoutEditing
          ) {
            return;
          }


          event.stopPropagation();

          choosePhoto(
            block.slotId
          );
        }
      );


      frame.addEventListener(
        'dragover',
        event => {

          event.preventDefault();

          frame.classList.add(
            'is-dragover'
          );
        }
      );


      frame.addEventListener(
        'dragleave',
        () => {

          frame.classList.remove(
            'is-dragover'
          );
        }
      );


      frame.addEventListener(
        'drop',
        event => {

          event.preventDefault();


          frame.classList.remove(
            'is-dragover'
          );


          const file =
            event.dataTransfer?.files?.[0];


          if (file) {

            processPhotoFile(
              block.slotId,
              file
            );
          }
        }
      );
    }
  }


  return element;
}


function renderBlockContent(
  block,
  container
) {

  switch (block.type) {

    case 'activityTitle':

      renderActivityTitleBlock(
        block,
        container
      );

      break;


    case 'activityContent':

      renderActivityContentBlock(
        block,
        container
      );

      break;


    case 'subtitle':

      renderSubtitleBlock(
        block,
        container
      );

      break;


    case 'text':

      renderTextBlock(
        block,
        container
      );

      break;


    case 'photo':

    case 'photo-caption':

      renderPhotoBlock(
        block,
        container
      );

      break;


    default:

      container.textContent =
        '';
  }
}


/* =========================================================
   활동 제목 블록
========================================================= */

function renderActivityTitleBlock(
  block,
  container
) {

  const activity =
    getActivity(
      block.activityId
    );


  const index =
    getActivityIndex(
      block.activityId
    );


  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.className =
    'poster-activity-title';


  const number =
    document.createElement(
      'span'
    );


  number.className =
    'poster-activity-title__number';


  number.textContent =
    String(
      index + 1
    );


  const title =
    document.createElement(
      'h2'
    );


  title.className =
    'poster-activity-title__text';


  title.textContent =
    activity?.title ||
    '활동 제목';


  wrapper.append(
    number,
    title
  );


  container.appendChild(
    wrapper
  );
}


/* =========================================================
   활동 내용 블록
========================================================= */

function renderActivityContentBlock(
  block,
  container
) {

  const activity =
    getActivity(
      block.activityId
    );


  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.className =
    'poster-activity-content';


  const text =
    document.createElement(
      'div'
    );


  text.className =
    'poster-activity-content__text';


  text.textContent =
    activity?.content ||
    '활동 내용을 입력해 주세요.';


  wrapper.appendChild(
    text
  );


  container.appendChild(
    wrapper
  );
}


/* =========================================================
   추가 소제목
========================================================= */

function renderSubtitleBlock(
  block,
  container
) {

  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.className =
    'poster-subtitle-block';


  const number =
    document.createElement(
      'span'
    );


  number.className =
    'poster-subtitle-block__number';


  number.textContent =
    block.marker ||
    '•';


  const title =
    document.createElement(
      'h2'
    );


  title.className =
    'poster-subtitle-block__title';


  title.textContent =
    block.text ||
    '소제목';


  wrapper.append(
    number,
    title
  );


  container.appendChild(
    wrapper
  );
}


/* =========================================================
   추가 텍스트
========================================================= */

function renderTextBlock(
  block,
  container
) {

  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.className =
    'poster-text-block';


  const text =
    document.createElement(
      'div'
    );


  text.className =
    'poster-text-block__text';


  text.textContent =
    block.text ||
    '추가 텍스트';


  wrapper.appendChild(
    text
  );


  container.appendChild(
    wrapper
  );
}


/* =========================================================
   사진 블록
========================================================= */

function renderPhotoBlock(
  block,
  container
) {

  const figure =
    document.createElement(
      'figure'
    );


  figure.className =
    'poster-photo-block';


  const frame =
    document.createElement(
      'div'
    );


  frame.className =
    'poster-photo-block__frame';


  const image =
    document.createElement(
      'img'
    );


  image.className =
    'poster-photo-block__image';

  image.alt = '';


  const empty =
    document.createElement(
      'div'
    );


  empty.className =
    'poster-photo-block__empty';


  empty.innerHTML =
    '<span aria-hidden="true">+</span><span>사진</span>';


  const caption =
    document.createElement(
      'figcaption'
    );


  caption.className =
    'poster-photo-block__caption';


  const photo =
    findPhoto(
      block.slotId
    );


  if (
    photo?.dataUrl
  ) {

    image.src =
      photo.dataUrl;


    image.hidden =
      false;


    empty.hidden =
      true;


    applyImageCropStyle(
      image,
      photo.crop
    );

  } else {

    image.hidden =
      true;


    empty.hidden =
      false;
  }


  frame.append(
    image,
    empty
  );


  figure.appendChild(
    frame
  );


  const showCaption =
    block.type ===
    'photo-caption' ||
    Boolean(
      photo?.caption
    );


  if (showCaption) {

    caption.hidden =
      false;


    caption.textContent =
      photo?.caption ||
      '사진 설명';


    figure.appendChild(
      caption
    );
  }


  container.appendChild(
    figure
  );
}


/* =========================================================
   기본 사진 편집 카드 렌더링
========================================================= */

function renderBasicPhotoCards() {

  $$('.photo-editor-card').forEach(
    card => {

      const slotId =
        card.dataset.photoSlot;


      const photo =
        findPhoto(
          slotId
        );


      const image =
        card.querySelector(
          '.photo-editor-card__image'
        );


      const empty =
        card.querySelector(
          '.photo-editor-card__empty'
        );


      const captionInput =
        card.querySelector(
          '[data-photo-caption]'
        );


      const cropButton =
        card.querySelector(
          '[data-photo-crop]'
        );


      const removeButton =
        card.querySelector(
          '[data-photo-remove]'
        );


      if (
        photo?.dataUrl
      ) {

        image.src =
          photo.dataUrl;


        image.hidden =
          false;


        empty.hidden =
          true;


        applyImageCropStyle(
          image,
          photo.crop
        );


        cropButton.hidden =
          false;


        removeButton.hidden =
          false;

      } else {

        image.removeAttribute(
          'src'
        );


        image.hidden =
          true;


        empty.hidden =
          false;


        cropButton.hidden =
          true;


        removeButton.hidden =
          true;
      }


      captionInput.value =
        photo?.caption ||
        '';
    }
  );
}


/* =========================================================
   AI 전체 다듬기
========================================================= */

async function improveAllActivities() {

  const activities =
    state.activities.map(
      activity => ({
        id: activity.id,

        title:
          activity.title ||
          '',

        content:
          activity.content ||
          ''
      })
    );


  const hasAnyText =
    activities.some(
      activity =>
        activity.title.trim() ||
        activity.content.trim()
    );


  if (
    !hasAnyText
  ) {

    showToast(
      'AI로 다듬을 활동 내용을 먼저 입력해 주세요.',
      'error'
    );

    return;
  }


  state.aiUndoSnapshot =
    cloneJson(
      state.activities
    );


  updateAiUndoButton();


  showLoading(
    '전체 활동을 다듬는 중입니다.'
  );


  try {

    const response =
      await callAppsScript({

        action:
          'improveActivities',

        targetLength:
          APP_CONFIG
            .TARGET_ACTIVITY_LENGTH,

        activities:
          activities
      });


    if (
      !response ||
      !Array.isArray(
        response.activities
      )
    ) {

      throw new Error(
        'AI 결과의 형식이 올바르지 않습니다.'
      );
    }


    response.activities.forEach(
      result => {

        const activity =
          getActivity(
            result.id
          );


        if (
          !activity
        ) {
          return;
        }


        activity.title =
          String(
            result.title ||
            ''
          );


        activity.content =
          String(
            result.content ||
            ''
          );
      }
    );


    applyStateToEditor();

    markDirty();

    renderAll();


    const modelText =
      response.modelLabel
        ? ` · ${response.modelLabel}`
        : '';


    const cachedText =
      response.cached
        ? ' · 캐시 사용'
        : '';


    showToast(
      `전체 활동을 다듬었습니다${modelText}${cachedText}.`,
      'success'
    );

  } catch (error) {

    state.aiUndoSnapshot =
      null;


    updateAiUndoButton();


    showToast(
      error.message ||
      'AI 다듬기에 실패했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}


/* =========================================================
   AI 취소
========================================================= */

function undoAiImprove() {

  if (
    !state.aiUndoSnapshot
  ) {
    return;
  }


  state.activities =
    cloneJson(
      state.aiUndoSnapshot
    );


  state.aiUndoSnapshot =
    null;


  applyStateToEditor();

  markDirty();

  renderAll();


  showToast(
    'AI 수정 전 내용으로 되돌렸습니다.',
    'success'
  );
}


function updateAiUndoButton() {

  dom.btnAiUndo.hidden =
    !state.aiUndoSnapshot;
}


/* =========================================================
   레이아웃 편집 모드
========================================================= */

function handleLayoutEditingToggle() {

  state.layoutEditing =
    dom.layoutToggle.checked;


  if (
    !state.layoutEditing
  ) {

    state.selectedBlockId =
      null;
  }


  markDirty();

  renderAll();
}


function updateLayoutToolState() {

  const enabled =
    Boolean(
      state.layoutEditing
    );


  dom.layoutTools.setAttribute(
    'aria-disabled',
    String(
      !enabled
    )
  );


  dom.blockAddButtons.forEach(
    button => {

      button.disabled =
        !enabled;
    }
  );
}


function selectBlock(blockId) {

  state.selectedBlockId =
    blockId;


  renderAll();
}


function getSelectedBlock() {

  return (
    state.blocks.find(
      block =>
        block.id ===
        state.selectedBlockId
    ) ||
    null
  );
}


/* =========================================================
   블록 추가
========================================================= */

function addBlock(type) {

  if (
    !state.layoutEditing
  ) {
    return;
  }


  const id =
    createClientId(
      'block'
    );


  let block;


  if (
    type ===
    'subtitle'
  ) {

    block = {

      id,

      type:
        'subtitle',

      text:
        '새 소제목',

      marker:
        '•',

      x:
        1,

      y:
        39,

      w:
        6,

      h:
        3,

      z:
        getNextZ(),

      locked:
        false
    };

  } else if (
    type ===
    'text'
  ) {

    block = {

      id,

      type:
        'text',

      text:
        '추가 내용을 입력해 주세요.',

      x:
        1,

      y:
        39,

      w:
        6,

      h:
        7,

      z:
        getNextZ(),

      locked:
        false
    };

  } else if (
    type === 'photo' ||
    type === 'photo-caption'
  ) {

    block = {

      id,

      type,

      slotId:
        createClientId(
          'photo'
        ),

      x:
        1,

      y:
        39,

      w:
        5,

      h:
        type ===
        'photo-caption'
          ? 8
          : 7,

      z:
        getNextZ(),

      locked:
        false
    };

  } else {

    return;
  }


  const position =
    findAvailablePosition(
      block.w,
      block.h
    );


  if (
    !position
  ) {

    showToast(
      '새 블록을 놓을 빈 공간이 없습니다. 기존 블록을 이동하거나 크기를 줄여 주세요.',
      'error'
    );

    return;
  }


  block.x =
    position.x;


  block.y =
    position.y;


  state.blocks.push(
    block
  );


  state.selectedBlockId =
    block.id;


  markDirty();

  renderAll();
}


function findAvailablePosition(
  w,
  h
) {

  for (
    let y = 1;
    y <=
    APP_CONFIG.GRID_ROWS - h + 1;
    y += 1
  ) {

    for (
      let x = 1;
      x <=
      APP_CONFIG.GRID_COLUMNS - w + 1;
      x += 1
    ) {

      const candidate = {
        x,
        y,
        w,
        h
      };


      if (
        !hasCollision(
          candidate,
          null
        )
      ) {

        return {
          x,
          y
        };
      }
    }
  }


  return null;
}


/* =========================================================
   블록 설정 패널
========================================================= */

function renderBlockInspector() {

  const block =
    getSelectedBlock();


  if (
    !state.layoutEditing ||
    !block
  ) {

    dom.blockInspector.hidden =
      true;

    return;
  }


  dom.blockInspector.hidden =
    false;


  dom.selectedBlockLabel.textContent =
    getBlockLabel(
      block
    );


  dom.blockInspectorContent.innerHTML =
    '';


  if (
    block.type ===
    'subtitle'
  ) {

    dom.blockInspectorContent.appendChild(

      createInspectorTextInput(
        '소제목',
        block.text || '',

        value => {

          block.text =
            value;


          markDirty();

          renderBlocks();
        }
      )
    );


    dom.blockInspectorContent.appendChild(

      createInspectorTextInput(
        '표시 문자',
        block.marker || '•',

        value => {

          block.marker =
            value.slice(
              0,
              3
            );


          markDirty();

          renderBlocks();
        }
      )
    );
  }


  if (
    block.type ===
    'text'
  ) {

    dom.blockInspectorContent.appendChild(

      createInspectorTextarea(
        '텍스트',
        block.text || '',

        value => {

          block.text =
            value;


          markDirty();

          renderBlocks();
        }
      )
    );
  }


  if (
    block.type === 'photo' ||
    block.type === 'photo-caption'
  ) {

    const photo =
      findPhoto(
        block.slotId
      );


    dom.blockInspectorContent.appendChild(

      createInspectorButton(

        photo?.dataUrl
          ? '사진 변경'
          : '사진 선택',

        () => {

          choosePhoto(
            block.slotId
          );
        }
      )
    );


    if (
      photo?.dataUrl
    ) {

      dom.blockInspectorContent.appendChild(

        createInspectorButton(
          '사진 위치 조정',

          () => {

            openCropDialog(
              block.slotId
            );
          }
        )
      );
    }


    if (
      block.type ===
      'photo-caption'
    ) {

      dom.blockInspectorContent.appendChild(

        createInspectorTextInput(
          '사진 설명',

          photo?.caption ||
          '',

          value => {

            const record =
              ensurePhotoRecord(
                block.slotId
              );


            record.caption =
              value;


            markDirty();

            renderBlocks();
          }
        )
      );
    }
  }


  dom.blockInspectorContent.appendChild(

    createInspectorRange(
      '너비',
      2,
      12,
      block.w,

      value => {

        resizeBlockFromInspector(
          block,
          value,
          block.h
        );
      }
    )
  );


  dom.blockInspectorContent.appendChild(

    createInspectorRange(
      '높이',
      2,
      18,
      block.h,

      value => {

        resizeBlockFromInspector(
          block,
          block.w,
          value
        );
      }
    )
  );


  dom.btnBlockDelete.disabled =
    Boolean(
      block.locked
    );


  dom.btnBlockDelete.title =
    block.locked
      ? '기본 활동 블록은 삭제할 수 없습니다.'
      : '';
}


function createInspectorTextInput(
  labelText,
  value,
  onInput
) {

  const label =
    document.createElement(
      'label'
    );


  label.className =
    'field';


  const title =
    document.createElement(
      'span'
    );


  title.className =
    'field__label';


  title.textContent =
    labelText;


  const input =
    document.createElement(
      'input'
    );


  input.type =
    'text';


  input.value =
    value;


  input.addEventListener(
    'input',
    () => {

      onInput(
        input.value
      );
    }
  );


  label.append(
    title,
    input
  );


  return label;
}


function createInspectorTextarea(
  labelText,
  value,
  onInput
) {

  const label =
    document.createElement(
      'label'
    );


  label.className =
    'field field--full';


  const title =
    document.createElement(
      'span'
    );


  title.className =
    'field__label';


  title.textContent =
    labelText;


  const textarea =
    document.createElement(
      'textarea'
    );


  textarea.rows =
    4;


  textarea.value =
    value;


  textarea.addEventListener(
    'input',
    () => {

      onInput(
        textarea.value
      );
    }
  );


  label.append(
    title,
    textarea
  );


  return label;
}


function createInspectorButton(
  text,
  onClick
) {

  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.className =
    'field';


  const button =
    document.createElement(
      'button'
    );


  button.type =
    'button';


  button.className =
    'btn btn--ghost';


  button.textContent =
    text;


  button.addEventListener(
    'click',
    onClick
  );


  wrapper.appendChild(
    button
  );


  return wrapper;
}


function createInspectorRange(
  labelText,
  min,
  max,
  value,
  onInput
) {

  const label =
    document.createElement(
      'label'
    );


  label.className =
    'field';


  const row =
    document.createElement(
      'div'
    );


  row.className =
    'field__label-row';


  const title =
    document.createElement(
      'span'
    );


  title.className =
    'field__label';


  title.textContent =
    labelText;


  const output =
    document.createElement(
      'span'
    );


  output.className =
    'character-count';


  output.textContent =
    String(
      value
    );


  row.append(
    title,
    output
  );


  const input =
    document.createElement(
      'input'
    );


  input.type =
    'range';

  input.min =
    String(min);

  input.max =
    String(max);

  input.step =
    '1';

  input.value =
    String(value);


  input.addEventListener(
    'input',
    () => {

      const next =
        Number(
          input.value
        );


      output.textContent =
        String(
          next
        );


      onInput(
        next
      );
    }
  );


  label.append(
    row,
    input
  );


  return label;
}


function resizeBlockFromInspector(
  block,
  nextW,
  nextH
) {

  const candidate = {

    x:
      block.x,

    y:
      block.y,

    w:
      clamp(
        nextW,
        2,
        APP_CONFIG.GRID_COLUMNS
      ),

    h:
      clamp(
        nextH,
        2,
        18
      )
  };


  candidate.w =
    Math.min(
      candidate.w,
      APP_CONFIG.GRID_COLUMNS -
      candidate.x +
      1
    );


  candidate.h =
    Math.min(
      candidate.h,
      APP_CONFIG.GRID_ROWS -
      candidate.y +
      1
    );


  if (
    hasCollision(
      candidate,
      block.id
    )
  ) {

    showToast(
      '다른 블록과 겹쳐서 크기를 변경할 수 없습니다.',
      'error'
    );


    renderBlockInspector();

    return;
  }


  block.w =
    candidate.w;


  block.h =
    candidate.h;


  markDirty();

  renderAll();
}


function getBlockLabel(block) {

  const labels = {

    activityTitle:
      '활동 제목',

    activityContent:
      '활동 내용',

    subtitle:
      '소제목',

    text:
      '텍스트',

    photo:
      '사진',

    'photo-caption':
      '사진 + 설명'
  };


  return (
    labels[block.type] ||
    block.type
  );
}


/* =========================================================
   블록 드래그
========================================================= */

function startBlockDrag(
  event,
  blockId
) {

  if (
    !state.layoutEditing
  ) {
    return;
  }


  event.preventDefault();

  event.stopPropagation();


  const block =
    state.blocks.find(
      item =>
        item.id ===
        blockId
    );


  if (
    !block
  ) {
    return;
  }


  state.selectedBlockId =
    block.id;


  const element =
    dom.layoutCanvas.querySelector(
      `[data-block-id="${cssEscape(block.id)}"]`
    );


  const metrics =
    getGridMetrics();


  layoutPointerState = {

    mode:
      'drag',

    blockId:
      block.id,

    startClientX:
      event.clientX,

    startClientY:
      event.clientY,

    startX:
      block.x,

    startY:
      block.y,

    candidateX:
      block.x,

    candidateY:
      block.y,

    metrics
  };


  element?.classList.add(
    'is-dragging'
  );


  window.addEventListener(
    'pointermove',
    handleLayoutPointerMove
  );


  window.addEventListener(
    'pointerup',
    finishLayoutPointer
  );


  renderBlockInspector();
}


/* =========================================================
   블록 크기 변경
========================================================= */

function startBlockResize(
  event,
  blockId
) {

  if (
    !state.layoutEditing
  ) {
    return;
  }


  event.preventDefault();

  event.stopPropagation();


  const block =
    state.blocks.find(
      item =>
        item.id ===
        blockId
    );


  if (
    !block
  ) {
    return;
  }


  state.selectedBlockId =
    block.id;


  const element =
    dom.layoutCanvas.querySelector(
      `[data-block-id="${cssEscape(block.id)}"]`
    );


  const metrics =
    getGridMetrics();


  layoutPointerState = {

    mode:
      'resize',

    blockId:
      block.id,

    startClientX:
      event.clientX,

    startClientY:
      event.clientY,

    startW:
      block.w,

    startH:
      block.h,

    candidateW:
      block.w,

    candidateH:
      block.h,

    metrics
  };


  element?.classList.add(
    'is-resizing'
  );


  window.addEventListener(
    'pointermove',
    handleLayoutPointerMove
  );


  window.addEventListener(
    'pointerup',
    finishLayoutPointer
  );


  renderBlockInspector();
}


function handleLayoutPointerMove(event) {

  if (
    !layoutPointerState
  ) {
    return;
  }


  const pointer =
    layoutPointerState;


  const block =
    state.blocks.find(
      item =>
        item.id ===
        pointer.blockId
    );


  if (
    !block
  ) {
    return;
  }


  const deltaX =
    event.clientX -
    pointer.startClientX;


  const deltaY =
    event.clientY -
    pointer.startClientY;


  const colDelta =
    Math.round(
      deltaX /
      pointer.metrics.colStep
    );


  const rowDelta =
    Math.round(
      deltaY /
      pointer.metrics.rowStep
    );


  if (
    pointer.mode ===
    'drag'
  ) {

    const nextX =
      clamp(
        pointer.startX +
        colDelta,

        1,

        APP_CONFIG.GRID_COLUMNS -
        block.w +
        1
      );


    const nextY =
      clamp(
        pointer.startY +
        rowDelta,

        1,

        APP_CONFIG.GRID_ROWS -
        block.h +
        1
      );


    pointer.candidateX =
      nextX;


    pointer.candidateY =
      nextY;


    updateBlockElementPosition(
      block.id,
      nextX,
      nextY,
      block.w,
      block.h
    );

  } else {

    const maxW =
      APP_CONFIG.GRID_COLUMNS -
      block.x +
      1;


    const maxH =
      APP_CONFIG.GRID_ROWS -
      block.y +
      1;


    const nextW =
      clamp(
        pointer.startW +
        colDelta,
        2,
        maxW
      );


    const nextH =
      clamp(
        pointer.startH +
        rowDelta,
        2,
        maxH
      );


    pointer.candidateW =
      nextW;


    pointer.candidateH =
      nextH;


    updateBlockElementPosition(
      block.id,
      block.x,
      block.y,
      nextW,
      nextH
    );
  }
}


function finishLayoutPointer() {

  if (
    !layoutPointerState
  ) {
    return;
  }


  const pointer =
    layoutPointerState;


  const block =
    state.blocks.find(
      item =>
        item.id ===
        pointer.blockId
    );


  window.removeEventListener(
    'pointermove',
    handleLayoutPointerMove
  );


  window.removeEventListener(
    'pointerup',
    finishLayoutPointer
  );


  layoutPointerState =
    null;


  if (
    !block
  ) {

    renderAll();

    return;
  }


  const candidate =
    pointer.mode ===
    'drag'
      ? {
          x:
            pointer.candidateX,

          y:
            pointer.candidateY,

          w:
            block.w,

          h:
            block.h
        }
      : {
          x:
            block.x,

          y:
            block.y,

          w:
            pointer.candidateW,

          h:
            pointer.candidateH
        };


  if (
    hasCollision(
      candidate,
      block.id
    )
  ) {

    showToast(
      '다른 블록과 겹치는 위치에는 놓을 수 없습니다.',
      'error'
    );


    renderAll();

    return;
  }


  Object.assign(
    block,
    candidate
  );


  markDirty();

  renderAll();
}


function updateBlockElementPosition(
  blockId,
  x,
  y,
  w,
  h
) {

  const element =
    dom.layoutCanvas.querySelector(
      `[data-block-id="${cssEscape(blockId)}"]`
    );


  if (
    !element
  ) {
    return;
  }


  element.style.setProperty(
    '--block-x',
    x
  );


  element.style.setProperty(
    '--block-y',
    y
  );


  element.style.setProperty(
    '--block-w',
    w
  );


  element.style.setProperty(
    '--block-h',
    h
  );
}


/* =========================================================
   Grid 계산
========================================================= */

function getGridMetrics() {

  const rect =
    dom.layoutCanvas
      .getBoundingClientRect();


  const scaleX =
    rect.width /
    dom.layoutCanvas.offsetWidth;


  const scaleY =
    rect.height /
    dom.layoutCanvas.offsetHeight;


  const columnGap =
    APP_CONFIG.GRID_COLUMN_GAP *
    scaleX;


  const rowGap =
    APP_CONFIG.GRID_ROW_GAP *
    scaleY;


  const colWidth =
    (
      rect.width -
      columnGap *
      (
        APP_CONFIG.GRID_COLUMNS -
        1
      )
    ) /
    APP_CONFIG.GRID_COLUMNS;


  const rowHeight =
    (
      rect.height -
      rowGap *
      (
        APP_CONFIG.GRID_ROWS -
        1
      )
    ) /
    APP_CONFIG.GRID_ROWS;


  return {

    colStep:
      colWidth +
      columnGap,

    rowStep:
      rowHeight +
      rowGap
  };
}


/* =========================================================
   충돌 검사
========================================================= */

function hasCollision(
  candidate,
  ignoreBlockId
) {

  return state.blocks.some(
    block => {

      if (
        block.id ===
        ignoreBlockId
      ) {
        return false;
      }


      return rectanglesOverlap(
        candidate,
        block
      );
    }
  );
}


function rectanglesOverlap(
  a,
  b
) {

  return !(
    a.x + a.w - 1 < b.x ||
    b.x + b.w - 1 < a.x ||
    a.y + a.h - 1 < b.y ||
    b.y + b.h - 1 < a.y
  );
}


/* =========================================================
   Z-index
========================================================= */

function getNextZ() {

  return (
    Math.max(
      1,

      ...state.blocks.map(
        block =>
          Number(
            block.z ||
            1
          )
      )
    ) +
    1
  );
}


function bringSelectedBlockFront() {

  const block =
    getSelectedBlock();


  if (
    !block
  ) {
    return;
  }


  block.z =
    getNextZ();


  markDirty();

  renderAll();
}


function sendSelectedBlockBack() {

  const block =
    getSelectedBlock();


  if (
    !block
  ) {
    return;
  }


  const minZ =
    Math.min(
      ...state.blocks.map(
        item =>
          Number(
            item.z ||
            1
          )
      )
    );


  block.z =
    minZ -
    1;


  normalizeBlockZ();

  markDirty();

  renderAll();
}


function normalizeBlockZ() {

  [...state.blocks]
    .sort(
      (a, b) =>
        Number(a.z || 1) -
        Number(b.z || 1)
    )
    .forEach(
      (block, index) => {

        block.z =
          index + 1;
      }
    );
}


/* =========================================================
   블록 삭제
========================================================= */

async function deleteSelectedBlock() {

  const block =
    getSelectedBlock();


  if (
    !block
  ) {
    return;
  }


  if (
    block.locked
  ) {

    showToast(
      '기본 활동 블록은 삭제할 수 없습니다.',
      'error'
    );

    return;
  }


  const confirmed =
    await confirmAction(
      '블록 삭제',
      '선택한 블록을 삭제할까요?'
    );


  if (
    !confirmed
  ) {
    return;
  }


  if (
    block.slotId
  ) {

    removePhotoRecordOnly(
      block.slotId
    );
  }


  state.blocks =
    state.blocks.filter(
      item =>
        item.id !==
        block.id
    );


  state.selectedBlockId =
    null;


  markDirty();

  renderAll();
}


/* =========================================================
   레이아웃 초기화
========================================================= */

async function resetLayout() {

  const confirmed =
    await confirmAction(

      '레이아웃 초기화',

      '기본 활동 1·2 배치로 돌아가고 추가 블록은 삭제할까요? 입력한 활동 내용과 기본 사진은 유지됩니다.'
    );


  if (
    !confirmed
  ) {
    return;
  }


  const extraPhotoSlots =
    state.blocks
      .filter(
        block =>
          !block.locked &&
          block.slotId
      )
      .map(
        block =>
          block.slotId
      );


  extraPhotoSlots.forEach(
    removePhotoRecordOnly
  );


  state.blocks =
    createDefaultBlocks();


  state.selectedBlockId =
    null;


  markDirty();

  renderAll();


  showToast(
    '기본 레이아웃으로 되돌렸습니다.',
    'success'
  );
}


/* =========================================================
   사진 선택
========================================================= */

function choosePhoto(slotId) {

  currentPhotoSlot =
    slotId;


  dom.photoFileInput.value =
    '';


  dom.photoFileInput.click();
}


async function handlePhotoFileInput() {

  const file =
    dom.photoFileInput
      .files?.[0];


  if (
    !file ||
    !currentPhotoSlot
  ) {
    return;
  }


  const slotId =
    currentPhotoSlot;


  currentPhotoSlot =
    null;


  await processPhotoFile(
    slotId,
    file
  );
}


async function processPhotoFile(
  slotId,
  file
) {

  if (
    !/^image\/(jpeg|png|webp)$/i
      .test(
        file.type
      )
  ) {

    showToast(
      'JPG, PNG, WEBP 사진만 사용할 수 있습니다.',
      'error'
    );

    return;
  }


  showLoading(
    '사진을 불러오는 중입니다.'
  );


  try {

    const dataUrl =
      await compressImageFile(
        file
      );


    let photo =
      findPhoto(
        slotId
      );


    if (
      !photo
    ) {

      photo = {

        slotId,

        caption:
          '',

        crop: {
          x: 50,
          y: 50,
          scale: 1
        },

        dataUrl,

        fileId:
          null,

        fileName:
          file.name,

        mimeType:
          'image/jpeg'
      };


      state.photos.push(
        photo
      );

    } else {

      photo.dataUrl =
        dataUrl;


      photo.fileId =
        null;


      photo.fileName =
        file.name;


      photo.mimeType =
        'image/jpeg';


      photo.crop = {
        x: 50,
        y: 50,
        scale: 1
      };
    }


    markDirty();

    renderAll();


    showToast(
      '사진을 추가했습니다.',
      'success'
    );

  } catch (error) {

    showToast(
      error.message ||
      '사진을 처리하지 못했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}


function findPhoto(slotId) {

  return (
    state.photos.find(
      photo =>
        photo.slotId ===
        slotId
    ) ||
    null
  );
}


function ensurePhotoRecord(slotId) {

  let photo =
    findPhoto(
      slotId
    );


  if (
    !photo
  ) {

    photo = {

      slotId,

      caption:
        '',

      crop: {
        x: 50,
        y: 50,
        scale: 1
      },

      dataUrl:
        '',

      fileId:
        null,

      fileName:
        '',

      mimeType:
        'image/jpeg'
    };


    state.photos.push(
      photo
    );
  }


  return photo;
}


/* =========================================================
   사진 삭제
========================================================= */

async function removePhoto(slotId) {

  const photo =
    findPhoto(
      slotId
    );


  if (
    !photo
  ) {
    return;
  }


  const confirmed =
    await confirmAction(
      '사진 삭제',
      '선택한 사진을 삭제할까요?'
    );


  if (
    !confirmed
  ) {
    return;
  }


  removePhotoRecordOnly(
    slotId
  );


  markDirty();

  renderAll();
}


function removePhotoRecordOnly(slotId) {

  state.photos =
    state.photos.filter(
      photo =>
        photo.slotId !==
        slotId
    );
}


function applyImageCropStyle(
  image,
  crop
) {

  const normalized =
    normalizeCrop(
      crop
    );


  image.style.objectPosition =
    `${normalized.x}% ${normalized.y}%`;


  image.style.transform =
    `scale(${normalized.scale})`;
}


/* =========================================================
   사진 위치 조정
========================================================= */

function openCropDialog(slotId) {

  const photo =
    findPhoto(
      slotId
    );


  if (
    !photo?.dataUrl
  ) {

    showToast(
      '먼저 사진을 추가해 주세요.',
      'error'
    );

    return;
  }


  currentCropSlot =
    slotId;


  cropWorkingState =
    normalizeCrop(
      photo.crop
    );


  dom.cropImage.src =
    photo.dataUrl;


  dom.cropZoom.value =
    String(
      cropWorkingState.scale
    );


  updateCropPreview();


  dom.photoCropDialog.showModal();
}


function closeCropDialog() {

  if (
    dom.photoCropDialog.open
  ) {

    dom.photoCropDialog.close();
  }


  currentCropSlot =
    null;


  cropWorkingState =
    null;


  cropPointerState =
    null;
}


function handleCropZoom() {

  if (
    !cropWorkingState
  ) {
    return;
  }


  cropWorkingState.scale =
    Number(
      dom.cropZoom.value
    );


  updateCropPreview();
}


function updateCropPreview() {

  if (
    !cropWorkingState
  ) {
    return;
  }


  dom.cropImage.style.objectPosition =
    `${cropWorkingState.x}% ${cropWorkingState.y}%`;


  dom.cropImage.style.transform =
    `scale(${cropWorkingState.scale})`;
}


function startCropDrag(event) {

  if (
    !cropWorkingState
  ) {
    return;
  }


  event.preventDefault();


  cropPointerState = {

    pointerId:
      event.pointerId,

    startClientX:
      event.clientX,

    startClientY:
      event.clientY,

    startX:
      cropWorkingState.x,

    startY:
      cropWorkingState.y
  };
}


function handleCropDrag(event) {

  if (
    !cropPointerState ||
    !cropWorkingState
  ) {
    return;
  }


  if (
    event.pointerId !==
    cropPointerState.pointerId
  ) {
    return;
  }


  const rect =
    dom.cropFrame
      .getBoundingClientRect();


  const dx =
    event.clientX -
    cropPointerState.startClientX;


  const dy =
    event.clientY -
    cropPointerState.startClientY;


  cropWorkingState.x =
    clamp(
      cropPointerState.startX -
      (
        dx /
        rect.width
      ) *
      100,

      0,
      100
    );


  cropWorkingState.y =
    clamp(
      cropPointerState.startY -
      (
        dy /
        rect.height
      ) *
      100,

      0,
      100
    );


  updateCropPreview();
}


function endCropDrag(event) {

  if (
    !cropPointerState
  ) {
    return;
  }


  if (
    event.pointerId !==
    cropPointerState.pointerId
  ) {
    return;
  }


  cropPointerState =
    null;
}


function applyCrop() {

  if (
    !currentCropSlot ||
    !cropWorkingState
  ) {

    closeCropDialog();

    return;
  }


  const photo =
    findPhoto(
      currentCropSlot
    );


  if (
    photo
  ) {

    photo.crop =
      normalizeCrop(
        cropWorkingState
      );


    markDirty();

    renderAll();
  }


  closeCropDialog();


  showToast(
    '사진 위치를 적용했습니다.',
    'success'
  );
}


/* =========================================================
   이미지 압축
========================================================= */

function compressImageFile(file) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onerror =
        () => {

          reject(
            new Error(
              '사진 파일을 읽지 못했습니다.'
            )
          );
        };


      reader.onload =
        () => {

          const image =
            new Image();


          image.onload =
            () => {

              let width =
                image.naturalWidth;


              let height =
                image.naturalHeight;


              const maxDimension =
                APP_CONFIG
                  .MAX_IMAGE_DIMENSION;


              if (
                Math.max(
                  width,
                  height
                ) >
                maxDimension
              ) {

                const ratio =
                  maxDimension /
                  Math.max(
                    width,
                    height
                  );


                width =
                  Math.round(
                    width *
                    ratio
                  );


                height =
                  Math.round(
                    height *
                    ratio
                  );
              }


              const canvas =
                document.createElement(
                  'canvas'
                );


              canvas.width =
                width;


              canvas.height =
                height;


              const context =
                canvas.getContext(
                  '2d'
                );


              if (
                !context
              ) {

                reject(
                  new Error(
                    '사진을 처리할 수 없습니다.'
                  )
                );

                return;
              }


              context.drawImage(
                image,
                0,
                0,
                width,
                height
              );


              try {

                resolve(
                  canvas.toDataURL(
                    'image/jpeg',
                    APP_CONFIG
                      .IMAGE_JPEG_QUALITY
                  )
                );

              } catch (error) {

                reject(
                  new Error(
                    '사진을 변환하지 못했습니다.'
                  )
                );
              }
            };


          image.onerror =
            () => {

              reject(
                new Error(
                  '사진 형식을 읽지 못했습니다.'
                )
              );
            };


          image.src =
            reader.result;
        };


      reader.readAsDataURL(
        file
      );
    }
  );
}


/* =========================================================
   프로젝트 저장
========================================================= */

async function saveProject(finalize) {

  const clubName =
    String(
      state.clubName ||
      ''
    ).trim();


  if (
    !clubName
  ) {

    showToast(
      '동아리명을 입력해 주세요.',
      'error'
    );


    dom.clubName.focus();

    return;
  }


  if (
    finalize
  ) {

    const confirmed =
      await confirmAction(

        '완성본 저장',

        'Google Drive에 완성본을 저장하고 PNG와 PDF 파일을 내려받을까요?'
      );


    if (
      !confirmed
    ) {
      return;
    }
  }


  showLoading(

    finalize
      ? '완성본을 저장하는 중입니다.'
      : '작성 중인 내용을 저장하는 중입니다.'
  );


  try {

    const previewRatio =
      finalize
        ? APP_CONFIG
            .COMPLETE_PREVIEW_PIXEL_RATIO
        : APP_CONFIG
            .DRAFT_PREVIEW_PIXEL_RATIO;


    const previewDataUrl =
      await capturePosterDataUrl(
        previewRatio
      );


    const response =
      await callAppsScript({

        action:
          'saveProject',

        finalize,

        expectedUpdatedAt:
          state.updatedAt ||
          null,

        project:
          buildProjectPayload(
            finalize
          ),

        photos:
          buildPhotosPayload(),

        preview: {
          dataUrl:
            previewDataUrl
        }
      });


    if (
      !response?.id
    ) {

      throw new Error(
        '저장 결과를 확인할 수 없습니다.'
      );
    }


    const loaded =
      await callAppsScript({

        action:
          'loadProject',

        projectId:
          response.id
      });


    if (
      loaded?.project
    ) {

      const layoutEditing =
        state.layoutEditing;


      state =
        normalizeLoadedState(
          loaded.project
        );


      state.layoutEditing =
        layoutEditing;


      applyStateToEditor();

      renderAll();
    }


    isDirty =
      false;


    await saveLocalDraft();


    setSaveStatus(

      finalize
        ? '완성본 저장됨'
        : '클라우드 저장됨',

      'saved'
    );


    if (
      finalize
    ) {

      try {

        await downloadCompleteFiles();


        showToast(
          '완성본을 저장하고 PNG·PDF 파일을 만들었습니다.',
          'success'
        );

      } catch (
        downloadError
      ) {

        console.error(
          downloadError
        );


        showToast(
          'Drive 저장은 완료됐지만 PNG·PDF 다운로드에 실패했습니다.',
          'error'
        );
      }

    } else {

      showToast(
        '작성 중인 내용을 클라우드에 저장했습니다.',
        'success'
      );
    }

  } catch (error) {

    setSaveStatus(
      '저장 실패',
      'error'
    );


    showToast(
      error.message ||
      '저장에 실패했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}


function buildProjectPayload(finalize) {

  return {

    id:
      state.id ||
      null,

    type:
      state.type,

    clubName:
      state.clubName,

    teacherName:
      state.teacherName,

    activities:
      state.activities.map(
        activity => ({

          id:
            activity.id,

          title:
            activity.title ||
            '',

          content:
            activity.content ||
            ''
        })
      ),

    blocks:
      state.blocks.map(
        sanitizeBlockForSave
      ),

    status:
      finalize
        ? 'completed'
        : 'draft'
  };
}


function sanitizeBlockForSave(block) {

  const output = {

    id:
      block.id,

    type:
      block.type,

    x:
      block.x,

    y:
      block.y,

    w:
      block.w,

    h:
      block.h,

    z:
      block.z ||
      1,

    locked:
      Boolean(
        block.locked
      )
  };


  if (
    block.activityId
  ) {

    output.activityId =
      block.activityId;
  }


  if (
    block.slotId
  ) {

    output.slotId =
      block.slotId;
  }


  if (
    block.text !==
    undefined
  ) {

    output.text =
      block.text;
  }


  if (
    block.marker !==
    undefined
  ) {

    output.marker =
      block.marker;
  }


  return output;
}


function buildPhotosPayload() {

  return state.photos
    .filter(
      photo =>
        Boolean(
          photo.dataUrl ||
          photo.fileId
        )
    )
    .map(
      photo => {

        const payload = {

          slotId:
            photo.slotId,

          caption:
            photo.caption ||
            '',

          crop:
            normalizeCrop(
              photo.crop
            )
        };


        if (
          photo.fileId
        ) {

          payload.fileId =
            photo.fileId;

        } else {

          payload.dataUrl =
            photo.dataUrl;
        }


        return payload;
      }
    );
}


/* =========================================================
   클라우드 불러오기
========================================================= */

async function openCloudDialog() {

  if (
    !isAppsScriptConfigured()
  ) {

    showToast(
      'script.js 상단의 APPS_SCRIPT_URL을 먼저 설정해 주세요.',
      'error'
    );

    return;
  }


  dom.cloudDialog.showModal();


  dom.cloudProjectList.innerHTML =
    '<p class="empty-state">저장된 프로젝트를 불러오는 중입니다.</p>';


  try {

    const response =
      await callAppsScript({
        action:
          'listProjects'
      });


    cachedProjects =
      Array.isArray(
        response?.projects
      )
        ? response.projects
        : [];


    renderCloudProjectList();

  } catch (error) {

    dom.cloudProjectList.innerHTML =
      '';


    const message =
      document.createElement(
        'p'
      );


    message.className =
      'empty-state';


    message.textContent =
      error.message ||
      '프로젝트 목록을 불러오지 못했습니다.';


    dom.cloudProjectList.appendChild(
      message
    );
  }
}


function renderCloudProjectList() {

  dom.cloudProjectList.innerHTML =
    '';


  const projects =
    cachedProjects.filter(
      project =>
        projectFilter ===
        'all' ||
        project.type ===
        projectFilter
    );


  if (
    !projects.length
  ) {

    const empty =
      document.createElement(
        'p'
      );


    empty.className =
      'empty-state';


    empty.textContent =
      '저장된 프로젝트가 없습니다.';


    dom.cloudProjectList.appendChild(
      empty
    );

    return;
  }


  projects.forEach(
    project => {

      dom.cloudProjectList.appendChild(
        createCloudProjectItem(
          project
        )
      );
    }
  );
}


function createCloudProjectItem(project) {

  const item =
    document.createElement(
      'article'
    );


  item.className =
    'project-item';


  const preview =
    document.createElement(
      'div'
    );


  preview.className =
    'project-item__preview';


  preview.style.background =
    project.type ===
    'creative'
      ? '#efe5f5'
      : '#dfeef8';


  preview.style.display =
    'grid';


  preview.style.placeItems =
    'center';


  preview.style.fontSize =
    '9px';


  preview.style.fontWeight =
    '800';


  preview.textContent =
    project.typeLabel ||
    (
      project.type ===
      'creative'
        ? '창체'
        : '자율'
    );


  const info =
    document.createElement(
      'div'
    );


  const name =
    document.createElement(
      'h3'
    );


  name.className =
    'project-item__name';


  name.textContent =
    project.clubName ||
    '이름 없는 동아리';


  const meta =
    document.createElement(
      'p'
    );


  meta.className =
    'project-item__meta';


  const parts =
    [];


  if (
    project.typeLabel
  ) {

    parts.push(
      project.typeLabel
    );
  }


  if (
    project.teacherName
  ) {

    parts.push(
      `담당 ${project.teacherName}`
    );
  }


  if (
    project.activityCount
  ) {

    parts.push(
      `활동 ${project.activityCount}개`
    );
  }


  if (
    project.updatedAt
  ) {

    parts.push(
      formatDateTime(
        project.updatedAt
      )
    );
  }


  meta.textContent =
    parts.join(
      ' · '
    );


  info.append(
    name,
    meta
  );


  const actions =
    document.createElement(
      'div'
    );


  actions.className =
    'project-item__actions';


  const loadButton =
    document.createElement(
      'button'
    );


  loadButton.type =
    'button';


  loadButton.className =
    'mini-btn';


  loadButton.textContent =
    '불러오기';


  loadButton.addEventListener(
    'click',
    () => {

      loadCloudProject(
        project.id
      );
    }
  );


  const deleteButton =
    document.createElement(
      'button'
    );


  deleteButton.type =
    'button';


  deleteButton.className =
    'mini-btn mini-btn--danger';


  deleteButton.textContent =
    '삭제';


  deleteButton.addEventListener(
    'click',
    () => {

      deleteCloudProject(
        project
      );
    }
  );


  actions.append(
    loadButton,
    deleteButton
  );


  item.append(
    preview,
    info,
    actions
  );


  return item;
}


async function loadCloudProject(projectId) {

  if (
    isDirty
  ) {

    const confirmed =
      await confirmAction(

        '저장된 작업 불러오기',

        '현재 수정 중인 내용이 있습니다. 저장하지 않고 다른 작업을 불러올까요?'
      );


    if (
      !confirmed
    ) {
      return;
    }
  }


  showLoading(
    '저장된 작업을 불러오는 중입니다.'
  );


  try {

    const response =
      await callAppsScript({

        action:
          'loadProject',

        projectId
      });


    if (
      !response?.project
    ) {

      throw new Error(
        '프로젝트 데이터를 찾을 수 없습니다.'
      );
    }


    state =
      normalizeLoadedState(
        response.project
      );


    isDirty =
      false;


    applyStateToEditor();

    renderAll();

    fitPreviewToWindow();


    await saveLocalDraft();


    dom.cloudDialog.close();


    setSaveStatus(
      '클라우드 불러옴',
      'saved'
    );


    showToast(
      '저장된 작업을 불러왔습니다.',
      'success'
    );

  } catch (error) {

    showToast(
      error.message ||
      '프로젝트를 불러오지 못했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}


/* =========================================================
   클라우드 삭제
========================================================= */

async function deleteCloudProject(project) {

  const confirmed =
    await confirmAction(

      '프로젝트 삭제',

      `"${project.clubName || '이름 없는 동아리'}" 프로젝트를 삭제할까요? Drive의 편집 원본과 완성본도 휴지통으로 이동합니다.`
    );


  if (
    !confirmed
  ) {
    return;
  }


  showLoading(
    '프로젝트를 삭제하는 중입니다.'
  );


  try {

    await callAppsScript({

      action:
        'deleteProject',

      projectId:
        project.id
    });


    cachedProjects =
      cachedProjects.filter(
        item =>
          item.id !==
          project.id
      );


    if (
      state.id ===
      project.id
    ) {

      state =
        createEmptyState();


      isDirty =
        false;


      applyStateToEditor();

      renderAll();


      await saveLocalDraft();
    }


    renderCloudProjectList();


    showToast(
      '프로젝트를 삭제했습니다.',
      'success'
    );

  } catch (error) {

    showToast(
      error.message ||
      '프로젝트 삭제에 실패했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}


/* =========================================================
   새 작업
========================================================= */

async function handleNewProject() {

  if (
    isDirty
  ) {

    const confirmed =
      await confirmAction(

        '새로 만들기',

        '현재 수정 중인 내용이 있습니다. 저장하지 않고 새 작업을 시작할까요?'
      );


    if (
      !confirmed
    ) {
      return;
    }
  }


  state =
    createEmptyState();


  isDirty =
    false;


  applyStateToEditor();

  renderAll();

  fitPreviewToWindow();


  await clearLocalDraft();


  setSaveStatus(
    '새 작업',
    ''
  );


  showToast(
    '새 작업을 시작했습니다.',
    'success'
  );
}


/* =========================================================
   내용 초기화
========================================================= */

async function resetContentOnly() {

  const confirmed =
    await confirmAction(

      '내용 초기화',

      '동아리명, 담당교사, 활동 제목과 내용, 사진을 모두 비울까요? 레이아웃은 유지됩니다.'
    );


  if (
    !confirmed
  ) {
    return;
  }


  state.clubName =
    '';


  state.teacherName =
    '';


  state.activities =
    createDefaultActivities();


  state.photos =
    [];


  state.aiUndoSnapshot =
    null;


  applyStateToEditor();

  markDirty();

  renderAll();


  showToast(
    '입력 내용을 초기화했습니다.',
    'success'
  );
}


/* =========================================================
   미리보기 확대/축소
========================================================= */

function fitPreviewToWindow() {

  if (
    !dom.previewStage ||
    !dom.poster
  ) {
    return;
  }


  const stageRect =
    dom.previewStage
      .getBoundingClientRect();


  const pageWidth =
    dom.poster.offsetWidth;


  const pageHeight =
    dom.poster.offsetHeight;


  if (
    !pageWidth ||
    !pageHeight
  ) {
    return;
  }


  const availableWidth =
    Math.max(
      200,
      stageRect.width -
      44
    );


  const availableHeight =
    Math.max(
      300,
      stageRect.height -
      50
    );


  const fitted =
    Math.min(

      availableWidth /
      pageWidth,

      availableHeight /
      pageHeight
    );


  setPreviewZoom(

    clamp(

      Math.floor(
        fitted *
        20
      ) /
      20,

      APP_CONFIG
        .MIN_PREVIEW_ZOOM,

      0.8
    )
  );
}


function setPreviewZoom(value) {

  previewZoom =
    clamp(

      value,

      APP_CONFIG
        .MIN_PREVIEW_ZOOM,

      APP_CONFIG
        .MAX_PREVIEW_ZOOM
    );


  dom.poster.style.transform =
    `scale(${previewZoom})`;


  dom.posterWrapper.style.width =
    `${dom.poster.offsetWidth * previewZoom}px`;


  dom.posterWrapper.style.height =
    `${dom.poster.offsetHeight * previewZoom}px`;


  dom.zoomLabel.textContent =
    `${Math.round(previewZoom * 100)}%`;
}


/* =========================================================
   포스터 캡처
========================================================= */

async function capturePosterDataUrl(pixelRatio) {

  await loadExportLibraries(
    false
  );


  if (
    !window.htmlToImage?.toPng
  ) {

    throw new Error(
      '이미지 저장 라이브러리를 불러오지 못했습니다.'
    );
  }


  const previousEditing =
    state.layoutEditing;


  const previousSelected =
    state.selectedBlockId;


  dom.poster.classList.add(
    'is-exporting'
  );


  dom.poster.dataset.layoutEditing =
    'false';


  state.selectedBlockId =
    null;


  renderBlocks();


  try {

    await waitForImages(
      dom.poster
    );


    return await window
      .htmlToImage
      .toPng(

        dom.poster,

        {

          pixelRatio,

          cacheBust:
            true,

          backgroundColor:
            null,

          width:
            dom.poster.offsetWidth,

          height:
            dom.poster.offsetHeight,

          style: {

            transform:
              'none',

            transformOrigin:
              'top left'
          }
        }
      );

  } finally {

    dom.poster.classList.remove(
      'is-exporting'
    );


    dom.poster.dataset.layoutEditing =
      String(
        previousEditing
      );


    state.selectedBlockId =
      previousSelected;


    renderBlocks();
  }
}


/* =========================================================
   완성본 PNG / PDF
========================================================= */

async function downloadCompleteFiles() {

  showLoading(
    'PNG와 PDF 파일을 만드는 중입니다.'
  );


  try {

    await loadExportLibraries(
      true
    );


    const dataUrl =
      await capturePosterDataUrl(
        APP_CONFIG
          .DOWNLOAD_PIXEL_RATIO
      );


    const baseName =
      safeDownloadFileName(
        state.clubName ||
        '동아리_전시자료'
      );


    downloadDataUrl(
      dataUrl,
      `${baseName}.png`
    );


    const jsPDF =
      window.jspdf?.jsPDF;


    if (
      !jsPDF
    ) {

      throw new Error(
        'PDF 저장 라이브러리를 불러오지 못했습니다.'
      );
    }


    const pdf =
      new jsPDF({

        orientation:
          'portrait',

        unit:
          'mm',

        format:
          'a4',

        compress:
          true
      });


    pdf.addImage(

      dataUrl,

      'PNG',

      0,
      0,

      210,
      297,

      undefined,

      'FAST'
    );


    pdf.save(
      `${baseName}.pdf`
    );

  } finally {

    hideLoading();
  }
}


function downloadDataUrl(
  dataUrl,
  fileName
) {

  const link =
    document.createElement(
      'a'
    );


  link.href =
    dataUrl;


  link.download =
    fileName;


  document.body.appendChild(
    link
  );


  link.click();

  link.remove();
}


/* =========================================================
   외부 저장 라이브러리
========================================================= */

async function loadExportLibraries(
  includePdf
) {

  if (
    !window.htmlToImage
  ) {

    await loadScriptOnce(

      APP_CONFIG
        .HTML_TO_IMAGE_URL,

      'html-to-image'
    );
  }


  if (
    includePdf &&
    !window.jspdf?.jsPDF
  ) {

    await loadScriptOnce(

      APP_CONFIG
        .JSPDF_URL,

      'jspdf'
    );
  }
}


function loadScriptOnce(
  src,
  key
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const existing =
        document.querySelector(
          `script[data-dynamic-lib="${key}"]`
        );


      if (
        existing
      ) {

        if (
          existing.dataset.loaded ===
          'true'
        ) {

          resolve();

          return;
        }


        existing.addEventListener(
          'load',
          resolve,
          {
            once: true
          }
        );


        existing.addEventListener(
          'error',

          () => {

            reject(
              new Error(
                '외부 라이브러리를 불러오지 못했습니다.'
              )
            );
          },

          {
            once: true
          }
        );


        return;
      }


      const script =
        document.createElement(
          'script'
        );


      script.src =
        src;


      script.async =
        true;


      script.dataset.dynamicLib =
        key;


      script.addEventListener(
        'load',
        () => {

          script.dataset.loaded =
            'true';


          resolve();
        }
      );


      script.addEventListener(
        'error',
        () => {

          reject(
            new Error(
              '외부 라이브러리를 불러오지 못했습니다.'
            )
          );
        }
      );


      document.head.appendChild(
        script
      );
    }
  );
}


function waitForImages(root) {

  const images =
    Array.from(
      root.querySelectorAll(
        'img'
      )
    )
      .filter(
        image =>
          !image.hidden &&
          image.src
      );


  return Promise.all(

    images.map(
      image => {

        if (
          image.complete
        ) {

          return Promise.resolve();
        }


        return new Promise(
          resolve => {

            image.addEventListener(
              'load',
              resolve,
              {
                once: true
              }
            );


            image.addEventListener(
              'error',
              resolve,
              {
                once: true
              }
            );
          }
        );
      }
    )
  );
}


/* =========================================================
   Apps Script 통신
========================================================= */

async function callAppsScript(payload) {

  if (
    !isAppsScriptConfigured()
  ) {

    throw new Error(
      'script.js 상단의 APPS_SCRIPT_URL에 배포된 Apps Script 웹 앱 주소를 입력해 주세요.'
    );
  }


  let response;


  try {

    response =
      await fetch(

        APPS_SCRIPT_URL,

        {

          method:
            'POST',

          headers: {

            'Content-Type':
              'text/plain;charset=utf-8'
          },

          body:
            JSON.stringify(
              payload
            ),

          redirect:
            'follow'
        }
      );

  } catch (error) {

    throw new Error(
      'Apps Script 서버에 연결하지 못했습니다. 인터넷 연결과 웹 앱 배포 주소를 확인해 주세요.'
    );
  }


  let json;


  try {

    json =
      await response.json();

  } catch (error) {

    throw new Error(
      '서버 응답을 읽지 못했습니다. Apps Script 배포 설정을 확인해 주세요.'
    );
  }


  if (
    !json.ok
  ) {

    throw new Error(
      json.error ||
      '서버에서 오류가 발생했습니다.'
    );
  }


  return json.data;
}


function isAppsScriptConfigured() {

  return Boolean(

    APPS_SCRIPT_URL &&

    /^https:\/\/script\.google\.com\//i
      .test(
        APPS_SCRIPT_URL
      )
  );
}


/* =========================================================
   불러온 프로젝트 정규화
========================================================= */

function normalizeLoadedState(project) {

  const next =
    createEmptyState();


  next.id =
    project.id ||
    null;


  next.type =
    project.type ===
    'creative'
      ? 'creative'
      : 'autonomous';


  next.clubName =
    String(
      project.clubName ||
      ''
    );


  next.teacherName =
    String(
      project.teacherName ||
      ''
    );


  next.activities =
    normalizeActivities(
      project.activities
    );


  next.blocks =
    normalizeBlocks(
      project.blocks
    );


  next.photos =
    normalizePhotos(
      project.photos
    );


  next.status =
    project.status ||
    'draft';


  next.createdAt =
    project.createdAt ||
    null;


  next.updatedAt =
    project.updatedAt ||
    null;


  next.layoutEditing =
    false;


  next.selectedBlockId =
    null;


  next.aiUndoSnapshot =
    null;


  return next;
}


function normalizeActivities(activities) {

  const input =
    Array.isArray(
      activities
    )
      ? activities
      : [];


  const output =
    createDefaultActivities();


  input
    .slice(
      0,
      2
    )
    .forEach(
      (
        activity,
        index
      ) => {

        output[index] = {

          id:
            `activity_${index + 1}`,

          title:
            String(
              activity?.title ||
              ''
            ),

          content:
            String(
              activity?.content ||
              ''
            )
        };
      }
    );


  return output;
}


function normalizeBlocks(blocks) {

  if (
    !Array.isArray(
      blocks
    ) ||
    !blocks.length
  ) {

    return createDefaultBlocks();
  }


  const normalized =
    blocks
      .map(
        block => {

          if (
            !block?.id ||
            !block?.type
          ) {

            return null;
          }


          const output =
            cloneJson(
              block
            );


          output.id =
            String(
              output.id
            );


          output.type =
            String(
              output.type
            );


          output.x =
            clamp(
              Number(
                output.x ||
                1
              ),
              1,
              APP_CONFIG.GRID_COLUMNS
            );


          output.y =
            clamp(
              Number(
                output.y ||
                1
              ),
              1,
              APP_CONFIG.GRID_ROWS
            );


          output.w =
            clamp(
              Number(
                output.w ||
                4
              ),
              2,
              APP_CONFIG.GRID_COLUMNS
            );


          output.h =
            clamp(
              Number(
                output.h ||
                4
              ),
              2,
              18
            );


          output.w =
            Math.min(

              output.w,

              APP_CONFIG.GRID_COLUMNS -
              output.x +
              1
            );


          output.h =
            Math.min(

              output.h,

              APP_CONFIG.GRID_ROWS -
              output.y +
              1
            );


          output.z =
            Number(
              output.z ||
              1
            );


          output.locked =
            Boolean(
              output.locked
            );


          return output;
        }
      )
      .filter(
        Boolean
      );


  const defaults =
    createDefaultBlocks();


  defaults.forEach(
    defaultBlock => {

      const exists =
        normalized.some(
          block =>
            block.id ===
            defaultBlock.id
        );


      if (
        !exists
      ) {

        normalized.push(
          defaultBlock
        );
      }
    }
  );


  return normalized;
}


function normalizePhotos(photos) {

  if (
    !Array.isArray(
      photos
    )
  ) {

    return [];
  }


  return photos
    .filter(
      photo =>
        photo?.slotId
    )
    .map(
      photo => ({

        slotId:
          String(
            photo.slotId
          ),

        caption:
          String(
            photo.caption ||
            ''
          ),

        crop:
          normalizeCrop(
            photo.crop
          ),

        dataUrl:
          String(
            photo.dataUrl ||
            ''
          ),

        fileId:
          photo.fileId ||
          null,

        fileName:
          String(
            photo.fileName ||
            ''
          ),

        mimeType:
          String(
            photo.mimeType ||
            'image/jpeg'
          )
      })
    );
}


/* =========================================================
   변경 상태 / 자동 저장
========================================================= */

function markDirty() {

  isDirty =
    true;


  setSaveStatus(
    '변경사항 있음',
    'saving'
  );


  scheduleAutoSave();
}


function scheduleAutoSave() {

  clearTimeout(
    autoSaveTimer
  );


  autoSaveTimer =
    setTimeout(

      async () => {

        try {

          await saveLocalDraft();


          if (
            isDirty
          ) {

            setSaveStatus(
              '브라우저 임시저장',
              'saved'
            );
          }

        } catch (error) {

          console.warn(
            '브라우저 임시 저장 실패:',
            error
          );
        }
      },

      APP_CONFIG
        .AUTO_SAVE_DELAY
    );
}


/* =========================================================
   IndexedDB
========================================================= */

async function restoreLocalDraft() {

  try {

    const value =
      await idbGet(
        APP_CONFIG
          .LOCAL_DRAFT_KEY
      );


    return (
      value?.state ||
      null
    );

  } catch (error) {

    console.warn(
      '임시 저장 복구 실패:',
      error
    );


    return null;
  }
}


async function saveLocalDraft() {

  await idbSet(

    APP_CONFIG
      .LOCAL_DRAFT_KEY,

    {

      savedAt:
        Date.now(),

      state:
        cloneJson(
          state
        )
    }
  );
}


async function clearLocalDraft() {

  try {

    await idbDelete(
      APP_CONFIG
        .LOCAL_DRAFT_KEY
    );

  } catch (error) {

    console.warn(
      error
    );
  }
}


function openLocalDb() {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const request =
        indexedDB.open(

          APP_CONFIG
            .LOCAL_DB_NAME,

          APP_CONFIG
            .LOCAL_DB_VERSION
        );


      request.onupgradeneeded =
        () => {

          const db =
            request.result;


          if (
            !db.objectStoreNames.contains(
              APP_CONFIG
                .LOCAL_STORE_NAME
            )
          ) {

            db.createObjectStore(
              APP_CONFIG
                .LOCAL_STORE_NAME
            );
          }
        };


      request.onsuccess =
        () => {

          resolve(
            request.result
          );
        };


      request.onerror =
        () => {

          reject(
            request.error ||
            new Error(
              'IndexedDB를 열 수 없습니다.'
            )
          );
        };
    }
  );
}


async function idbGet(key) {

  const db =
    await openLocalDb();


  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(

          APP_CONFIG
            .LOCAL_STORE_NAME,

          'readonly'
        );


      const request =
        transaction
          .objectStore(
            APP_CONFIG
              .LOCAL_STORE_NAME
          )
          .get(
            key
          );


      request.onsuccess =
        () => {

          resolve(
            request.result ||
            null
          );
        };


      request.onerror =
        () => {

          reject(
            request.error
          );
        };


      transaction.oncomplete =
        () => {

          db.close();
        };
    }
  );
}


async function idbSet(
  key,
  value
) {

  const db =
    await openLocalDb();


  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(

          APP_CONFIG
            .LOCAL_STORE_NAME,

          'readwrite'
        );


      transaction
        .objectStore(
          APP_CONFIG
            .LOCAL_STORE_NAME
        )
        .put(
          value,
          key
        );


      transaction.oncomplete =
        () => {

          db.close();

          resolve();
        };


      transaction.onerror =
        () => {

          reject(
            transaction.error
          );
        };
    }
  );
}


async function idbDelete(key) {

  const db =
    await openLocalDb();


  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(

          APP_CONFIG
            .LOCAL_STORE_NAME,

          'readwrite'
        );


      transaction
        .objectStore(
          APP_CONFIG
            .LOCAL_STORE_NAME
        )
        .delete(
          key
        );


      transaction.oncomplete =
        () => {

          db.close();

          resolve();
        };


      transaction.onerror =
        () => {

          reject(
            transaction.error
          );
        };
    }
  );
}


/* =========================================================
   확인 Dialog
========================================================= */

function confirmAction(
  title,
  message
) {

  return new Promise(
    resolve => {

      if (
        confirmResolver
      ) {

        confirmResolver(
          false
        );
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

    resolver(
      value
    );
  }
}


/* =========================================================
   Toast
========================================================= */

function showToast(
  message,
  type
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
    type ===
    'success'
  ) {

    dom.toast.classList.add(
      'is-success'
    );
  }


  if (
    type ===
    'error'
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
      3600
    );
}


/* =========================================================
   Loading
========================================================= */

function showLoading(message) {

  dom.loadingMessage.textContent =
    message ||
    '처리 중입니다.';


  dom.loadingOverlay.hidden =
    false;
}


function hideLoading() {

  dom.loadingOverlay.hidden =
    true;
}


/* =========================================================
   저장 상태
========================================================= */

function setSaveStatus(
  text,
  type
) {

  dom.saveStatus.textContent =
    text;


  dom.saveStatus.className =
    'save-status';


  if (
    type ===
    'saving'
  ) {

    dom.saveStatus.classList.add(
      'is-saving'
    );
  }


  if (
    type ===
    'saved'
  ) {

    dom.saveStatus.classList.add(
      'is-saved'
    );
  }


  if (
    type ===
    'error'
  ) {

    dom.saveStatus.classList.add(
      'is-error'
    );
  }
}


/* =========================================================
   활동 찾기
========================================================= */

function getActivity(activityId) {

  return (
    state.activities.find(
      activity =>
        activity.id ===
        activityId
    ) ||
    null
  );
}


function getActivityIndex(activityId) {

  const index =
    state.activities.findIndex(
      activity =>
        activity.id ===
        activityId
    );


  return (
    index >= 0
      ? index
      : 0
  );
}


/* =========================================================
   공통 유틸
========================================================= */

function $(
  selector,
  root = document
) {

  return root.querySelector(
    selector
  );
}


function $$(
  selector,
  root = document
) {

  return Array.from(
    root.querySelectorAll(
      selector
    )
  );
}


function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


function normalizeCrop(crop) {

  return {

    x:
      clamp(
        Number(
          crop?.x ??
          50
        ),
        0,
        100
      ),

    y:
      clamp(
        Number(
          crop?.y ??
          50
        ),
        0,
        100
      ),

    scale:
      clamp(
        Number(
          crop?.scale ??
          1
        ),
        1,
        4
      )
  };
}


function cloneJson(value) {

  return JSON.parse(
    JSON.stringify(
      value
    )
  );
}


function createClientId(prefix) {

  const random =
    Math.random()
      .toString(36)
      .slice(
        2,
        9
      );


  return (

    `${prefix}_` +

    `${Date.now().toString(36)}_` +

    random

  ).slice(
    0,
    60
  );
}


function safeDownloadFileName(value) {

  return (

    String(
      value ||
      '동아리_전시자료'
    )
      .replace(
        /[\\/:*?"<>|\r\n]+/g,
        '_'
      )
      .trim() ||

    '동아리_전시자료'
  );
}


function formatDateTime(value) {

  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '';
  }


  return date.toLocaleString(
    'ko-KR',
    {

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',

      hour:
        '2-digit',

      minute:
        '2-digit'
    }
  );
}


function debounce(
  callback,
  delay
) {

  let timer;


  return function (
    ...args
  ) {

    clearTimeout(
      timer
    );


    timer =
      setTimeout(
        () => {

          callback(
            ...args
          );
        },
        delay
      );
  };
}


function cssEscape(value) {

  if (
    window.CSS &&
    typeof window.CSS.escape ===
    'function'
  ) {

    return window.CSS.escape(
      String(
        value
      )
    );
  }


  return String(
    value
  ).replace(
    /["\\]/g,
    '\\$&'
  );
}
