let isValidated = false;
$('#topBannerForm').submit(function(event) {
  if (isValidated) {
    return;
  }
  event.preventDefault();
  const $form = $(this);
  const fd = new FormData($form[0]);
  const url = $form[0].action + '/validate';
  $.ajax({
    url : url,
    type: $form.attr('method'),
    data: fd,
    processData: false,
    contentType: false,
    timeout: 60000,
  })
  .done(function(data) {
    removeErrorInfo();
    if (!data) {
      // バリデーション異常なしの場合
      isValidated = true;
      $('#topBannerForm').submit();
    } else {
      // バリデーション異常ありの場合
      const errorInfo = data;
      if (errorInfo.title) {
        $('#inputTitle').parents('.form-group').addClass('has-error');
        $('#errorTitle').text(errorInfo.title.msg);
      }
      if (errorInfo.bannerPosition) {
        $('#selectBannerPosition').parents('.form-group').addClass('has-error');
        $('#errorBannerPosition').text(errorInfo.bannerPosition.msg);
      }
      if (errorInfo.topBannerAttribute) {
        $('#selectTopBannerAttribute').parents('.form-group').addClass('has-error');
        $('#errorTopBannerAttribute').text(errorInfo.topBannerAttribute.msg);
      }
      if (errorInfo.image) {
        $('#inputImageName').parents('.form-group').addClass('has-error');
        $('#errorImageName').text(errorInfo.image.msg);
      }
      if (errorInfo.link) {
        // HACK
        // セッションタイムアウトが生じるとerrorInfo.linkが関数を返す（返却されたloginページのHTMLオブジェクト由来と推測）
        // この場合msgプロパティは存在しないはずなので、強引にリダイレクトをかける
        if(!errorInfo.link.msg) {
          location.href = '/back/login';
          return;
        }
        $('#inputLink').parents('.form-group').addClass('has-error');
        $('#errorLink').text(errorInfo.link.msg);
      }
      if (errorInfo.csv) {
        $('#inputCsvName').parents('.form-group').addClass('has-error');
        $('#errorCsvName').text(errorInfo.csv.msg);
      }
      if (errorInfo.publishDateTimeStart) {
        $('#inputPublishDateTimeStart').parents('.form-group').addClass('has-error');
        $('#errorPublishDateTimeStart').text(errorInfo.publishDateTimeStart.msg);
      }
      if (errorInfo.publishDateTimeEnd) {
        $('#inputPublishDateTimeEnd').parents('.form-group').addClass('has-error');
        $('#errorPublishDateTimeEnd').text(errorInfo.publishDateTimeEnd.msg);
      }
      if (errorInfo.priority) {
        $('#inputPriority').parents('.form-group').addClass('has-error');
        $('#errorPriority').text(errorInfo.priority.msg);
      }
      if (errorInfo.comment) {
        $('#inputComment').parents('.form-group').addClass('has-error');
        $('#errorComment').text(errorInfo.comment.msg);
      }
    }
  })
  .fail(function(XMLHttpRequest, textStatus, errorThrown) {
    $('#errorMessage').addClass('alert alert-danger');
    $('#errorMessage').find('p').text('通信エラーが発生しました');
  })
})

/**
* エラーメッセージ情報を空にする
*/
const removeErrorInfo = function() {
  const EMPTY_STRING = '';
  $('#inputTitle').parents('.form-group').removeClass('has-error');
  $('#errorTitle').text(EMPTY_STRING);
  $('#selectBannerPosition').parents('.form-group').removeClass('has-error');
  $('#errorBannerPosition').text(EMPTY_STRING);
  $('#selectTopBannerAttribute').parents('.form-group').removeClass('has-error');
  $('#errorTopBannerAttribute').text(EMPTY_STRING);
  $('#inputImageName').parents('.form-group').removeClass('has-error');
  $('#errorImageName').text(EMPTY_STRING);
  $('#inputLink').parents('.form-group').removeClass('has-error');
  $('#errorLink').text(EMPTY_STRING);
  $('#inputCsvName').parents('.form-group').removeClass('has-error');
  $('#errorCsvName').text(EMPTY_STRING);
  $('#inputPublishDateTimeStart').parents('.form-group').removeClass('has-error');
  $('#errorPublishDateTimeStart').text(EMPTY_STRING);
  $('#inputPublishDateTimeEnd').parents('.form-group').removeClass('has-error');
  $('#errorPublishDateTimeEnd').text(EMPTY_STRING);
  $('#inputPriority').parents('.form-group').removeClass('has-error');
  $('#errorPriority').text(EMPTY_STRING);
  $('#inputComment').parents('.form-group').removeClass('has-error');
  $('#errorComment').text(EMPTY_STRING);
  $('#errorMessage').removeClass('alert alert-danger');
  $('#errorMessage').find('p').text(EMPTY_STRING);
}
