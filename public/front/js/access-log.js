// コンテンツタップ時にアクセスログ送信APIにリクエストする
$('.sendAccessLog').click(function() {
  var userId = $('#contracterNo').text() ? $('#contracterNo').text() : '';
  var target = $(this).find($('img')).attr('alt');
  var jsonData = {
    userId: userId,
    target: target,
    bannerLink: ''
  };
  $.ajax({
    url : '/api/v1/log/access',
    type: 'post',
    contentType: 'application/JSON',
    data: JSON.stringify(jsonData),
    dataType : 'JSON',
    scriptCharset: 'utf-8',
    timeout: 60000,
  })
  .done(function(data) {
    // 結果は無視する為、特に処理なし
  })
  .fail(function(XMLHttpRequest, textStatus, errorThrown) {
    // 結果は無視する為、特に処理なし
  })
})
