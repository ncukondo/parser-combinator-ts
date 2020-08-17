interface FormatOption  {
  linesBeforeError:number;
  linesAfterError:number;
  linePrefix:string;
}
const formatOptionDefault:FormatOption = {
  linesBeforeError: 2,
  linesAfterError:3,
  linePrefix:"  "
}

const offsetToPosition = (input:string, offset:number) =>{
  const lines = input.slice(0, offset).split("\n");
  // Note that unlike the character offset, the line and column offsets are
  // 1-based.
  return {
    offset,
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}


const repeat = (text:string, amount:number) => {
  return Array(amount + 1).join(text);
}

const formatExpected = (expected:string[]) =>{
  if (expected.length === 1) {
    return "Expected:\n\n" + expected[0];
  }
  return "Expected one of the following: \n\n" + expected.join(", ");
}

// Get a range of indexes including `i`-th element and `before` and `after` amount of elements from `arr`.
const rangeFromIndexAndOffsets = (i:number, before:number, after:number, length:number) =>{
  return [
    // Guard against the negative upper bound for lines included in the output.
    i - before > 0 ? i - before : 0,
    i + after > length ? length : i + after
  ];
}

const makePadder = (len:number,padChar=' ') => (target:string) =>
  target.padStart(len,padChar);
const range = (start:number,end:number) => 
  [...Array(end-start)].map((_,i)=>i+start);
const insert = <T>(target:T[],index:number,item:T) =>
  [...target].splice(index,0,item);

const formatGot = (input:string, index:number,option?:Partial<FormatOption>) => {
  if (index === input.length) return "Got the end of the input";
  const opt = option ? {...formatOptionDefault,...option}: formatOptionDefault
  const position = offsetToPosition(input, index);
  const errorLine = position.line-1;
  const lines = input.split(/\r\n|[\n\r]/);
  const [start,end] = rangeFromIndexAndOffsets(
    errorLine,
    opt.linesBeforeError,
    opt.linesAfterError,
    lines.length);
  const numberLabelLength = String(end).length;
  const padLeft = makePadder(numberLabelLength,' ');
  const lineSep =  " | " ;
  const printLine = (i:number,line:string) =>{
    const prefix = i===errorLine ? "> " : opt.linePrefix;
    return prefix+padLeft(String(i+1))+lineSep+line;
  }
  const errorIndicatorLine = () =>{
    return opt.linePrefix
      + lineSep
      + repeat(" ",position.column)
      + "^"
  }
  const output = range(start,end).map(i=>printLine(i,lines[i]));
  return insert(
    output,
    errorLine,
    errorIndicatorLine()
    ).join("\n")
}

const formatError = (input:string, index:number,expected:string[],option?:Partial<FormatOption>) => {
  return `
-- PARSING FAILED ${repeat("-", 50)}
    
    
${formatGot(input, index,option)}
     
 
${formatExpected(expected)}
`;
}

export {formatError};