import {
  dom,
  confirmAction,
  showToast
} from './dom.js';


import {
  getState,
  updateState
} from './store.js';


export function initEditor() {

  dom.clubTypeInputs.forEach(
    input => {

      input.addEventListener(
        'change',
        updateBasicInfo
      );
    }
  );


  dom.clubName.addEventListener(
    'input',
    updateBasicInfo
  );


  dom.teacher.addEventListener(
    'input',
    updateBasicInfo
  );


  dom.activity1Title.addEventListener(
    'input',
    updateActivities
  );


  dom.activity1Content.addEventListener(
    'input',
    updateActivities
  );


  dom.activity2Title.addEventListener(
    'input',
    updateActivities
  );


  dom.activity2Content.addEventListener(
    'input',
    updateActivities
  );


  dom.btnResetContent.addEventListener(
    'click',
    resetContent
  );
}


function updateBasicInfo() {

  const selectedType =
    dom.clubTypeInputs.find(
      input =>
        input.checked
    )?.value ||
    'autonomous';


  updateState(
    state => {

      state.type =
        selectedType;


      state.clubName =
        dom.clubName.value;


      state.teacherName =
        dom.teacher.value;
    }
  );
}


function updateActivities() {

  updateState(
    state => {

      state.activities[0].title =
        dom.activity1Title.value;


      state.activities[0].content =
        dom.activity1Content.value;


      state.activities[1].title =
        dom.activity2Title.value;


      state.activities[1].content =
        dom.activity2Content.value;
    }
  );


  updateCharacterCounts();
}


export function syncEditorFromState() {

  const state =
    getState();


  dom.clubTypeInputs.forEach(
    input => {

      input.checked =
        input.value ===
        state.type;
    }
  );


  dom.clubName.value =
    state.clubName ||
    '';


  dom.teacher.value =
    state.teacherName ||
    '';


  dom.activity1Title.value =
    state.activities[0]?.title ||
    '';


  dom.activity1Content.value =
    state.activities[0]?.content ||
    '';


  dom.activity2Title.value =
    state.activities[1]?.title ||
    '';


  dom.activity2Content.value =
    state.activities[1]?.content ||
    '';


  updateCharacterCounts();
}


function updateCharacterCounts() {

  dom.activity1Count.textContent =
    `${dom.activity1Content.value.length}자`;


  dom.activity2Count.textContent =
    `${dom.activity2Content.value.length}자`;
}


async function resetContent() {

  const confirmed =
    await confirmAction(
      '내용 초기화',

      '동아리명, 담당교사, 활동 내용과 사진을 초기화할까요? 레이아웃 위치는 유지됩니다.'
    );


  if (
    !confirmed
  ) {

    return;
  }


  updateState(
    state => {

      state.clubName =
        '';


      state.teacherName =
        '';


      state.activities.forEach(
        activity => {

          activity.title =
            '';

          activity.content =
            '';
        }
      );


      state.photos =
        [];


      state.blocks.forEach(
        block => {

          if (
            !block.locked &&
            (
              block.type === 'text' ||
              block.type === 'subtitle'
            )
          ) {

            block.text =
              '';
          }
        }
      );


      state.aiUndoSnapshot =
        null;
    }
  );


  syncEditorFromState();


  showToast(
    '내용을 초기화했습니다.',
    'success'
  );
}
