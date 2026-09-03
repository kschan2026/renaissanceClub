import {
  CONFIG
} from './config.js';


import {
  dom,
  showToast,
  showLoading,
  hideLoading,
  setSaveStatus,
  confirmAction
} from './dom.js';


import {
  apiRequest
} from './api.js';


import {
  getState,
  replaceState,
  resetState,
  isDirty,
  setDirty,
  createEmptyState,
  createDefaultBlocks
} from './store.js';


import {
  syncEditorFromState
} from './editor.js';


import {
  capturePoster,
  downloadCompleteFiles
} from './export.js';


import {
  fitPreviewToWindow
} from './render.js';


import {
  saveLocalDraftNow,
  clearLocalDraft
} from './local-storage.js';


import {
  normalizeCrop,
  formatDateTime
} from './utils.js';


let projects = [];

let filter = 'all';


export function initProject() {

  dom.btnNew.addEventListener(
    'click',
    newProject
  );


  dom.btnLoadCloud.addEventListener(
    'click',
    openCloud
  );


  dom.btnSaveDraft.addEventListener(
    'click',
    () => saveProject(false)
  );


  dom.btnSaveComplete.addEventListener(
    'click',
    () => saveProject(true)
  );


  dom.btnCloseCloudDialog.addEventListener(
    'click',
    () => {

      dom.cloudDialog.close();
    }
  );


  dom.filterChips.forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          filter =
            button.dataset.projectFilter;


          dom.filterChips.forEach(
            chip => {

              chip.classList.toggle(
                'is-active',
                chip === button
              );
            }
          );


          renderProjectList();
        }
      );
    }
  );


  window.addEventListener(
    'beforeunload',
    event => {

      if (
        !isDirty()
      ) {

        return;
      }


      event.preventDefault();

      event.returnValue =
        '';
    }
  );
}


