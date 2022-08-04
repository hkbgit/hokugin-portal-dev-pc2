let isValidated = false;
$('#extendForm').submit(function(event) {
  // console.log("validatevalidatevalidatevalidatevalidate");
  if (isValidated) {
    return;
  }
  event.preventDefault();
  const $form = $(this);
  const fd = new FormData($form[0]);
  $.ajax({
    url : '/back/extendRegister/validate/discussAdd',
    type: $form.attr('method'),
    data: fd,
    processData: false,
    contentType: false,
    timeout: 30000,
  })
  .done(function(data) {
    console.log("/back/extendRegister/validate  成功");
    removeErrorInfo();
    if (!data) {
      console.log("/back/extendRegister/validate  成功1"); 
      // バリデーション異常なしの場合
      isValidated = true;
      editor.sync();
      // eidtor_html = document.getElementById('editor_id').value; // 原生API
      // // 设置HTML内容
      // editor.html(editor);

      $('#extendForm').submit();

    } else {
      // バリデーション異常ありの場合
      const errorInfo = data;
      if (errorInfo.bannerPosition) {
        $('#selectBannerPosition').parents('.form-group').addClass('has-error');
        $('#errorBannerPosition').text(errorInfo.title.msg);
      }
      if (errorInfo.smalTitle) {
        $('#inputSmalTitle').parents('.form-group').addClass('has-error');
        $('#errorSmalTitle').text(errorInfo.smalTitle.msg);
      }
      if (errorInfo.Priority) {
        $('#inputPriority').parents('.form-group').addClass('has-error');
        $('#errorPriority').text(errorInfo.Priority.msg);
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
