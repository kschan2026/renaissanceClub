import {
  CONFIG
} from './config.js';


import {
  getState,
  isDirty,
  subscribe
} from './store.js';


import {
  clone,
  debounce
} from './utils.js';


const scheduleSave =
  debounce(
    () => {

      if (
        isDirty()
      ) {

        saveLocalDraftNow()
          .catch(
            error => {

              console.warn(
                '브라우저 임시 저장 실패',
                error
              );
            }
          );
      }

    },
    CONFIG.STORAGE.AUTO_SAVE_DELAY
  );


export function initLocalStorage() {

  subscribe(
    () => {

      scheduleSave();
    }
  );
}


export async function restoreLocalDraft() {

  try {

    const data =
      await read(
        CONFIG.STORAGE.DRAFT_KEY
      );


    return (
      data?.state ||
      null
    );

  } catch (error) {

    console.warn(
      '임시 저장 복구 실패',
      error
    );


    return null;
  }
}


export async function saveLocalDraftNow() {

  await write(
    CONFIG.STORAGE.DRAFT_KEY,
    {
      savedAt:
        Date.now(),

      state:
        clone(
          getState()
        )
    }
  );
}


export async function clearLocalDraft() {

  await remove(
    CONFIG.STORAGE.DRAFT_KEY
  );
}


function openDatabase() {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const request =
        indexedDB.open(
          CONFIG.STORAGE.DB_NAME,
          CONFIG.STORAGE.DB_VERSION
        );


      request.onupgradeneeded =
        () => {

          const db =
            request.result;


          if (
            !db.objectStoreNames.contains(
              CONFIG.STORAGE.STORE_NAME
            )
          ) {

            db.createObjectStore(
              CONFIG.STORAGE.STORE_NAME
            );
          }
        };


      request.onsuccess =
        () => {

          resolve(
            request.result
          );
        };


      request.onerror =
        () => {

          reject(
            request.error
          );
        };
    }
  );
}


async function read(key) {

  const db =
    await openDatabase();


  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(
          CONFIG.STORAGE.STORE_NAME,
          'readonly'
        );


      const request =
        transaction
          .objectStore(
            CONFIG.STORAGE.STORE_NAME
          )
          .get(key);


      request.onsuccess =
        () => {

          resolve(
            request.result
          );
        };


      request.onerror =
        () => {

          reject(
            request.error
          );
        };


      transaction.oncomplete =
        () => {

          db.close();
        };
    }
  );
}


async function write(
  key,
  value
) {

  const db =
    await openDatabase();


  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(
          CONFIG.STORAGE.STORE_NAME,
          'readwrite'
        );


      transaction
        .objectStore(
          CONFIG.STORAGE.STORE_NAME
        )
        .put(
          value,
          key
        );


      transaction.oncomplete =
        () => {

          db.close();

          resolve();
        };


      transaction.onerror =
        () => {

          reject(
            transaction.error
          );
        };
    }
  );
}


async function remove(key) {

  const db =
    await openDatabase();


  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(
          CONFIG.STORAGE.STORE_NAME,
          'readwrite'
        );


      transaction
        .objectStore(
          CONFIG.STORAGE.STORE_NAME
        )
        .delete(key);


      transaction.oncomplete =
        () => {

          db.close();

          resolve();
        };


      transaction.onerror =
        () => {

          reject(
            transaction.error
          );
        };
    }
  );
}
