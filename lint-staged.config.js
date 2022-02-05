module.exports = {
  '*.ts': (filenames) => [
    'tsc -p tsconfig.json --noEmit',
    `eslint --cache --fix ${filenames.join(' ')}`,
  ],
  '*.js': 'eslint --cache --fix',
};
