let isValidated = false;
$('#noticeForm').submit(function(event) {
  console.log("noticeFormvalidatevalidatevalidatevalidate");
  if (isValidated) {
    return;
  }
  event.preventDefault();
  const $form = $(this);
  const fd = new FormData($form[0]);
  $.ajax({
    url : '/back/noticeRegister/validate',
    type: $form.attr('method'),
    data: $form.serialize(),
    timeout: 30000,
  })
  .done(function(data) {
    console.log("/back/noticeRegister/validate  成功");
    removeErrorInfo();
    if (!data) {
      console.log("/back/noticeRegister/validate  成功1"); 
      // バリデーション異常なしの場合
      isValidated = true;
      $('#noticeForm').submit();

    } else {
      // バリデーション異常ありの場合
      const errorInfo = data;
      if (errorInfo.notice) {
        console.log("=========>notice");
        $('#inputnotice').parents('.form-group').addClass('has-error');
        $('#errornotice').text(errorInfo.notice.msg);
      }
      if (errorInfo.link) {
        if(!errorInfo.link.msg) {
          location.href = '/back/login';
          return;
        }
        $('#inputLink').parents('.form-group').addClass('has-error');
        $('#errorLink').text(errorInfo.link.msg);
      }
      if (errorInfo.publishDateTimeStart) {
        $('#inputPublishDateTimeStart').parents('.form-group').addClass('has-error');
        $('#errorPublishDateTimeStart').text(errorInfo.publishDateTimeStart.msg);
      }
      if (errorInfo.publishDateTimeEnd) {
        $('#inputPublishDateTimeEnd').parents('.form-group').addClass('has-error');
        $('#errorPublishDateTimeEnd').text(errorInfo.publishDateTimeEnd.msg);
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
  $('#inputLink').parents('.form-group').removeClass('has-error');
  $('#errorLink').text(EMPTY_STRING);
  $('#inputPublishDateTimeStart').parents('.form-group').removeClass('has-error');
  $('#errorPublishDateTimeStart').text(EMPTY_STRING);
  $('#inputPublishDateTimeEnd').parents('.form-group').removeClass('has-error');
  $('#errorPublishDateTimeEnd').text(EMPTY_STRING);
  $('#inputnotice').parents('.form-group').removeClass('has-error');
  $('#errornotice').text(EMPTY_STRING);
  $('#errorMessage').removeClass('alert alert-danger');
  $('#errorMessage').find('p').text(EMPTY_STRING);
}
