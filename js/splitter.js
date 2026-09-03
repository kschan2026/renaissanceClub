import {
  dom
} from './dom.js';


import {
  fitPreviewToWindow
} from './render.js';


const STORAGE_KEY =
  'club-poster-workspace-ratio';


const DEFAULT_RATIO =
  62;


const MIN_EDITOR_RATIO =
  42;


const MAX_EDITOR_RATIO =
  72;


let splitter =
  null;


let dragging =
  false;


export function initSplitter() {

  splitter =
    document.getElementById(
      'workspace-splitter'
    );


  if (
    !splitter
  ) {

    return;
  }


  restoreRatio();


  splitter.addEventListener(
    'pointerdown',
    startDrag
  );


  window.addEventListener(
    'pointermove',
    moveDrag
  );


  window.addEventListener(
    'pointerup',
    endDrag
  );


  /*
   * 더블클릭하면 기본 62:38 비율로 복구
   */
  splitter.addEventListener(
    'dblclick',
    () => {

      setRatio(
        DEFAULT_RATIO
      );


      saveRatio(
        DEFAULT_RATIO
      );


      requestAnimationFrame(
        fitPreviewToWindow
      );
    }
  );
}


function startDrag(event) {

  event.preventDefault();


  dragging =
    true;


  splitter.classList.add(
    'is-dragging'
  );


  document.body.classList.add(
    'is-resizing-workspace'
  );


  splitter.setPointerCapture?.(
    event.pointerId
  );
}


function moveDrag(event) {

  if (
    !dragging
  ) {

    return;
  }


  const workspace =
    document.querySelector(
      '.workspace'
    );


  if (
    !workspace
  ) {

    return;
  }


  const rect =
    workspace.getBoundingClientRect();


  /*
   * 마우스 X 위치가
   * 전체 workspace의 몇 %인지 계산
   */
  const rawRatio =
    (
      (
        event.clientX -
        rect.left
      ) /
      rect.width
    ) *
    100;


  const ratio =
    clamp(
      rawRatio,
      MIN_EDITOR_RATIO,
      MAX_EDITOR_RATIO
    );


  setRatio(
    ratio
  );


  /*
   * 미리보기 영역 크기가 바뀔 때마다
   * A4도 새 공간에 맞춰 자동 조절
   */
  requestAnimationFrame(
    fitPreviewToWindow
  );
}


function endDrag() {

  if (
    !dragging
  ) {

    return;
  }


  dragging =
    false;


  splitter.classList.remove(
    'is-dragging'
  );


  document.body.classList.remove(
    'is-resizing-workspace'
  );


  const workspace =
    document.querySelector(
      '.workspace'
    );


  const value =
    parseFloat(
      getComputedStyle(
        workspace
      )
        .getPropertyValue(
          '--editor-width'
        )
    );


  if (
    Number.isFinite(
      value
    )
  ) {

    saveRatio(
      value
    );
  }


  requestAnimationFrame(
    fitPreviewToWindow
  );
}


function setRatio(ratio) {

  const workspace =
    document.querySelector(
      '.workspace'
    );


  if (
    !workspace
  ) {

    return;
  }


  workspace.style.setProperty(
    '--editor-width',
    `${ratio}%`
  );
}


function saveRatio(ratio) {

  try {

    localStorage.setItem(
      STORAGE_KEY,
      String(ratio)
    );

  } catch (error) {

    console.warn(
      '화면 비율 저장 실패',
      error
    );
  }
}


function restoreRatio() {

  let ratio =
    DEFAULT_RATIO;


  try {

    const saved =
      Number(
        localStorage.getItem(
          STORAGE_KEY
        )
      );


    if (
      Number.isFinite(
        saved
      )
    ) {

      ratio =
        clamp(
          saved,
          MIN_EDITOR_RATIO,
          MAX_EDITOR_RATIO
        );
    }

  } catch (error) {

    console.warn(
      '화면 비율 복구 실패',
      error
    );
  }


  setRatio(
    ratio
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
