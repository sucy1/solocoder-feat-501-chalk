import process from 'node:process';
import test from 'ava';
import chalk, {
	Chalk,
	chalkStderr,
	hexToRgb,
	rgbToHex,
} from '../source/index.js';

chalk.level = 3;
chalkStderr.level = 3;

console.log('TERM:', process.env.TERM || '[none]');
console.log('platform:', process.platform || '[unknown]');

test('don\'t add any styling when called as the base function', t => {
	t.is(chalk('foo'), 'foo');
});

test('support multiple arguments in base function', t => {
	t.is(chalk('hello', 'there'), 'hello there');
});

test('support automatic casting to string', t => {
	t.is(chalk(['hello', 'there']), 'hello,there');
	t.is(chalk(123), '123');

	t.is(chalk.bold(['foo', 'bar']), '\u001B[1mfoo,bar\u001B[22m');
	t.is(chalk.green(98_765), '\u001B[32m98765\u001B[39m');
});

test('style string', t => {
	t.is(chalk.underline('foo'), '\u001B[4mfoo\u001B[24m');
	t.is(chalk.red('foo'), '\u001B[31mfoo\u001B[39m');
	t.is(chalk.bgRed('foo'), '\u001B[41mfoo\u001B[49m');
});

test('support applying multiple styles at once', t => {
	t.is(chalk.red.bgGreen.underline('foo'), '\u001B[31m\u001B[42m\u001B[4mfoo\u001B[24m\u001B[49m\u001B[39m');
	t.is(chalk.underline.red.bgGreen('foo'), '\u001B[4m\u001B[31m\u001B[42mfoo\u001B[49m\u001B[39m\u001B[24m');
});

test('support nesting styles', t => {
	t.is(
		chalk.red('foo' + chalk.underline.bgBlue('bar') + '!'),
		'\u001B[31mfoo\u001B[4m\u001B[44mbar\u001B[49m\u001B[24m!\u001B[39m',
	);
});

test('support nesting styles of the same type (color, underline, bg)', t => {
	t.is(
		chalk.red('a' + chalk.yellow('b' + chalk.green('c') + 'b') + 'c'),
		'\u001B[31ma\u001B[33mb\u001B[32mc\u001B[39m\u001B[31m\u001B[33mb\u001B[39m\u001B[31mc\u001B[39m',
	);
});

test('reset all styles with `.reset()`', t => {
	t.is(chalk.reset(chalk.red.bgGreen.underline('foo') + 'foo'), '\u001B[0m\u001B[31m\u001B[42m\u001B[4mfoo\u001B[24m\u001B[49m\u001B[39mfoo\u001B[0m');
});

test('support caching multiple styles', t => {
	const {red, green} = chalk.red;
	const redBold = red.bold;
	const greenBold = green.bold;

	t.not(red('foo'), green('foo'));
	t.not(redBold('bar'), greenBold('bar'));
	t.not(green('baz'), greenBold('baz'));
});

test('alias gray to grey', t => {
	t.is(chalk.grey('foo'), '\u001B[90mfoo\u001B[39m');
});

test('support variable number of arguments', t => {
	t.is(chalk.red('foo', 'bar'), '\u001B[31mfoo bar\u001B[39m');
});

test('support falsy values', t => {
	t.is(chalk.red(0), '\u001B[31m0\u001B[39m');
});

test('don\'t output escape codes if the input is empty', t => {
	t.is(chalk.red(), '');
	t.is(chalk.red.blue.black(), '');
});

test('keep Function.prototype methods', t => {
	t.is(Reflect.apply(chalk.grey, null, ['foo']), '\u001B[90mfoo\u001B[39m');
	t.is(chalk.reset(chalk.red.bgGreen.underline.bind(null)('foo') + 'foo'), '\u001B[0m\u001B[31m\u001B[42m\u001B[4mfoo\u001B[24m\u001B[49m\u001B[39mfoo\u001B[0m');
	t.is(chalk.red.blue.black.call(null), '');
});

