import {
  CONFIG
} from './config.js';


import {
  dom,
  showToast,
  confirmAction
} from './dom.js';


import {
  getState,
  updateState,
  createDefaultBlocks
} from './store.js';


import {
  clamp,
  createId
} from './utils.js';


import {
  selectPhotoForSlot,
  openCropDialog,
  removePhotoRecord
} from './photos.js';


let pointerState = null;


export function initLayout() {

  dom.layoutToggle.addEventListener(
    'change',
    toggleLayoutEditing
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


  dom.btnBlockFront.addEventListener(
    'click',
    bringFront
  );


  dom.btnBlockBack.addEventListener(
    'click',
    sendBack
  );


  dom.btnBlockDelete.addEventListener(
    'click',
    deleteSelectedBlock
  );


  dom.btnLayoutReset.addEventListener(
    'click',
    resetLayout
  );


  dom.layoutCanvas.addEventListener(
    'click',
    selectBlockFromCanvas
  );


  dom.layoutCanvas.addEventListener(
    'pointerdown',
    beginPointerAction
  );


  window.addEventListener(
    'pointermove',
    movePointer
  );


  window.addEventListener(
    'pointerup',
    finishPointer
  );
}


export function renderLayoutInspector() {

  const state =
    getState();


  const enabled =
    state.layoutEditing;


  dom.layoutToggle.checked =
    enabled;


  dom.layoutTools.setAttribute(
    'aria-disabled',
    String(!enabled)
  );


  dom.blockAddButtons.forEach(
    button => {

      button.disabled =
        !enabled;
    }
  );


  const block =
    state.blocks.find(
      item =>
        item.id ===
        state.selectedBlockId
    );


  if (
    !enabled ||
    !block
  ) {

    dom.blockInspector.hidden =
      true;

    return;
  }


  dom.blockInspector.hidden =
    false;


  dom.selectedBlockLabel.textContent =
    blockLabel(
      block
    );


  dom.blockInspectorContent.innerHTML =
    '';


  if (
    block.type === 'subtitle'
  ) {

    dom.blockInspectorContent.appendChild(
      makeTextInput(
        '소제목',
        block.text || '',
        value => {

          updateBlock(
            block.id,
            item => {

              item.text =
                value;
            }
          );
        }
      )
    );


    dom.blockInspectorContent.appendChild(
      makeTextInput(
        '표시 문자',
        block.marker || '•',
        value => {

          updateBlock(
            block.id,
            item => {

              item.marker =
                value.slice(0, 3);
            }
          );
        }
      )
    );
  }


  if (
    block.type === 'text'
  ) {

    dom.blockInspectorContent.appendChild(
      makeTextarea(
        '텍스트',
        block.text || '',
        value => {

          updateBlock(
            block.id,
            item => {

              item.text =
                value;
            }
          );
        }
      )
    );
  }


  if (
    block.type === 'photo' ||
    block.type === 'photo-caption'
  ) {

    dom.blockInspectorContent.appendChild(
      makeButton(
        '사진 선택/변경',
        () => {

          selectPhotoForSlot(
            block.slotId
          );
        }
      )
    );


    dom.blockInspectorContent.appendChild(
      makeButton(
        '사진 위치 조정',
        () => {

          openCropDialog(
            block.slotId
          );
        }
      )
    );


    if (
      block.type === 'photo-caption'
    ) {

      const photo =
        state.photos.find(
          item =>
            item.slotId ===
            block.slotId
        );


      dom.blockInspectorContent.appendChild(
        makeTextInput(
          '사진 설명',
          photo?.caption || '',
          value => {

            updateState(
              state => {

                let target =
                  state.photos.find(
                    item =>
                      item.slotId ===
                      block.slotId
                  );


                if (
                  !target
                ) {

                  target = {
                    slotId:
                      block.slotId,

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
                      null
                  };


                  state.photos.push(
                    target
                  );
                }


                target.caption =
                  value;
              }
            );
          }
        )
      );
    }
  }


  dom.blockInspectorContent.appendChild(
    makeRange(
      '너비',
      2,
      12,
      block.w,
      value => {

        resizeFromInspector(
          block.id,
          value,
          block.h
        );
      }
    )
  );


  dom.blockInspectorContent.appendChild(
    makeRange(
      '높이',
      2,
      18,
      block.h,
      value => {

        resizeFromInspector(
          block.id,
          block.w,
          value
        );
      }
    )
  );


  dom.btnBlockDelete.disabled =
    block.locked;
}


function toggleLayoutEditing() {

  updateState(
    state => {

      state.layoutEditing =
        dom.layoutToggle.checked;


      if (
        !state.layoutEditing
      ) {

        state.selectedBlockId =
          null;
      }

    },
    {
      dirty: false
    }
  );
}


function selectBlockFromCanvas(event) {

  const state =
    getState();


  if (
    !state.layoutEditing
  ) {

    return;
  }


  if (
    event.target.closest(
      '.layout-block__move-handle'
    ) ||
    event.target.closest(
      '.layout-block__resize-handle'
    )
  ) {

    return;
  }


  const element =
    event.target.closest(
      '.layout-block'
    );


  if (
    !element
  ) {

    return;
  }


  updateState(
    state => {

      state.selectedBlockId =
        element.dataset.blockId;

    },
    {
      dirty: false
    }
  );
}


function addBlock(type) {

  const state =
    getState();


  if (
    !state.layoutEditing
  ) {

    return;
  }


  const block = {
    id:
      createId('block'),

    type,

    x: 1,
    y: 1,

    w: 5,
    h: 6,

    z:
      nextZ(),

    locked:
      false
  };


  if (
    type === 'subtitle'
  ) {

    block.text =
      '새 소제목';

    block.marker =
      '•';

    block.w =
      6;

    block.h =
      3;
  }


  if (
    type === 'text'
  ) {

    block.text =
      '추가 내용을 입력해 주세요.';

    block.w =
      6;

    block.h =
      7;
  }


  if (
    type === 'photo' ||
    type === 'photo-caption'
  ) {

    block.slotId =
      createId('photo');

    block.w =
      5;

    block.h =
      type === 'photo-caption'
        ? 8
        : 7;
  }


  const position =
    findPosition(
      block.w,
      block.h
    );


  if (
    !position
  ) {

    showToast(
      '블록을 추가할 빈 공간이 없습니다.',
      'error'
    );

    return;
  }


  block.x =
    position.x;


  block.y =
    position.y;


  updateState(
    state => {

      state.blocks.push(
        block
      );


      state.selectedBlockId =
        block.id;
    }
  );
}


function findPosition(
  width,
  height,
  blocks = getState().blocks
) {

  for (
    let y = 1;
    y <=
      CONFIG.GRID_ROWS -
      height +
      1;
    y += 1
  ) {

    for (
      let x = 1;
      x <=
        CONFIG.GRID_COLUMNS -
        width +
        1;
      x += 1
    ) {

      const candidate = {
        x,
        y,
        w: width,
        h: height
      };


      if (
        !hasCollision(
          candidate,
          null,
          blocks
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


function beginPointerAction(event) {

  const state =
    getState();


  if (
    !state.layoutEditing
  ) {

    return;
  }


  const moveHandle =
    event.target.closest(
      '.layout-block__move-handle'
    );


  const resizeHandle =
    event.target.closest(
      '.layout-block__resize-handle'
    );


  if (
    !moveHandle &&
    !resizeHandle
  ) {

    return;
  }


  event.preventDefault();


  const element =
    event.target.closest(
      '.layout-block'
    );


  const block =
    state.blocks.find(
      item =>
        item.id ===
        element.dataset.blockId
    );


  if (
    !block
  ) {

    return;
  }


  updateState(
    state => {

      state.selectedBlockId =
        block.id;

    },
    {
      dirty: false
    }
  );


  pointerState = {

    mode:
      moveHandle
        ? 'move'
        : 'resize',

    blockId:
      block.id,

    clientX:
      event.clientX,

    clientY:
      event.clientY,

    x:
      block.x,

    y:
      block.y,

    w:
      block.w,

    h:
      block.h,

    candidateX:
      block.x,

    candidateY:
      block.y,

    candidateW:
      block.w,

    candidateH:
      block.h,

    metrics:
      getGridMetrics()
  };
}


function movePointer(event) {

  if (
    !pointerState
  ) {

    return;
  }


  const block =
    getState().blocks.find(
      item =>
        item.id ===
        pointerState.blockId
    );


  if (
    !block
  ) {

    return;
  }


  const dx =
    event.clientX -
    pointerState.clientX;


  const dy =
    event.clientY -
    pointerState.clientY;


  const columns =
    Math.round(
      dx /
      pointerState.metrics.column
    );


  const rows =
    Math.round(
      dy /
      pointerState.metrics.row
    );


  if (
    pointerState.mode === 'move'
  ) {

    pointerState.candidateX =
      clamp(
        pointerState.x +
        columns,

        1,

        CONFIG.GRID_COLUMNS -
        block.w +
        1
      );


    pointerState.candidateY =
      clamp(
        pointerState.y +
        rows,

        1,

        CONFIG.GRID_ROWS -
        block.h +
        1
      );

  } else {

    pointerState.candidateW =
      clamp(
        pointerState.w +
        columns,

        2,

        CONFIG.GRID_COLUMNS -
        block.x +
        1
      );


    pointerState.candidateH =
      clamp(
        pointerState.h +
        rows,

        2,

        CONFIG.GRID_ROWS -
        block.y +
        1
      );
  }


  const element =
    dom.layoutCanvas.querySelector(
      `[data-block-id="${block.id}"]`
    );


  if (
    !element
  ) {

    return;
  }


  element.style.setProperty(
    '--block-x',
    pointerState.candidateX
  );


  element.style.setProperty(
    '--block-y',
    pointerState.candidateY
  );


  element.style.setProperty(
    '--block-w',
    pointerState.candidateW
  );


  element.style.setProperty(
    '--block-h',
    pointerState.candidateH
  );
}


function finishPointer() {

  if (
    !pointerState
  ) {

    return;
  }


  const pointer =
    pointerState;


  pointerState =
    null;


  const state =
    getState();


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


  const candidate = {
    x:
      pointer.candidateX,

    y:
      pointer.candidateY,

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


    updateState(
      () => {},
      {
        dirty: false
      }
    );


    return;
  }


  updateState(
    state => {

      const target =
        state.blocks.find(
          item =>
            item.id ===
            block.id
        );


      Object.assign(
        target,
        candidate
      );
    }
  );
}


function getGridMetrics() {

  const rect =
    dom.layoutCanvas
      .getBoundingClientRect();


  return {
    column:
      rect.width /
      CONFIG.GRID_COLUMNS,

    row:
      rect.height /
      CONFIG.GRID_ROWS
  };
}


function hasCollision(
  candidate,
  ignoreId,
  blocks = getState().blocks
) {

  return blocks.some(
    block => {

      if (
        block.id ===
        ignoreId
      ) {

        return false;
      }


      return !(
        candidate.x +
        candidate.w -
        1 <
        block.x ||

        block.x +
        block.w -
        1 <
        candidate.x ||

        candidate.y +
        candidate.h -
        1 <
        block.y ||

        block.y +
        block.h -
        1 <
        candidate.y
      );
    }
  );
}


function resizeFromInspector(
  id,
  width,
  height
) {

  const state =
    getState();


  const block =
    state.blocks.find(
      item =>
        item.id === id
    );


  const candidate = {
    x:
      block.x,

    y:
      block.y,

    w:
      Math.min(
        width,
        CONFIG.GRID_COLUMNS -
        block.x +
        1
      ),

    h:
      Math.min(
        height,
        CONFIG.GRID_ROWS -
        block.y +
        1
      )
  };


  if (
    hasCollision(
      candidate,
      id
    )
  ) {

    showToast(
      '다른 블록과 겹쳐서 크기를 변경할 수 없습니다.',
      'error'
    );

    return;
  }


  updateBlock(
    id,
    block => {

      block.w =
        candidate.w;

      block.h =
        candidate.h;
    }
  );
}


function bringFront() {

  const id =
    getState()
      .selectedBlockId;


  if (
    !id
  ) {

    return;
  }


  updateBlock(
    id,
    block => {

      block.z =
        nextZ();
    }
  );
}


function sendBack() {

  const id =
    getState()
      .selectedBlockId;


  if (
    !id
  ) {

    return;
  }


  updateState(
    state => {

      const block =
        state.blocks.find(
          item =>
            item.id === id
        );


      block.z =
        Math.min(
          ...state.blocks.map(
            item =>
              item.z || 1
          )
        ) -
        1;


      const ordered =
        [...state.blocks]
          .sort(
            (a, b) =>
              a.z - b.z
          );


      ordered.forEach(
        (item, index) => {

          item.z =
            index + 1;
        }
      );
    }
  );
}


async function deleteSelectedBlock() {

  const state =
    getState();


  const block =
    state.blocks.find(
      item =>
        item.id ===
        state.selectedBlockId
    );


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

    removePhotoRecord(
      block.slotId
    );
  }


  updateState(
    state => {

      state.blocks =
        state.blocks.filter(
          item =>
            item.id !==
            block.id
        );


      state.selectedBlockId =
        null;
    }
  );
}


async function resetLayout() {

  const confirmed =
    await confirmAction(
      '레이아웃 초기화',

      '활동 1·2의 기본 블록을 원래 위치로 되돌릴까요? 추가한 블록과 내용은 유지됩니다.'
    );


  if (
    !confirmed
  ) {

    return;
  }


  updateState(
    state => {

      const defaults =
        createDefaultBlocks();


      const extras =
        state.blocks.filter(
          block =>
            !block.locked
        );


      state.blocks =
        defaults;


      extras.forEach(
        extra => {

          let position = {
            x:
              extra.x,

            y:
              extra.y
          };


          if (
            hasCollision(
              extra,
              null,
              state.blocks
            )
          ) {

            position =
              findPosition(
                extra.w,
                extra.h,
                state.blocks
              ) ||
              position;
          }


          extra.x =
            position.x;


          extra.y =
            position.y;


          state.blocks.push(
            extra
          );
        }
      );


      state.selectedBlockId =
        null;
    }
  );


  showToast(
    '기본 레이아웃으로 되돌렸습니다.',
    'success'
  );
}


function nextZ() {

  return (
    Math.max(
      1,
      ...getState()
        .blocks
        .map(
          block =>
            block.z || 1
        )
    ) +
    1
  );
}


function updateBlock(
  id,
  callback
) {

  updateState(
    state => {

      const block =
        state.blocks.find(
          item =>
            item.id === id
        );


      if (
        block
      ) {

        callback(block);
      }
    }
  );
}


function blockLabel(block) {

  return {
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
  }[block.type] ||
  block.type;
}


function makeTextInput(
  title,
  value,
  onInput
) {

  const label =
    document.createElement(
      'label'
    );


  label.className =
    'field';


  label.innerHTML =
    `<span class="field__label">${title}</span>`;


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
    () => onInput(input.value)
  );


  label.appendChild(
    input
  );


  return label;
}


function makeTextarea(
  title,
  value,
  onInput
) {

  const label =
    document.createElement(
      'label'
    );


  label.className =
    'field field--full';


  label.innerHTML =
    `<span class="field__label">${title}</span>`;


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
    () => onInput(textarea.value)
  );


  label.appendChild(
    textarea
  );


  return label;
}


function makeButton(
  text,
  onClick
) {

  const wrapper =
    document.createElement(
      'div'
    );


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


function makeRange(
  title,
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


  const caption =
    document.createElement(
      'span'
    );


  caption.className =
    'field__label';


  caption.textContent =
    title;


  const input =
    document.createElement(
      'input'
    );


  input.type =
    'range';


  input.min =
    min;


  input.max =
    max;


  input.value =
    value;


  input.addEventListener(
    'change',
    () => {

      onInput(
        Number(
          input.value
        )
      );
    }
  );


  label.append(
    caption,
    input
  );


  return label;
}
