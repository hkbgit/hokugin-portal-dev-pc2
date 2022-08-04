let isValidated = false;
$('#passwordForm').submit(function(event) {
  if (isValidated) {
    return;
  }
  event.preventDefault();
  const $form = $(this);
  const fd = new FormData($form[0]);
  $.ajax({
    url : '/back/password/validate',
    type: $form.attr('method'),
    data: $form.serialize(),
    timeout: 60000,
  })
  .done(function(data) {
    if (!data) {
      // バリデーション異常なしの場合
      isValidated = true;
      $('#passwordForm').submit();
    } else {
      removeErrorInfo();
      // バリデーション異常ありの場合
      const errorInfo = data;
      if (errorInfo.currentPass) {
        $('#inputCurrentPass').parents('.form-group').addClass('has-error');
        $('#errorCurrentPass').text(errorInfo.currentPass.msg);
      }
      if (errorInfo.newPass) {
        $('#inputNewPass').parents('.form-group').addClass('has-error');
        $('#errorNewPass').text(errorInfo.newPass.msg);
      }
      if (errorInfo.newPass2) {
        $('#inputNewPass2').parents('.form-group').addClass('has-error');
        $('#errorNewPass2').text(errorInfo.newPass2.msg);
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
  $('#inputCurrentPass').val(EMPTY_STRING);
  $('#inputCurrentPass').parents('.form-group').removeClass('has-error');
  $('#errorCurrentPass').text(EMPTY_STRING);
  $('#inputNewPass').val(EMPTY_STRING);
  $('#inputNewPass').parents('.form-group').removeClass('has-error');
  $('#errorNewPass').text(EMPTY_STRING);
  $('#inputNewPass2').val(EMPTY_STRING);
  $('#inputNewPass2').parents('.form-group').removeClass('has-error');
  $('#errorNewPass2').text(EMPTY_STRING);
}
