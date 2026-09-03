import {
  APPS_SCRIPT_URL
} from './config.js';


export function isApiConfigured() {

  return Boolean(

    APPS_SCRIPT_URL &&

    /^https:\/\/script\.google\.com\//i
      .test(
        APPS_SCRIPT_URL
      )
  );
}


export async function apiRequest(payload) {

  if (
    !isApiConfigured()
  ) {

    throw new Error(
      'config.js의 APPS_SCRIPT_URL을 설정해 주세요.'
    );
  }


  let response;


  try {

    response =
      await fetch(

        APPS_SCRIPT_URL,

        {
          method:
            'POST',

          headers: {

            'Content-Type':
              'text/plain;charset=utf-8'
          },

          body:
            JSON.stringify(
              payload
            ),

          redirect:
            'follow'
        }
      );

  } catch (error) {

    throw new Error(
      'Apps Script 서버에 연결할 수 없습니다.'
    );
  }


  let result;


  try {

    result =
      await response.json();

  } catch (error) {

    throw new Error(
      'Apps Script 응답을 읽을 수 없습니다.'
    );
  }


  if (
    !result.ok
  ) {

    throw new Error(
      result.error ||
      '서버 오류가 발생했습니다.'
    );
  }


  return result.data;
}
