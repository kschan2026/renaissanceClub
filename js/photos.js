import {
  CONFIG
} from './config.js';


import {
  dom,
  showLoading,
  hideLoading,
  showToast,
  confirmAction
} from './dom.js';


import {
  getState,
  getPhoto,
  updateState
} from './store.js';


import {
  normalizeCrop,
  clamp
} from './utils.js';


let currentSlotId = null;

let cropSlotId = null;

let cropState = null;

let cropPointer = null;


export function initPhotos() {

  bindBasicPhotoCards();


  dom.photoFileInput.addEventListener(
    'change',
    handleFileInput
  );


  dom.layoutCanvas.addEventListener(
    'click',
    handlePosterPhotoClick
  );


  dom.layoutCanvas.addEventListener(
    'dragover',
    handlePosterDragOver
  );


  dom.layoutCanvas.addEventListener(
    'drop',
    handlePosterDrop
  );


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
    updateCropZoom
  );


  dom.cropFrame.addEventListener(
    'pointerdown',
    beginCropDrag
  );


  window.addEventListener(
    'pointermove',
    moveCrop
  );


  window.addEventListener(
    'pointerup',
    endCropDrag
  );


  dom.photoCropDialog.addEventListener(
    'cancel',
    event => {

      event.preventDefault();

      closeCropDialog();
    }
  );
}


function bindBasicPhotoCards() {

  document
    .querySelectorAll(
      '.photo-editor-card'
    )
    .forEach(
      card => {

        const slotId =
          card.dataset.photoSlot;


        const selectButton =
          card.querySelector(
            '[data-photo-select]'
          );


        const caption =
          card.querySelector(
            '[data-photo-caption]'
          );


        const crop =
          card.querySelector(
            '[data-photo-crop]'
          );


        const remove =
          card.querySelector(
            '[data-photo-remove]'
          );


        selectButton.addEventListener(
          'click',
          () => {

            selectPhotoForSlot(
              slotId
            );
          }
        );


        caption.addEventListener(
          'input',
          () => {

            updateState(
              state => {

                let photo =
                  state.photos.find(
                    item =>
                      item.slotId ===
                      slotId
                  );


                if (
                  !photo
                ) {

                  photo =
                    createPhotoRecord(
                      slotId
                    );


                  state.photos.push(
                    photo
                  );
                }


                photo.caption =
                  caption.value;
              }
            );
          }
        );


        crop.addEventListener(
          'click',
          () => {

            openCropDialog(
              slotId
            );
          }
        );


        remove.addEventListener(
          'click',
          () => {

            removePhoto(
              slotId
            );
          }
        );


        selectButton.addEventListener(
          'dragover',
          event => {

            event.preventDefault();

            selectButton.classList.add(
              'is-dragover'
            );
          }
        );


        selectButton.addEventListener(
          'dragleave',
          () => {

            selectButton.classList.remove(
              'is-dragover'
            );
          }
        );


        selectButton.addEventListener(
          'drop',
          event => {

            event.preventDefault();


            selectButton.classList.remove(
              'is-dragover'
            );


            const file =
              event.dataTransfer
                ?.files?.[0];


            if (
              file
            ) {

              processFile(
                slotId,
                file
              );
            }
          }
        );
      }
    );
}