test('line breaks should open and close colors', t => {
	t.is(chalk.grey('hello\nworld'), '\u001B[90mhello\u001B[39m\n\u001B[90mworld\u001B[39m');
});

test('line breaks should open and close colors with CRLF', t => {
	t.is(chalk.grey('hello\r\nworld'), '\u001B[90mhello\u001B[39m\r\n\u001B[90mworld\u001B[39m');
});

test('properly convert RGB to 16 colors on basic color terminals', t => {
	t.is(new Chalk({level: 1}).hex('#FF0000')('hello'), '\u001B[91mhello\u001B[39m');
	t.is(new Chalk({level: 1}).bgHex('#FF0000')('hello'), '\u001B[101mhello\u001B[49m');
});

test('properly convert RGB to 256 colors on basic color terminals', t => {
	t.is(new Chalk({level: 2}).hex('#FF0000')('hello'), '\u001B[38;5;196mhello\u001B[39m');
	t.is(new Chalk({level: 2}).bgHex('#FF0000')('hello'), '\u001B[48;5;196mhello\u001B[49m');
	t.is(new Chalk({level: 3}).bgHex('#FF0000')('hello'), '\u001B[48;2;255;0;0mhello\u001B[49m');
});

test('don\'t emit RGB codes if level is 0', t => {
	t.is(new Chalk({level: 0}).hex('#FF0000')('hello'), 'hello');
	t.is(new Chalk({level: 0}).bgHex('#FF0000')('hello'), 'hello');
});

test('supports blackBright color', t => {
	t.is(chalk.blackBright('foo'), '\u001B[90mfoo\u001B[39m');
});

test('sets correct level for chalkStderr and respects it', t => {
	t.is(chalkStderr.level, 3);
	t.is(chalkStderr.red.bold('foo'), '\u001B[31m\u001B[1mfoo\u001B[22m\u001B[39m');
});

test('keeps function prototype methods', t => {
	t.is(chalk.apply(chalk, ['foo']), 'foo');
	t.is(chalk.bind(chalk, 'foo')(), 'foo');
	t.is(chalk.call(chalk, 'foo'), 'foo');
});

test('hexToRgb converts hex to RGB array', t => {
	t.deepEqual(hexToRgb('#ff0000'), [255, 0, 0]);
	t.deepEqual(hexToRgb('#00ff00'), [0, 255, 0]);
	t.deepEqual(hexToRgb('#0000ff'), [0, 0, 255]);
	t.deepEqual(hexToRgb('#ffffff'), [255, 255, 255]);
	t.deepEqual(hexToRgb('#000000'), [0, 0, 0]);
});

test('hexToRgb supports shorthand hex', t => {
	t.deepEqual(hexToRgb('#f00'), [255, 0, 0]);
	t.deepEqual(hexToRgb('#0f0'), [0, 255, 0]);
	t.deepEqual(hexToRgb('#00f'), [0, 0, 255]);
	t.deepEqual(hexToRgb('#fff'), [255, 255, 255]);
});

test('hexToRgb handles invalid input', t => {
	t.deepEqual(hexToRgb('invalid'), [0, 0, 0]);
	t.deepEqual(hexToRgb(''), [0, 0, 0]);
});

test('rgbToHex converts RGB to hex string', t => {
	t.is(rgbToHex(255, 0, 0), '#ff0000');
	t.is(rgbToHex(0, 255, 0), '#00ff00');
	t.is(rgbToHex(0, 0, 255), '#0000ff');
	t.is(rgbToHex(255, 255, 255), '#ffffff');
	t.is(rgbToHex(0, 0, 0), '#000000');
});

test('rgbToHex handles out of range values', t => {
	t.is(rgbToHex(300, -10, 128), '#ff0080');
	t.is(rgbToHex(256, 256, 256), '#ffffff');
});

test('rgbToHex handles floating point values', t => {
	t.is(rgbToHex(255.5, 0.4, 127.6), '#ff0080');
});

