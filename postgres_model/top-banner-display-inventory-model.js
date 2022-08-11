const logger = require('../submodules/logger').systemLogger;
const util = require('../submodules/util');
require('array-foreach-async');
const connection = require('../submodules/postgres');
/**
 * topバナーに紐づく契約者通番を取得する
 * @param connection
 * @param topBannerI
 */
exports.getContractNumbersBelongsToBanner = async (db, topBannerId) => {
  const sql = `
    SELECT contract_no
    FROM top_banner_display_inventory
    WHERE top_banner_id = $1;
  `;
  const values = [topBannerId];
  logger.debug('execute getContractNumbersBelongsToBanner query');
  let rows = await connection.query(sql, values);
  return rows[0].contract_no
};

/**
 * TOPバナーIDに紐づく契約者通番を削除する
 * @param connection
 * @param contractNumbers 契約者通番
 * @param topBannerId
 */
exports.deleteCotractNumbersBelongsToBanner = async (db, contractNumbers, topBannerId) => {
  const sql = `
    DELETE FROM top_banner_display_inventory
    WHERE contract_no IN ($1)
    and top_banner_id = $2;
  `;
  const values = [contractNumbers, topBannerId];
  logger.debug('execute deleteCotractNumbersBelongsToBanner query');
  return await connection.queryCount(sql, values);
};

exports.deleteByTopBannerId = async (topBannerId) => {

  const sql = `
    DELETE FROM top_banner_display_inventory
    WHERE top_banner_id = $1
  `;
  const values = [topBannerId];
  logger.debug('execute deleteByTopBannerId query');
  return await connection.query(sql, values);
};

/**
 * 契約者通番をTOPバナーに紐づける
 * すでに契約者通番とTOPバナーの組み合わせが存在する場合は最終表示日時を空にする
 * @param connection
 * @param contractNumbers 契約者通番
 * @param topBannerId
 */
exports.linkContractNumbersWithTopBanner = async (contractNumbers, topBannerId) => {

  let count = 0;
  logger.debug('execute linkContractNumbersWithTopBanner query');
  logger.debug('topBannerId => ' + topBannerId);
  await contractNumbers.forEachAsync(async contractNumber => {
    const sql = `
      INSERT INTO top_banner_display_inventory
      (contract_no, top_banner_id, last_showed_date,is_first)
      values($1, $2, '',1)
      ON CONFLICT (contract_no, top_banner_id)
        DO UPDATE SET last_showed_date = '';
    `;
    const values = [contractNumber, topBannerId];
    const result = await connection.query(sql, values);
    if (result) {
      count++;
    }
  });
  return count;

};

/**
 * デフォルトバナーに紐ついていない契約者通番をデフォルトバナーに紐づける
 * @param connection
 */
exports.linkNewContractNumberWithDefaultBanners = async () => {
  let count = 0;
  logger.debug('execute linkNewContractNumberWithDefaultBanners query');
  const selectDefaultBannerSql = `
    SELECT id
    FROM top_banners
    WHERE is_default = '1';
  `
  const defaultBannerRows = await connection.query(selectDefaultBannerSql);
  logger.debug('defaultBannerRows => ' + defaultBannerRows.length);
  if (0 !== defaultBannerRows.length) {
    await defaultBannerRows.forEachAsync(async row => {
      const defaultBannerId = row.id;
      logger.debug('top_banner_id => ' + defaultBannerId);
      const selectContractNumbersSql = `
        SELECT T1.contract_no as contract_no
        FROM app_users T1
        WHERE NOT EXISTS (
          SELECT T2.contract_no
          FROM top_banner_display_inventory T2
          WHERE T1.contract_no = T2.contract_no
          AND T2.top_banner_id = $1
        );
      `;
      const values = [defaultBannerId];
      const contractNumberRows = await connection.query(selectContractNumbersSql, values)
      logger.debug('contractNumberRows => ' + contractNumberRows.length);
      if (0 !== contractNumberRows.length) {
        await contractNumberRows.forEachAsync(async row => {
          const contractNumber = row.contract_no;
          const insertSql = `
            INSERT INTO top_banner_display_inventory
            (contract_no, top_banner_id, last_showed_date,is_first)
            values($1, $2, '', 1);
          `;
          const values = [contractNumber, defaultBannerId];
          const result = await connection.query(insertSql, values);
          if (result) {
            count++;
          }
        });
      }
    });
  }
  return count;
};

/**
 * バナーを全てのapp_userと紐づける
 * @param connection
 * @param topBannerId
 */
exports.linkBannerWithAllContractNumbers = async (topBannerId) => {

  let count = 0;
  logger.debug('execute linkBannerWithAllContractNumbers query');
  const selectAllContractNumbersSql = `
    SELECT contract_no
    FROM app_users;
  `;
  const selectRows = await connection.query(selectAllContractNumbersSql);
  if (0 !== selectRows.length) {
    await selectRows.forEachAsync(async row => {
      const contractNo = row.contract_no;
      const insertSql = `
      INSERT INTO top_banner_display_inventory
      (contract_no, top_banner_id, last_showed_date,is_first)
      values($1, $2, '',1);
      `;
      const values = [contractNo, topBannerId];
      const result = await connection.query(insertSql, values);
      if (result) {
        count++;
      }
    });
  }
  return count;
};

