import chalk, {Chalk} from './source/index.js';

const chalk0 = new Chalk({level: 0});
const chalk1 = new Chalk({level: 1});
const chalk3 = new Chalk({level: 3});

console.log('=== Level 0 ===');
console.log('Empty string:', JSON.stringify(chalk0.gradient('#ff0000', '#0000ff')('')));
console.log('With text:', JSON.stringify(chalk0.gradient('#ff0000', '#0000ff')('AB')));
console.log('Bold+gradient:', JSON.stringify(chalk0.bold.gradient('#ff0000', '#0000ff')('AB')));

console.log('\n=== Level 1 ===');
console.log('Plain:', JSON.stringify(chalk1.gradient('#ff0000', '#0000ff')('AB')));
console.log('Bold+gradient:', JSON.stringify(chalk1.bold.gradient('#ff0000', '#0000ff')('AB')));

console.log('\n=== Level 3 ===');
console.log('CRLF:', JSON.stringify(chalk3.gradient('#ff0000', '#0000ff')('AB\r\nCD')));
console.log('Empty line:', JSON.stringify(chalk3.gradient('#ff0000', '#0000ff')('AB\n\nCD')));
console.log('Start with newline:', JSON.stringify(chalk3.gradient('#ff0000', '#0000ff')('\nAB')));
console.log('hex+gradient:', JSON.stringify(chalk3.hex('#00ff00').gradient('#ff0000', '#0000ff')('AB')));
console.log('Bold+gradient:', JSON.stringify(chalk3.bold.gradient('#ff0000', '#0000ff')('AB')));
