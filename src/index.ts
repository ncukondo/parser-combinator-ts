import './parser-method';
import {formatError} from'./error-formatter';
import './test';
import {Parser} from './parser';

Parser.setDefaultErrorFormatter(formatError);

export * from './parser';

