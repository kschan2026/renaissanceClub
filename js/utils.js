export function $(selector, root = document) {

  return root.querySelector(
    selector
  );
}


export function $$(selector, root = document) {

  return Array.from(
    root.querySelectorAll(
      selector
    )
  );
}


export function clamp(
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


export function clone(value) {

  return JSON.parse(
    JSON.stringify(
      value
    )
  );
}


export function createId(prefix = 'item') {

  const time =
    Date.now()
      .toString(36);


  const random =
    Math.random()
      .toString(36)
      .slice(2, 9);


  return `${prefix}_${time}_${random}`;
}


export function normalizeCrop(crop = {}) {

  return {

    x:
      clamp(
        Number(
          crop.x ?? 50
        ),
        0,
        100
      ),

    y:
      clamp(
        Number(
          crop.y ?? 50
        ),
        0,
        100
      ),

    scale:
      clamp(
        Number(
          crop.scale ?? 1
        ),
        1,
        4
      )
  };
}


export function safeFileName(value) {

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


export function debounce(
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
        () => {

          callback(
            ...args
          );

        },
        delay
      );
  };
}


export function formatDateTime(value) {

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
