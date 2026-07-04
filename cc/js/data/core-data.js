/* ============ 示例资料库（全部为演示数据，待老板用真实资料替换） ============
 * 人类可读版见「资料模板」文件夹。此文件 = 系统的"大脑"。
 */
window.AppData = {

  company: {
    name: '青岛绿洲模块化房屋有限公司（示例）',
    brand: 'Oasis Modular',
    site: 'www.oasismodular-demo.com',
    markets: ['北美', '澳新', '欧洲', '中东', '东南亚'],
    team: ['李婷', '王浩', '陈晨', 'Kevin']
  },

  /* ---------- 产品知识库 ---------- */
  products: [
    {
      id: 'EH-20',
      name: 'EH-20 可扩展集装箱房',
      tagline: '主力款 · 一拖三展开',
      area: '展开约 36㎡（6.0×5.9×2.5m）',
      layout: '2卧 + 1卫 + 厨房/客厅（布局可选）',
      structure: '轻钢框架 + 75mm 岩棉/PU 夹芯板，地面 18mm 水泥纤维板+SPC',
      electric: '预装电路，110V/220V 可选，美标/澳标/欧标插座',
      bathroom: '整体卫浴含马桶/淋浴/洗手盆，预装给排水',
      priceMin: 8500, priceMax: 13500, priceNote: 'FOB 青岛，按配置浮动',
      floorPrice: 8200,
      moq: '1 套可下样品单，10 套起享批量价',
      leadTime: '样品 15 天，批量 30–45 天',
      cert: 'CE、结构计算书，可按 AS/NZS 提供参考文件',
      packing: '折叠平板包装，40HQ 装 6 套',
      warranty: '主结构 10 年，部件 2 年',
      options: '布局定制 / 外板颜色 / 门窗升级 / 太阳能套件 / 家具包'
    },
    {
      id: 'EH-40',
      name: 'EH-40 大户型可扩展房',
      tagline: '家庭款 · 三卧两卫',
      area: '展开约 72㎡（12.0×5.9×2.5m）',
      layout: '3卧 + 2卫 + 大客厅厨房',
      structure: '同 EH-20 加强型钢架，抗风等级更高',
      electric: '预装电路，可选智能家居包',
      bathroom: '双整体卫浴',
      priceMin: 16800, priceMax: 24000, priceNote: 'FOB 青岛',
      floorPrice: 16000,
      moq: '1 套起，5 套享批量价',
      leadTime: '样品 20 天，批量 40–55 天',
      cert: 'CE、结构计算书',
      packing: '40FR 或散件装运',
      warranty: '主结构 10 年，部件 2 年',
      options: '同 EH-20，另有露台/雨棚模块'
    },
    {
      id: 'FD-13',
      name: 'FD-13 快装折叠屋',
      tagline: '走量款 · 4人1小时快装',
      area: '13㎡（3.8×3.5×2.5m）',
      layout: '单间 + 可选卫浴角',
      structure: '折叠钢架 + 50mm 夹芯板',
      electric: '基础电路预装',
      bathroom: '可选装整体卫浴',
      priceMin: 3200, priceMax: 4600, priceNote: 'FOB 青岛',
      floorPrice: 3000,
      moq: '2 套起，20 套享批量价',
      leadTime: '现货 7 天，批量 20–30 天',
      cert: 'CE',
      packing: '折叠打包，40HQ 装 10 套',
      warranty: '主结构 5 年，部件 1 年',
      options: '工地宿舍 / 应急安置 / 岗亭改装'
    },
    {
      id: 'CH-P',
      name: 'CH-P 定制项目款',
      tagline: '项目款 · 营地/民宿整体方案',
      area: '按项目设计',
      layout: '营地/度假村/学校/办公整体规划',
      structure: '按当地规范做结构设计与计算',
      electric: '按项目国标准定制',
      bathroom: '按设计',
      priceMin: 100000, priceMax: 2000000, priceNote: '按图报价，起订 20 套或 $10 万',
      floorPrice: null,
      moq: '20 套或 $10 万起',
      leadTime: '设计 2–4 周 + 生产 60–90 天',
      cert: '按项目所在国要求',
      packing: '项目物流方案',
      warranty: '合同约定',
      options: '含设计图纸、基础图、安装指导（可派工程师）'
    }
  ],

  /* ---------- 常见问题 FAQ（初筛客服 AI 的弹药） ---------- */
  faq: [
    { q: 'How much is the expandable house? / 多少钱一套？', a: 'EH-20 主力款 FOB 青岛 $8,500–$13,500，具体取决于布局、电气标准和选配。请告诉我您的国家和用途，我给您精确报价。', tags: ['价格'] },
    { q: 'What is the MOQ? / 最小起订量？', a: '样品单 1 套即可安排，10 套起享受批量价格。', tags: ['MOQ'] },
    { q: 'How long is the lead time? / 交期多久？', a: '样品 15 天左右，批量订单 30–45 天，旺季请提前锁排产。', tags: ['交期'] },
    { q: 'How much is shipping to my country? / 运费多少？', a: '按目的港实时询价。参考：美西一个 40HQ 约 $2,500–4,500（随市场波动），一柜可装 EH-20 共 6 套，摊到每套运费不高。告诉我您的港口，24 小时内给准确报价。', tags: ['运费'] },
    { q: 'Is installation difficult? / 安装难吗？', a: 'EH-20 展开式设计，4 人半天可完成安装，提供图文手册+视频教程；大项目可付费派工程师现场指导。', tags: ['安装'] },
    { q: 'Do you have certifications? / 有认证吗？', a: '产品带 CE 认证和结构计算书，可按澳标/美标项目提供参考技术文件。具体项目认证需求可评估。', tags: ['认证'] },
    { q: 'What are the payment terms? / 付款方式？', a: '常规 T/T：30% 定金，70% 见提单副本。即期信用证可谈。', tags: ['付款'] },
    { q: 'Is the bathroom included? / 含卫浴吗？', a: 'EH-20/EH-40 标配整体卫浴（马桶/淋浴/洗手盆），给排水预装，现场接通即用。', tags: ['配置'] },
    { q: 'Can I customize the layout? / 能定制吗？', a: '可以。布局、外板颜色、门窗、太阳能、家具包都可定制，定制图纸费 $300，下单后抵货款。', tags: ['定制'] },
    { q: 'Is it windproof / typhoon resistant? / 抗风吗？', a: '标准款设计风载 0.5kN/㎡（约 10–12 级风），雪载 0.5kN/㎡。飓风/重雪地区可做加强结构，需按当地规范确认。', tags: ['结构'] },
    { q: 'How is the insulation? / 保温怎么样？', a: '75mm 岩棉/PU 夹芯板，冬暖夏凉，可选加厚。北欧/加拿大客户常选 100mm 加强保温包。', tags: ['保温'] },
    { q: 'What about plumbing and electrical standards? / 水电标准？', a: '出厂预装水电，支持 110V/220V，插座按美标/澳标/欧标配置，现场一次接入。', tags: ['水电'] },
    { q: 'Do you provide furniture? / 带家具吗？', a: '可选家具包（床/衣柜/桌椅/窗帘/热水器/空调），民宿营地客户多数选整包拎包入住方案。', tags: ['配置'] },
    { q: 'Can I get a sample first? / 能先买样品吗？', a: '可以，1 套样品单 15 天出货。很多客户先订 1 套样板房，验证后再下批量单。', tags: ['样品'] },
    { q: 'How many units in one container? / 一柜装几套？', a: 'EH-20 折叠平板包装，40HQ 装 6 套；FD-13 可装 10 套。', tags: ['物流'] },
    { q: 'What is the warranty? / 质保多久？', a: '主结构 10 年，门窗电气等部件 2 年，安装类问题远程指导终身支持。', tags: ['售后'] },
    { q: 'Can I visit your factory? / 能验厂吗？', a: '欢迎！工厂在青岛，机场 40 分钟车程，可安排接机。也可先视频验厂。', tags: ['验厂'] },
    { q: 'Do you offer dealership / agency? / 能做代理吗？', a: '有区域经销政策（首单量+年度目标+区域保护），把您的市场和渠道情况告诉我，我请负责人和您详谈。', tags: ['代理'] },
    { q: 'Is it waterproof? / 防水吗？', a: '屋顶整体防水卷材+结构落水系统，墙体拼接处胶条+密封胶双重防水，沿海多雨地区大量案例。', tags: ['结构'] },
    { q: 'Can it be used in cold winter? / 冬天能住吗？', a: '可以。加拿大/北欧客户在 -30℃ 环境使用，选配 100mm 保温+双层中空窗+电暖，完全可过冬。', tags: ['保温'] }
  ],

  /* ---------- 红线清单（AI 绝对不能自答/不能承诺的） ---------- */
  redlines: [
    'EH-20 报价不得低于 $8,200（底价），低于此价必须转人工并报老板审批',
    '不承诺任何账期 / OA 付款，一律 30% 定金起',
    '不承诺独家代理，代理政策必须转负责人洽谈',
    '非标结构（超高/超大跨度/特殊荷载）安全性不得口头确认，必须转技术部出评估',
    '不承诺"包清关包税"，只做 FOB/CIF/DDP 报价明确责任边界',
    '运费只报估算区间并注明随市场波动，不锁死运价',
    '不评价、不诋毁任何同行'
  ],

  /* ---------- 标签体系 & 销售阶段 ---------- */
  tagSystem: {
    intent: [
      { level: 'A', name: '强意向', desc: '有明确项目/预算/时间线，两周内可推进关键动作' },
      { level: 'B', name: '有意向', desc: '需求真实但周期不明确，需持续跟进' },
      { level: 'C', name: '观望', desc: '早期了解/比价阶段' },
      { level: 'D', name: '弱意向', desc: '仅询价无回应，或明显不匹配' }
    ],
    customerTypes: ['营地/度假村运营商', '经销商', '工程承包商', '民宿业主', '终端个人', '政府/机构项目'],
    dimensions: ['国家区域', '采购用途', '预算规模', '决策角色', '紧急程度', '渠道来源'],
    common: ['急单', '比价中', '要样品', '要验厂', '价格敏感', '大项目', '老客户', '待唤醒', '已寄样', '节后跟进']
  },

  stages: ['新询盘', '需求确认', '方案与报价', '样品/看厂', 'PI/合同', '定金收取', '生产中', '发货/尾款', '成交复购', '流失'],

  /* ---------- 销冠资料（模块⑧的灵魂） ---------- */
  champion: {
    name: 'Kevin（销冠 · 示例）',
    winRate: '询盘→成交转化率 11.2%（团队平均 4.8%）',
    principles: [
      '报价永远给三档（基础/主推/高配），让客户在"选哪个"而不是"买不买"之间做决定',
      '先问用途、数量、时间线，再谈价格——没锁需求的报价都是白报',
      '48 小时跟进节奏：报价后 48 小时内必有一次带新信息的跟进',
      '用案例代替形容词：不说质量好，发同国家客户的实拍和复购记录',
      '逼单三件套：船期（本月订舱价）、涨价预告（钢材行情）、排产位（旺季交期）',
      '每一条消息结尾都给下一步动作：约电话/发资料/确认规格，绝不让对话死掉'
    ],
    playbook: [
      {
        tactic: '报价前先锁需求',
        triggers: ['price', 'how much', 'cost', 'quotation', 'quote'],
        basis: '销冠原则：先问用途/数量/时间线再报价',
        scriptEn: 'Hi {name}, happy to send you exact pricing. Quick questions so I quote you right: 1) Is this for a resort/rental or personal use? 2) How many units are you planning? 3) When do you need them on site? Our EH-20 starts from $8,500 FOB — with your answers I can send a precise offer within 24h.',
        scriptZh: '很乐意报价。为了报得准，先确认三件事：①用途是营地/出租还是自用？②计划几套？③什么时候要到场地？EH-20 从 $8,500 FOB 起，收到您的信息后 24 小时内给精确方案。'
      },
      {
        tactic: '处理价格异议：拆价值不降价',
        triggers: ['expensive', 'too high', 'cheaper', 'discount', 'lower price', 'best price'],
        basis: '销冠原则：降配置不降价 + 案例代替形容词',
        scriptEn: 'I understand, {name}. Let me break down where the money goes: galvanized steel frame (10-yr warranty), full bathroom pre-installed, wiring done at factory — you save ~$2,000/unit on local labor. If budget is tight, I can do a basic-spec version at a lower price instead of cutting corners on the same spec. Also, our Texas client reordered 12 units last month — happy to share his install photos.',
        scriptZh: '理解您的顾虑。我拆一下成本：镀锌钢架（10年质保）、整体卫浴预装、出厂完成布线——现场人工至少省 $2,000/套。预算紧的话，我可以给基础配置版降低总价，而不是同配置偷工减料。上个月德州客户刚返单 12 套，可以发他的安装实拍给您参考。'
      },
      {
        tactic: '处理拖延：留钩子+时限',
        triggers: ['think about', 'let me think', 'later', 'not now', 'discuss with', 'get back'],
        basis: '销冠原则：逼单三件套（船期/涨价/排产）',
        scriptEn: 'Of course, take your time {name}. One heads-up: steel price is trending up and our July production slots are 80% booked. If you can confirm within this week, I can lock the current price + a slot with 30-day delivery. Want me to hold one for you till Friday?',
        scriptZh: '当然可以考虑。提醒一下：钢材价格在涨，7 月排产位已订出 80%。本周内确认的话，我可以锁定当前价格和 30 天交期的排产位。要不要我先给您保留到周五？'
      },
      {
        tactic: '运费询问：报区间+引导CIF',
        triggers: ['shipping', 'freight', 'delivery cost', 'ship to', 'port'],
        basis: 'FAQ·运费 + 红线：运费只报区间',
        scriptEn: 'Sure {name} — which port is closest to you? Rough guide: one 40HQ (fits 6 units of EH-20) to US West Coast runs $2,500–4,500 depending on season. I can get you an exact CIF quote within 24h once I know your port.',
        scriptZh: '您最近的港口是哪个？参考：40HQ（装 6 套 EH-20）到美西约 $2,500–4,500 随季节波动。告诉我港口，24 小时内给精确 CIF 报价。'
      },
      {
        tactic: '样品单转化',
        triggers: ['sample', 'trial order', 'test order', 'one unit first'],
        basis: 'FAQ·样品政策',
        scriptEn: 'Smart approach, {name}. Most of our dealers started with 1 sample unit — 15 days production, you inspect everything, then scale up. I can also credit the $300 custom-drawing fee to your bulk order. Shall I send the sample-order PI for the EH-20 spec we discussed?',
        scriptZh: '先订样板房是聪明的做法，我们多数经销商都这么开始：1 套样品 15 天出货，验证后再放量，定制图纸费 $300 还能抵批量货款。要不要我按聊过的配置先发样品单 PI？'
      },
      {
        tactic: '质量疑虑：案例+可验证',
        triggers: ['quality', 'material', 'steel', 'insulation', 'durable', 'last long'],
        basis: '销冠原则：用案例代替形容词',
        scriptEn: '{name}, fair question. Frame is Q235 galvanized steel, panels 75mm rockwool — spec sheet attached. Better than words: here is a video from our Queensland client, 3 years in coastal weather, zero rust issues, plus a factory live-tour we can do on video call this week. Would Tuesday or Wednesday work?',
        scriptZh: '这个问题问得好。钢架 Q235 镀锌、板材 75mm 岩棉，规格书发您。比参数更有说服力的：昆士兰客户海边用了 3 年的实拍视频，零锈蚀；另外这周可以视频直播验厂，周二还是周三方便？'
      },
      {
        tactic: '交期询问：顺势逼单',
        triggers: ['lead time', 'delivery time', 'how long', 'when can', 'production time'],
        basis: 'FAQ·交期 + 逼单三件套',
        scriptEn: 'Sample 15 days, bulk 30–45 days ex-factory, {name}. Note: slots for this month are filling fast — confirm this week and I lock a 30-day slot; next batch would be +2 weeks. When do you need the units on site? I can work the timeline backwards for you.',
        scriptZh: '样品 15 天，批量 30–45 天出厂。提醒：本月排产位快满了，本周确认可锁 30 天交期，下一批要多等 2 周。您希望什么时候到场地？我帮您倒排时间表。'
      },
      {
        tactic: '认证合规：给文件+划边界',
        triggers: ['certificate', 'certification', 'ce ', 'code', 'permit', 'regulation', 'standard'],
        basis: 'FAQ·认证 + 红线：非标结构转技术',
        scriptEn: 'We ship with CE cert + structural calculation report, {name}. For local building permits, requirements vary by county/state — many clients register these as movable/temporary structures which simplifies approval. Tell me your location and intended use, and I will have our engineer prepare the matching document pack.',
        scriptZh: '随货提供 CE 证书+结构计算书。当地报建各国/各州要求不同，很多客户按可移动/临时建筑申报会简单很多。告诉我您的地点和用途，我让工程师配一套对应的文件包。'
      },
      {
        tactic: '付款条款：标准且坚定',
        triggers: ['payment', 'deposit', 'pay', 't/t', 'lc', 'credit'],
        basis: 'FAQ·付款 + 红线：不承诺账期',
        scriptEn: 'Standard terms: 30% T/T deposit, 70% against BL copy, {name}. Sight LC is also workable for bigger orders. This keeps both sides protected — and your deposit directly locks the production slot and material price.',
        scriptZh: '标准条款：30% 定金 T/T，70% 见提单副本；大单可走即期信用证。这个结构对双方都有保障——定金同时锁定排产位和钢材价格。'
      },
      {
        tactic: '通用推进（兜底）',
        triggers: [],
        basis: '销冠原则：每条消息给下一步动作',
        scriptEn: 'Thanks for the message, {name}. To move this forward efficiently: I can send you 1) full spec sheet + price list, 2) install video, 3) a reference from a client in your region. Which would help most? Or we can do a quick 15-min call — what time zone are you in?',
        scriptZh: '收到。为了高效推进，我可以发：①完整规格书+价格表 ②安装视频 ③您所在市场的客户案例。哪个对您最有用？或者约个 15 分钟快速通话，您在哪个时区？'
      }
    ]
  },

  /* ---------- 销冠成交聊天记录（脱敏示例，正式版由老板提供 10–20 段真实记录） ---------- */
  championTranscripts: [
    {
      title: '美国营地客户 · 从询价到 8 套成交（14 天）',
      customer: 'Mike（德州 Glamping 营地）',
      messages: [
        { role: 'customer', text: 'Hi, saw your expandable house video. How much for one?' },
        { role: 'sales', text: 'Hi Mike! Happy to quote. Is this for a glamping site or personal use? And roughly how many units are you planning for phase 1?', note: '不直接报价，先锁需求（用途+数量）' },
        { role: 'customer', text: 'Glamping site in Texas. Thinking 6-10 units to start.' },
        { role: 'sales', text: 'Great scale for phase 1. For rental units I recommend EH-20 with the furniture pack — guests can check in day one. $9,800/unit at 8+ qty, FOB. Want me to build a full landed-cost estimate to Houston?', note: '按场景推方案而不是报裸价，主动算到岸成本' },
        { role: 'customer', text: 'That is a bit above my budget. I saw cheaper ones online, around $6,500.' },
        { role: 'sales', text: 'I know the ones you mean — usually 50mm foam panel, no bathroom plumbing, wiring done on site (that alone costs $2k+ in US labor). Ours arrive rental-ready. Two of our US camp clients switched from the cheap version after year-one repairs. I can share their photos. If budget is the constraint, I can do a basic-spec at $8,900 — same frame, simpler interior.', note: '拆价值+案例+给降配选项，不直接降价' },
        { role: 'customer', text: 'Interesting. Can you send the spec comparison?' },
        { role: 'sales', text: 'Sent to your email + here as PDF. Also: our July production is 80% booked. If you confirm 8 units this week I lock $8,900 basic / $9,800 full and a 35-day slot. Deposit is 30%.', note: '发完资料立刻给时限和排产钩子' },
        { role: 'customer', text: 'Let me discuss with my partner this weekend.' },
        { role: 'sales', text: 'Of course. I will hold the slot till Tuesday. One more thing that helps partners decide: ROI sheet — at $120/night and 60% occupancy an EH-20 pays back in ~14 months. Sending it now.', note: '拖延时不催单，给"帮他内部说服"的弹药（ROI表）' },
        { role: 'customer', text: 'This ROI sheet is helpful. OK for 8 units, 6 full + 2 basic. Send PI.' },
        { role: 'sales', text: 'Excellent decision Mike! PI coming within 2 hours. After deposit I will send you the production schedule + weekly photo updates. Also connecting you with our Texas client for install tips.', note: '成交后立即给确定感：时间表+老客户背书' }
      ]
    },
    {
      title: '澳洲经销商 · 样品单转年度合作',
      customer: 'Emma（墨尔本建材经销商）',
      messages: [
        { role: 'customer', text: 'Do you offer dealership for Australia? What are the terms?' },
        { role: 'sales', text: 'We do have a dealer program for AU. Before terms — tell me a bit about your current channels: do you sell to end users or trade? Any experience with modular/granny flats?', note: '代理询价先反向资审，抬高姿态同时收集画像' },
        { role: 'customer', text: 'We supply granny flat builders in VIC, about 200 projects/year.' },
        { role: 'sales', text: 'That is a strong fit — granny flat demand matches EH-20 perfectly. Dealer terms: first order 4 units, annual target 30, VIC exclusivity reviewed yearly. Most dealers start with 1 sample unit to test the market. Sample at dealer price $9,200 with AU-standard electrical. Fancy starting there?', note: '给清晰门槛+低风险起步路径（样品单）' },
        { role: 'customer', text: 'Sample sounds good. What about AS/NZS compliance?' },
        { role: 'sales', text: 'AU spec: AS3000-style wiring layout, engineering drawings pack for your certifier included. Our Queensland dealer got council approval for movable dwelling class — I can intro you two for a chat.', note: '合规问题给文件+同行背书，不口头承诺认证' },
        { role: 'customer', text: 'OK, send PI for one sample unit with AU electrical.' },
        { role: 'sales', text: 'PI on the way. Production 15 days + I will film your unit through QC stages so you can show clients real footage while waiting. That usually helps dealers pre-sell before the sample even lands.', note: '把等待期变成客户的预售素材，超预期服务' }
      ]
    }
  ],

  /* ---------- 客户库 ---------- */
  customers: [
    { id: 'c1', name: 'Mike Johnson', company: 'Sunrise Glamping LLC', country: '美国', flag: '🇺🇸', type: '营地/度假村运营商', intent: 'A', stage: '方案与报价', tags: ['营地', '急单', '要ROI表'], source: '广告投放', owner: '李婷', value: 86000, lastContact: '今天', whatsapp: '+1 512-555-0132', email: 'mike@sunriseglamping.com', note: '德州营地一期 8-10 套，对比过低价竞品，关注到岸成本和回本周期' },
    { id: 'c2', name: 'Ahmed Al-Rashidi', company: 'Desert Pearl Resorts', country: '阿联酋', flag: '🇦🇪', type: '工程承包商', intent: 'A', stage: '样品/看厂', tags: ['大项目', '要验厂'], source: '主动开发', owner: 'Kevin', value: 320000, lastContact: '昨天', whatsapp: '+971 50-555-0188', email: 'ahmed@desertpearl.ae', note: '迪拜沙漠营地项目 40 套，下月来华验厂，决策人是老板本人' },
    { id: 'c3', name: 'Sophie Martin', company: 'Chez Sophie B&B', country: '法国', flag: '🇫🇷', type: '民宿业主', intent: 'B', stage: '需求确认', tags: ['民宿', '比价中'], source: '视频号', owner: '王浩', value: 24000, lastContact: '3天前', whatsapp: '+33 6-55-01-44', email: 'sophie@chezsophie.fr', note: '普罗旺斯民宿加 2 套，关心外观定制和法国报建' },
    { id: 'c4', name: 'Carlos Rodriguez', company: 'CR Distribuciones', country: '墨西哥', flag: '🇲🇽', type: '经销商', intent: 'B', stage: '方案与报价', tags: ['经销商', '要样品'], source: '主动开发', owner: '李婷', value: 45000, lastContact: '2天前', whatsapp: '+52 55-5501-7723', email: 'carlos@crdist.mx', note: '想做墨西哥城区域代理，先要 1 套样品测市场' },
    { id: 'c5', name: 'Olu Adeyemi', company: 'Lagos Homes Ltd', country: '尼日利亚', flag: '🇳🇬', type: '经销商', intent: 'C', stage: '方案与报价', tags: ['价格敏感', '比价中'], source: '官网/其他', owner: '王浩', value: 18000, lastContact: '5天前', whatsapp: '+234 803-555-0166', email: 'olu@lagoshomes.ng', note: '反复压价，预算与 FD-13 更匹配，考虑引导换型号' },
    { id: 'c6', name: 'Hans Müller', company: 'Müller Bau GmbH', country: '德国', flag: '🇩🇪', type: '工程承包商', intent: 'A', stage: 'PI/合同', tags: ['大项目', '严谨'], source: '广告投放', owner: 'Kevin', value: 138000, lastContact: '今天', whatsapp: '+49 151-555-0177', email: 'hans@muellerbau.de', note: '工人宿舍项目 12 套 EH-20，合同条款抠得细，本周内定' },
    { id: 'c7', name: 'Emma Wilson', company: 'EW Building Supplies', country: '澳大利亚', flag: '🇦🇺', type: '经销商', intent: 'A', stage: '成交复购', tags: ['老客户', '澳标'], source: '主动开发', owner: 'Kevin', value: 96000, lastContact: '4天前', whatsapp: '+61 4-5550-1929', email: 'emma@ewbuilding.au', note: '维州经销商，样品单已转年度合作，Q3 计划返单 10 套' },
    { id: 'c8', name: '佐藤 健', company: 'Sato Resort K.K.', country: '日本', flag: '🇯🇵', type: '营地/度假村运营商', intent: 'C', stage: '新询盘', tags: ['观望'], source: '视频号', owner: '陈晨', value: 30000, lastContact: '1周前', whatsapp: '+81 90-5550-1212', email: 'sato@satoresort.jp', note: '轻井泽营地扩建构想阶段，节奏慢，需长线内容触达' },
    { id: 'c9', name: 'Raj Patel', company: 'RP Trading', country: '印度', flag: '🇮🇳', type: '经销商', intent: 'D', stage: '流失', tags: ['只比价'], source: '官网/其他', owner: '王浩', value: 8000, lastContact: '3周前', whatsapp: '+91 98555-01234', email: 'raj@rptrading.in', note: '目标价低于底价 30%，暂归档，留触达名单' },
    { id: 'c10', name: 'Peter Novák', company: 'Novak Stavby', country: '捷克', flag: '🇨🇿', type: '工程承包商', intent: 'B', stage: '样品/看厂', tags: ['已寄样'], source: '广告投放', owner: '李婷', value: 52000, lastContact: '6天前', whatsapp: '+420 601-555-018', email: 'peter@novakstavby.cz', note: '样品已到港，等安装反馈后谈 6 套批量' },
    { id: 'c11', name: 'Maria Silva', company: 'Silva Eco Pousada', country: '巴西', flag: '🇧🇷', type: '民宿业主', intent: 'B', stage: '新询盘', tags: ['民宿'], source: '视频号', owner: '陈晨', value: 21000, lastContact: '今天', whatsapp: '+55 11-95550-1440', email: 'maria@silvaeco.br', note: '看了安装延时视频进线，问 2 套海景民宿方案' },
    { id: 'c12', name: 'John Smith', company: 'Smith Farm Stays', country: '加拿大', flag: '🇨🇦', type: '终端个人', intent: 'B', stage: '新询盘', tags: ['保温需求'], source: '广告投放', owner: '李婷', value: 15000, lastContact: '今天', whatsapp: '+1 604-555-0155', email: 'john@smithfarm.ca', note: '农场民宿 1 套试水，重点关心 -30℃ 冬季保温' },
    { id: 'c13', name: 'Fatima Zahra', company: 'Atlas Camps', country: '摩洛哥', flag: '🇲🇦', type: '营地/度假村运营商', intent: 'B', stage: '方案与报价', tags: ['待唤醒'], source: '主动开发', owner: '王浩', value: 64000, lastContact: '45天前', whatsapp: '+212 661-555-023', email: 'fatima@atlascamps.ma', note: '撒哈拉营地 8 套报价后失联 45 天，值得唤醒' },
    { id: 'c14', name: 'David Lee', company: 'Lee Trading Co.', country: '韩国', flag: '🇰🇷', type: '经销商', intent: 'C', stage: '需求确认', tags: ['待唤醒'], source: '官网/其他', owner: '陈晨', value: 26000, lastContact: '30天前', whatsapp: '+82 10-5550-1888', email: 'david@leetrading.kr', note: '济州岛渠道，聊到一半转淡，30 天未跟进' }
  ],

  /* ---------- WhatsApp 聊天记录（部分客户有完整对话） ---------- */
  chats: {
    c1: [
      { from: 'them', text: 'Hi, saw your expandable house video on Facebook. How much for one unit?', time: '6月28日 09:12' },
      { from: 'me', text: 'Hi Mike! Happy to quote. Is this for a glamping site or personal use? And roughly how many units for phase 1?', time: '6月28日 09:20' },
      { from: 'them', text: 'Glamping site in Texas. Thinking 8-10 units to start.', time: '6月28日 21:05' },
      { from: 'me', text: 'Great scale. For rental I recommend EH-20 + furniture pack — guests check in day one. $9,800/unit at 8+ qty FOB. Want a landed-cost estimate to Houston?', time: '6月28日 21:18' },
      { from: 'them', text: 'Yes please. Also saw cheaper ones online around $6,500, what is the difference?', time: '6月29日 08:44' },
      { from: 'me', text: 'Those are usually 50mm foam panel, no bathroom plumbing, wiring on site (that is $2k+ US labor). Ours arrive rental-ready. Sending spec comparison + Texas client install photos.', time: '6月29日 09:02' },
      { from: 'them', text: 'Got the files. The ROI sheet is interesting. What about delivery time to Houston?', time: '7月1日 10:31' },
      { from: 'me', text: 'Production 35 days + sea freight ~30 days to Houston. July slots are 80% booked — confirm this week and I lock the schedule + current price.', time: '7月1日 10:40' },
      { from: 'them', text: 'Let me discuss with my partner this weekend. The $9,800 is still above what we planned.', time: '7月3日 22:15' }
    ],
    c2: [
      { from: 'them', text: 'We are evaluating suppliers for a 40-unit desert camp project in Dubai. Send company profile and project references.', time: '6月20日 15:00' },
      { from: 'me', text: 'Thank you Ahmed. Profile + 3 resort project cases (Saudi, Oman, Qatar) sent to your email. For 40 units I suggest our CH-P project line with full design service. May I ask your target completion date?', time: '6月20日 15:25' },
      { from: 'them', text: 'Camp must open before December. Heat resistance is critical, 45°C summers.', time: '6月21日 11:08' },
      { from: 'me', text: 'Noted. For Gulf climate we use 100mm PU + reflective coating + upsized AC pre-wiring — same spec as the Oman resort (3 summers, zero complaints). Timeline works: design 3 weeks + production 75 days + shipping 18 days = on site early November.', time: '6月21日 11:30' },
      { from: 'them', text: 'Good. Our team will visit factories in China next month. Add us to your schedule.', time: '6月30日 09:40' },
      { from: 'me', text: 'Excellent! Which dates? We will arrange airport pickup in Qingdao, factory tour + sample units on site. I will also prepare a draft BOQ for the 40-unit layout before your visit.', time: '6月30日 09:52' },
      { from: 'them', text: 'July 15-16. Send the BOQ draft before July 10.', time: '7月2日 16:20' },
      { from: 'me', text: 'Confirmed July 15-16. BOQ draft will be in your inbox by July 8. Looking forward to hosting your team.', time: '7月2日 16:31' }
    ],
    c5: [
      { from: 'them', text: 'Your price is too high my friend. I can get same house $5,000 from another factory.', time: '6月25日 14:10' },
      { from: 'me', text: 'Olu, at $5,000 that is a 50mm foam panel unit without bathroom — different product. Our EH-20 is rental-grade. But let me ask: what is your end-customer budget? Maybe FD-13 fits better at $3,200-4,600.', time: '6月25日 14:26' },
      { from: 'them', text: 'FD-13 interesting. Send catalog. But best price please, Lagos market is very price sensitive.', time: '6月27日 10:33' },
      { from: 'me', text: 'Catalog sent. At 20 units FD-13 goes to $3,200/unit — that is our volume price. 40HQ fits 10 units so 2 containers. For Lagos port CIF I can quote once you confirm quantity.', time: '6月27日 10:50' },
      { from: 'them', text: 'I will start with 5 units only. Give me $2,800 and we do business long time.', time: '6月29日 18:44' }
    ],
    c6: [
      { from: 'them', text: 'We reviewed the contract draft. Clause 7 penalty terms need adjustment, and we need DIN-compliant electrical documentation.', time: '7月2日 15:12' },
      { from: 'me', text: 'Hans, adjusted Clause 7 as discussed (0.5%/week cap 5%). DIN documentation pack: wiring diagrams + component certs from our German-approved suppliers, attached. Anything else blocking signature?', time: '7月2日 16:05' },
      { from: 'them', text: 'Looks acceptable. Final question: can production photos be provided at each QC stage?', time: '7月3日 09:30' },
      { from: 'me', text: 'Standard for us: photo+video report at 4 QC gates (frame/panel/MEP/pre-pack), sent every Friday. Your project manager also gets our QC checklist template today.', time: '7月3日 09:41' }
    ],
    c7: [
      { from: 'them', text: 'Sample unit performing well, 3 client viewings this week. Planning Q3 order of 10 units with AU electrical.', time: '6月30日 13:20' },
      { from: 'me', text: 'Great news Emma! For 10 units dealer price holds at $9,200 + I can add the new colour options (charcoal/sand) at no cost for Q3 orders. Want the updated PI now to lock August production?', time: '6月30日 13:35' },
      { from: 'them', text: 'Send PI. Also my builder asked about cyclone-region tie-down kits.', time: '7月1日 08:15' },
      { from: 'me', text: 'PI sent. Tie-down kit for cyclonic regions: engineered anchor set +$380/unit with drawings for your certifier — used by our QLD dealer. Adding as optional line item.', time: '7月1日 08:28' }
    ],
    c11: [
      { from: 'them', text: 'Olá! I watched your installation video. Beautiful! I want 2 units for my eco pousada near Paraty, sea view.', time: '今天 08:05' },
      { from: 'me', text: 'Olá Maria! Obrigado! Sea-view pousada is a perfect use case. Quick questions: do you need furnished units ready for guests? And is road access to your site ok for a small crane truck?', time: '今天 08:30' },
      { from: 'them', text: 'Yes furnished please. Road is ok, we receive trucks. What is the price with bathroom and kitchen?', time: '今天 09:12' }
    ],
    c12: [
      { from: 'them', text: 'Hello, interested in one expandable unit for a farm stay in BC Canada. Main concern: winter goes to -30C. Will it work?', time: '今天 10:02' }
    ],
    c13: [
      { from: 'them', text: 'Received your quotation for 8 units. We are reviewing with investors.', time: '5月20日 11:00' },
      { from: 'me', text: 'Thank you Fatima. I will prepare the desert-spec details (sand sealing + heat insulation) while you review. When do investors meet?', time: '5月20日 11:20' }
    ],
    c14: [
      { from: 'them', text: 'What is dealer price for Jeju island market? Small quantities first.', time: '6月4日 14:30' },
      { from: 'me', text: 'For Jeju: start with 2 units at $9,500 trial-dealer price, Korean-standard electrical included. Ferry logistics from Busan we can arrange. Shall I detail the trial terms?', time: '6月4日 14:52' }
    ]
  },

  /* ---------- 跟进记录 ---------- */
  followups: [
    { customerId: 'c1', date: '7月1日', by: '李婷', summary: '发送到岸成本估算+ROI表，客户反馈正向，周末与合伙人商量，价格仍有异议', next: '周一跟进合伙人讨论结果，准备基础配置降价方案' },
    { customerId: 'c2', date: '7月2日', by: 'Kevin', summary: '确认 7月15-16 验厂行程，需 7月8日前发 40 套 BOQ 草案', next: '7月8日前完成 BOQ，安排接机与样板房参观动线' },
    { customerId: 'c6', date: '7月3日', by: 'Kevin', summary: '合同条款全部谈妥，DIN 文件包已发，客户确认 QC 流程满意', next: '本周五前催签约+30%定金' },
    { customerId: 'c7', date: '7月1日', by: 'Kevin', summary: 'Q3 返单 10 套意向确认，PI 已发，新增飓风锚固件选项 +$380/套', next: '下周确认 PI 签回，锁 8 月排产' },
    { customerId: 'c10', date: '6月28日', by: '李婷', summary: '样品到港，客户安排本周安装', next: '安装后 3 天内回访，收集反馈推批量单' }
  ],

  /* ---------- 线索池 ---------- */
  leadsPool: [
    { id: 'l1', name: 'Maria Silva', country: '巴西', source: '视频号', time: '今天 08:05', msg: '看了安装视频，要 2 套海景民宿', status: '已转客户', owner: '陈晨' },
    { id: 'l2', name: 'John Smith', country: '加拿大', source: '广告投放', time: '今天 10:02', msg: '农场民宿 1 套，关心-30℃保温', status: '已分配', owner: '李婷' },
    { id: 'l3', name: 'Sarah Brown', country: '英国', source: '广告投放', time: '今天 11:40', msg: '花园办公室用途，问价格和UK运费', status: '未分配', owner: null },
    { id: 'l4', name: 'Tom Kruger', country: '南非', source: '主动开发', time: '昨天 16:22', msg: '回复开发信：对营地项目感兴趣，要案例', status: '未分配', owner: null },
    { id: 'l5', name: 'Nguyen Van An', country: '越南', source: '官网/其他', time: '昨天 09:15', msg: '度假村 15 套询价，问是否做过越南项目', status: '已分配', owner: '王浩' },
    { id: 'l6', name: 'Lisa Chen', country: '新加坡', source: '视频号', time: '2天前', msg: '问 FD-13 能否做咖啡亭改装', status: '未分配', owner: null }
  ],

  /* ---------- 视频工厂 ---------- */
  videoTemplates: [
    {
      id: 'vt1', name: '工厂流水线快剪型', duration: '30-45秒', bestFor: '建立工厂实力信任，适合经销商/工程商受众',
      structure: ['0-3s 钩子：整板钢材下料特写', '3-15s 产线快剪：焊接/组装/质检', '15-25s 成品展开过程', '25-30s 行动号召：工厂直供+联系方式'],
      sample: [
        { shot: '特写', visual: '激光切割火花', zh: '这就是你家房子的第一步', en: 'This is where your house begins', vo: '每一套房，从一块钢板开始' },
        { shot: '快剪', visual: '产线 4 镜头各 2 秒', zh: '30天，从钢板到你的民宿', en: '30 days from steel to your resort', vo: '标准化产线，30 天交付' },
        { shot: '全景', visual: '成品房展开延时', zh: '到场 3 小时，拎包入住', en: '3 hours on site, move-in ready', vo: '展开式设计，到场即用' },
        { shot: '落版', visual: '品牌 LOGO+微信/WhatsApp', zh: '工厂直供 · 私信报价', en: 'Factory direct · DM for quote', vo: '点击头像，获取今日报价' }
      ]
    },
    {
      id: 'vt2', name: '产品360°展开演示型', duration: '45-60秒', bestFor: '展示产品细节，适合终端/民宿业主',
      structure: ['0-3s 钩子：房子"变形"瞬间', '3-20s 展开全过程', '20-40s 内部空间走一遍（卧室/卫浴/厨房）', '40s+ 价格锚点+CTA'],
      sample: [
        { shot: '延时', visual: '吊装落地到完全展开', zh: '一个集装箱，变出 36㎡ 两居室', en: 'One container unfolds into 36㎡', vo: '可扩展设计，运输省一半' },
        { shot: '跟拍', visual: '开门进屋一镜到底', zh: '卫浴厨房全预装', en: 'Bathroom & kitchen pre-installed', vo: '水电家具出厂全装好' },
        { shot: '特写', visual: '卫浴/插座/窗户细节', zh: '细节经得起放大', en: 'Details that hold up', vo: '' },
        { shot: '落版', visual: '价格字幕+联系方式', zh: '$8,500 起 · 全球发货', en: 'From $8,500 · Ships worldwide', vo: '评论区扣 1，发你完整报价单' }
      ]
    },
    {
      id: 'vt3', name: '30秒安装延时型', duration: '15-30秒', bestFor: '短平快爆款，跑量投放素材',
      structure: ['0-2s 钩子：空地', '2-25s 安装延时（配节奏卡点音乐）', '25-30s 前后对比+CTA'],
      sample: [
        { shot: '固定机位', visual: '空地→完工延时', zh: '早上还是空地，下午就能入住', en: 'Empty lot to livable in one day', vo: '' },
        { shot: '对比', visual: '左右分屏前后对比', zh: '4 个人，3 小时', en: '4 people, 3 hours', vo: '' },
        { shot: '落版', visual: 'LOGO+CTA', zh: '想知道多少钱？私信「报价」', en: 'DM "QUOTE" for pricing', vo: '' }
      ]
    },
    {
      id: 'vt4', name: '客户案例故事型', duration: '60-90秒', bestFor: '深度种草，适合复投高意向人群',
      structure: ['0-5s 客户痛点自述', '5-30s 选购决策过程', '30-60s 使用实拍+收益数据', '60s+ 客户口播推荐+CTA'],
      sample: [
        { shot: '素材混剪', visual: '客户营地实拍(授权)', zh: '德州老哥用 8 套房，一年回本', en: 'Texas host: payback in 14 months', vo: '他最担心的，也是你最担心的' },
        { shot: '数据卡', visual: '入住率/房价/回本周期字幕卡', zh: '$120/晚 · 60% 入住率', en: '$120/night at 60% occupancy', vo: '算给你看' },
        { shot: '落版', visual: '案例合集封面', zh: '各国案例实拍，私信「案例」领取', en: 'DM "CASES" for the full folder', vo: '' }
      ]
    },
    {
      id: 'vt5', name: '痛点字幕解说型', duration: '30-45秒', bestFor: '无需拍摄，纯素材+字幕+AI配音，产能最高',
      structure: ['0-3s 痛点提问字幕', '3-30s 3 个卖点逐条反驳痛点', '30s+ CTA'],
      sample: [
        { shot: '素材+大字', visual: '库存素材+动态字幕', zh: '为什么你的民宿扩建总是超预算？', en: 'Why does your resort expansion overrun budget?', vo: 'AI配音：三个原因……' },
        { shot: '素材+大字', visual: '产品素材3段', zh: '固定总价 · 固定工期 · 到场即用', en: 'Fixed price. Fixed timeline. Move-in ready.', vo: '' },
        { shot: '落版', visual: 'LOGO+CTA', zh: '预算表私信免费领', en: 'Free budget sheet — DM us', vo: '' }
      ]
    },
    {
      id: 'vt6', name: '敲镜头互动型', duration: '15-30秒', bestFor: '强互动钩子拉高完播率，适合冷启动涨粉/跑量投放',
      structure: ['0-3s 钩子：指节敲击镜头"咚咚咚"打断刷屏', '3-10s 拉远揭晓：敲的是样板房窗户/墙板', '10-25s 敲击实测材料强度（墙板/玻璃/地板）', '25-30s 行动号召：私信领材料检测报告'],
      sample: [
        { shot: '特写', visual: '指节敲击镜头玻璃（实为样板房窗户内侧）', zh: '咚咚咚，别划走，看这里', en: 'Knock knock — stop scrolling', vo: '敲的不是你屏幕，是我们的窗户' },
        { shot: '拉远', visual: '镜头拉远露出整栋样板房', zh: '刚才敲的，是这栋房子的窗户', en: 'That was the window of this house', vo: '双层中空玻璃，隔音又保温' },
        { shot: '实测', visual: '锤敲墙板/成人原地跳地板', zh: '墙板随便敲，地板随便跳', en: 'Knock the walls, jump on the floor', vo: '镀锌钢骨架，抗风抗震' },
        { shot: '落版', visual: 'LOGO+CTA', zh: '不信？私信「报告」看检测数据', en: 'DM "TEST" for lab reports', vo: '' }
      ]
    },
    {
      id: 'vt7', name: '工厂实力展示型', duration: '45-60秒', bestFor: '整厂参观视角建立信任，适合经销商/大单客户考察前种草',
      structure: ['0-5s 钩子：无人机航拍厂区全景', '5-20s 车间巡览：钢构/焊接/总装一镜到底', '20-35s 成品库存区+装柜发货', '35-45s 资质证书+出口国家地图', '45s+ 行动号召：预约来厂考察/视频验厂'],
      sample: [
        { shot: '航拍', visual: '无人机掠过厂区全景', zh: '20000㎡的工厂，长这样', en: 'Our 20,000㎡ factory from above', vo: '自有工厂，不是贸易商' },
        { shot: '跟拍', visual: '一镜穿过三大车间', zh: '钢构、焊接、总装，一条龙', en: 'Steel, welding, assembly — all in-house', vo: '月产能 300 套，大单不慌' },
        { shot: '摇镜', visual: '成品库存区+集装箱装柜', zh: '现货常备 50 套，随时装柜', en: '50 units in stock, ready to ship', vo: '急单 7 天出货' },
        { shot: '字幕卡', visual: 'CE/ISO 证书+全球发货地图', zh: '已出口 30+ 个国家', en: 'Exported to 30+ countries', vo: '' },
        { shot: '落版', visual: 'LOGO+CTA', zh: '来厂考察或视频验厂，私信「预约」', en: 'DM "TOUR" — on-site or video factory tour', vo: '' }
      ]
    }
  ],

  /* 视频项目：用于视频仓库按项目归类管理生成的视频 */
  videoProjects: [
    { id: 'vp1', name: '视频号日更' },
    { id: 'vp2', name: '美国营地主投放素材' },
    { id: 'vp3', name: '产品发布' }
  ],

  videoQueue: [
    { id: 'v1', ratio: '9:16', durationSec: 60, title: 'EH-20 德州营地案例(英文版)', template: '客户案例故事型', project: 'vp2', product: 'EH-20', status: '已发布', date: '7月1日', views: 12400, likes: 380, leads: 5 },
    { id: 'v2', ratio: '9:16', durationSec: 30, title: '30秒安装延时 · 卡点版', template: '30秒安装延时型', project: 'vp2', product: 'EH-20', status: '已发布', date: '6月30日', views: 45200, likes: 1520, leads: 9 },
    { id: 'v3', ratio: '9:16', durationSec: 45, title: '为什么民宿扩建总超预算', template: '痛点字幕解说型', project: 'vp1', product: 'EH-20', status: '已发布', date: '6月28日', views: 8900, likes: 210, leads: 2 },
    { id: 'v4', ratio: '9:16', durationSec: 30, title: '工厂流水线快剪 7月版', template: '工厂流水线快剪型', project: 'vp1', product: 'EH-20', status: '待审核', date: '今天', views: 0, likes: 0, leads: 0 },
    { id: 'v5', ratio: '9:16', durationSec: 60, title: 'EH-40 三卧两卫内部实拍', template: '产品360°展开演示型', project: 'vp3', product: 'EH-40', status: '待审核', date: '今天', views: 0, likes: 0, leads: 0 },
    { id: 'v6', ratio: '9:16', durationSec: 30, title: 'FD-13 咖啡亭改装脑洞篇', template: '痛点字幕解说型', project: 'vp1', product: 'FD-13', status: '草稿', date: '昨天', views: 0, likes: 0, leads: 0 }
  ],

  /* ---------- 广告投放 ---------- */
  adAccounts: [
    { platform: 'Facebook', account: 'Oasis Modular 主户', accountId: 'act_1024****88', status: '正常', balance: 12400, spendMonth: 6420 },
    { platform: 'Google', account: 'Oasis 搜索+PMax', accountId: '739-***-2210', status: '正常', balance: 5800, spendMonth: 2130 }
  ],

  campaigns: [
    {
      id: 'cp1', name: '美国营地主-EH20-7月', platform: 'Facebook', objective: '线索收集', budget: 120, status: '投放中',
      adsets: [
        {
          name: '兴趣-Glamping/Airbnb房东', audience: '美国 35-60岁, 兴趣: glamping/airbnb hosting/campground',
          ads: [
            { name: '安装延时30s-A', creative: '30秒安装延时型', impressions: 84200, clicks: 1560, ctr: 1.85, spend: 890, leads: 11, cpl: 81 },
            { name: '案例故事-德州营地', creative: '客户案例故事型', impressions: 42100, clicks: 620, ctr: 1.47, spend: 610, leads: 4, cpl: 152 }
          ]
        },
        {
          name: '再营销-视频观看50%', audience: '过去30天观看视频50%以上人群',
          ads: [
            { name: 'ROI算账版', creative: '痛点字幕解说型', impressions: 12800, clicks: 410, ctr: 3.2, spend: 320, leads: 7, cpl: 46 }
          ]
        }
      ]
    },
    {
      id: 'cp2', name: '澳洲经销商招募-Q3', platform: 'Facebook', objective: '线索收集', budget: 60, status: '投放中',
      adsets: [
        {
          name: '行业-建材/granny flat', audience: '澳洲, 职位: builder/distributor, 兴趣: granny flat',
          ads: [
            { name: '工厂实力快剪', creative: '工厂流水线快剪型', impressions: 22400, clicks: 290, ctr: 1.29, spend: 480, leads: 2, cpl: 240 }
          ]
        }
      ]
    },
    {
      id: 'cp3', name: '搜索-expandable house 词组', platform: 'Google', objective: '搜索线索', budget: 50, status: '投放中',
      adsets: [
        {
          name: '核心词组-精确+词组', audience: 'expandable container house / folding house 等 24 个词',
          ads: [
            { name: 'RSA自适应搜索广告', creative: '文字广告', impressions: 9600, clicks: 380, ctr: 3.96, spend: 720, leads: 6, cpl: 120 }
          ]
        }
      ]
    }
  ],

  adSuggestions: [
    { severity: 'high', title: '「案例故事-德州营地」单线索成本 $152，超目标 52%', advice: '建议暂停该素材，把预算挪给 CPL $46 的再营销组', action: '暂停素材并调预算' },
    { severity: 'high', title: '再营销组 CPL $46 表现最佳且预算受限', advice: '建议日预算从 $20 提到 $45，预计周线索 +8', action: '上调预算至 $45/日' },
    { severity: 'mid', title: '澳洲经销商系列 CTR 1.29% 低于账户均值', advice: '建议新增「产品360°展开」素材做 A/B，并把受众收窄到 VIC/QLD', action: '生成新素材进入 A/B' },
    { severity: 'low', title: 'Google 搜索词报告发现 12 个无关词（diy shed 等）', advice: '建议加入否定关键词列表', action: '添加否定词' }
  ],

  /* ---------- 主动客户开发 ---------- */
  icp: {
    countries: ['美国', '加拿大', '澳大利亚', '新西兰', '德国', '法国', '北欧', '阿联酋', '沙特', '东南亚'],
    roles: ['Owner / Founder', 'Purchasing Manager', 'Project Manager', 'Director'],
    companyTypes: ['营地/度假村运营商', '建材经销商', '工程承包商', '民宿/短租连锁'],
    keywords: ['glamping resort', 'campground expansion', 'container homes dealer', 'modular construction', 'tiny house rental', 'workforce housing', 'granny flat builder'],
    scoringRules: [
      { rule: '国家在目标市场清单内', weight: 20 },
      { rule: '行业/业务与四类目标客户匹配', weight: 25 },
      { rule: '联系人是决策角色(Owner/采购/项目总监)', weight: 20 },
      { rule: '官网/社媒出现相关项目或产品线', weight: 15 },
      { rule: 'LinkedIn 近90天有活跃动态', weight: 10 },
      { rule: '海关数据有相关品类进口记录', weight: 10 }
    ]
  },

  prospects: [
    { id: 'p1', company: 'Blue Ridge Retreats', country: '美国', person: 'Anna White', role: 'Owner', website: 'blueridgeretreats.com', score: 92, signals: ['官网有扩建计划页', 'LinkedIn活跃', '营地运营商'], status: '已回复→线索', lastAction: '回复了 D3 邮件' },
    { id: 'p2', company: 'Nordic Cabins AB', country: '瑞典', person: 'Erik Lund', role: 'Purchasing Manager', website: 'nordiccabins.se', score: 85, signals: ['海关数据: 进口过板房', '决策角色'], status: '已发WA', lastAction: 'WhatsApp 首触已读' },
    { id: 'p3', company: 'Outback Stays Pty', country: '澳大利亚', person: 'Jack Morrison', role: 'Director', website: 'outbackstays.au', score: 81, signals: ['granny flat 业务', 'LinkedIn活跃'], status: '已发邮件', lastAction: 'D0 邮件已打开 2 次' },
    { id: 'p4', company: 'Gulf Camp Solutions', country: '阿联酋', person: 'Khalid Rahman', role: 'Project Manager', website: 'gulfcamp.ae', score: 78, signals: ['工程承包商', '官网有营地项目'], status: '待触达', lastAction: '-' },
    { id: 'p5', company: 'Maple Stay Group', country: '加拿大', person: 'Chloe Tremblay', role: 'Founder', website: 'maplestay.ca', score: 74, signals: ['短租连锁 12 处', 'LinkedIn活跃'], status: '已发邮件', lastAction: 'D0 已送达未打开' },
    { id: 'p6', company: 'Alpen Chalets GmbH', country: '德国', person: 'Stefan Weber', role: 'Owner', website: 'alpenchalets.de', score: 71, signals: ['度假村运营', '官网多语言'], status: '待触达', lastAction: '-' },
    { id: 'p7', company: 'Kiwi Tiny Homes', country: '新西兰', person: 'Ben Clarke', role: 'Owner', website: 'kiwitiny.nz', score: 68, signals: ['tiny house 经销'], status: '已发WA', lastAction: '未读' },
    { id: 'p8', company: 'Saigon Eco Resorts', country: '越南', person: 'Tran Minh', role: 'Purchasing Manager', website: 'saigoneco.vn', score: 62, signals: ['度假村', '进口记录待核'], status: '待触达', lastAction: '-' },
    { id: 'p9', company: 'Desert Rose Events', country: '沙特', person: 'Omar Hassan', role: 'Director', website: 'desertrose.sa', score: 55, signals: ['活动搭建为主，匹配度中'], status: '待触达', lastAction: '-' },
    { id: 'p10', company: 'City Storage Ltd', country: '英国', person: 'Paul Green', role: 'Manager', website: 'citystorage.uk', score: 34, signals: ['仓储行业，匹配度低'], status: '已排除', lastAction: 'AI 判定: 非目标行业' }
  ],

  outreachSequences: [
    { day: 'D0', channel: '邮件', subject: 'Expansion units for {company} — 14-month payback case', body: 'Hi {name}, saw {company} is growing. We supply expandable units to camps/resorts in {country} — one Texas client hit payback in 14 months (real numbers inside). Worth a 2-line reply if relevant: I will send the case + pricing. — Kevin, Oasis Modular' },
    { day: 'D3', channel: '邮件', subject: 'Re: the 14-month payback case (+ install video)', body: 'Hi {name}, following up with the 3-hour install video — most operators are surprised how fast units go live. If expansion is on your 2026 roadmap, happy to send a budget sheet for {country} landed cost. No hard sell.' },
    { day: 'D7', channel: 'WhatsApp', subject: '-', body: 'Hi {name}, Kevin from Oasis Modular here (emailed you the camp-unit case). One question: is adding units something you are looking at this year, or should I check back next season? Either answer helps me not spam you :)' },
    { day: 'D14', channel: '邮件', subject: 'Last note — leaving the door open', body: 'Hi {name}, closing the loop. Leaving you our case folder + price list link. If timing changes, one reply brings it to the top of my list. Good luck with the season!' }
  ],

  inboxReplies: [
    { prospectId: 'p1', from: 'Anna White · Blue Ridge Retreats', text: 'Interesting numbers. We are planning 6 new units for spring 2027. Send the case study and pricing for the 36sqm model.', time: '今天 07:42' },
    { prospectId: 'p2', from: 'Erik Lund · Nordic Cabins AB', text: 'We import from Estonia currently. What makes your units better for Nordic winters? Send insulation specs.', time: '昨天 19:10' }
  ],

  /* ---------- 存量客户批量分析（预设结论） ---------- */
  analysisFindings: {
    c1: { focus: ['价格与预算', '到岸成本', '回本周期'], stageJudge: '报价后关键决策期', risk: '价格异议未完全化解，周末合伙人讨论存在变数', action: '周一主动跟进，备好基础配置降价方案', autoTags: ['营地', '急单', '价格敏感'] },
    c2: { focus: ['项目交期', '耐高温', '验厂'], stageJudge: '样品/看厂推进中，信任建立期', risk: '大项目多供应商比选，验厂表现决定成败', action: '7月8日前高质量交付 BOQ，验厂动线彩排', autoTags: ['大项目', '要验厂'] },
    c3: { focus: ['外观定制', '法国报建'], stageJudge: '需求确认期', risk: '报建问题若无解可能流失', action: '发送法国已交付案例+报建思路文档', autoTags: ['民宿', '比价中'] },
    c5: { focus: ['价格', '低价竞品对比'], stageJudge: '价格拉锯', risk: '目标价接近底价红线，强行成交利润过薄', action: '引导转 FD-13 走量，或礼貌设定底线', autoTags: ['价格敏感', '比价中'] },
    c6: { focus: ['合同条款', 'DIN合规', 'QC流程'], stageJudge: '临门一脚，本周可签', risk: '流程型客户，任何文件延误都影响签约', action: '周五前催签+定金，所有文件当天响应', autoTags: ['大项目', '严谨'] },
    c7: { focus: ['返单', '飓风锚固', '澳标'], stageJudge: '复购扩大期', risk: '无重大风险，注意竞品挖角', action: '锁定 8 月排产，季度拜访计划', autoTags: ['老客户', '澳标'] },
    c8: { focus: ['前期了解'], stageJudge: '早期构想阶段', risk: '节奏慢，过度跟进易反感', action: '转入内容营养流（月度案例推送）', autoTags: ['观望', '长线'] },
    c13: { focus: ['投资人决策', '沙漠规格'], stageJudge: '报价后失联 45 天', risk: '大概率项目搁置或转竞品', action: '发唤醒消息：沙漠新案例+旺季排产提醒', autoTags: ['待唤醒', '大项目'] },
    c14: { focus: ['试单条件'], stageJudge: '需求确认中断 30 天', risk: '兴趣减退', action: '换角度唤醒：济州岛物流方案已打通', autoTags: ['待唤醒'] }
  },

  /* ---------- 初筛客服演示剧本 ---------- */
  qualifyDemo: {
    lead: { name: 'Sarah Brown', country: '英国', source: '广告投放' },
    conversation: [
      { from: 'c', text: 'Hi, how much is the expandable house? Can it be a garden office?' },
      { from: 'ai', text: 'Hi Sarah! Yes — the EH-20 works great as a garden office (36㎡, fully insulated, wiring pre-installed). Price is $8,500–13,500 FOB depending on spec. May I ask — is this for your own garden, or a business project?' },
      { from: 'c', text: 'My own garden. I run a design studio from home.' },
      { from: 'ai', text: 'A design studio — nice use case. Two quick things to quote you accurately: 1) Which port/city are you in? (for shipping estimate to UK) 2) When would you like it installed?' },
      { from: 'c', text: 'Near Bristol. Ideally before October.' },
      { from: 'ai', text: 'Bristol before October is comfortable: production 15-30 days + ~35 days shipping. For a UK garden office most clients choose the upgraded insulation + double glazing (+$900). Budget-wise, are you thinking around $10k, or shall I quote base spec too?' },
      { from: 'c', text: 'Around 10-12k USD all-in would be ok. Do I need planning permission?' },
      { from: 'ai', text: 'Great, that budget fits the upgraded spec. On UK planning: garden offices under 2.5m height often fall under permitted development, but rules vary by council — our team will send you a guidance note for Bristol. I am connecting you with our UK specialist 李婷 now, she will send the exact quote within 24h. 👍' }
    ],
    profile: { name: 'Sarah Brown', country: '英国 · Bristol', usage: '花园办公室（设计工作室）', qty: '1 套', budget: '$10-12k 全包', timeline: '10 月前交付', intent: 'B+', suggestion: '推 EH-20 加强保温+双层玻璃配置，附英国报建指引，分配给李婷' }
  },

  /* ---------- 技术分身知识库 ---------- */
  techKB: [
    { q: '标准款抗风抗雪等级是多少？', a: '设计风载 0.5kN/㎡（约10-12级风），雪载 0.5kN/㎡。飓风区/重雪区需加强结构：加密立柱+斜撑+锚固件，需提交当地风速数据给技术部出方案。' },
    { q: '客户地基怎么做？', a: '三种方案：①条形混凝土基础（永久）②混凝土墩+调平（半永久）③螺旋桩（快装/可迁移）。平整度要求 ±10mm，我们提供基础图，土建客户自理。' },
    { q: '美标/澳标电气有什么区别？', a: '美标：110V/NEC 规范/NEMA 插座；澳标：230V/AS3000 布线逻辑/SAA 插座。出厂按目的国预装，报价时必须确认标准，改装费 $260/套。' },
    { q: '卫浴排水有坡度要求吗？', a: '整体卫浴自带 2% 排水坡，出户主管 DN75。客户场地需预留化粪池/市政接口，距离超 15m 需加中继泵（选配 $180）。' },
    { q: '75mm 岩棉板保温参数？', a: 'U值约 0.55 W/㎡K，耐火 A 级。寒区推荐 100mm（U值 0.41）+双层中空窗，-30℃ 环境已有加拿大案例。' },
    { q: '吊装有什么要求？', a: 'EH-20 整箱约 4.2 吨，需 8 吨以上吊车或带吊叉车，4 个顶角吊点。场地需 6m 宽通道。无吊装条件可选散件发货现场组装（工时 x3）。' },
    { q: '拼接处防水工艺？', a: '三道防线：EPDM 胶条 + 结构搭接 + 中性硅酮密封胶。屋面整体防水卷材上翻 150mm。沿海高盐雾地区外板用 AZ150 镀铝锌。' },
    { q: '定制图纸流程和周期？', a: '收 $300 图纸费（下单抵货款）→ 3 个工作日出平面+立面 → 客户确认 → 2 天出生产图。改版 2 次内免费。' },
    { q: '海运固定怎么做？', a: '折叠板用钢带+角件锁固，整箱用集装箱标准角件。到港开箱如发现运输损伤，48 小时内拍照报保险，我们协助理赔。' },
    { q: '高湿热地区防锈处理？', a: '标准热镀锌 Z120；海边/高湿热升级 AZ150 镀铝锌+环氧底漆，加价 $350/套，质保从 5 年升到 10 年。' }
  ],

  /* ---------- 老板分身 ---------- */
  bossBrief: {
    date: '2026年7月4日 星期六',
    cash: { in: 186000, out: 92400, note: '本月回款 $186k，含 Müller 定金 $41.4k（待到账）' },
    highlights: [
      'Hans Müller 合同今日待签，金额 $138k，Kevin 跟进中',
      'Ahmed 验厂定档 7月15-16，BOQ 草案 7月8日截止',
      '广告月消耗 $8,550，产出线索 39 条，平均 CPL $115（上月 $142，改善 19%）',
      '排产：7 月产能已排 82%，EH-20 线满产'
    ],
    approvals: [
      { id: 'a1', title: 'Olu（尼日利亚）FD-13 x5 特价申请：$2,950/套（底价 $3,000）', by: '王浩', type: '价格审批' },
      { id: 'a2', title: '广告：再营销组预算 $20→$45/日', by: '李婷', type: '预算审批' },
      { id: 'a3', title: 'Ahmed 验厂接待预算 ¥8,000（接机+样板房布置+晚宴）', by: 'Kevin', type: '费用审批' }
    ],
    schedule: ['10:00 产能例会', '14:00 看 EH-40 新样板房', '16:30 和物流谈美线运价年协议']
  },
  bossQA: [
    { triggers: ['业绩', '这个月', '销售额'], a: '本月截至今日：新签 $224k（Müller $138k 待签+Emma 返单 $86k 意向），回款 $186k，新线索 39 条转客户 11 个。对比上月同期签单 +34%。' },
    { triggers: ['产能', '排产', '工厂'], a: '7 月产能已排 82%：EH-20 线满产至 7月28日，FD-13 线余 40% 产能。若 Müller 今日签约，需与 Emma 返单抢 8 月上旬排期，建议优先老客户。' },
    { triggers: ['mike', '德州', '营地'], a: 'Mike Johnson（德州营地 8-10 套，$86k）：报价后价格有异议，周末与合伙人讨论。李婷已备好基础配置方案（$8,900），周一跟进。成交概率评估 65%。' },
    { triggers: ['广告', '投放', '线索成本'], a: '广告月消耗 $8,550 → 39 线索，CPL $115。最优：FB 再营销组 CPL $46（预算审批在你桌上）；最差：案例故事素材 CPL $152 已建议暂停。' },
    { triggers: ['验厂', 'ahmed', '迪拜'], a: 'Ahmed（迪拜 40 套，$320k）7月15-16 验厂。准备事项：BOQ 草案（7月8日截止，Kevin 负责）、接待审批（¥8,000 待你批）、样板房展开演示彩排。' }
  ],

  /* ---------- 仪表盘 KPI ---------- */
  kpis: {
    todayLeads: 4,
    weekLeads: 39,
    weekTrend: [4, 6, 5, 7, 8, 5, 4],
    channelSplit: [
      { label: '广告投放', v: 16 },
      { label: '视频号', v: 9 },
      { label: '主动开发', v: 8 },
      { label: '官网/其他', v: 6 }
    ],
    adSpendMonth: 8550,
    cpl: 115,
    pendingFollowups: 12,
    videosWeek: 11,
    funnel: [
      { label: '询盘', v: 39 },
      { label: '需求确认', v: 24 },
      { label: '方案报价', v: 15 },
      { label: '样品/看厂', v: 6 },
      { label: 'PI/成交', v: 3 }
    ]
  }
};
