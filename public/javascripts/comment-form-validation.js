let isValidated = false;
$('#commentForm').submit(function(event) {
  console.log("commentFormvalidatevalidatevalidatevalidate");
  if (isValidated) {
    return;
  }
  event.preventDefault();
  const $form = $(this);
  const fd = new FormData($form[0]);
  $.ajax({
    url : '/back/commentRegister/validate',
    type: $form.attr('method'),
    data: $form.serialize(),
    timeout: 30000,
  })
  .done(function(data) {
    console.log("/back/commentRegister/validate  成功");
    removeErrorInfo();
    if (!data) {
      console.log("/back/commentRegister/validate  成功1"); 
      // バリデーション異常なしの場合
      isValidated = true;
      $('#commentForm').submit();

    } else {
      // バリデーション異常ありの場合
      const errorInfo = data;
      if (errorInfo.comment) {
        console.log("=========>comment");
        $('#inputComment').parents('.form-group').addClass('has-error');
        $('#errorComment').text(errorInfo.comment.msg);
      }
      if (errorInfo.kyaraAttr) {
        $('#selectKyaraAttr').parents('.form-group').addClass('has-error');
        $('#errorKyaraAttr').text(errorInfo.kyaraAttr.msg);
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
  $('#inputName').parents('.form-group').removeClass('has-error');
  $('#errorTitle').text(EMPTY_STRING);
  $('#inputSmalTitle').parents('.form-group').removeClass('has-error');
  $('#errorSmalTitle').text(EMPTY_STRING);
  $('#inputImageName').parents('.form-group').removeClass('has-error');
  $('#errorImageName').text(EMPTY_STRING);
  $('#inputImageNames').parents('.form-group').removeClass('has-error');
  $('#errorImageNames').text(EMPTY_STRING);
  $('#inputCatalog').parents('.form-group').removeClass('has-error');
  $('#errorCatalogTitle').text(EMPTY_STRING);
  $('#inputLink').parents('.form-group').removeClass('has-error');
  $('#errorLink').text(EMPTY_STRING);
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
