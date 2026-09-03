'use strict';

/**
 * 동아리 전시자료 제작 웹앱
 * ------------------------------------------------------------
 * 사용 전 반드시 아래 APPS_SCRIPT_URL에 배포된 Apps Script 웹 앱 주소를 입력한다.
 *
 * 예:
 * const APPS_SCRIPT_URL =
 *   'https://script.google.com/macros/s/배포ID/exec';
 *
 * 이 파일은 GitHub Pages의 index.html / style.css와 같은 폴더에 둔다.
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5FpPe6BD8ikxSgIK2r5AQ9vkmh-np5WJshqNA4JlHVgCJENSFkA4oemhLkFnOMtk4/exec';

const APP_CONFIG = Object.freeze({
  TARGET_ACTIVITY_LENGTH: 400,
  MAX_PHOTOS: 4,
  IMAGE_MAX_DIMENSION: 1800,
  IMAGE_JPEG_QUALITY: 0.86,
  MAX_FRONTEND_IMAGE_BYTES: 7.5 * 1024 * 1024,
  CLOUD_PREVIEW_PIXEL_RATIO: 2,
  EXPORT_PIXEL_RATIO: 3,
  LOCAL_SAVE_DELAY: 700,
  LOCAL_DB_NAME: 'club-exhibition-editor',
  LOCAL_DB_STORE: 'drafts',
  LOCAL_DB_KEY: 'current-draft',

  HTML_TO_IMAGE_URL:
    'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',

  JSPDF_URL:
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js'
});

const EMPTY_PHOTO = index => ({
  slotId: `photo_${index + 1}`,
  dataUrl: '',
  fileId: '',
  fileName: '',
  mimeType: '',
  caption: '',
  crop: {
    x: 50,
    y: 50,
    scale: 1
  },
  imageDirty: false
});

const createEmptyState = () => ({
  id: null,
  createdAt: null,
  updatedAt: null,
  type: 'autonomous',
  clubName: '',
  teacherName: '',
  title: '',
  activityText: '',
  photoLayout: 2,
  status: 'draft',

  photos: Array.from(
    { length: APP_CONFIG.MAX_PHOTOS },
    (_, index) => EMPTY_PHOTO(index)
  )
});

let state = createEmptyState();

let localSaveTimer = null;
let currentPhotoTargetIndex = 0;

let currentCropIndex = null;
let cropWorking = null;
let cropDrag = null;

let toastTimer = null;
let confirmResolver = null;

let previewZoom = 1;
let uiInitialized = false;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const elements = {};

document.addEventListener('DOMContentLoaded', init);



/* ============================================================
   초기화
============================================================ */

async function init() {
  cacheElements();
  bindEvents();

  clearPreviewPlaceholderText();
  renderAll();

  /*
   * PNG/PDF 저장 라이브러리는 화면을 연 직후 미리 불러온다.
   * 실패하더라도 편집 기능 자체에는 영향을 주지 않는다.
   */
  loadExportLibraries().catch(error => {
    console.warn(
      '내보내기 라이브러리 사전 로드 실패:',
      error
    );
  });

  /*
   * 브라우저에 이전 작성 내용이 남아 있으면 복원한다.
   */
  try {
    const localState = await loadLocalDraft();

    if (
      localState &&
      hasMeaningfulContent(localState)
    ) {
      state = normalizeState(localState);

      renderAll();

      setSaveStatus(
        '브라우저 자동저장본'
      );

      showToast(
        '이 브라우저에 자동 저장된 작업을 불러왔습니다.'
      );
    }
  } catch (error) {
    console.warn(
      '로컬 자동저장 불러오기 실패:',
      error
    );
  }

  /*
   * 첫 화면에서는 A4가 화면 안에 적당히 들어오도록 축소한다.
   */
  requestAnimationFrame(() => {
    fitPreviewToWindow();

    uiInitialized = true;
  });
}



/* ============================================================
   DOM 요소 저장
============================================================ */

function cacheElements() {
  Object.assign(
    elements,
    {
      poster:
        $('#poster-canvas'),

      paperStage:
        $('.paper-stage'),

      saveStatus:
        $('#save-status'),

      zoomLabel:
        $('#zoom-label'),

      previewClubName:
        $('#preview-club-name'),

      previewClubType:
        $('#preview-club-type'),

      previewTeacher:
        $('#preview-teacher'),

      previewTitle:
        $('#preview-title'),

      previewActivity:
        $('#preview-activity'),

      inputClubName:
        $('#input-club-name'),

      inputTeacher:
        $('#input-teacher'),

      inputTitle:
        $('#input-title'),

      inputActivity:
        $('#input-activity'),

      activityCount:
        $('#activity-count'),

      photoGrid:
        $('#photo-grid'),

      photoCards:
        $$('.photo-card'),

      photoEditorList:
        $('#photo-editor-list'),

      photoFileInput:
        $('#photo-file-input'),

      cloudDialog:
        $('#cloud-dialog'),

      cloudProjectList:
        $('#cloud-project-list'),

      photoCropDialog:
        $('#photo-crop-dialog'),

      cropFrame:
        $('#crop-frame'),

      cropImage:
        $('#crop-image'),

      cropZoom:
        $('#crop-zoom'),

      confirmDialog:
        $('#confirm-dialog'),

      confirmTitle:
        $('#confirm-title'),

      confirmMessage:
        $('#confirm-message'),

      toast:
        $('#toast'),

      loadingOverlay:
        $('#loading-overlay'),

      loadingMessage:
        $('#loading-message')
    }
  );
}



/* ============================================================
   이벤트 연결
============================================================ */

