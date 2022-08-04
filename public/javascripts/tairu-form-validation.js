let isValidated = false;
$('#tairuForm').submit(function(event) {
  console.log("tairuFormvalidatevalidatevalidatevalidate");
  if (isValidated) {
    return;
  }
  event.preventDefault();
  const $form = $(this);
  const fd = new FormData($form[0]);
  $.ajax({
    url : '/back/tairuRegister/validate',
    type: $form.attr('method'),
    data: fd,
    processData: false,
    contentType: false,
    timeout: 30000,
  })
  .done(function(data) {
    console.log("/back/tairuRegister/validate  成功");
    removeErrorInfo();
    if (!data) {
      console.log("/back/tairuRegister/validate  成功1"); 
      // バリデーション異常なしの場合
      isValidated = true;
      $('#tairuForm').submit();

    } else {
      // バリデーション異常ありの場合
      const errorInfo = data;
      if (errorInfo.title) {
        console.log("=========>title");
        $('#inputTitle').parents('.form-group').addClass('has-error');
        $('#errorTitle').text(errorInfo.title.msg);
      }
      
      if (errorInfo.image) {
        console.log("=========>image");
        $('#inputImageName').parents('.form-group').addClass('has-error');
        $('#errorImageName').text(errorInfo.image.msg);
      }

      if (errorInfo.link) {
        if(!errorInfo.link.msg) {
          location.href = '/back/login';
          return;
        }
        $('#inputLink').parents('.form-group').addClass('has-error');
        $('#errorLink').text(errorInfo.link.msg);
      }

      if (errorInfo.priority) {
        $('#inputPriority').parents('.form-group').addClass('has-error');
        $('#errorPriority').text(errorInfo.priority.msg);
      }

      if (errorInfo.priority) {
        $('#inputPriority').parents('.form-group').addClass('has-error');
        $('#errorPriority').text(errorInfo.priority.msg);
      }
    
      if (errorInfo.coordinate) {
        $('#selectCoordinate').parents('.form-group').addClass('has-error');
        $('#errorCoordinate').text(errorInfo.coordinate.msg);
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
  $('#selectCoordinate').parents('.form-group').removeClass('has-error');
  $('#errorCoordinate').text(EMPTY_STRING);
  $('#inputImageName').parents('.form-group').removeClass('has-error');
  $('#errorImageName').text(EMPTY_STRING);
  $('#inputImageNames').parents('.form-group').removeClass('has-error');
  $('#errorImageNames').text(EMPTY_STRING);
  $('#inputLink').parents('.form-group').removeClass('has-error');
  $('#errorLink').text(EMPTY_STRING);
  $('#inputPriority').parents('.form-group').removeClass('has-error');
  $('#errorPriority').text(EMPTY_STRING);
  $('#errorMessage').removeClass('alert alert-danger');
  $('#errorMessage').find('p').text(EMPTY_STRING);
}
