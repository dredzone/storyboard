import {
  LEVEL_STR_TO_NUM,
  FILTER_KEY,
  DEFAULT_FILTER,
} from './constants';
import chalk from 'chalk';

let included = null;
let excluded = null;
let cachedThreshold = null;
let mainStory = null;

const init = deps => {
  mainStory = deps.mainStory;
  /* istanbul ignore if */
  if (!mainStory) throw new Error('MISSING_DEPENDENCIES');
  mainStory.info('storyboard', `Log filter: ${chalk.cyan.bold(getConfig())}`);
};

const setUpFilters = () => {
  included = [];
  excluded = [];
  cachedThreshold = {};
  const filter = getConfig();
  const specs = filter.split(/[\s,]+/);
  specs.forEach(spec => {
    if (!spec.length) return;
    const tokens = spec.split(':');
    const src = tokens[0].replace(/\*/g, '.*?');
    let level = tokens[1];
    if (src[0] === '-') {
      excluded.push({ re: new RegExp(`^${src.substr(1)}$`) });
    } else {
      if (tokens.length < 1) {
        mainStory.error('storyboard', `Incorrect filter element: ${chalk.cyan.bold(spec)}`);
        return;
      }
      level = level.toUpperCase();
      if (level === '*') level = 'TRACE';
      let threshold = LEVEL_STR_TO_NUM[level];
      if (threshold == null) threshold = LEVEL_STR_TO_NUM.DEBUG;
      included.push({ re: new RegExp(`^${src}$`), threshold });
    }
  });
};

const getStorage = () => (
  typeof window !== 'undefined' && window && window.localStorage ?
    window.localStorage :
    process.env
);

const getConfig = () => {
  const store = getStorage();
  let filter = store[FILTER_KEY];
  if (filter == null || !filter.length) filter = DEFAULT_FILTER;
  return filter;
};

const config = filter => {
  const store = getStorage();
  store[FILTER_KEY] = filter || '';
  cachedThreshold = null;
  setUpFilters();
  mainStory.info('storyboard', `Log filter is now: ${chalk.cyan.bold(getConfig())}`);
};

const calcThreshold = src => {
  for (let i = 0; i < excluded.length; i++) {
    if (excluded[i].re.test(src)) return null;
  }
  for (let i = 0; i < included.length; i++) {
    if (included[i].re.test(src)) return included[i].threshold;
  }
  return null;
};

const passesFilter = (src, level) => {
  let thresh;
  if (cachedThreshold.hasOwnProperty(src)) {
    thresh = cachedThreshold[src];
  } else {
    thresh = cachedThreshold[src] = calcThreshold(src);
  }
  return thresh != null && level >= thresh;
};

setUpFilters();

// -----------------------------------------
// API
// -----------------------------------------
export {
  init,
  config,
  getConfig,
  passesFilter,
};