import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../js/main.js', import.meta.url), 'utf8'), context);
const { buildBookingMessage, buildLineUrl, validateBooking, normalizePhone } = context.JudoBooking;
const booking = { name: ' 小橘 ', phone: '0912-345 678', lineId: '', service: '機器霧眉 / 自然系霧眉', date: '2026-10-26', time: '下午', experience: '否', noticeRead: true, notes: '' };

test('訊息包含所有欄位、正確星期、手機格式與空值提示', () => {
  assert.equal(buildBookingMessage(booking), '【橘豆 預約申請】\n姓名：小橘\n電話：0912345678\nLINE ID：未提供\n服務項目：機器霧眉 / 自然系霧眉\n希望日期：2026/10/26（週一）\n希望時段：下午\n是否做過紋繡：否\n健康狀況告知：無\n已閱讀預約前注意事項：是\n備註：無');
});
test('保留選填內容、繁體字、換行與特殊字元', () => {
  const message = buildBookingMessage({ ...booking, lineId: ' judo_123 ', notes: '唇峰 & 眉型？\n想先諮詢' });
  assert.ok(message.includes('LINE ID：judo_123'));
  assert.ok(message.endsWith('備註：唇峰 & 眉型？\n想先諮詢'));
});
test('LINE 網址保留路徑 @，完整編碼訊息且可還原', () => {
  const message = buildBookingMessage(booking);
  const url = buildLineUrl(message);
  assert.equal(url, 'https://line.me/R/oaMessage/@184kwhyi/?' + encodeURIComponent(message));
  assert.equal(decodeURIComponent(url.split('/?')[1]), message);
  assert.ok(!url.includes('\n'));
});
test('手機驗證接受空格與連字號，拒絕錯誤號碼', () => {
  assert.equal(normalizePhone('09 12-345-678'), '0912345678');
  assert.ok(validateBooking({ ...booking, phone: '0812345678' }, [], '2026-10-26').phone);
  assert.ok(validateBooking({ ...booking, phone: '09123456789' }, [], '2026-10-26').phone);
});
test('驗證必填、服務選項、日期與時段', () => {
  const services = [{ id: 'brow' }];
  assert.equal(Object.keys(validateBooking({ ...booking, service: 'brow' }, services, '2026-10-26')).length, 0);
  assert.ok(validateBooking({ ...booking, date: '2026-10-25' }, services, '2026-10-26').date);
  assert.ok(validateBooking({ ...booking, date: '2026-02-30' }, services, '2026-01-01').date);
  assert.equal(Object.keys(validateBooking({}, services, '2026-10-26')).length, 7);
});
test('健康告知支援複選與空陣列，LINE 網址可完整還原', () => {
  const message = buildBookingMessage({ ...booking, health: ['唇皰疹體質', '有接睫毛'] });
  assert.ok(message.includes('健康狀況告知：唇皰疹體質、有接睫毛'));
  assert.equal(decodeURIComponent(buildLineUrl(message).split('/?')[1]), message);
  assert.ok(buildBookingMessage({ ...booking, health: [] }).includes('健康狀況告知：無'));
});
test('舊輸入仍可產生訊息，不將未提供的閱讀確認誤報為是', () => {
  const { noticeRead, ...legacy } = booking;
  const message = buildBookingMessage(legacy);
  assert.ok(message.includes('姓名：小橘'));
  assert.ok(message.includes('健康狀況告知：無'));
  assert.ok(message.includes('已閱讀預約前注意事項：否'));
  assert.ok(buildBookingMessage({ ...booking, noticeRead: false }).includes('已閱讀預約前注意事項：否'));
});
test('必須明確勾選已閱讀，未填或 false 均拒絕', () => {
  const valid = { ...booking, service: 'brow' };
  const services = [{ id: 'brow' }];
  assert.equal(Object.keys(validateBooking(valid, services, '2026-10-26')).length, 0);
  for (const noticeRead of [false, undefined, 'true']) {
    const errors = validateBooking({ ...valid, noticeRead }, services, '2026-10-26');
    assert.deepEqual(Object.keys(errors), ['noticeRead']);
  }
});
test('正確處理週日與閏年，拒絕不可能日期', () => {
  assert.ok(buildBookingMessage({ ...booking, date: '2026-11-01' }).includes('（週日）'));
  assert.ok(buildBookingMessage({ ...booking, date: '2028-02-29' }).includes('2028/02/29'));
  assert.throws(() => buildBookingMessage({ ...booking, date: '2026-02-29' }), /日期格式/);
});
