import { digit, takeTo, string, regexp,seqObj, all, alt,seq } from "../src/index";

describe('basic methods',()=>{
  test('withRawText',()=>{
    expect(seq("year",regexp(/\d+/).map(Number)).withRawText().tryParse('year00019801006')).toEqual({
        "rawText": "year00019801006",
        "value":  [
          "year",
          19801006,
        ],
      });
  })
  test('many',()=>{
    expect(regexp(/./).many().withRawText().parse('123456')).toEqual({
      "expect":  [],
      "index": 6,
      "status": true,
      "value": {
        "rawText": "123456",
        "value": [
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
        ],
      },
    });
  })
})