async function saveProject(finalize) {

  const state =
    getState();


  if (
    !state.clubName.trim()
  ) {

    showToast(
      '동아리명을 입력해 주세요.',
      'error'
    );


    dom.clubName.focus();

    return;
  }


  if (
    finalize
  ) {

    const confirmed =
      await confirmAction(
        '완성본 저장',

        'Google Drive에 완성본을 저장하고 PNG와 PDF 파일도 내려받을까요?'
      );


    if (
      !confirmed
    ) {

      return;
    }
  }


  showLoading(
    finalize
      ? '완성본을 저장하는 중입니다.'
      : '작성 중인 내용을 저장하는 중입니다.'
  );


  try {

    let preview = null;


    /*
     * 작성 중 저장은 외부 이미지 라이브러리를
     * 사용하지 않아도 되도록 미리보기를 생략한다.
     *
     * 완성본 저장 때만 PNG를 만든다.
     */
    if (
      finalize
    ) {

      preview =
        await capturePoster(
          CONFIG.PREVIEW.COMPLETE_PIXEL_RATIO
        );
    }


    const request = {

      action:
        'saveProject',

      finalize,

      expectedUpdatedAt:
        state.updatedAt ||
        null,

      project:
        buildProjectPayload(),

      photos:
        buildPhotoPayload()
    };


    if (
      preview
    ) {

      request.preview = {
        dataUrl:
          preview
      };
    }


    const saved =
      await apiRequest(
        request
      );


    const loaded =
      await apiRequest({

        action:
          'loadProject',

        projectId:
          saved.id
      });


    replaceState(
      normalizeProjectState(
        loaded.project
      ),
      {
        dirty: false
      }
    );


    syncEditorFromState();


    await saveLocalDraftNow();


    setDirty(false);


    setSaveStatus(
      finalize
        ? '완성본 저장됨'
        : '클라우드 저장됨',
      'saved'
    );


    if (
      finalize
    ) {

      showLoading(
        'PNG와 PDF 파일을 만드는 중입니다.'
      );


      await downloadCompleteFiles();


      showToast(
        '완성본 저장을 완료했습니다.',
        'success'
      );

    } else {

      showToast(
        '작성 중인 내용을 저장했습니다.',
        'success'
      );
    }

  } catch (error) {

    setSaveStatus(
      '저장 실패',
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


function buildProjectPayload() {

  const state =
    getState();


  return {
    id:
      state.id,

    type:
      state.type,

    clubName:
      state.clubName,

    teacherName:
      state.teacherName,

    activities:
      state.activities,

    blocks:
      state.blocks.map(
        block => {

          const result = {
            id:
              block.id,

            type:
              block.type,

            x:
              block.x,

            y:
              block.y,

            w:
              block.w,

            h:
              block.h,

            z:
              block.z || 1,

            locked:
              Boolean(block.locked)
          };


          if (
            block.activityId
          ) {

            result.activityId =
              block.activityId;
          }


          if (
            block.slotId
          ) {

            result.slotId =
              block.slotId;
          }


          if (
            block.text !== undefined
          ) {

            result.text =
              block.text;
          }


          if (
            block.marker !== undefined
          ) {

            result.marker =
              block.marker;
          }


          return result;
        }
      )
  };
}


function buildPhotoPayload() {

  return getState()
    .photos
    .filter(
      photo =>
        photo.dataUrl ||
        photo.fileId
    )
    .map(
      photo => {

        const result = {
          slotId:
            photo.slotId,

          caption:
            photo.caption || '',

          crop:
            normalizeCrop(
              photo.crop
            )
        };


        if (
          photo.fileId
        ) {

          result.fileId =
            photo.fileId;

        } else {

          result.dataUrl =
            photo.dataUrl;
        }


        return result;
      }
    );
}


async function openCloud() {

  dom.cloudDialog.showModal();


  dom.cloudProjectList.innerHTML =
    '<p class="empty-state">불러오는 중입니다.</p>';


  try {

    const result =
      await apiRequest({
        action:
          'listProjects'
      });


    projects =
      result.projects ||
      [];


    renderProjectList();

  } catch (error) {

    dom.cloudProjectList.innerHTML =
      `<p class="empty-state">${error.message}</p>`;
  }
}


function renderProjectList() {

  dom.cloudProjectList.innerHTML =
    '';


  const filtered =
    projects.filter(
      project =>
        filter === 'all' ||
        project.type === filter
    );


  if (
    !filtered.length
  ) {

    dom.cloudProjectList.innerHTML =
      '<p class="empty-state">저장된 프로젝트가 없습니다.</p>';

    return;
  }


  filtered.forEach(
    project => {

      dom.cloudProjectList.appendChild(
        createProjectItem(
          project
        )
      );
    }
  );
}


function createProjectItem(project) {

  const item =
    document.createElement(
      'article'
    );


  item.className =
    'project-item';


  const preview =
    document.createElement(
      'div'
    );


  preview.className =
    'project-item__preview';


  preview.style.background =
    project.type === 'creative'
      ? '#efe5f5'
      : '#dfeef8';


  const info =
    document.createElement(
      'div'
    );


  const title =
    document.createElement(
      'h3'
    );


  title.className =
    'project-item__name';


  title.textContent =
    project.clubName;


  const meta =
    document.createElement(
      'p'
    );


  meta.className =
    'project-item__meta';


  meta.textContent = [
    project.typeLabel,

    project.teacherName
      ? `담당 ${project.teacherName}`
      : '',

    project.updatedAt
      ? formatDateTime(
          project.updatedAt
        )
      : ''
  ]
    .filter(Boolean)
    .join(' · ');


  info.append(
    title,
    meta
  );


  const actions =
    document.createElement(
      'div'
    );


  actions.className =
    'project-item__actions';


  const load =
    document.createElement(
      'button'
    );


  load.className =
    'mini-btn';

  load.type =
    'button';

  load.textContent =
    '불러오기';


  load.addEventListener(
    'click',
    () => {

      loadProject(
        project.id
      );
    }
  );


  const remove =
    document.createElement(
      'button'
    );


  remove.className =
    'mini-btn mini-btn--danger';

  remove.type =
    'button';

  remove.textContent =
    '삭제';


  remove.addEventListener(
    'click',
    () => {

      deleteProject(
        project
      );
    }
  );


  actions.append(
    load,
    remove
  );


  item.append(
    preview,
    info,
    actions
  );


  return item;
}


async function loadProject(id) {

  if (
    isDirty()
  ) {

    const confirmed =
      await confirmAction(
        '프로젝트 불러오기',

        '현재 수정 중인 내용을 저장하지 않고 불러올까요?'
      );


    if (
      !confirmed
    ) {

      return;
    }
  }


  showLoading(
    '프로젝트를 불러오는 중입니다.'
  );


  try {

    const result =
      await apiRequest({
        action:
          'loadProject',

        projectId:
          id
      });


    replaceState(
      normalizeProjectState(
        result.project
      ),
      {
        dirty: false
      }
    );


    syncEditorFromState();


    await saveLocalDraftNow();


    setDirty(false);


    dom.cloudDialog.close();


    requestAnimationFrame(
      fitPreviewToWindow
    );


    showToast(
      '프로젝트를 불러왔습니다.',
      'success'
    );

  } catch (error) {

    showToast(
      error.message,
      'error'
    );

  } finally {

    hideLoading();
  }
}


async function deleteProject(project) {

  const confirmed =
    await confirmAction(
      '프로젝트 삭제',

      `"${project.clubName}" 프로젝트를 삭제할까요?`
    );


  if (
    !confirmed
  ) {

    return;
  }


  showLoading(
    '프로젝트를 삭제하는 중입니다.'
  );


  try {

    await apiRequest({
      action:
        'deleteProject',

      projectId:
        project.id
    });


    projects =
      projects.filter(
        item =>
          item.id !== project.id
      );


    if (
      getState().id ===
      project.id
    ) {

      resetState();

      syncEditorFromState();

      await clearLocalDraft();
    }


    renderProjectList();


    showToast(
      '프로젝트를 삭제했습니다.',
      'success'
    );

  } catch (error) {

    showToast(
      error.message,
      'error'
    );

  } finally {

    hideLoading();
  }
}


async function newProject() {

  if (
    isDirty()
  ) {

    const confirmed =
      await confirmAction(
        '새로 만들기',

        '현재 수정 중인 내용을 저장하지 않고 새 작업을 시작할까요?'
      );


    if (
      !confirmed
    ) {

      return;
    }
  }


  resetState();


  syncEditorFromState();


  await clearLocalDraft();


  setSaveStatus(
    '새 작업'
  );


  requestAnimationFrame(
    fitPreviewToWindow
  );
}


export function normalizeProjectState(project) {

  const empty =
    createEmptyState();


  const activities = [
    {
      id:
        'activity_1',

      title:
        project.activities?.[0]?.title ||
        '',

      content:
        project.activities?.[0]?.content ||
        ''
    },

    {
      id:
        'activity_2',

      title:
        project.activities?.[1]?.title ||
        '',

      content:
        project.activities?.[1]?.content ||
        ''
    }
  ];


  const blocks =
    Array.isArray(
      project.blocks
    ) &&
    project.blocks.length
      ? project.blocks
      : createDefaultBlocks();


  return {
    ...empty,

    id:
      project.id ||
      null,

    type:
      project.type === 'creative'
        ? 'creative'
        : 'autonomous',

    clubName:
      project.clubName ||
      '',

    teacherName:
      project.teacherName ||
      '',

    activities,

    blocks,

    photos:
      Array.isArray(
        project.photos
      )
        ? project.photos.map(
            photo => ({
              ...photo,

              crop:
                normalizeCrop(
                  photo.crop
                )
            })
          )
        : [],

    status:
      project.status ||
      'draft',

    createdAt:
      project.createdAt ||
      null,

    updatedAt:
      project.updatedAt ||
      null
  };
}
