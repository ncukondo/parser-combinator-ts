import {Parser} from './parser';
import './parser-method';
import {formatError} from'./error-formatter';

Parser.setDefaultErrorFormatter(formatError);

export * from './parser';

