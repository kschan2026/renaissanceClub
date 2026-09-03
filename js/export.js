import {
  CONFIG
} from './config.js';


import {
  dom
} from './dom.js';


import {
  getState
} from './store.js';


import {
  safeFileName
} from './utils.js';


export async function capturePoster(
  pixelRatio
) {

  await loadHtmlToImage();


  if (
    !window.htmlToImage?.toPng
  ) {

    throw new Error(
      'PNG 생성 기능을 불러오지 못했습니다.'
    );
  }


  dom.poster.classList.add(
    'is-exporting'
  );


  const previousLayout =
    dom.poster.dataset
      .layoutEditing;


  dom.poster.dataset.layoutEditing =
    'false';


  try {

    await waitForImages();


    return await window.htmlToImage.toPng(
      dom.poster,
      {
        pixelRatio,

        cacheBust: true,

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
      previousLayout;
  }
}


export async function downloadCompleteFiles() {

  await loadHtmlToImage();

  await loadJsPdf();


  const image =
    await capturePoster(
      CONFIG.PREVIEW.DOWNLOAD_PIXEL_RATIO
    );


  const state =
    getState();


  const name =
    safeFileName(
      state.clubName ||
      '동아리_전시자료'
    );


  downloadDataUrl(
    image,
    `${name}.png`
  );


  const JsPdf =
    window.jspdf?.jsPDF;


  if (
    !JsPdf
  ) {

    throw new Error(
      'PDF 생성 기능을 불러오지 못했습니다.'
    );
  }


  const pdf =
    new JsPdf({
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
    image,
    'PNG',
    0,
    0,
    210,
    297
  );


  pdf.save(
    `${name}.pdf`
  );
}


function downloadDataUrl(
  dataUrl,
  name
) {

  const link =
    document.createElement(
      'a'
    );


  link.href =
    dataUrl;


  link.download =
    name;


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();
}


async function loadHtmlToImage() {

  if (
    window.htmlToImage
  ) {

    return;
  }


  await loadScript(
    CONFIG.LIBRARIES.HTML_TO_IMAGE,
    'html-to-image'
  );
}


async function loadJsPdf() {

  if (
    window.jspdf?.jsPDF
  ) {

    return;
  }


  await loadScript(
    CONFIG.LIBRARIES.JSPDF,
    'jspdf'
  );
}


function loadScript(
  source,
  id
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const old =
        document.querySelector(
          `script[data-lib="${id}"]`
        );


      if (
        old
      ) {

        if (
          old.dataset.loaded ===
          'true'
        ) {

          resolve();

          return;
        }


        old.addEventListener(
          'load',
          resolve,
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
        source;


      script.dataset.lib =
        id;


      script.onload =
        () => {

          script.dataset.loaded =
            'true';

          resolve();
        };


      script.onerror =
        () => {

          reject(
            new Error(
              '외부 저장 라이브러리를 불러오지 못했습니다.'
            )
          );
        };


      document.head.appendChild(
        script
      );
    }
  );
}


async function waitForImages() {

  const images =
    Array.from(
      dom.poster.querySelectorAll(
        'img'
      )
    );


  await Promise.all(
    images.map(
      image => {

        if (
          image.complete
        ) {

          return Promise.resolve();
        }


        return new Promise(
          resolve => {

            image.onload =
              resolve;

            image.onerror =
              resolve;
          }
        );
      }
    )
  );
}
