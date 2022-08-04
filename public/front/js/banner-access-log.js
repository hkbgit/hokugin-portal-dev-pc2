// バナータップ時にアクセスログ送信APIにリクエストする
  $('.bannerClick').on('click', function() {
    var userId = $('#contracterNo').text() ? $('#contracterNo').text() : '';
    // userId = "8907555"
    var bannerLink = $(this).attr('href') ? $(this).attr('href') : '';
    console.log();
    if (bannerLink) {
      // "bankingappli://browser?url="を削除する
      var PATTERN_CUSTOM_URL = /bankingappli:\/\/browser\?url=/;
      if (null !== bannerLink.match(PATTERN_CUSTOM_URL)) {
        bannerLink = bannerLink.replace(PATTERN_CUSTOM_URL, '');
      } else {
        // "bankingappli://browser?url="の文字列が存在しない場合は、リンクではないのでアクセスログを送信せず処理終了。
        return;
      }
    }
    var jsonData = {
      userId: userId,
      target: 'バナーリンク', // 固定文字列
      bannerLink: bannerLink
    };
    $.ajax({
      url : '/api/v1/log/access',
      type: 'post',
      contentType: 'application/JSON',
      data: JSON.stringify(jsonData),
      dataType : 'JSON',
      scriptCharset: 'utf-8',
      timeout: 10000,
    })
    .done(function(data) {
      // 結果は無視する為、特に処理なし
    })
    .fail(function(XMLHttpRequest, textStatus, errorThrown) {
      // 結果は無視する為、特に処理なし
    })
  })