test('gradient applies two-color gradient with hex', t => {
	const result = chalk.gradient('#ff0000', '#0000ff')('AB');
	t.true(result.startsWith('\u001B[38;2;255;0;0m'));
	t.true(result.includes('\u001B[38;2;0;0;255m'));
	t.true(result.endsWith('\u001B[39m'));
	t.true(result.includes('A'));
	t.true(result.includes('B'));
});

test('gradient applies two-color gradient with CSS color names', t => {
	const result = chalk.gradient('red', 'blue')('AB');
	t.true(result.startsWith('\u001B[38;2;255;0;0m'));
	t.true(result.includes('\u001B[38;2;0;0;255m'));
	t.true(result.endsWith('\u001B[39m'));
});

test('gradient supports multiple colors', t => {
	const result = chalk.gradient('red', 'green', 'blue')('ABC');
	t.true(result.startsWith('\u001B[38;2;255;0;0m'));
	t.true(result.includes('\u001B[38;2;0;128;0m'));
	t.true(result.includes('\u001B[38;2;0;0;255m'));
	t.true(result.endsWith('\u001B[39m'));
});

test('gradient handles multi-line text with independent gradients per line', t => {
	const result = chalk.gradient('#ff0000', '#0000ff')('AB\nCD');
	const lines = result.split('\n');
	t.is(lines.length, 2);
	t.true(lines[0].startsWith('\u001B[38;2;255;0;0m'));
	t.true(lines[0].endsWith('\u001B[39m'));
	t.true(lines[1].startsWith('\u001B[38;2;255;0;0m'));
	t.true(lines[1].endsWith('\u001B[39m'));
});

test('gradient throws error with less than two colors', t => {
	t.throws(() => chalk.gradient('#ff0000')('test'), {message: 'Gradient requires at least two colors'});
	t.throws(() => chalk.gradient()('test'), {message: 'Gradient requires at least two colors'});
});

test('gradient degrades gracefully at level 2 (256 colors)', t => {
	const chalk256 = new Chalk({level: 2});
	const result = chalk256.gradient('#ff0000', '#0000ff')('AB');
	t.true(result.startsWith('\u001B[38;5;196m'));
	t.true(result.includes('\u001B[38;5;21m'));
	t.true(result.endsWith('\u001B[39m'));
});

test('gradient degrades to midpoint solid color at level 1 (16 colors)', t => {
	const chalk16 = new Chalk({level: 1});
	const result = chalk16.gradient('#ff0000', '#0000ff')('AB');
	t.true(result.startsWith('\u001B[35m'));
	t.true(result.endsWith('\u001B[39m'));
	t.is(result, '\u001B[35mAB\u001B[39m');
});

test('gradient returns plain text at level 0 (no color)', t => {
	const chalk0 = new Chalk({level: 0});
	const result = chalk0.gradient('#ff0000', '#0000ff')('AB');
	t.is(result, 'AB');
});

test('gradient handles empty string', t => {
	t.is(chalk.gradient('#ff0000', '#0000ff')(''), '');
});

test('gradient handles single character', t => {
	const result = chalk.gradient('#ff0000', '#0000ff')('A');
	t.true(result.startsWith('\u001B[38;2;255;0;0m'));
	t.true(result.endsWith('A\u001B[39m'));
});

test('gradient supports mixed hex and color name inputs', t => {
	const result = chalk.gradient('#ff0000', 'blue')('AB');
	t.true(result.startsWith('\u001B[38;2;255;0;0m'));
	t.true(result.includes('\u001B[38;2;0;0;255m'));
});

test('gradient is chainable with other styles', t => {
	const result = chalk.bold.gradient('#ff0000', '#0000ff')('AB');
	t.true(result.includes('\u001B[1m'));
	t.true(result.includes('\u001B[38;2;255;0;0m'));
	t.true(result.includes('\u001B[22m'));
});
