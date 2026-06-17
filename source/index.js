import ansiStyles from '#ansi-styles';
import supportsColor from '#supports-color';
import { // eslint-disable-line import/order
	stringReplaceAll,
	stringEncaseCRLFWithFirstIndex,
	colorToRgb,
} from './utilities.js';

const {stdout: stdoutColor, stderr: stderrColor} = supportsColor;

const GENERATOR = Symbol('GENERATOR');
const STYLER = Symbol('STYLER');
const IS_EMPTY = Symbol('IS_EMPTY');

// `supportsColor.level` → `ansiStyles.color[name]` mapping
const levelMapping = [
	'ansi',
	'ansi',
	'ansi256',
	'ansi16m',
];

const styles = Object.create(null);

const applyOptions = (object, options = {}) => {
	if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
		throw new Error('The `level` option should be an integer from 0 to 3');
	}

	// Detect level if not set manually
	const colorLevel = stdoutColor ? stdoutColor.level : 0;
	object.level = options.level === undefined ? colorLevel : options.level;
};

export class Chalk {
	constructor(options) {
		// eslint-disable-next-line no-constructor-return
		return chalkFactory(options);
	}
}

const chalkFactory = options => {
	const chalk = (...strings) => strings.join(' ');
	applyOptions(chalk, options);

	Object.setPrototypeOf(chalk, createChalk.prototype);

	return chalk;
};

function createChalk(options) {
	return chalkFactory(options);
}

Object.setPrototypeOf(createChalk.prototype, Function.prototype);

for (const [styleName, style] of Object.entries(ansiStyles)) {
	styles[styleName] = {
		get() {
			const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
			Object.defineProperty(this, styleName, {value: builder});
			return builder;
		},
	};
}

styles.visible = {
	get() {
		const builder = createBuilder(this, this[STYLER], true);
		Object.defineProperty(this, 'visible', {value: builder});
		return builder;
	},
};

const getModelAnsi = (model, level, type, ...arguments_) => {
	if (model === 'rgb') {
		if (level === 'ansi16m') {
			return ansiStyles[type].ansi16m(...arguments_);
		}

		if (level === 'ansi256') {
			return ansiStyles[type].ansi256(ansiStyles.rgbToAnsi256(...arguments_));
		}

		return ansiStyles[type].ansi(ansiStyles.rgbToAnsi(...arguments_));
	}

	if (model === 'hex') {
		return getModelAnsi('rgb', level, type, ...ansiStyles.hexToRgb(...arguments_));
	}

	return ansiStyles[type][model](...arguments_);
};

const usedModels = ['rgb', 'hex', 'ansi256'];

for (const model of usedModels) {
	styles[model] = {
		get() {
			const {level} = this;
			return function (...arguments_) {
				const styler = createStyler(getModelAnsi(model, levelMapping[level], 'color', ...arguments_), ansiStyles.color.close, this[STYLER]);
				return createBuilder(this, styler, this[IS_EMPTY]);
			};
		},
	};

	const bgModel = 'bg' + model[0].toUpperCase() + model.slice(1);
	styles[bgModel] = {
		get() {
			const {level} = this;
			return function (...arguments_) {
				const styler = createStyler(getModelAnsi(model, levelMapping[level], 'bgColor', ...arguments_), ansiStyles.bgColor.close, this[STYLER]);
				return createBuilder(this, styler, this[IS_EMPTY]);
			};
		},
	};
}

const interpolateRgb = (color1, color2, factor) => [
	color1[0] + ((color2[0] - color1[0]) * factor),
	color1[1] + ((color2[1] - color1[1]) * factor),
	color1[2] + ((color2[2] - color1[2]) * factor),
];

const getGradientColor = (colors, position) => {
	if (colors.length === 1) {
		return colors[0];
	}

	if (position <= 0) {
		return colors[0];
	}

	if (position >= 1) {
		return colors.at(-1);
	}

	const segmentCount = colors.length - 1;
	const segmentPosition = position * segmentCount;
	const segmentIndex = Math.floor(segmentPosition);
	const segmentFraction = segmentPosition - segmentIndex;

	return interpolateRgb(colors[segmentIndex], colors[segmentIndex + 1], segmentFraction);
};

const getRgbAnsi = (level, type, rgb) => {
	const modelLevel = levelMapping[level];
	if (modelLevel === 'ansi16m') {
		return ansiStyles[type].ansi16m(...rgb);
	}

	if (modelLevel === 'ansi256') {
		return ansiStyles[type].ansi256(ansiStyles.rgbToAnsi256(...rgb));
	}

	return ansiStyles[type].ansi(ansiStyles.rgbToAnsi(...rgb));
};

