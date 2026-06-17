import chalk, {Chalk} from './source/index.js';

const result = chalk.gradient('#ff0000', '#0000ff')('AB\r\nCD');
console.log('Result:', JSON.stringify(result));
console.log('Split by \\r\\n:', result.split('\r\n'));
console.log('Split by \\n:', result.split('\n'));