function bindEvents() {

  /* ----------------------------
     상단 메뉴
  ---------------------------- */

  $('#btn-new')
    .addEventListener(
      'click',
      handleNewProject
    );

  $('#btn-load-cloud')
    .addEventListener(
      'click',
      openCloudDialog
    );

  $('#btn-load-example')
    .addEventListener(
      'click',
      loadExample
    );

  $('#btn-save-draft')
    .addEventListener(
      'click',
      () => saveProject(false)
    );

  $('#btn-save-complete')
    .addEventListener(
      'click',
      () => saveProject(true)
    );

  $('#btn-export-png')
    .addEventListener(
      'click',
      exportPng
    );

  $('#btn-export-pdf')
    .addEventListener(
      'click',
      exportPdf
    );


  /* ----------------------------
     미리보기 확대 / 축소
  ---------------------------- */

  $('#btn-zoom-out')
    .addEventListener(
      'click',
      () => changeZoom(-0.1)
    );

  $('#btn-zoom-in')
    .addEventListener(
      'click',
      () => changeZoom(0.1)
    );


  /* ----------------------------
     기본 입력
  ---------------------------- */

  elements.inputClubName
    .addEventListener(
      'input',
      event => {

        state.clubName =
          event.target.value;

        renderTextPreview();

        markChanged();
      }
    );


  elements.inputTeacher
    .addEventListener(
      'input',
      event => {

        state.teacherName =
          event.target.value;

        renderTextPreview();

        markChanged();
      }
    );


  elements.inputTitle
    .addEventListener(
      'input',
      event => {

        state.title =
          event.target.value;

        renderTextPreview();

        markChanged();
      }
    );


  elements.inputActivity
    .addEventListener(
      'input',
      event => {

        state.activityText =
          event.target.value;

        renderTextPreview();

        markChanged();
      }
    );


  /* ----------------------------
     동아리 종류
  ---------------------------- */

  $$(
    'input[name="clubType"]'
  )
    .forEach(
      input => {

        input.addEventListener(
          'change',
          event => {

            if (
              !event.target.checked
            ) {
              return;
            }

            /*
             * 이미 클라우드에 저장한 프로젝트는
             * 종류 변경을 막는다.
             *
             * GS에서도 같은 검증을 한다.
             */
            if (
              state.id &&
              state.type !== event.target.value
            ) {

              showToast(
                '클라우드에 저장된 프로젝트는 동아리 종류를 바꿀 수 없습니다. 새 프로젝트에서 변경해 주세요.',
                'error'
              );

              renderClubType();

              return;
            }

            state.type =
              event.target.value;

            renderClubType();

            markChanged();
          }
        );
      }
    );


  /* ----------------------------
     사진 레이아웃
  ---------------------------- */

  $$(
    'input[name="photoLayout"]'
  )
    .forEach(
      input => {

        input.addEventListener(
          'change',
          event => {

            if (
              !event.target.checked
            ) {
              return;
            }

            state.photoLayout =
              Number(
                event.target.value
              );

            renderPhotos();

            markChanged();
          }
        );
      }
    );


  /* ----------------------------
     AI
  ---------------------------- */

  $('#btn-ai-improve')
    .addEventListener(
      'click',
      improveActivityText
    );


  /* ----------------------------
     전체 초기화
  ---------------------------- */

  $('#btn-reset')
    .addEventListener(
      'click',
      handleReset
    );


  /* ----------------------------
     출력물에서 직접 글 수정
  ---------------------------- */

  bindDirectEditing();


  /* ----------------------------
     사진 파일 선택
  ---------------------------- */

  elements.photoFileInput
    .addEventListener(
      'change',
      handlePhotoFilesSelected
    );


  /* ----------------------------
     사진 슬롯 이벤트
  ---------------------------- */

  elements.photoCards
    .forEach(
      (card, index) => {

        const frame =
          card.querySelector(
            '.photo-frame'
          );

        const placeholder =
          card.querySelector(
            '.photo-placeholder'
          );

        const caption =
          card.querySelector(
            '.photo-caption'
          );


        /*
         * 빈 사진 영역 클릭
         */
        placeholder
          .addEventListener(
            'click',
            () => openPhotoPicker(index)
          );


        /*
         * 사진 더블클릭 → 위치 조정
         */
        frame
          .addEventListener(
            'dblclick',
            event => {

              if (
                state.photos[index].dataUrl
              ) {

                event.preventDefault();

                openPhotoCropDialog(
                  index
                );
              }
            }
          );


        /*
         * 드래그 앤 드롭
         */
        frame
          .addEventListener(
            'dragover',
            event => {

              event.preventDefault();

              frame.classList.add(
                'is-dragover'
              );
            }
          );


        frame
          .addEventListener(
            'dragleave',
            () => {

              frame.classList.remove(
                'is-dragover'
              );
            }
          );


        frame
          .addEventListener(
            'drop',
            async event => {

              event.preventDefault();

              frame.classList.remove(
                'is-dragover'
              );

              const files = [
                ...(
                  event.dataTransfer.files ||
                  []
                )
              ]
                .filter(
                  isSupportedImage
                );


              if (
                !files.length
              ) {

                showToast(
                  'JPG, PNG, WEBP 사진 파일을 넣어 주세요.',
                  'error'
                );

                return;
              }


              await assignFilesFromIndex(
                files,
                index
              );
            }
          );


        /*
         * 사진 설명 직접 수정
         */
        caption
          .addEventListener(
            'input',
            event => {

              state.photos[index].caption =
                editableText(
                  event.currentTarget
                );

              syncPhotoEditorCaption(
                index
              );

              markChanged();
            }
          );
      }
    );


  /* ----------------------------
     클라우드 dialog
  ---------------------------- */

  $('#btn-close-cloud-dialog')
    .addEventListener(
      'click',
      () => {

        elements.cloudDialog.close();
      }
    );


  $$('.filter-chip')
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            $$('.filter-chip')
              .forEach(
                item => {

                  item.classList.remove(
                    'is-active'
                  );
                }
              );


            button.classList.add(
              'is-active'
            );


            filterCloudProjects(
              button.dataset.projectFilter
            );
          }
        );
      }
    );


  /* ----------------------------
     사진 위치 조정 dialog
  ---------------------------- */

  $('#btn-close-photo-dialog')
    .addEventListener(
      'click',
      closePhotoCropDialog
    );

  $('#btn-crop-cancel')
    .addEventListener(
      'click',
      closePhotoCropDialog
    );

  $('#btn-crop-apply')
    .addEventListener(
      'click',
      applyPhotoCrop
    );


  elements.cropZoom
    .addEventListener(
      'input',
      event => {

        if (
          !cropWorking
        ) {
          return;
        }

        cropWorking.scale =
          clamp(
            Number(
              event.target.value
            ),
            1,
            3
          );

        renderCropImage();
      }
    );


  elements.cropFrame
    .addEventListener(
      'pointerdown',
      startCropDrag
    );


  window.addEventListener(
    'pointermove',
    moveCropDrag
  );


  window.addEventListener(
    'pointerup',
    endCropDrag
  );


  /* ----------------------------
     확인 dialog
  ---------------------------- */

  $('#btn-confirm-cancel')
    .addEventListener(
      'click',
      () => resolveConfirm(false)
    );


  $('#btn-confirm-ok')
    .addEventListener(
      'click',
      () => resolveConfirm(true)
    );


  elements.confirmDialog
    .addEventListener(
      'cancel',
      event => {

        event.preventDefault();

        resolveConfirm(false);
      }
    );


  /* ----------------------------
     창 크기 변경
  ---------------------------- */

  window.addEventListener(
    'resize',
    debounce(
      () => {

        if (
          previewZoom > 1
        ) {
          return;
        }

        fitPreviewToWindow(false);
      },
      180
    )
  );
}



/* ============================================================
   출력물 직접 편집
============================================================ */

function bindDirectEditing() {

  const directFields = [

    [
      elements.previewClubName,
      'clubName',
      elements.inputClubName,
      false
    ],

    [
      elements.previewTeacher,
      'teacherName',
      elements.inputTeacher,
      false
    ],

    [
      elements.previewTitle,
      'title',
      elements.inputTitle,
      false
    ],

    [
      elements.previewActivity,
      'activityText',
      elements.inputActivity,
      true
    ]
  ];


  directFields.forEach(
    (
      [
        editable,
        key,
        input,
        multiline
      ]
    ) => {

      editable
        .addEventListener(
          'input',
          () => {

            const value =
              editableText(
                editable
              );

            state[key] =
              value;

            input.value =
              value;


            if (
              key === 'activityText'
            ) {

              updateActivityCount();

              fitActivityText();
            }


            markChanged();
          }
        );


      /*
       * 한 줄 입력란에서 Enter로 줄바꿈하지 못하게 함.
       */
      if (
        !multiline
      ) {

        editable
          .addEventListener(
            'keydown',
            event => {

              if (
                event.key === 'Enter'
              ) {

                event.preventDefault();

                editable.blur();
              }
            }
          );
      }


      /*
       * 서식이 들어있는 문장을 붙여넣더라도
       * 텍스트만 붙인다.
       */
      editable
        .addEventListener(
          'paste',
          event => {

            event.preventDefault();

            const text =
              event.clipboardData
                .getData(
                  'text/plain'
                );

            document.execCommand(
              'insertText',
              false,
              text
            );
          }
        );
    }
  );
}



/* ============================================================
   상태 렌더링
============================================================ */

function renderAll() {

  renderClubType();

  renderTextPreview();

  renderPhotos();


  elements.inputClubName.value =
    state.clubName || '';

  elements.inputTeacher.value =
    state.teacherName || '';

  elements.inputTitle.value =
    state.title || '';

  elements.inputActivity.value =
    state.activityText || '';


  const layoutInput =
    $(
      `input[name="photoLayout"][value="${Number(state.photoLayout) || 2}"]`
    );


  if (
    layoutInput
  ) {
    layoutInput.checked =
      true;
  }


  updateActivityCount();

  fitActivityText();
}



function renderClubType() {

  const type =
    state.type === 'creative'
      ? 'creative'
      : 'autonomous';


  state.type =
    type;


  const input =
    $(
      `input[name="clubType"][value="${type}"]`
    );


  if (
    input
  ) {
    input.checked =
      true;
  }


  elements.poster.dataset.clubType =
    type;


  elements.previewClubType.textContent =
    type === 'creative'
      ? '창체동아리'
      : '자율동아리';
}



