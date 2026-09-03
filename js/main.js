import {
  initSplitter
} from './splitter.js';


import {
  cacheDom,
  showToast
} from './dom.js';


import {
  subscribe,
  replaceState
} from './store.js';


import {
  initEditor,
  syncEditorFromState
} from './editor.js';


import {
  initPhotos,
  renderPhotoEditors
} from './photos.js';


import {
  initLayout,
  renderLayoutInspector
} from './layout.js';


import {
  initAi,
  renderAiControls
} from './ai.js';


import {
  initProject,
  normalizeProjectState
} from './project.js';


import {
  initPreview,
  renderAll,
  fitPreviewToWindow
} from './render.js';


import {
  initLocalStorage,
  restoreLocalDraft
} from './local-storage.js';


async function init() {

  cacheDom();


  const restored =
    await restoreLocalDraft();


  if (
    restored
  ) {

    replaceState(
      normalizeProjectState(
        restored
      ),
      {
        dirty: false
      }
    );
  }


  /*
   * 상태가 변경될 때 갱신해야 하는
   * 화면만 여기서 모아서 호출한다.
   */
  subscribe(
    () => {

      renderAll();

      renderPhotoEditors();

      renderLayoutInspector();

      renderAiControls();
    }
  );

  initSplitter();
  
  initEditor();

  initPhotos();

  initLayout();

  initAi();

  initProject();

  initPreview();

  initLocalStorage();


  syncEditorFromState();

  renderAll();

  renderPhotoEditors();

  renderLayoutInspector();

  renderAiControls();


  requestAnimationFrame(
    fitPreviewToWindow
  );


  if (
    restored
  ) {

    showToast(
      '브라우저에 임시 저장된 작업을 복구했습니다.',
      'success'
    );
  }
}


document.addEventListener(
  'DOMContentLoaded',
  init
);