/**
 * 契約者通番と表示順に基づくトップページバナーID一覧を取得し、優先度が一番高いものを返す
 */
exports.getTopBannerIdByContractNumberPriority = async function(contractNumber) {
  
  logger.debug('execute getTopBannerIdByContractNumberPriority query');
  const currentDateTime = util.getCurrentDateTime();
  let sql = `
    SELECT
      tbdi.top_banner_id AS id,
      tbdi.last_showed_date,
      tb.is_default,
      tb.top_banner_attribute_id,
      tb.image_path,
      tb.link
    FROM
      (SELECT * FROM top_banner_display_inventory WHERE contract_no = $1) AS tbdi
    INNER JOIN
      (SELECT
        top_banners.id,
        top_banners.is_default,
        top_banners.top_banner_attribute_id,
        banners.priority,
        banners.image_path,
        banners.link,
        banners.last_updated_date
       FROM banners
       INNER JOIN top_banners ON banners.id = top_banners.banner_id
       WHERE
        (
          ((banners.publish_datetime_start = '' OR banners.publish_datetime_start IS NULL)
            AND (banners.publish_datetime_end = '' OR banners.publish_datetime_end IS NULL))
          OR
          (banners.publish_datetime_start <= $2 AND $3 <= banners.publish_datetime_end)
          OR
          ((banners.publish_datetime_start = '' OR banners.publish_datetime_start IS NULL)
            AND $4 <= banners.publish_datetime_end)
          OR
          (banners.publish_dateTime_start <= $4
            AND (banners.publish_datetime_end = '' OR banners.publish_datetime_end IS NULL))
        )
       ) AS tb
    ON tbdi.top_banner_id = tb.id
    ORDER BY
      case
        when tbdi.last_showed_date is null then '1'
        else '0'
      end ,
      tbdi.last_showed_date asc,
      tb.is_default asc,
      CASE
        WHEN priority is NULL then '1'
        ELSE '0'
      END,
      tb.priority,
      tb.last_updated_date desc

  `
  const values = [contractNumber, currentDateTime, currentDateTime, currentDateTime];
  const result = await connection.query(sql, values);
  if(result.length === 0) {
    return null;
  }
  var datas = { "datas": result };
  return datas;
 
}

/**
 * 契約者通番表示にNULLのレコードがない場合、すべて表示済みとみなして表示日時をNULLにアップデート
 */
exports.updateStatusIfOneRound = async function(contractNumber) {
  logger.debug('execute findTopBannerByAppUserPriority select query');
  const values = [contractNumber];
  let select = `
    SELECT COUNT(*) as count
    FROM top_banner_display_inventory
    WHERE contract_no = $1
    AND last_showed_date = ''
  `
  const selectResult = await connection.query(select, values);
  if(selectResult[0].count != 0) {
    return true;
  }
  logger.debug('execute findTopBannerByAppUserPriority update query');
  let update = `
    UPDATE top_banner_display_inventory
    SET last_showed_date = ''
    WHERE contract_no = $1
  `
  const updateResult = await connection.query(update, values);
  return true;
}

/**
 * 最終表示日時を更新する
 */
exports.updateLastShowDate = async (top_banner_id, contractNumber, currentDate) => {
  logger.debug('execute updateLastShowDate query');
  let sql = `
    UPDATE top_banner_display_inventory
    SET last_showed_date = $1
    WHERE top_banner_id = $2
    AND contract_no = $3
  `
  const values = [currentDate, top_banner_id, contractNumber];
  const updateResult = await connection.query(sql, values);
  return true;
}

/**
 * 新規に接続してきた契約者通番を、デフォルトバナーと紐づける
 */
exports.linkContractNumberAtFirstConnect = async (contractNumber) => {
  const select = `
    SELECT id
    FROM top_banners
    WHERE is_default = '1';
  `
  const defaultBanners = await connection.query(select);
  await defaultBanners.forEachAsync(async row => {
    const insert = `
      INSERT INTO top_banner_display_inventory
      (contract_no, top_banner_id, last_showed_date,is_first)
      values($1, $2, '',1);
    `
    const values = [contractNumber, row.id];
    const updateResult = await connection.query(insert, values);
  });
  return true;
}

/**
 * 新規に接続してきた契約者通番を、デフォルトバナーと紐づける
 */
 exports.linkBanner = async (contractNumber,bannerIds) => {

  const insert = `
  INSERT INTO top_banner_display_inventory
  (contract_no, top_banner_id, last_showed_date,is_first)
  values($1, $2, '',1);
`
  for (var i = 0; i < bannerIds.length; i++) {
    const values = [contractNumber, bannerIds[i]];
    const updateResult = await connection.query(insert, values);
  }

  return true;
}