function renderTextPreview() {

  setEditableText(
    elements.previewClubName,
    state.clubName
  );


  setEditableText(
    elements.previewTeacher,
    state.teacherName
  );


  setEditableText(
    elements.previewTitle,
    state.title
  );


  setEditableText(
    elements.previewActivity,
    state.activityText
  );


  updateActivityCount();


  requestAnimationFrame(
    fitActivityText
  );
}



function renderPhotos() {

  const layout =
    clamp(
      Math.round(
        Number(
          state.photoLayout
        ) || 2
      ),
      1,
      4
    );


  state.photoLayout =
    layout;


  elements.photoGrid.dataset.layout =
    String(layout);


  state.photos =
    normalizePhotos(
      state.photos
    );


  elements.photoCards
    .forEach(
      (card, index) => {

        const photo =
          state.photos[index];


        const img =
          card.querySelector(
            '.photo-image'
          );


        const placeholder =
          card.querySelector(
            '.photo-placeholder'
          );


        const caption =
          card.querySelector(
            '.photo-caption'
          );


        if (
          photo.dataUrl
        ) {

          img.src =
            photo.dataUrl;

          img.hidden =
            false;

          placeholder.hidden =
            true;


          applyPhotoCropStyle(
            img,
            photo.crop
          );

        } else {

          img.removeAttribute(
            'src'
          );

          img.hidden =
            true;

          placeholder.hidden =
            false;


          resetPhotoImageStyle(
            img
          );
        }


        setEditableText(
          caption,
          photo.caption
        );
      }
    );


  renderPhotoEditorList();
}



function renderPhotoEditorList() {

  const visibleCount =
    state.photoLayout;


  elements.photoEditorList
    .replaceChildren();


  for (
    let index = 0;
    index < visibleCount;
    index += 1
  ) {

    const photo =
      state.photos[index];


    const item =
      document.createElement(
        'div'
      );


    item.className =
      'photo-editor-item';


    const thumb =
      document.createElement(
        'div'
      );


    thumb.className =
      'photo-editor-item__thumb';


    if (
      photo.dataUrl
    ) {

      const img =
        document.createElement(
          'img'
        );


      img.src =
        photo.dataUrl;


      img.alt =
        `${index + 1}번 사진 미리보기`;


      applyPhotoCropStyle(
        img,
        photo.crop
      );


      thumb.append(
        img
      );
    }


    const body =
      document.createElement(
        'div'
      );


    body.className =
      'photo-editor-item__body';


    const title =
      document.createElement(
        'p'
      );


    title.className =
      'photo-editor-item__title';


    title.textContent =
      `${index + 1}번 사진`;


    const captionInput =
      document.createElement(
        'input'
      );


    captionInput.type =
      'text';


    captionInput.maxLength =
      300;


    captionInput.placeholder =
      '사진 설명';


    captionInput.value =
      photo.caption || '';


    captionInput.dataset.photoCaptionInput =
      String(index);


    Object.assign(
      captionInput.style,
      {
        width:
          '100%',

        height:
          '32px',

        marginBottom:
          '7px',

        padding:
          '0 8px',

        border:
          '1px solid #d9dde3',

        borderRadius:
          '6px',

        background:
          '#fff'
      }
    );


    captionInput
      .addEventListener(
        'input',
        event => {

          state.photos[index].caption =
            event.target.value;


          const directCaption =
            elements.photoCards[index]
              .querySelector(
                '.photo-caption'
              );


          setEditableText(
            directCaption,
            event.target.value
          );


          markChanged();
        }
      );


    const actions =
      document.createElement(
        'div'
      );


    actions.className =
      'photo-editor-item__actions';


    const addButton =
      makeSmallButton(
        photo.dataUrl
          ? '사진 변경'
          : '사진 추가'
      );


    addButton
      .addEventListener(
        'click',
        () => openPhotoPicker(index)
      );


    actions.append(
      addButton
    );


    if (
      photo.dataUrl
    ) {

      const cropButton =
        makeSmallButton(
          '위치 조정'
        );


      cropButton
        .addEventListener(
          'click',
          () =>
            openPhotoCropDialog(
              index
            )
        );


      const removeButton =
        makeSmallButton(
          '삭제',
          true
        );


      removeButton
        .addEventListener(
          'click',
          () =>
            removePhoto(
              index
            )
        );


      actions.append(
        cropButton,
        removeButton
      );
    }


    body.append(
      title,
      captionInput,
      actions
    );


    item.append(
      thumb,
      body
    );


    elements.photoEditorList
      .append(
        item
      );
  }
}



function makeSmallButton(
  text,
  danger = false
) {

  const button =
    document.createElement(
      'button'
    );


  button.type =
    'button';


  button.className =
    danger
      ? 'btn btn--danger'
      : 'btn btn--ghost';


  button.textContent =
    text;


  return button;
}



function syncPhotoEditorCaption(
  index
) {

  const input =
    $(
      `[data-photo-caption-input="${index}"]`
    );


  if (
    input
  ) {

    input.value =
      state.photos[index].caption ||
      '';
  }
}



function updateActivityCount() {

  const count =
    (
      state.activityText ||
      ''
    ).length;


  elements.activityCount.textContent =
    `${count.toLocaleString('ko-KR')}자`;
}



function fitActivityText() {

  const el =
    elements.previewActivity;


  if (
    !el
  ) {
    return;
  }


  let size =
    14;


  el.style.fontSize =
    `${size}px`;


  while (
    el.scrollHeight >
      el.clientHeight + 2 &&
    size > 11.5
  ) {

    size -= 0.5;


    el.style.fontSize =
      `${size}px`;
  }
}



/* ============================================================
   사진 선택 / 압축
============================================================ */

function openPhotoPicker(
  index
) {

  currentPhotoTargetIndex =
    index;


  elements.photoFileInput.value =
    '';


  elements.photoFileInput.click();
}



async function handlePhotoFilesSelected(
  event
) {

  const files =
    [
      ...event.target.files
    ]
      .filter(
        isSupportedImage
      );


  if (
    !files.length
  ) {
    return;
  }


  await assignFilesFromIndex(
    files,
    currentPhotoTargetIndex
  );
}



