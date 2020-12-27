import  {regexp,string,makeParser,makeOk,makeFail,offsetToPosition} from './parser';
import  {alt,desc} from './combinators';
    

const testChar = (testFn:(chars:string)=>boolean) => {
  return makeParser((input, i)=> {
    const char = input.charAt(i);
    if (i < input.length && testFn(char)) {
      return makeOk(i + 1, char);
    } else {
      return makeFail(i, "a character matching " + testFn.toString());
    }
  });
}

const rangeChar = (begin:string, end:string) => {
  return testChar(function(ch) {
    return begin <= ch && ch <= end;
  }).pipe(desc(begin + "-" + end));
}


const oneOf = (str:string) =>{
  const expected = str.split("");
  for (var idx = 0; idx < expected.length; idx++) {
    expected[idx] = "'" + expected[idx] + "'";
  }
  return testChar((ch)=> str.includes(ch))
    .pipe(desc(expected));
}

const noneOf = (str:string) => {
  return testChar((ch) => {
    return str.indexOf(ch) < 0;
  }).pipe(desc("none of '" + str + "'"));
}

const index = makeParser((input, i,ok) =>{
  return ok(i, offsetToPosition(input, i));
});

const any = makeParser(function(input, i,ok,fail) {
  if (i >= input.length) {
    return fail(i, "any character");
  }
  return ok(i + 1, input.charAt(i));
});

const all = makeParser((input, i,ok) =>
  ok(input.length, input.slice(i))
);

const EOF = makeParser((input, i,ok,fail) =>{
  if (i < input.length) {
    return fail(i, "EOF");
  }
  return ok(i, null);
});

const SOL = makeParser((input, i,ok,fail) =>{
  if (i === 0) return ok(i, null);
  if ("\n\r".includes(input.charAt(i-1))) return ok(i, null);
  return fail(i, "start of line");
});

const digits = regexp(/[1-9][0-9]*/).pipe(desc("optional digits"));
const letter = regexp(/[a-z]/i).pipe(desc("a letter"));
const letters = regexp(/[a-z]+/i).pipe(desc("letters"));
const optWhitespace = regexp(/\s*/).pipe(desc("optional whitespace"));
const digit = regexp(/[0-9]/).pipe(desc("a digit"));
const whitespace = regexp(/\s+/).pipe(desc("whitespace"));
const cr = string("\r");
const lf = string("\n");
const crlf = string("\r\n").pipe(desc("CRLF"));
const NL = alt(crlf, lf, cr).pipe(desc("newline"));
const EOL = alt(NL, EOF).pipe(desc("end of line"));

export {
  EOL,SOL,EOF,digit,digits,letter,letters
  ,optWhitespace, whitespace,cr,lf,crlf,NL
  ,any,all,index
  ,rangeChar,oneOf,noneOf
}