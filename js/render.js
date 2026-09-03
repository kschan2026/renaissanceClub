import {
  CONFIG
} from './config.js';


import {
  dom
} from './dom.js';


import {
  getState,
  getActivity,
  getPhoto
} from './store.js';


import {
  clamp,
  normalizeCrop
} from './utils.js';


let previewZoom = 0.5;


export function initPreview() {

  dom.btnZoomIn.addEventListener(
    'click',
    () => {

      setPreviewZoom(
        previewZoom +
        CONFIG.PREVIEW.ZOOM_STEP
      );
    }
  );


  dom.btnZoomOut.addEventListener(
    'click',
    () => {

      setPreviewZoom(
        previewZoom -
        CONFIG.PREVIEW.ZOOM_STEP
      );
    }
  );


  window.addEventListener(
    'resize',
    () => {

      fitPreviewToWindow();
    }
  );
}


export function renderAll() {

  renderPosterHeader();

  renderBlocks();
}


function renderPosterHeader() {

  const state =
    getState();


  dom.poster.dataset.clubType =
    state.type;


  dom.poster.dataset.layoutEditing =
    String(
      state.layoutEditing
    );


  dom.previewClubName.textContent =
    state.clubName || '';


  dom.previewTeacher.textContent =
    state.teacherName || '';


  dom.previewClubType.textContent =
    state.type === 'creative'
      ? '창체동아리'
      : '자율동아리';


  dom.previewFooterMessage.textContent =
    state.layoutEditing
      ? '블록을 선택하여 이동하거나 크기를 조절할 수 있습니다.'
      : '입력한 내용이 실시간으로 반영됩니다.';
}


function renderBlocks() {

  const state =
    getState();


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
    element.querySelector(
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


  const state =
    getState();


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


  return element;
}


function renderBlockContent(
  block,
  container
) {

  switch (
    block.type
  ) {

    case 'activityTitle':

      renderActivityTitle(
        block,
        container
      );

      break;


    case 'activityContent':

      renderActivityContent(
        block,
        container
      );

      break;


    case 'subtitle':

      renderSubtitle(
        block,
        container
      );

      break;


    case 'text':

      renderText(
        block,
        container
      );

      break;


    case 'photo':
    case 'photo-caption':

      renderPhoto(
        block,
        container
      );

      break;
  }
}


function renderActivityTitle(
  block,
  container
) {

  const activity =
    getActivity(
      block.activityId
    );


  const state =
    getState();


  const index =
    state.activities.findIndex(
      item =>
        item.id ===
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


function renderActivityContent(
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


function renderSubtitle(
  block,
  container
) {

  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.className =
    'poster-subtitle-block';


  const marker =
    document.createElement(
      'span'
    );


  marker.className =
    'poster-subtitle-block__number';


  marker.textContent =
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
    marker,
    title
  );


  container.appendChild(
    wrapper
  );
}


function renderText(
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


function renderPhoto(
  block,
  container
) {

  const photo =
    getPhoto(
      block.slotId
    );


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


  image.alt =
    '';


  const empty =
    document.createElement(
      'div'
    );


  empty.className =
    'poster-photo-block__empty';


  empty.innerHTML =
    '<span>+</span><span>사진</span>';


  if (
    photo?.dataUrl
  ) {

    image.src =
      photo.dataUrl;


    image.hidden =
      false;


    empty.hidden =
      true;


    applyCrop(
      image,
      photo.crop
    );

  } else {

    image.hidden =
      true;
  }


  frame.append(
    image,
    empty
  );


  figure.appendChild(
    frame
  );


  if (
    block.type ===
      'photo-caption' ||
    photo?.caption
  ) {

    const caption =
      document.createElement(
        'figcaption'
      );


    caption.className =
      'poster-photo-block__caption';


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


function applyCrop(
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


export function fitPreviewToWindow() {

  if (
    !dom.previewStage ||
    !dom.poster
  ) {

    return;
  }


  const stage =
    dom.previewStage
      .getBoundingClientRect();


  const width =
    dom.poster.offsetWidth;


  const height =
    dom.poster.offsetHeight;


  const availableWidth =
    stage.width - 42;


  const availableHeight =
    stage.height - 45;


  const zoom =
    Math.min(
      availableWidth / width,
      availableHeight / height
    );


  setPreviewZoom(
    clamp(
      Math.floor(
        zoom * 20
      ) / 20,

      CONFIG.PREVIEW.MIN_ZOOM,

      0.8
    )
  );
}


function setPreviewZoom(value) {

  previewZoom =
    clamp(
      value,
      CONFIG.PREVIEW.MIN_ZOOM,
      CONFIG.PREVIEW.MAX_ZOOM
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
