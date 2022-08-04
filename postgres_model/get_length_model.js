
module.exports= async () => {
    let body = await db.partitionedFind('banners',{
        "selector":{}
    });
    global.banners_next = body.docs.length+1;
  };