async function assignFilesFromIndex(
  files,
  startIndex
) {

  const available =
    APP_CONFIG.MAX_PHOTOS -
    startIndex;


  const selected =
    files.slice(
      0,
      available
    );


  showLoading(
    '사진을 준비하고 있습니다.'
  );


  try {

    for (
      let offset = 0;
      offset < selected.length;
      offset += 1
    ) {

      const index =
        startIndex +
        offset;


      const processed =
        await resizeImageFile(
          selected[offset]
        );


      state.photos[index] = {
        ...state.photos[index],

        dataUrl:
          processed.dataUrl,

        fileId:
          '',

        fileName:
          selected[offset].name,

        mimeType:
          processed.mimeType,

        crop: {
          x: 50,
          y: 50,
          scale: 1
        },

        imageDirty:
          true
      };
    }


    const neededLayout =
      Math.min(
        APP_CONFIG.MAX_PHOTOS,

        Math.max(
          state.photoLayout,
          startIndex +
            selected.length
        )
      );


    state.photoLayout =
      neededLayout;


    renderPhotos();


    const radio =
      $(
        `input[name="photoLayout"][value="${neededLayout}"]`
      );


    if (
      radio
    ) {
      radio.checked =
        true;
    }


    markChanged();

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



function isSupportedImage(
  file
) {

  return [
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
    .includes(
      file.type
    );
}



async function resizeImageFile(
  file
) {

  if (
    !isSupportedImage(
      file
    )
  ) {

    throw new Error(
      'JPG, PNG, WEBP 파일만 사용할 수 있습니다.'
    );
  }


  const objectUrl =
    URL.createObjectURL(
      file
    );


  try {

    const image =
      await loadImage(
        objectUrl
      );


    const maxDimension =
      APP_CONFIG.IMAGE_MAX_DIMENSION;


    const ratio =
      Math.min(
        1,

        maxDimension /
          Math.max(
            image.naturalWidth,
            image.naturalHeight
          )
      );


    const width =
      Math.max(
        1,

        Math.round(
          image.naturalWidth *
            ratio
        )
      );


    const height =
      Math.max(
        1,

        Math.round(
          image.naturalHeight *
            ratio
        )
      );


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
        '2d',
        {
          alpha: false
        }
      );


    context.fillStyle =
      '#ffffff';


    context.fillRect(
      0,
      0,
      width,
      height
    );


    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );


    /*
     * 학교 활동 사진은 투명 배경이 필요하지 않기 때문에
     * JPEG로 변환하여 파일 크기를 줄인다.
     */
    const blob =
      await canvasToBlob(
        canvas,
        'image/jpeg',
        APP_CONFIG.IMAGE_JPEG_QUALITY
      );


    if (
      !blob
    ) {

      throw new Error(
        '사진 변환에 실패했습니다.'
      );
    }


    if (
      blob.size >
      APP_CONFIG.MAX_FRONTEND_IMAGE_BYTES
    ) {

      throw new Error(
        '사진 용량이 너무 큽니다. 더 작은 사진을 사용해 주세요.'
      );
    }


    return {
      dataUrl:
        await blobToDataUrl(
          blob
        ),

      mimeType:
        'image/jpeg'
    };

  } finally {

    URL.revokeObjectURL(
      objectUrl
    );
  }
}



/* ============================================================
   사진 삭제
============================================================ */

function removePhoto(
  index
) {

  const current =
    state.photos[index];


  state.photos[index] = {
    ...EMPTY_PHOTO(
      index
    ),

    caption:
      current.caption ||
      ''
  };


  renderPhotos();

  markChanged();
}



/* ============================================================
   사진 위치 조정
============================================================ */

function openPhotoCropDialog(
  index
) {

  const photo =
    state.photos[index];


  if (
    !photo ||
    !photo.dataUrl
  ) {
    return;
  }


  currentCropIndex =
    index;


  cropWorking = {

    x:
      finiteNumber(
        photo.crop?.x,
        50
      ),

    y:
      finiteNumber(
        photo.crop?.y,
        50
      ),

    scale:
      clamp(
        finiteNumber(
          photo.crop?.scale,
          1
        ),
        1,
        3
      )
  };


  elements.cropImage.src =
    photo.dataUrl;


  elements.cropZoom.value =
    String(
      cropWorking.scale
    );


  renderCropImage();


  if (
    !elements.photoCropDialog.open
  ) {

    elements.photoCropDialog.showModal();
  }
}



function closePhotoCropDialog() {

  currentCropIndex =
    null;


  cropWorking =
    null;


  cropDrag =
    null;


  if (
    elements.photoCropDialog.open
  ) {

    elements.photoCropDialog.close();
  }
}



function applyPhotoCrop() {

  if (
    currentCropIndex === null ||
    !cropWorking
  ) {
    return;
  }


  state.photos[
    currentCropIndex
  ].crop = {
    ...cropWorking
  };


  renderPhotos();

  markChanged();

  closePhotoCropDialog();
}



function renderCropImage() {

  if (
    !cropWorking
  ) {
    return;
  }


  Object.assign(
    elements.cropImage.style,
    {
      width:
        '100%',

      height:
        '100%',

      objectFit:
        'cover',

      objectPosition:
        `${cropWorking.x}% ${cropWorking.y}%`,

      transform:
        `scale(${cropWorking.scale})`,

      transformOrigin:
        `${cropWorking.x}% ${cropWorking.y}%`
    }
  );
}



function startCropDrag(
  event
) {

  if (
    !cropWorking
  ) {
    return;
  }


  cropDrag = {

    pointerId:
      event.pointerId,

    startClientX:
      event.clientX,

    startClientY:
      event.clientY,

    startX:
      cropWorking.x,

    startY:
      cropWorking.y
  };


  elements.cropFrame
    .setPointerCapture?.(
      event.pointerId
    );
}



function moveCropDrag(
  event
) {

  if (
    !cropDrag ||
    !cropWorking
  ) {
    return;
  }


  if (
    event.pointerId !==
    cropDrag.pointerId
  ) {
    return;
  }


  const rect =
    elements.cropFrame
      .getBoundingClientRect();


  const dx =
    (
      (
        event.clientX -
        cropDrag.startClientX
      ) /
      rect.width
    ) *
    100;


  const dy =
    (
      (
        event.clientY -
        cropDrag.startClientY
      ) /
      rect.height
    ) *
    100;


  cropWorking.x =
    clamp(
      cropDrag.startX -
        dx,
      0,
      100
    );


  cropWorking.y =
    clamp(
      cropDrag.startY -
        dy,
      0,
      100
    );


  renderCropImage();
}



function endCropDrag(
  event
) {

  if (
    !cropDrag
  ) {
    return;
  }


  if (
    event.pointerId !==
    cropDrag.pointerId
  ) {
    return;
  }


  cropDrag =
    null;
}



function applyPhotoCropStyle(
  img,
  crop
) {

  const normalized =
    normalizeCrop(
      crop
    );


  Object.assign(
    img.style,
    {
      objectFit:
        'cover',

      objectPosition:
        `${normalized.x}% ${normalized.y}%`,

      transform:
        `scale(${normalized.scale})`,

      transformOrigin:
        `${normalized.x}% ${normalized.y}%`
    }
  );
}



function resetPhotoImageStyle(
  img
) {

  Object.assign(
    img.style,
    {
      objectPosition:
        '50% 50%',

      transform:
        'none',

      transformOrigin:
        '50% 50%'
    }
  );
}



/* ============================================================
   AI 활동 내용 다듬기
============================================================ */

async function improveActivityText() {

  const text =
    (
      state.activityText ||
      ''
    ).trim();


  if (
    !text
  ) {

    showToast(
      '먼저 주요 활동 내용을 입력해 주세요.',
      'error'
    );


    elements.inputActivity
      .focus();


    return;
  }


  if (
    !isAppsScriptConfigured()
  ) {

    showAppsScriptUrlError();

    return;
  }


  showLoading(
    'AI가 활동 내용을 다듬고 있습니다.'
  );


  try {

    const data =
      await callAppsScript({
        action:
          'improveActivityText',

        activityText:
          text,

        clubName:
          state.clubName,

        clubType:
          state.type,

        targetLength:
          APP_CONFIG.TARGET_ACTIVITY_LENGTH
      });


    state.activityText =
      data.text ||
      text;


    elements.inputActivity.value =
      state.activityText;


    renderTextPreview();

    markChanged();


    const cachedText =
      data.cached
        ? ' · 이전 결과 사용'
        : '';


    showToast(
      `${data.modeLabel || 'AI 다듬기'} 완료 (${data.resultLength || state.activityText.length}자${cachedText})`,
      'success'
    );

  } catch (error) {

    showToast(
      error.message ||
        'AI 요청에 실패했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}



/* ============================================================
   클라우드 저장
============================================================ */

async function saveProject(
  finalize
) {

  if (
    !isAppsScriptConfigured()
  ) {

    showAppsScriptUrlError();

    return;
  }


  const clubName =
    (
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


    elements.inputClubName
      .focus();


    return;
  }


  /*
   * 완성본 저장 시에는
   * 최소한 제목과 활동 내용이 있어야 한다.
   */
  if (
    finalize
  ) {

    if (
      !(
        state.title ||
        ''
      ).trim()
    ) {

      showToast(
        '완성본 저장 전 활동 제목을 입력해 주세요.',
        'error'
      );


      elements.inputTitle
        .focus();


      return;
    }


    if (
      !(
        state.activityText ||
        ''
      ).trim()
    ) {

      showToast(
        '완성본 저장 전 주요 활동 내용을 입력해 주세요.',
        'error'
      );


      elements.inputActivity
        .focus();


      return;
    }
  }


  const loadingText =
    finalize
      ? '완성본을 저장하고 있습니다.'
      : '작성 중인 작업을 저장하고 있습니다.';


  showLoading(
    loadingText
  );


  setSaveStatus(
    '저장 중…',
    'saving'
  );


  try {

    /*
     * Drive에서 목록 확인용 미리보기이자
     * 완성본 PNG 저장에 사용할 이미지를 만든다.
     */
    const previewDataUrl =
      await capturePosterDataUrl(
        APP_CONFIG.CLOUD_PREVIEW_PIXEL_RATIO
      );


    const request = {

      action:
        'saveProject',


      project: {

        id:
          state.id ||
          undefined,

        type:
          state.type,

        clubName:
          clubName,

        teacherName:
          (
            state.teacherName ||
            ''
          ).trim(),

        title:
          (
            state.title ||
            ''
          ).trim(),

        activityText:
          state.activityText ||
          '',

        photoLayout:
          state.photoLayout,

        status:
          finalize
            ? 'completed'
            : 'draft',

        templateVersion:
          1
      },


      photos:
        buildPhotoSavePayload(),


      preview: {
        dataUrl:
          previewDataUrl
      },


      finalize:
        Boolean(
          finalize
        )
    };


    /*
     * 기존 프로젝트 업데이트 시
     * 덮어쓰기 충돌 방지
     */
    if (
      state.id &&
      state.updatedAt
    ) {

      request.expectedUpdatedAt =
        state.updatedAt;
    }


    const saved =
      await callAppsScript(
        request
      );


    /*
     * 새로 저장한 사진의 Drive fileId까지 받기 위해
     * 저장 직후 프로젝트를 다시 한 번 읽는다.
     */
    const loaded =
      await callAppsScript({

        action:
          'loadProject',

        projectId:
          saved.id
      });


    state =
      stateFromCloudProject(
        loaded.project
      );


    renderAll();


    await saveLocalDraftNow();


    setSaveStatus(
      finalize
        ? '완성본 저장됨'
        : '클라우드 저장됨',
      'saved'
    );


    showToast(
      finalize
        ? '원본파일과 동아리 완성본 이미지가 저장되었습니다.'
        : '편집 가능한 원본이 클라우드에 저장되었습니다.',
      'success'
    );

  } catch (error) {

    setSaveStatus(
      '저장 오류',
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



/* ============================================================
   사진 저장 데이터 생성
============================================================ */

function buildPhotoSavePayload() {

  return state.photos

    .filter(
      photo =>
        photo.dataUrl ||
        photo.fileId
    )

    .map(
      photo => {

        const item = {

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


        /*
         * 기존 Drive 사진을 변경하지 않았다면
         * Base64를 다시 전송하지 않고 fileId만 보낸다.
         */
        if (
          photo.fileId &&
          !photo.imageDirty
        ) {

          item.fileId =
            photo.fileId;

        } else if (
          photo.dataUrl
        ) {

          item.dataUrl =
            photo.dataUrl;
        }


        return item;
      }
    );
}



/* ============================================================
   클라우드 불러오기
============================================================ */

async function openCloudDialog() {

  if (
    !isAppsScriptConfigured()
  ) {

    showAppsScriptUrlError();

    return;
  }


  if (
    !elements.cloudDialog.open
  ) {

    elements.cloudDialog
      .showModal();
  }


  elements.cloudProjectList.innerHTML =
    '<p class="empty-state">저장된 프로젝트를 불러오는 중입니다.</p>';


  $$('.filter-chip')
    .forEach(
      item =>
        item.classList.remove(
          'is-active'
        )
    );


  $('[data-project-filter="all"]')
    .classList.add(
      'is-active'
    );


  try {

    const data =
      await callAppsScript({
        action:
          'listProjects'
      });


    renderCloudProjectList(
      data.projects ||
      []
    );

  } catch (error) {

    elements.cloudProjectList.innerHTML =
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


    elements.cloudProjectList
      .append(
        message
      );
  }
}



/* ============================================================
   클라우드 프로젝트 목록
============================================================ */

function renderCloudProjectList(
  projects
) {

  elements.cloudProjectList
    .replaceChildren();


  elements.cloudProjectList.dataset.projects =
    JSON.stringify(
      projects
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
      '클라우드에 저장된 프로젝트가 없습니다.';


    elements.cloudProjectList
      .append(
        empty
      );


    return;
  }


  projects.forEach(
    project => {

      const item =
        document.createElement(
          'article'
        );


      item.className =
        'project-item';


      item.dataset.projectType =
        project.type;


      item.dataset.projectId =
        project.id;


      /*
       * 목록 단계에서는 미리보기 PNG 자체를
       * 아직 서버가 반환하지 않으므로 간단한 표시만 보여준다.
       */
      const preview =
        document.createElement(
          'div'
        );


      preview.className =
        'project-item__preview';


      preview.style.display =
        'grid';


      preview.style.placeItems =
        'center';


      preview.style.color =
        '#7e8790';


      preview.style.fontSize =
        '11px';


      preview.textContent =
        project.type === 'creative'
          ? '창체'
          : '자율';


      const body =
        document.createElement(
          'div'
        );


      const name =
        document.createElement(
          'p'
        );


      name.className =
        'project-item__name';


      name.textContent =
        project.clubName ||
        '이름 없음';


      const meta =
        document.createElement(
          'p'
        );


      meta.className =
        'project-item__meta';


      meta.textContent =
        [
          project.typeLabel ||
            '',

          project.title ||
            '',

          project.updatedAt
            ? `수정 ${formatDate(project.updatedAt)}`
            : ''
        ]
          .filter(Boolean)
          .join(' · ');


      body.append(
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
        makeSmallButton(
          '불러오기'
        );


      loadButton
        .addEventListener(
          'click',
          () =>
            loadCloudProject(
              project.id
            )
        );


      const deleteButton =
        makeSmallButton(
          '삭제',
          true
        );


      deleteButton
        .addEventListener(
          'click',
          () =>
            deleteCloudProject(
              project.id,
              project.clubName
            )
        );


      actions.append(
        loadButton,
        deleteButton
      );


      item.append(
        preview,
        body,
        actions
      );


      elements.cloudProjectList
        .append(
          item
        );
    }
  );
}



function filterCloudProjects(
  type
) {

  $$('.project-item')
    .forEach(
      item => {

        item.hidden =
          type !== 'all' &&
          item.dataset.projectType !==
            type;
      }
    );
}



/* ============================================================
   클라우드 프로젝트 불러오기
============================================================ */

async function loadCloudProject(
  projectId
) {

  showLoading(
    '프로젝트를 불러오고 있습니다.'
  );


  try {

    const data =
      await callAppsScript({

        action:
          'loadProject',

        projectId:
          projectId
      });


    state =
      stateFromCloudProject(
        data.project
      );


    renderAll();


    await saveLocalDraftNow();


    elements.cloudDialog
      .close();


    setSaveStatus(
      '클라우드에서 불러옴',
      'saved'
    );


    showToast(
      '저장된 프로젝트를 불러왔습니다.',
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



/* ============================================================
   클라우드 프로젝트 삭제
============================================================ */

async function deleteCloudProject(
  projectId,
  clubName
) {

  const confirmed =
    await askConfirm({

      title:
        '클라우드 프로젝트 삭제',

      message:
        `"${clubName || '이 프로젝트'}"의 편집 가능한 원본을 휴지통으로 이동할까요?`,

      confirmText:
        '삭제'
    });


  if (
    !confirmed
  ) {
    return;
  }


  showLoading(
    '프로젝트를 삭제하고 있습니다.'
  );


  try {

    await callAppsScript({

      action:
        'deleteProject',

      projectId:
        projectId
    });


    /*
     * 현재 편집 중인 프로젝트를 삭제했다면
     * 화면도 새 작업으로 돌린다.
     */
    if (
      state.id === projectId
    ) {

      state =
        createEmptyState();


      renderAll();


      await saveLocalDraftNow();


      setSaveStatus(
        '새 작업'
      );
    }


    await openCloudDialog();


    showToast(
      '프로젝트를 휴지통으로 이동했습니다.',
      'success'
    );

  } catch (error) {

    showToast(
      error.message ||
        '프로젝트를 삭제하지 못했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}



/* ============================================================
   Drive 프로젝트 → 프런트 상태
============================================================ */

function stateFromCloudProject(
  project
) {

  const normalized =
    normalizeState({

      ...project,

      teacherName:
        project.teacherName ||
        '',

      photoLayout:
        project.photoLayout ||
        2
    });


  normalized.photos =
    normalizePhotos(

      (
        project.photos ||
        []
      )
        .map(
          (photo, index) => ({

            ...EMPTY_PHOTO(
              index
            ),

            ...photo,

            crop:
              normalizeCrop(
                photo.crop
              ),

            imageDirty:
              false
          })
        )
    );


  return normalized;
}



/* ============================================================
   Apps Script 요청
============================================================ */

async function callAppsScript(
  payload
) {

  const response =
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


  if (
    !response.ok
  ) {

    throw new Error(
      `서버 요청에 실패했습니다. (${response.status})`
    );
  }


  const result =
    await response.json();


  if (
    !result ||
    result.ok !== true
  ) {

    throw new Error(
      result?.error ||
      'Apps Script 처리 중 오류가 발생했습니다.'
    );
  }


  return result.data;
}



/* ============================================================
   Apps Script URL 확인
============================================================ */

function isAppsScriptConfigured() {

  return (
    typeof APPS_SCRIPT_URL ===
      'string' &&

    /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/
      .test(
        APPS_SCRIPT_URL.trim()
      )
  );
}



function showAppsScriptUrlError() {

  showToast(
    'script.js 상단의 APPS_SCRIPT_URL에 배포된 Apps Script 웹 앱 주소를 입력해 주세요.',
    'error'
  );
}



/* ============================================================
   PNG 저장
============================================================ */

async function exportPng() {

  const fileName =
    `${safeFileName(
      state.clubName ||
      '동아리_전시자료'
    )}.png`;


  showLoading(
    '고해상도 PNG를 만들고 있습니다.'
  );


  try {

    await loadExportLibraries();


    const dataUrl =
      await capturePosterDataUrl(
        APP_CONFIG.EXPORT_PIXEL_RATIO
      );


    downloadDataUrl(
      dataUrl,
      fileName
    );


    showToast(
      'PNG 파일을 저장했습니다.',
      'success'
    );

  } catch (error) {

    showToast(
      error.message ||
        'PNG 생성에 실패했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}



/* ============================================================
   PDF 저장
============================================================ */

async function exportPdf() {

  const fileName =
    `${safeFileName(
      state.clubName ||
      '동아리_전시자료'
    )}.pdf`;


  showLoading(
    'PDF를 만들고 있습니다.'
  );


  try {

    await loadExportLibraries();


    const dataUrl =
      await capturePosterDataUrl(
        2.5
      );


    const jsPDF =
      window.jspdf?.jsPDF;


    if (
      !jsPDF
    ) {

      throw new Error(
        'PDF 라이브러리를 불러오지 못했습니다.'
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
      fileName
    );


    showToast(
      'PDF 파일을 저장했습니다.',
      'success'
    );

  } catch (error) {

    showToast(
      error.message ||
        'PDF 생성에 실패했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}



/* ============================================================
   출력물을 PNG Data URL로 변환
============================================================ */

async function capturePosterDataUrl(
  pixelRatio
) {

  await loadExportLibraries();


  if (
    !window.htmlToImage?.toPng
  ) {

    throw new Error(
      '이미지 저장 기능을 불러오지 못했습니다.'
    );
  }


  const poster =
    elements.poster;


  const oldZoom =
    poster.style.zoom;


  /*
   * 빈 contenteditable 영역에서 보이는
   * placeholder 안내 문구는 최종 이미지에 나오지 않도록 한다.
   */
  const placeholders =
    $$(
      '#poster-canvas [contenteditable="true"][data-placeholder]'
    )
      .map(
        element => ({

          element:
            element,

          placeholder:
            element.getAttribute(
              'data-placeholder'
            )
        })
      );


  /*
   * 사진이 비어 있을 때 보이는
   * + 사진 추가 문구도 결과물에서는 제거한다.
   */
  const photoPlaceholders =
    $$(
      '#poster-canvas .photo-placeholder'
    )
      .map(
        element => ({

          element:
            element,

          display:
            element.style.display
        })
      );


  poster.classList.add(
    'is-exporting'
  );


  poster.style.zoom =
    '1';


  placeholders
    .forEach(
      item => {

        item.element
          .setAttribute(
            'data-placeholder',
            ''
          );
      }
    );


  photoPlaceholders
    .forEach(
      item => {

        if (
          !item.element.hidden
        ) {

          item.element.style.display =
            'none';
        }
      }
    );


  try {

    await waitForImages(
      poster
    );


    return await window.htmlToImage
      .toPng(
        poster,
        {

          pixelRatio:
            pixelRatio,

          cacheBust:
            true,

          backgroundColor:
            '#ffffff',

          width:
            poster.offsetWidth,

          height:
            poster.offsetHeight,

          style: {
            transform:
              'none',

            margin:
              '0'
          }
        }
      );

  } finally {

    poster.classList.remove(
      'is-exporting'
    );


    poster.style.zoom =
      oldZoom;


    placeholders
      .forEach(
        item => {

          item.element
            .setAttribute(
              'data-placeholder',
              item.placeholder ||
              ''
            );
        }
      );


    photoPlaceholders
      .forEach(
        item => {

          item.element.style.display =
            item.display;
        }
      );
  }
}



/* ============================================================
   PNG/PDF 외부 라이브러리
============================================================ */

async function loadExportLibraries() {

  await loadExternalScript(
    APP_CONFIG.HTML_TO_IMAGE_URL,
    () =>
      Boolean(
        window.htmlToImage?.toPng
      )
  );


  await loadExternalScript(
    APP_CONFIG.JSPDF_URL,
    () =>
      Boolean(
        window.jspdf?.jsPDF
      )
  );
}



function loadExternalScript(
  src,
  readyTest
) {

  if (
    readyTest()
  ) {
    return Promise.resolve();
  }


  return new Promise(
    (
      resolve,
      reject
    ) => {

      const existing =
        document.querySelector(
          `script[data-external-src="${src}"]`
        );


      if (
        existing
      ) {

        existing.addEventListener(
          'load',
          () => resolve(),
          {
            once: true
          }
        );


        existing.addEventListener(
          'error',
          () =>
            reject(
              new Error(
                '외부 라이브러리를 불러오지 못했습니다.'
              )
            ),
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


      script.dataset.externalSrc =
        src;


      script.addEventListener(
        'load',
        () => {

          if (
            readyTest()
          ) {

            resolve();

          } else {

            reject(
              new Error(
                '외부 라이브러리가 정상적으로 초기화되지 않았습니다.'
              )
            );
          }
        },
        {
          once: true
        }
      );


      script.addEventListener(
        'error',
        () =>
          reject(
            new Error(
              '외부 라이브러리를 불러오지 못했습니다.'
            )
          ),
        {
          once: true
        }
      );


      document.head.append(
        script
      );
    }
  );
}



/* ============================================================
   새로 만들기
============================================================ */

async function handleNewProject() {

  if (
    hasMeaningfulContent(
      state
    )
  ) {

    const confirmed =
      await askConfirm({

        title:
          '새로 만들기',

        message:
          '현재 화면의 내용을 비우고 새 전시자료를 만들까요? 클라우드에 저장하지 않은 변경 내용은 사라집니다.',

        confirmText:
          '새로 만들기'
      });


    if (
      !confirmed
    ) {
      return;
    }
  }


  state =
    createEmptyState();


  renderAll();


  await saveLocalDraftNow();


  setSaveStatus(
    '새 작업'
  );


  showToast(
    '새 전시자료를 시작합니다.'
  );
}



/* ============================================================
   전체 초기화
============================================================ */

async function handleReset() {

  const confirmed =
    await askConfirm({

      title:
        '전체 초기화',

      message:
        '현재 입력한 글과 사진을 모두 초기화할까요? 클라우드에 저장된 파일은 삭제되지 않습니다.',

      confirmText:
        '초기화'
    });


  if (
    !confirmed
  ) {
    return;
  }


  state =
    createEmptyState();


  renderAll();


  await saveLocalDraftNow();


  setSaveStatus(
    '초기화됨'
  );


  showToast(
    '현재 화면을 초기화했습니다.'
  );
}



/* ============================================================
   예시 불러오기
============================================================ */

async function loadExample() {

  if (
    hasMeaningfulContent(
      state
    )
  ) {

    const confirmed =
      await askConfirm({

        title:
          '예시 불러오기',

        message:
          '현재 화면 내용을 예시 자료로 바꿀까요? 클라우드에 저장하지 않은 변경 내용은 사라집니다.',

        confirmText:
          '불러오기'
      });


    if (
      !confirmed
    ) {
      return;
    }
  }


  state =
    createEmptyState();


  state.clubName =
    '코딩동아리';


  state.teacherName =
    '홍길동';


  state.title =
    '마이크로비트로 만드는 생활 속 스마트 장치';


  state.activityText =
    '마이크로비트의 기본 기능과 다양한 센서의 역할을 알아보고 간단한 실습을 진행하였다. 이후 생활 속에서 불편한 점을 찾아 센서를 활용한 스마트 장치를 구상하고, 의사코드를 작성하여 동작 과정을 정리하였다. 직접 프로그램을 제작하고 실행 결과를 확인하면서 오류를 수정하였으며, 완성한 작품의 기능과 제작 과정을 서로 소개하였다.';


  state.photoLayout =
    2;


  renderAll();


  markChanged();


  showToast(
    '예시 내용을 불러왔습니다.'
  );
}



/* ============================================================
   브라우저 자동저장
============================================================ */

function markChanged() {

  setSaveStatus(
    '변경사항 있음'
  );


  if (
    !uiInitialized
  ) {
    return;
  }


  clearTimeout(
    localSaveTimer
  );


  localSaveTimer =
    setTimeout(
      async () => {

        try {

          await saveLocalDraftNow();


          setSaveStatus(
            '브라우저 자동저장됨'
          );

        } catch (error) {

          console.warn(
            '자동저장 실패:',
            error
          );


          setSaveStatus(
            '자동저장 오류',
            'error'
          );
        }
      },
      APP_CONFIG.LOCAL_SAVE_DELAY
    );
}



/* ============================================================
   IndexedDB 저장
============================================================ */

async function saveLocalDraftNow() {

  const db =
    await openLocalDb();


  await new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(
          APP_CONFIG.LOCAL_DB_STORE,
          'readwrite'
        );


      const store =
        transaction.objectStore(
          APP_CONFIG.LOCAL_DB_STORE
        );


      const request =
        store.put(
          JSON.parse(
            JSON.stringify(
              state
            )
          ),
          APP_CONFIG.LOCAL_DB_KEY
        );


      request.onsuccess =
        () => resolve();


      request.onerror =
        () =>
          reject(
            request.error
          );
    }
  );


  db.close();
}



/* ============================================================
   IndexedDB 불러오기
============================================================ */

async function loadLocalDraft() {

  const db =
    await openLocalDb();


  try {

    return await new Promise(
      (
        resolve,
        reject
      ) => {

        const transaction =
          db.transaction(
            APP_CONFIG.LOCAL_DB_STORE,
            'readonly'
          );


        const store =
          transaction.objectStore(
            APP_CONFIG.LOCAL_DB_STORE
          );


        const request =
          store.get(
            APP_CONFIG.LOCAL_DB_KEY
          );


        request.onsuccess =
          () =>
            resolve(
              request.result ||
              null
            );


        request.onerror =
          () =>
            reject(
              request.error
            );
      }
    );

  } finally {

    db.close();
  }
}



/* ============================================================
   IndexedDB 열기
============================================================ */

function openLocalDb() {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const request =
        indexedDB.open(
          APP_CONFIG.LOCAL_DB_NAME,
          1
        );


      request.onupgradeneeded =
        () => {

          const db =
            request.result;


          if (
            !db.objectStoreNames
              .contains(
                APP_CONFIG.LOCAL_DB_STORE
              )
          ) {

            db.createObjectStore(
              APP_CONFIG.LOCAL_DB_STORE
            );
          }
        };


      request.onsuccess =
        () =>
          resolve(
            request.result
          );


      request.onerror =
        () =>
          reject(
            request.error
          );
    }
  );
}



/* ============================================================
   미리보기 크기
============================================================ */

function fitPreviewToWindow(
  force = true
) {

  const stage =
    elements.paperStage;


  const poster =
    elements.poster;


  if (
    !stage ||
    !poster
  ) {
    return;
  }


  const availableWidth =
    Math.max(
      400,
      stage.clientWidth -
        70
    );


  const availableHeight =
    Math.max(
      400,
      stage.clientHeight -
        70
    );


  const fitted =
    Math.min(
      availableWidth /
        794,

      availableHeight /
        1123,

      1
    );


  if (
    force ||
    previewZoom <= 1
  ) {

    setPreviewZoom(
      clamp(
        Math.floor(
          fitted *
          20
        ) /
        20,
        0.5,
        1
      )
    );
  }
}



function changeZoom(
  delta
) {

  setPreviewZoom(
    clamp(
      previewZoom +
        delta,
      0.5,
      1.3
    )
  );
}



function setPreviewZoom(
  value
) {

  previewZoom =
    Math.round(
      value *
      10
    ) /
    10;


  elements.poster.style.zoom =
    String(
      previewZoom
    );


  elements.zoomLabel.textContent =
    `${Math.round(
      previewZoom *
      100
    )}%`;
}



/* ============================================================
   저장 상태 표시
============================================================ */

function setSaveStatus(
  text,
  type = ''
) {

  elements.saveStatus.textContent =
    text;


  elements.saveStatus.classList.remove(
    'is-saved',
    'is-saving',
    'is-error'
  );


  if (
    type === 'saved'
  ) {

    elements.saveStatus.classList.add(
      'is-saved'
    );
  }


  if (
    type === 'saving'
  ) {

    elements.saveStatus.classList.add(
      'is-saving'
    );
  }


  if (
    type === 'error'
  ) {

    elements.saveStatus.classList.add(
      'is-error'
    );
  }
}



/* ============================================================
   토스트
============================================================ */

function showToast(
  message,
  type = ''
) {

  clearTimeout(
    toastTimer
  );


  elements.toast.textContent =
    message;


  elements.toast.classList.remove(
    'is-success',
    'is-error'
  );


  if (
    type === 'success'
  ) {

    elements.toast.classList.add(
      'is-success'
    );
  }


  if (
    type === 'error'
  ) {

    elements.toast.classList.add(
      'is-error'
    );
  }


  elements.toast.hidden =
    false;


  toastTimer =
    setTimeout(
      () => {

        elements.toast.hidden =
          true;
      },
      type === 'error'
        ? 4300
        : 2800
    );
}



/* ============================================================
   로딩
============================================================ */

function showLoading(
  message =
    '처리 중입니다.'
) {

  elements.loadingMessage.textContent =
    message;


  elements.loadingOverlay.hidden =
    false;
}



function hideLoading() {

  elements.loadingOverlay.hidden =
    true;
}



/* ============================================================
   확인 dialog
============================================================ */

function askConfirm({
  title,
  message,
  confirmText = '확인'
}) {

  if (
    confirmResolver
  ) {

    confirmResolver(
      false
    );

    confirmResolver =
      null;
  }


  elements.confirmTitle.textContent =
    title ||
    '확인';


  elements.confirmMessage.textContent =
    message ||
    '';


  $('#btn-confirm-ok').textContent =
    confirmText;


  if (
    !elements.confirmDialog.open
  ) {

    elements.confirmDialog
      .showModal();
  }


  return new Promise(
    resolve => {

      confirmResolver =
        resolve;
    }
  );
}



function resolveConfirm(
  value
) {

  if (
    elements.confirmDialog.open
  ) {

    elements.confirmDialog
      .close();
  }


  if (
    confirmResolver
  ) {

    const resolve =
      confirmResolver;


    confirmResolver =
      null;


    resolve(
      Boolean(
        value
      )
    );
  }
}



/* ============================================================
   상태 정규화
============================================================ */

function normalizeState(
  input
) {

  const source =
    input ||
    {};


  const result =
    createEmptyState();


  result.id =
    source.id ||
    null;


  result.createdAt =
    source.createdAt ||
    null;


  result.updatedAt =
    source.updatedAt ||
    null;


  result.type =
    source.type ===
      'creative'
      ? 'creative'
      : 'autonomous';


  result.clubName =
    String(
      source.clubName ||
      ''
    );


  result.teacherName =
    String(
      source.teacherName ||
      source.teacher ||
      ''
    );


  result.title =
    String(
      source.title ||
      ''
    );


  result.activityText =
    String(
      source.activityText ||
      ''
    );


  result.photoLayout =
    clamp(
      Math.round(
        Number(
          source.photoLayout
        ) ||
        2
      ),
      1,
      APP_CONFIG.MAX_PHOTOS
    );


  result.status =
    source.status ===
      'completed'
      ? 'completed'
      : 'draft';


  result.photos =
    normalizePhotos(
      source.photos
    );


  return result;
}



/* ============================================================
   사진 상태 정규화
============================================================ */

function normalizePhotos(
  input
) {

  const source =
    Array.isArray(
      input
    )
      ? input
      : [];


  const result =
    Array.from(
      {
        length:
          APP_CONFIG.MAX_PHOTOS
      },
      (_, index) =>
        EMPTY_PHOTO(
          index
        )
    );


  source
    .slice(
      0,
      APP_CONFIG.MAX_PHOTOS
    )
    .forEach(
      (
        photo,
        index
      ) => {

        if (
          !photo
        ) {
          return;
        }


        /*
         * photo_3 같은 slotId가 있으면
         * 정확한 슬롯 위치를 찾아 넣는다.
         */
        const slotMatch =
          String(
            photo.slotId ||
            ''
          )
            .match(
              /^photo_(\d+)$/
            );


        const targetIndex =
          slotMatch
            ? clamp(
                Number(
                  slotMatch[1]
                ) -
                  1,
                0,
                APP_CONFIG.MAX_PHOTOS -
                  1
              )
            : index;


        result[targetIndex] = {

          ...EMPTY_PHOTO(
            targetIndex
          ),

          ...photo,

          slotId:
            `photo_${targetIndex + 1}`,

          caption:
            String(
              photo.caption ||
              ''
            ),

          crop:
            normalizeCrop(
              photo.crop
            ),

          imageDirty:
            Boolean(
              photo.imageDirty
            )
        };
      }
    );


  return result;
}



/* ============================================================
   크롭 정규화
============================================================ */

function normalizeCrop(
  crop
) {

  return {

    x:
      clamp(
        finiteNumber(
          crop?.x,
          50
        ),
        0,
        100
      ),

    y:
      clamp(
        finiteNumber(
          crop?.y,
          50
        ),
        0,
        100
      ),

    scale:
      clamp(
        finiteNumber(
          crop?.scale,
          1
        ),
        1,
        3
      )
  };
}



/* ============================================================
   처음 HTML에 들어있는 예시 문구 제거
============================================================ */

function clearPreviewPlaceholderText() {

  [
    elements.previewClubName,
    elements.previewTeacher,
    elements.previewTitle,
    elements.previewActivity
  ]
    .forEach(
      element => {

        element.textContent =
          '';
      }
    );


  elements.photoCards
    .forEach(
      card => {

        const caption =
          card.querySelector(
            '.photo-caption'
          );


        caption.textContent =
          '';
      }
    );
}



/* ============================================================
   contenteditable 텍스트 설정
============================================================ */

function setEditableText(
  element,
  value
) {

  const text =
    String(
      value ||
      ''
    );


  if (
    editableText(
      element
    ) === text
  ) {
    return;
  }


  element.textContent =
    text;
}



/* ============================================================
   contenteditable 텍스트 읽기
============================================================ */

function editableText(
  element
) {

  return String(
    element.innerText ||
    element.textContent ||
    ''
  )
    .replace(
      /\u00a0/g,
      ' '
    )
    .replace(
      /\n{3,}/g,
      '\n\n'
    )
    .trim();
}



/* ============================================================
   작성 내용 존재 여부
============================================================ */

function hasMeaningfulContent(
  inputState
) {

  if (
    !inputState
  ) {
    return false;
  }


  return Boolean(

    inputState.id ||

    String(
      inputState.clubName ||
      ''
    ).trim() ||

    String(
      inputState.teacherName ||
      ''
    ).trim() ||

    String(
      inputState.title ||
      ''
    ).trim() ||

    String(
      inputState.activityText ||
      ''
    ).trim() ||

    (
      inputState.photos ||
      []
    )
      .some(
        photo =>
          photo?.dataUrl ||
          photo?.fileId
      )
  );
}



/* ============================================================
   파일명 정리
============================================================ */

function safeFileName(
  value
) {

  return (

    String(
      value ||
      '동아리_전시자료'
    )
      .replace(
        /[\\/:*?"<>|\r\n]+/g,
        '_'
      )
      .trim()
      .slice(
        0,
        80
      ) ||

    '동아리_전시자료'
  );
}



/* ============================================================
   날짜 표시
============================================================ */

function formatDate(
  value
) {

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


  return new Intl.DateTimeFormat(
    'ko-KR',
    {
      month:
        'numeric',

      day:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit'
    }
  )
    .format(
      date
    );
}



/* ============================================================
   숫자 유틸
============================================================ */

function finiteNumber(
  value,
  fallback
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;
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



/* ============================================================
   Debounce
============================================================ */

function debounce(
  callback,
  delay
) {

  let timer;


  return (...args) => {

    clearTimeout(
      timer
    );


    timer =
      setTimeout(
        () =>
          callback(
            ...args
          ),
        delay
      );
  };
}



/* ============================================================
   이미지 읽기
============================================================ */

function loadImage(
  src
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const image =
        new Image();


      image.onload =
        () =>
          resolve(
            image
          );


      image.onerror =
        () =>
          reject(
            new Error(
              '사진을 읽을 수 없습니다.'
            )
          );


      image.src =
        src;
    }
  );
}



/* ============================================================
   Canvas → Blob
============================================================ */

function canvasToBlob(
  canvas,
  type,
  quality
) {

  return new Promise(
    resolve => {

      canvas.toBlob(
        resolve,
        type,
        quality
      );
    }
  );
}



/* ============================================================
   Blob → Data URL
============================================================ */

function blobToDataUrl(
  blob
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        () =>
          resolve(
            reader.result
          );


      reader.onerror =
        () =>
          reject(
            reader.error
          );


      reader.readAsDataURL(
        blob
      );
    }
  );
}



/* ============================================================
   파일 다운로드
============================================================ */

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


  document.body.append(
    link
  );


  link.click();


  link.remove();
}



/* ============================================================
   이미지 로딩 대기
============================================================ */

async function waitForImages(
  root
) {

  const images =
    [
      ...root.querySelectorAll(
        'img'
      )
    ]
      .filter(
        img =>
          !img.hidden
      );


  await Promise.all(

    images.map(
      img => {

        if (
          img.complete &&
          img.naturalWidth > 0
        ) {

          return Promise.resolve();
        }


        return new Promise(
          resolve => {

            img.addEventListener(
              'load',
              resolve,
              {
                once: true
              }
            );


            img.addEventListener(
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