styles.gradient = {
	get() {
		const {level} = this;
		const parentStyler = this[STYLER];
		return function (...colors) {
			if (colors.length < 2) {
				throw new Error('Gradient requires at least two colors');
			}

			const rgbColors = colors.map(color => colorToRgb(color));
			const closeCode = ansiStyles.color.close;

			const applyGradient = string => {
				if (level <= 0 || !string) {
					return parentStyler ? parentStyler.openAll + string + parentStyler.closeAll : string;
				}

				const lines = string.split('\n');
				const result = lines.map(line => {
					if (line.length === 0) {
						return line;
					}

					if (level <= 1) {
						const startColor = rgbColors[0];
						const endColor = rgbColors.at(-1);
						const midColor = interpolateRgb(startColor, endColor, 0.5);
						const openCode = getRgbAnsi(level, 'color', midColor.map(value => Math.round(value)));
						return openCode + line + closeCode;
					}

					let resultLine = '';
					let lastColor = null;

					for (let i = 0; i < line.length; i++) {
						const position = line.length === 1 ? 0 : i / (line.length - 1);
						const color = getGradientColor(rgbColors, position).map(value => Math.round(value));

						if (!lastColor || color[0] !== lastColor[0] || color[1] !== lastColor[1] || color[2] !== lastColor[2]) {
							resultLine += getRgbAnsi(level, 'color', color);
							lastColor = color;
						}

						resultLine += line[i];
					}

					resultLine += closeCode;
					return resultLine;
				});

				let gradientResult = result.join('\n');

				if (parentStyler) {
					const {openAll, closeAll} = parentStyler;
					if (gradientResult.includes('\u001B')) {
						let styler = parentStyler;
						while (styler !== undefined) {
							gradientResult = stringReplaceAll(gradientResult, styler.close, styler.open);
							styler = styler.parent;
						}
					}

					const lfIndex = gradientResult.indexOf('\n');
					if (lfIndex !== -1) {
						gradientResult = stringEncaseCRLFWithFirstIndex(gradientResult, closeAll, openAll, lfIndex);
					}

					gradientResult = openAll + gradientResult + closeAll;
				}

				return gradientResult;
			};

			const builder = (...arguments_) => {
				const string = (arguments_.length === 1) ? String(arguments_[0]) : arguments_.join(' ');
				return applyGradient(string);
			};

			Object.setPrototypeOf(builder, proto);
			builder[GENERATOR] = this;
			builder[STYLER] = parentStyler;
			builder[IS_EMPTY] = this[IS_EMPTY];

			return builder;
		};
	},
};

const proto = Object.defineProperties(() => {}, {
	...styles,
	level: {
		enumerable: true,
		get() {
			return this[GENERATOR].level;
		},
		set(level) {
			this[GENERATOR].level = level;
		},
	},
});

const createStyler = (open, close, parent) => {
	let openAll;
	let closeAll;
	if (parent === undefined) {
		openAll = open;
		closeAll = close;
	} else {
		openAll = parent.openAll + open;
		closeAll = close + parent.closeAll;
	}

	return {
		open,
		close,
		openAll,
		closeAll,
		parent,
	};
};

const createBuilder = (self, _styler, _isEmpty) => {
	// Single argument is hot path, implicit coercion is faster than anything
	// eslint-disable-next-line no-implicit-coercion
	const builder = (...arguments_) => applyStyle(builder, (arguments_.length === 1) ? ('' + arguments_[0]) : arguments_.join(' '));

	// We alter the prototype because we must return a function, but there is
	// no way to create a function with a different prototype
	Object.setPrototypeOf(builder, proto);

	builder[GENERATOR] = self;
	builder[STYLER] = _styler;
	builder[IS_EMPTY] = _isEmpty;

	return builder;
};

const applyStyle = (self, string) => {
	if (self.level <= 0 || !string) {
		return self[IS_EMPTY] ? '' : string;
	}

	let styler = self[STYLER];

	if (styler === undefined) {
		return string;
	}

	const {openAll, closeAll} = styler;
	if (string.includes('\u001B')) {
		while (styler !== undefined) {
			// Replace any instances already present with a re-opening code
			// otherwise only the part of the string until said closing code
			// will be colored, and the rest will simply be 'plain'.
			string = stringReplaceAll(string, styler.close, styler.open);

			styler = styler.parent;
		}
	}

	// We can move both next actions out of loop, because remaining actions in loop won't have
	// any/visible effect on parts we add here. Close the styling before a linebreak and reopen
	// after next line to fix a bleed issue on macOS: https://github.com/chalk/chalk/pull/92
	const lfIndex = string.indexOf('\n');
	if (lfIndex !== -1) {
		string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
	}

	return openAll + string + closeAll;
};

Object.defineProperties(createChalk.prototype, styles);

const chalk = createChalk();
export const chalkStderr = createChalk({level: stderrColor ? stderrColor.level : 0});

export {
	modifierNames,
	foregroundColorNames,
	backgroundColorNames,
	colorNames,

	// TODO: Remove these aliases in the next major version
	modifierNames as modifiers,
	foregroundColorNames as foregroundColors,
	backgroundColorNames as backgroundColors,
	colorNames as colors,
} from './vendor/ansi-styles/index.js';

export {
	stdoutColor as supportsColor,
	stderrColor as supportsColorStderr,
};

export {hexToRgb, rgbToHex} from './utilities.js';

export default chalk;
