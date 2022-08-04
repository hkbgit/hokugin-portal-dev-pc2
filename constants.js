module.exports = Object.freeze({
  FORCE_FREE_PROCESS_MINUTES: 30,
  BANNER_ROOT_PATH: '/img',
  CSV_ROOT_PATH: '/csv',
  CSVFILE_EXT_LIST: ['csv'],
  UPDATE_PASSWORD_LIMIT_DAYS: 75,
  MAX_LENGTH_TITLE: 255,
  MAX_LENGTH_LINK: 1024,
  MAX_NUMBER_PRIORITY: 2147483647,
  MAX_LENGTH_COMMENT: 21844,
  MAX_LENGTH_PASSWORD: 255,
  COORDINATE_ATTRS : ["上部","下部"],
  FILE_EXT_LIST: ['jpg', 'png', 'gif'],
  FILE_DIMENSIONS_LIST: [
    {
      WIDTH: 2250,
      HEIGHT: 60
    }, {
      WIDTH: 1125,
      HEIGHT: 240
    }, {
      WIDTH: 343,
      HEIGHT: 112
    }, {
      WIDTH: 200,
      HEIGHT: 200
    }, {
      WIDTH: 1125,
      HEIGHT: 60
    },
    {
      WIDTH: 2250,
      HEIGHT: 40
    }
  ],
  FILE_DIMENSION_TOP_BANNER: {
    WIDTH: 1125,
    HEIGHT: 240
  },
  FILE_DIMENSION_KYARA: {
    WIDTH: 174,
    HEIGHT: 168
  },
  FILE_DIMENSION_TAIRU: {
    WIDTH: 64,
    HEIGHT: 64
  },
  FILE_DIMENSION_TOP_BANNER_LIST: [
    {
      WIDTH: 686,
      HEIGHT: 224
    },
    {
      WIDTH: 256,
      HEIGHT: 366
    }

  ],
  TOP_BANNER_KINDS_LIST: {
    DEFAULT_TOP_BANNER:'デフォルト',
    CONTRACT_TOP_BANNER: '契約者通番紐付'
  },
  MAX_FILE_SIZE: 0.25 * 1024 * 1024, // = 1MB

  XG_MAX_FILE_SIZE: 0.117 * 1024 * 1024, // = 100KB*1.2
  FB_MAX_FILE_SIZE: 0.058 * 1024 * 1024, // = 50KB*1.2
  LML_FILE_SIZE: 0.253 * 1024 * 1024, // =   ==> 250KB   0.244
  LSL_FILE_SIZE: 0.030 * 1024 * 1024, // = 25KB*1.2
  LXX_FILE_SIZE: 0.235 * 1024 * 1024, // =  ==>200KB*1.2    0.235

  API: {
    ACCESS_LOG: {
      DISPLAY_BANNER_LINK: 'バナーリンク',
    },
  },
  CLOUDANT: {
    ERROR_MESSAGE: {
      ECONNREFUSED:'error happened in your connection',
      NOT_FOUND_DATABASE: 'Database does not exist'
    },
    RES_MESSAGE: { 
      DB_NOT_AVAILABLE: 'サーバーが利用できません',
      DB_NOT_FOUND: 'Database does not exist',
      DB_ERROR_COMMON: 'サーバーがエラー応答を返しました',
      LOGIN_FAILURE: 'IDまたはパスワードが異なります',
      OTHER_ERROR: 'システムエラーが発生しました',
      DELETE_SESSION_FAILED: '从数据库删除session失败',
      CLOUDANT_ERROR_COMMON: 'cloudant数据库返回错误响应'
    },
    // 本番環境
    // DATABSENAME: 'hkb-portal',
    // USERNAME : 'af90d870-e27f-454b-84e1-f4a55d49da1d-bluemix',
    // PASSWORD: '50b5a0c25d669c393cd0bfec6becee65c7651b34fd33eced4d29e5458ddf14ba',
    // URL: "https://af90d870-e27f-454b-84e1-f4a55d49da1d-bluemix:50b5a0c25d669c393cd0bfec6becee65c7651b34fd33eced4d29e5458ddf14ba@af90d870-e27f-454b-84e1-f4a55d49da1d-bluemix.cloudantnosqldb.appdomain.cloud"
    // テスト環境
    // DATABSENAME: 'hkb_portal',
    // USERNAME : '49268ee5-a56c-42d9-aca4-e3a83d4009fc-bluemix',
    // PASSWORD: '4480fc40ff2ab743c11152e28c557d8dc6566e6780326e6be72278c69b0b4250ab5',
    // URL: "https://49268ee5-a56c-42d9-aca4-e3a83d4009fc-bluemix:4480fc40ff2ab743c52e28c557d8dc6566e6780326e6be72278c69b0b4250ab5@49268ee5-a56c-42d9-aca4-e3a83d4009fc-bluemix.cloudant.com"
  },
  DB: {
    CONFIG: {
      DEBUG: {
        HOST: 'localhost',
        USER: 'root',
        PASSWORD: '',
        DATABASE: 'hokuriku'
      }
    }
  },
  ERROR: {
    ECONNREFUSED: 'ECONNREFUSED',
    ENOENT: 'ENOENT'
  },
  MESSAGE: {
    LOGIN_FAILURE: 'IDまたはパスワードが異なります',
    TITLE_NULL:"空くことはできない",
    FAILED_TO_LOAD_BANNER_INFO: 'バナー情報の取得に失敗しました',
    FAILED_TO_LOAD_BANNER_POSITIONS: 'バナー配置場所情報の取得に失敗しました',
    TITLE_LENGTH: 'タイトルは255文字以内で設定してください',
    BANNER_POSITION_MUST: 'バナー配置場所は必須項目です',
    TOP_BANNER_ATTRIBUTE_MUST: 'TOP画面バナー属性は必須項目です',
    IMAGE_WRONG_EXT: '拡張子が有効ではありません',
    IMAGE_WRONG_DIMENSION_SIZE: '画像の縦横サイズが指定されたサイズではありません',
    IMAGE_FILE_SIZE_TOO_LARGE: 'ファイルサイズが大きすぎます',
    IMAGE_TYPE_ERROR: '画像ファイルの読み込みに失敗しました',
    IMAGE_REMOVE_ERROR: '画像ファイルの格納に失敗しました',
    FILE_READ_ERROR: 'ファイルの読み込みに失敗しました',
    FILE_NAME_IS_EMPTY: 'ファイルを選択してください',
    LINK_LENGTH: 'リンク先URLは1024文字以内で設定してください',
    PUBLISHDATE_START_FORMAT: 'YYYY/MM/DD hh:mm形式で入力してください',
    PUBLISHDATE_END_FORMAT: 'YYYY/MM/DD hh:mm形式で入力してください',
    PUBLISHDATE_END_PRIOR_TO_START: '表示終了日時は表示開始日時よりも後の日付にしてください',
    PRIORITY_NOT_NUMBER: '表示優先順位は整数で入力してください',
    PRIORITY_OUT_OF_RANGE: '表示優先順位は1～2147483647の間で入力してください',
    COMMENT_LENGTH: '備考は21844文字以内で設定してください',
    INCORRECT_CONFIRM_PASSWORD: '確認用パスワードが異なります',
    PASSWORD_UPDATE_SUCCESS: 'パスワード変更が完了しました',
    PASSWORD_UPDATE_FAILURE: 'パスワード変更に失敗しました',
    PASSWORD_LENGTH: 'パスワードは255文字以内で設定してください',
    DB_NOT_AVAILABLE: 'MySQLサーバーが利用できません',
    DB_ERROR_COMMON: 'MySQLがエラー応答を返しました',
    FAILED_TO_REGISTER_BANNER: 'バナー登録に失敗しました',
    FAILED_TO_UPDATE_BANNER: 'バナー編集に失敗しました',
    FAILED_TO_DELETE_BANNER: 'バナー情報の削除に失敗しました',
    CANNOT_DELETE_BANNER_PUBLISHING: '掲載期間中のバナーは削除できません',
    CANNOT_DELETE_EXTEND_PUBLISHING: '掲載期間の拡張は削除できません',
    CANNOT_REGISTER_OR_UPDATE_TOP_BANNER_WHILE_PROCESSING: 'サーバーの処理中です。しばらくお待ちください。何らかのエラーにより処理が終わらない場合、処理開始から30分後に登録/編集/削除が行えます。',
    REQUEST_ERROR_PARAMS: '送信内容に誤りがあります',
    IS_DEFAULT_NOT_EXIST: 'デフォルトTOP画面バナーまたは契約者通番TOP画面バナーの取得に失敗しました',
    CSVFILE_WRONG_EXT: '拡張子がCSVではありません',
    FAILED_TO_REGISTER_CSV: '契約者通番CSV登録に失敗しました',
    CSV_CONTAINS_INVALID_CONTRACT_NO: '行目の契約者通番にエラーがあります',
    FAILED_TO_UPDATE_CSV: '契約者通番情報更新に失敗しました',
    FAILED_TO_DELETE_CSV: '契約者通番情報の削除に失敗しました',
    CSVFILE_REMOVE_ERROR: 'CSVファイルの格納に失敗しました',
    CSVFILE_TYPE_ERROR: 'CSVファイルの読み込みに失敗しました',
    INVALID_CONTRACT_NO_SEARCH_ERROR: '契約者通番は半角数字24文字以内で入力してください',
    ERROR_BEFORE_REGISTERING: '登録処理準備中に予期せぬエラーが発生しました',
    FAILED_TO_REGISTER_EXTEND: 'コラム登録に失敗しました',
    FAILED_TO_UPDATE_EXTEND: '拡張変更に失敗しました',
    FAILED_TO_DELETE_EXTEND: '拡張削除に失敗しました',
    FAILED_TO_REGISTER_KYARA: "キャラ登録に失敗しました",
    CANNOT_DELETE_KYARA_COMMENT: '関連付けコメントが存在します、キャラ削除できません。',
    FAILED_TO_DELETE_KYARA: 'キャラ削除に失敗しました',
    FAILED_TO_UPDATE_KYARA: 'キャラ変更に失敗しました',
    FAILED_TO_REGISTER_COMMENT: "コメント登録に失敗しました",
    FAILED_TO_DELETE_COMMENT: 'コメント削除に失敗しました',
    FAILED_TO_UPDATE_COMMENT: 'コメント変更に失敗しました',
    COMMENT_TITLE_LENGTH: 'コメントは255文字以内で設定してください',
    COMMENT_ATTRIBUTE_MUST: 'キャラは必須項目です',
    FAILED_TO_REGISTER_TAIRU: "タイル登録に失敗しました",
    FAILED_TO_DELETE_TAIRU: 'タイル削除に失敗しました',
    FAILED_TO_UPDATE_TAIRU: 'タイル変更に失敗しました',
    FAILED_TAIRU_PRIORITY:'順位は1～9の間で入力してください',
    FAILED_TAIRU_COORDINATE:'位置を選択してください',


  },
  ROUTE: {
    FRONT: '/front',
    FRONT_TOP: '/front/top',
    FRONT_TOP_NEW: '/front/top_new',
    BACK: '/back',
    LOGIN: '/back/login',
    LOGOUT: '/back/logout',
    BANNERS: '/back/banners',
    UPDATE: '/back/banners/update',
    REGISTER_BANNER: '/back/registerBanner',
    PASSWORD: '/back/password',
    API: '/api',
    TOP_BANNERS: '/back/topBanners',
    EXTEND: '/back/extend',
    EXTEND2: '/back/extend/discussList',
    REMITTANCE: '/front/remittance',
    REMITTANCE2: '/front/remittance2',
    EXTEND_REGISTER: '/back/extendRegister',
    EXTEND_UPDATE: '/back/extend/update',
    REGISTER_DEFAULT_TOP_BANNER: '/back/registerDefaultTopBanner',
    //UPDATE_DEFAULT_TOP_BANNER: '/back/topBanners/updateDefault',
    REGISTER_CONTRACT_TOP_BANNER: '/back/registerContractTopBanner',
    //UPDATE_CONTRACT_TOP_BANNER: '/back/topBanners/updateContract',
    REGISTER_TOP_BANNER: '/back/registerTopBanner',
    UPDATE_TOP_BANNER: '/back/topBanners/update',
    FRONT_TOP_HOME: '/front/top_home',
    COMMENT: '/back/comment',
    COMMENT_REGISTER: '/back/commentRegister',
    COMMENT_UPDATE: '/back/comment/update',
    KYARA: '/back/kyara',
    KYARA_REGISTER: '/back/kyaraRegister',
    UPDATE_KYARA: '/back/kyara/update',
    TAIRU: '/back/tairu',
    TAIRU_REGISTER: '/back/tairuRegister',
    TAIRU_UPDATE: '/back/tairu/update'
  },
  VIEW: {
    FRONT: {
      TOP: 'WEBview_1p',
      SEARCH: 'WEBview_2p',
      SAVE_AND_INCREASE: 'WEBview_3p',
      LOAN: 'WEBview_4p',
      TOP_NEW: 'WEBview_1p_new',
      EXTEND: 'WEBview_extend',
      SEARCH_NEW: 'WEBview_2p_new',
      SAVE_AND_INCREASE_NEW: 'WEBview_3p_new',
      LOAN_NEW: 'WEBview_4p_new',
      OTP_SERVICE_GUIDANCE_NEW: 'WEBview_5p_new',
      TOP_HOME: 'WEBview_top',
      TOP_INFO: 'WEBview_info',
      REMITTANCE1: 'remittance',
      REMITTANCE2: 'remittance_2',
      TRANSFER: 'transfer',
      
    },
    LOGIN: 'login',
    BANNERS: 'banners',
    BANNER_FORM: 'banner_form',
    PASSWORD: 'password',
    TOP_BANNERS: 'top_banners',
    TOP_BANNER_FORM: 'top_banner_form',
    EXTEND: 'extend',
    EXTEND2: 'extend2',
    EXTEND_FORM: 'extend_form',
    EXTEND_FORM2: 'extend_form_2',
    EXTEND_DETAIL: 'WEBview_extend_detail',
    COMMENT: 'comment',
    COMMENT_FORM: 'comment_form',
    KYARA: 'kyara',
    KYARA_FORM: 'kyara_form',
    TAIRU: 'tairu',
    TAIRU_FORM: 'tairu_form',

  },
  TITLE: {
    LOGIN: 'ログイン',
    BANNER_LIST: 'バナー一覧',
    BANNER_REGISTER: 'バナー登録',
    BANNER_UPDATE: 'バナー編集',
    TOP_BANNER_LIST: 'TOP画面バナー一覧',
    EXTEND: 'コラム一覧',
    EXTEND2: 'コラム目次一覧',
    EXTEND_FORM: 'コラム登録',
    EXTEND_FORM2: 'コラム目次登録',
    REGISTER_DEFAULT_TOP_BANNER: 'TOP画面バナー登録（デフォルト）',
    UPDATE_DEFAULT_TOP_BANNER: 'TOP画面バナー編集（デフォルト）',
    REGISTER_CONTRACT_TOP_BANNER: 'TOP画面バナー登録（契約者通番紐付）',
    UPDATE_CONTRACT_TOP_BANNER: 'TOP画面バナー編集（契約者通番紐付）',
    COMMENT: 'コメント一覧',
    COMMENT_FORM: 'コメント登録',
    KYARA: 'キャラ一覧',
    KYARA_FORM: 'キャラ登録',
    TAIRU: 'タイル一覧',
    TAIRU_FORM: 'タイル登録',
  }
});
