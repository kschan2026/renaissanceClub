import {
  CONFIG
} from './config.js';


import {
  apiRequest
} from './api.js';


import {
  dom,
  showLoading,
  hideLoading,
  showToast
} from './dom.js';


import {
  getState,
  updateState
} from './store.js';


import {
  clone
} from './utils.js';


import {
  syncEditorFromState
} from './editor.js';


export function initAi() {

  dom.btnAi.addEventListener(
    'click',
    improveActivities
  );


  dom.btnAiUndo.addEventListener(
    'click',
    undoAi
  );
}


export function renderAiControls() {

  const state =
    getState();


  dom.btnAiUndo.hidden =
    !state.aiUndoSnapshot;
}


async function improveActivities() {

  const state =
    getState();


  const activities =
    state.activities.map(
      activity => ({
        id:
          activity.id,

        title:
          activity.title || '',

        content:
          activity.content || ''
      })
    );


  const hasContent =
    activities.some(
      activity =>
        activity.title.trim() ||
        activity.content.trim()
    );


  if (
    !hasContent
  ) {

    showToast(
      'AI로 다듬을 활동 내용을 먼저 입력해 주세요.',
      'error'
    );

    return;
  }


  updateState(
    state => {

      state.aiUndoSnapshot =
        clone(
          state.activities
        );

    },
    {
      dirty: false
    }
  );


  showLoading(
    '전체 활동을 다듬는 중입니다.'
  );


  try {

    const result =
      await apiRequest({

        action:
          'improveActivities',

        targetLength:
          CONFIG.TARGET_ACTIVITY_LENGTH,

        activities
      });


    if (
      !Array.isArray(
        result?.activities
      )
    ) {

      throw new Error(
        'AI 응답 형식이 올바르지 않습니다.'
      );
    }


    updateState(
      state => {

        result.activities.forEach(
          revised => {

            const activity =
              state.activities.find(
                item =>
                  item.id ===
                  revised.id
              );


            if (
              !activity
            ) {

              return;
            }


            activity.title =
              revised.title || '';


            activity.content =
              revised.content || '';
          }
        );
      }
    );


    syncEditorFromState();


    showToast(
      result.cached
        ? 'AI 다듬기를 적용했습니다. (5분 캐시 사용)'
        : '전체 활동을 다듬었습니다.',
      'success'
    );

  } catch (error) {

    updateState(
      state => {

        state.aiUndoSnapshot =
          null;

      },
      {
        dirty: false
      }
    );


    showToast(
      error.message ||
      'AI 다듬기에 실패했습니다.',
      'error'
    );

  } finally {

    hideLoading();
  }
}


function undoAi() {

  const state =
    getState();


  if (
    !state.aiUndoSnapshot
  ) {

    return;
  }


  updateState(
    state => {

      state.activities =
        clone(
          state.aiUndoSnapshot
        );


      state.aiUndoSnapshot =
        null;
    }
  );


  syncEditorFromState();


  showToast(
    'AI 수정 전 내용으로 되돌렸습니다.',
    'success'
  );
}
