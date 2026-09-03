import {
  clone
} from './utils.js';


function createActivities() {

  return [

    {
      id: 'activity_1',
      title: '',
      content: ''
    },

    {
      id: 'activity_2',
      title: '',
      content: ''
    }
  ];
}


export function createDefaultBlocks() {

  return [

    {
      id: 'activity_1_title',

      type:
        'activityTitle',

      activityId:
        'activity_1',

      x: 1,
      y: 1,

      w: 12,
      h: 3,

      z: 1,

      locked: true
    },


    {
      id:
        'activity_1_content',

      type:
        'activityContent',

      activityId:
        'activity_1',

      x: 1,
      y: 5,

      w: 6,
      h: 12,

      z: 1,

      locked: true
    },


    {
      id:
        'activity_1_photo_1_block',

      type:
        'photo',

      slotId:
        'activity_1_photo_1',

      x: 8,
      y: 5,

      w: 5,
      h: 6,

      z: 1,

      locked: true
    },


    {
      id:
        'activity_1_photo_2_block',

      type:
        'photo',

      slotId:
        'activity_1_photo_2',

      x: 8,
      y: 12,

      w: 5,
      h: 6,

      z: 1,

      locked: true
    },


    {
      id:
        'activity_2_title',

      type:
        'activityTitle',

      activityId:
        'activity_2',

      x: 1,
      y: 20,

      w: 12,
      h: 3,

      z: 1,

      locked: true
    },


    {
      id:
        'activity_2_photo_1_block',

      type:
        'photo',

      slotId:
        'activity_2_photo_1',

      x: 1,
      y: 24,

      w: 5,
      h: 6,

      z: 1,

      locked: true
    },


    {
      id:
        'activity_2_photo_2_block',

      type:
        'photo',

      slotId:
        'activity_2_photo_2',

      x: 1,
      y: 31,

      w: 5,
      h: 6,

      z: 1,

      locked: true
    },


    {
      id:
        'activity_2_content',

      type:
        'activityContent',

      activityId:
        'activity_2',

      x: 7,
      y: 24,

      w: 6,
      h: 13,

      z: 1,

      locked: true
    }
  ];
}


export function createEmptyState() {

  return {

    id:
      null,

    type:
      'autonomous',

    clubName:
      '',

    teacherName:
      '',

    activities:
      createActivities(),

    blocks:
      createDefaultBlocks(),

    photos:
      [],

    status:
      'draft',

    createdAt:
      null,

    updatedAt:
      null,

    selectedBlockId:
      null,

    layoutEditing:
      false,

    aiUndoSnapshot:
      null
  };
}


let state =
  createEmptyState();


let dirty =
  false;


const listeners =
  new Set();


export function getState() {

  return state;
}


export function replaceState(
  newState,
  options = {}
) {

  state =
    newState;


  dirty =
    Boolean(
      options.dirty
    );


  notify();
}


export function resetState() {

  state =
    createEmptyState();


  dirty =
    false;


  notify();
}


export function updateState(
  callback,
  options = {}
) {

  callback(
    state
  );


  if (
    options.dirty !==
    false
  ) {

    dirty =
      true;
  }


  notify();
}


export function notify() {

  listeners.forEach(
    callback => {

      callback(
        state
      );
    }
  );
}


export function subscribe(callback) {

  listeners.add(
    callback
  );


  return () => {

    listeners.delete(
      callback
    );
  };
}


export function isDirty() {

  return dirty;
}


export function setDirty(value) {

  dirty =
    Boolean(
      value
    );
}


export function getActivity(id) {

  return (
    state.activities.find(
      activity =>
        activity.id ===
        id
    ) ||
    null
  );
}


export function getPhoto(slotId) {

  return (
    state.photos.find(
      photo =>
        photo.slotId ===
        slotId
    ) ||
    null
  );
}


export function snapshotActivities() {

  return clone(
    state.activities
  );
}