export function renderPhotoEditors() {

  document
    .querySelectorAll(
      '.photo-editor-card'
    )
    .forEach(
      card => {

        const slotId =
          card.dataset.photoSlot;


        const photo =
          getPhoto(
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


        const caption =
          card.querySelector(
            '[data-photo-caption]'
          );


        const crop =
          card.querySelector(
            '[data-photo-crop]'
          );


        const remove =
          card.querySelector(
            '[data-photo-remove]'
          );


        caption.value =
          photo?.caption ||
          '';


        if (
          photo?.dataUrl
        ) {

          image.src =
            photo.dataUrl;


          image.hidden =
            false;


          empty.hidden =
            true;


          crop.hidden =
            false;


          remove.hidden =
            false;


          applyCropStyle(
            image,
            photo.crop
          );

        } else {

          image.removeAttribute(
            'src'
          );


          image.hidden =
            true;


          empty.hidden =
            false;


          crop.hidden =
            true;


          remove.hidden =
            true;
        }
      }
    );
}


export function selectPhotoForSlot(slotId) {

  currentSlotId =
    slotId;


  dom.photoFileInput.value =
    '';


  dom.photoFileInput.click();
}


async function handleFileInput() {

  const file =
    dom.photoFileInput
      .files?.[0];


  if (
    !file ||
    !currentSlotId
  ) {

    return;
  }


  const slot =
    currentSlotId;


  currentSlotId =
    null;


  await processFile(
    slot,
    file
  );
}


async function processFile(
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
    '사진을 처리하는 중입니다.'
  );


  try {

    const dataUrl =
      await compressImage(
        file
      );


    updateState(
      state => {

        let photo =
          state.photos.find(
            item =>
              item.slotId ===
              slotId
          );


        if (
          !photo
        ) {

          photo =
            createPhotoRecord(
              slotId
            );


          state.photos.push(
            photo
          );
        }


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
    );


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


function createPhotoRecord(slotId) {

  return {
    slotId,

    caption: '',

    crop: {
      x: 50,
      y: 50,
      scale: 1
    },

    dataUrl: '',

    fileId: null,

    fileName: '',

    mimeType: 'image/jpeg'
  };
}


async function removePhoto(slotId) {

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


  removePhotoRecord(
    slotId
  );
}


export function removePhotoRecord(slotId) {

  updateState(
    state => {

      state.photos =
        state.photos.filter(
          photo =>
            photo.slotId !==
            slotId
        );
    }
  );
}


export function openCropDialog(slotId) {

  const photo =
    getPhoto(
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


  cropSlotId =
    slotId;


  cropState =
    normalizeCrop(
      photo.crop
    );


  dom.cropImage.src =
    photo.dataUrl;


  dom.cropZoom.value =
    cropState.scale;


  updateCropPreview();


  dom.photoCropDialog.showModal();
}


function closeCropDialog() {

  if (
    dom.photoCropDialog.open
  ) {

    dom.photoCropDialog.close();
  }


  cropSlotId =
    null;


  cropState =
    null;


  cropPointer =
    null;
}


function updateCropZoom() {

  if (
    !cropState
  ) {

    return;
  }


  cropState.scale =
    Number(
      dom.cropZoom.value
    );


  updateCropPreview();
}


function updateCropPreview() {

  if (
    !cropState
  ) {

    return;
  }


  dom.cropImage.style.objectPosition =
    `${cropState.x}% ${cropState.y}%`;


  dom.cropImage.style.transform =
    `scale(${cropState.scale})`;
}


function beginCropDrag(event) {

  if (
    !cropState
  ) {

    return;
  }


  event.preventDefault();


  cropPointer = {

    id:
      event.pointerId,

    startX:
      event.clientX,

    startY:
      event.clientY,

    cropX:
      cropState.x,

    cropY:
      cropState.y
  };
}


function moveCrop(event) {

  if (
    !cropPointer ||
    !cropState ||
    event.pointerId !==
      cropPointer.id
  ) {

    return;
  }


  const rect =
    dom.cropFrame
      .getBoundingClientRect();


  const dx =
    event.clientX -
    cropPointer.startX;


  const dy =
    event.clientY -
    cropPointer.startY;


  cropState.x =
    clamp(
      cropPointer.cropX -
      dx / rect.width * 100,
      0,
      100
    );


  cropState.y =
    clamp(
      cropPointer.cropY -
      dy / rect.height * 100,
      0,
      100
    );


  updateCropPreview();
}


function endCropDrag(event) {

  if (
    cropPointer &&
    event.pointerId ===
      cropPointer.id
  ) {

    cropPointer =
      null;
  }
}


function applyCrop() {

  if (
    !cropSlotId ||
    !cropState
  ) {

    closeCropDialog();

    return;
  }


  const finalCrop =
    normalizeCrop(
      cropState
    );


  updateState(
    state => {

      const photo =
        state.photos.find(
          item =>
            item.slotId ===
            cropSlotId
        );


      if (
        photo
      ) {

        photo.crop =
          finalCrop;
      }
    }
  );


  closeCropDialog();


  showToast(
    '사진 위치를 적용했습니다.',
    'success'
  );
}


function handlePosterPhotoClick(event) {

  const frame =
    event.target.closest(
      '.poster-photo-block__frame'
    );


  if (
    !frame
  ) {

    return;
  }


  const state =
    getState();


  if (
    state.layoutEditing
  ) {

    return;
  }


  const blockElement =
    frame.closest(
      '.layout-block'
    );


  const block =
    state.blocks.find(
      item =>
        item.id ===
        blockElement?.dataset.blockId
    );


  if (
    block?.slotId
  ) {

    selectPhotoForSlot(
      block.slotId
    );
  }
}


function handlePosterDragOver(event) {

  if (
    event.target.closest(
      '.poster-photo-block__frame'
    )
  ) {

    event.preventDefault();
  }
}


function handlePosterDrop(event) {

  const frame =
    event.target.closest(
      '.poster-photo-block__frame'
    );


  if (
    !frame
  ) {

    return;
  }


  event.preventDefault();


  const file =
    event.dataTransfer
      ?.files?.[0];


  if (
    !file
  ) {

    return;
  }


  const element =
    frame.closest(
      '.layout-block'
    );


  const state =
    getState();


  const block =
    state.blocks.find(
      item =>
        item.id ===
        element?.dataset.blockId
    );


  if (
    block?.slotId
  ) {

    processFile(
      block.slotId,
      file
    );
  }
}


function applyCropStyle(
  image,
  crop
) {

  const value =
    normalizeCrop(
      crop
    );


  image.style.objectPosition =
    `${value.x}% ${value.y}%`;


  image.style.transform =
    `scale(${value.scale})`;
}


function compressImage(file) {

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
              '사진을 읽지 못했습니다.'
            )
          );
        };


      reader.onload =
        () => {

          const image =
            new Image();


          image.onerror =
            () => {

              reject(
                new Error(
                  '사진 형식을 읽지 못했습니다.'
                )
              );
            };


          image.onload =
            () => {

              let width =
                image.naturalWidth;


              let height =
                image.naturalHeight;


              const maximum =
                CONFIG.MAX_IMAGE_DIMENSION;


              if (
                Math.max(
                  width,
                  height
                ) >
                maximum
              ) {

                const ratio =
                  maximum /
                  Math.max(
                    width,
                    height
                  );


                width =
                  Math.round(
                    width * ratio
                  );


                height =
                  Math.round(
                    height * ratio
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


              context.drawImage(
                image,
                0,
                0,
                width,
                height
              );


              resolve(
                canvas.toDataURL(
                  'image/jpeg',
                  CONFIG.IMAGE_JPEG_QUALITY
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
