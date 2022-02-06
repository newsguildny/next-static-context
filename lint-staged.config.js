module.exports = {
  '*.ts': (filenames) => ['yarn typecheck', `eslint --cache --fix ${filenames.join(' ')}`],
  '*.js': 'eslint --cache --fix',
};
