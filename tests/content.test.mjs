import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync(new URL('../js/data.js', import.meta.url), 'utf8'), context);
const data = JSON.parse(JSON.stringify(context.window.SITE_DATA));

test('預約注意事項保留店主逐字原文與四組順序', () => {
  assert.equal(data.bookingNotices.title, '半永久預約前請先看｜重要小提醒');
  assert.equal(data.bookingNotices.intro, '為了讓效果更好、操作更順利，預約前請協助注意以下事項');
  assert.deepEqual(data.bookingNotices.groups.map(group => `${group.no} ${group.title}`), ['① 霧眉／飄眉', '② 眼線', '③ 唇部', '④ 共通注意事項']);
  assert.deepEqual(data.bookingNotices.groups.flatMap(group => group.items), [
    '操作前三天請加強眉部保濕：皮膚狀態好，顯色更均勻、留色也會更漂亮。',
    '眉毛有做過、留有底色或改眉需求：請先拍照私訊諮詢，讓老師評估是否需要調整流程。',
    '操作前請勿接睫毛：若有接睫毛，請至少提前卸除，避免影響操作與衛生安全。',
    '近期眼睛不適、紅腫、發炎請先告知',
    '有唇皰疹體質、容易腫脹者請事先告知：老師會依狀況給予術前建議與調整方式。',
    '操作前一週可多補充水分、加強唇部保濕',
    '操作前避免熬夜、飲酒、感冒、生理期前後不適',
    '當天請勿化妝、勿自行塗抹麻藥',
    '若有重大疾病、懷孕或長期用藥，請務必提前告知'
  ]);
  assert.equal(data.bookingNotices.outro, '提前溝通，是為了讓你更安心、作品更漂亮。有任何不確定的狀況，都歡迎先私訊詢問❤️');
});
test('只有修眉有已確認的價格與價格說明', () => {
  const priced = data.services.filter(service => service.price !== null);
  assert.equal(priced.length, 1);
  assert.equal(priced[0].name, '修眉');
  assert.equal(priced[0].price, 'NT$150');
  assert.equal(priced[0].priceNote, '一人一針｜預約制');
  assert.equal(data.services.length, 11);
  assert.equal(new Set(data.services.map(service => service.id)).size, 11);
});
test('客人回饋只含指定引言及原始註記', () => {
  assert.deepEqual(data.testimonials, [
    { quote: '原來只是多了一雙眉毛，整個人氣色真的差好多。', attribution: '線條眉客人' },
    { quote: '老師，我最近工作真的變得很順耶！', attribution: '男士霧眉客人' },
    { quote: '想要每天起床就有精神', attribution: '機器霧眉客人（客人的期望）' }
  ]);
});
test('地圖指向大立百貨，保留詳細地址與官方 LINE 設定', () => {
  assert.equal(new URL(data.contact.mapUrl).searchParams.get('q'), '高雄大立百貨');
  assert.equal(new URL(data.contact.mapUrl).searchParams.get('output'), 'embed');
  assert.equal(new URL(data.contact.mapLink).searchParams.get('query'), '高雄大立百貨');
  assert.equal(data.contact.location, '高雄前金區，大立百貨附近');
  assert.equal(data.contact.address, '詳細地址預約後提供／請洽官方 LINE');
  assert.equal(data.contact.linePage, 'https://page.line.me/184kwhyi');
  assert.equal(data.contact.threads, 'https://www.threads.com/@jocelyn0504');
});
