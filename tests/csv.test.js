'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {cell, serialize} = require('../lib/csv');
test('escapes quotes, newlines, commas and nulls', () => {
  assert.equal(cell('one,"two"'), '"one,""two"""');
  assert.equal(cell('first\nsecond'), '"first\nsecond"');
  assert.equal(cell(null), '""');
});
test('neutralises spreadsheet formula injection', () => {
  for (const value of ['=SUM(1,2)', '+cmd', '-cmd', '@external', '  =1+1'])
    assert.ok(cell(value).startsWith('"\''));
});
test('exports ordered headers and rows', () => {
  assert.equal(serialize([{id:2,name:'Mira'}],['id','name']),
    '"id","name"\r\n"2","Mira"\r\n');
});
