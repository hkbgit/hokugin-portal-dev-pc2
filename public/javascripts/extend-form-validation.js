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
    url : '/back/extendRegister/validate',
    type: $form.attr('method'),
    data: fd,
    processData: false,
    contentType: false,
    timeout: 10000,
  })
  .done(function(data) {
    console.log("/back/extendRegister/validate  成功");
    removeErrorInfo();
    if (!data) {
      console.log("/back/extendRegister/validate  成功1"); 
      // バリデーション異常なしの場合
      isValidated = true;
      $('#extendForm').submit();

    } else {
      // バリデーション異常ありの場合
      const errorInfo = data;
      if (errorInfo.title) {
        $('#inputTitle').parents('.form-group').addClass('has-error');
        $('#errorTitle').text(errorInfo.title.msg);
      }
      if (errorInfo.smalTitle) {
        $('#inputSmalTitle').parents('.form-group').addClass('has-error');
        $('#errorSmalTitle').text(errorInfo.smalTitle.msg);
      }
      if (errorInfo.image) {
        console.log("=========>image");
        $('#inputImageName').parents('.form-group').addClass('has-error');
        $('#errorImageName').text(errorInfo.image.msg);
      }
      if (errorInfo.images) {
        console.log("=========>images");
        $('#inputImageNames').parents('.form-group').addClass('has-error');
        $('#errorImageNames').text(errorInfo.images.msg);
      }
      if (errorInfo.catalogLink) {
        // HACK
        // セッションタイムアウトが生じるとerrorInfo.linkが関数を返す（返却されたloginページのHTMLオブジェクト由来と推測）
        // この場合msgプロパティは存在しないはずなので、強引にリダイレクトをかける
        // if(!errorInfo.catalogLink.msg) {
        //   location.href = '/back/login';
        //   return;
        // }
        $('#inputLink').parents('.form-group').addClass('has-error');
        $('#errorLink').text(errorInfo.catalogLink.msg);
      }
      if (errorInfo.catalogTitle) {
        $('#inputCatalog').parents('.form-group').addClass('has-error');
        $('#errorCatalogTitle').text(errorInfo.catalogTitle.msg);
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
