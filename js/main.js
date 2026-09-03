import {
  cacheDom
} from './dom.js';


import {
  subscribe
} from './store.js';


import {
  initEditor
} from './editor.js';


import {
  initPhotos
} from './photos.js';


import {
  initLayout
} from './layout.js';


import {
  initAi
} from './ai.js';


import {
  initProject
} from './project.js';


import {
  renderAll
} from './render.js';


async function init() {

  cacheDom();


  subscribe(
    () => {

      renderAll();
    }
  );


  initEditor();

  initPhotos();

  initLayout();

  initAi();

  await initProject();


  renderAll();
}


document.addEventListener(
  'DOMContentLoaded',
  init
);
